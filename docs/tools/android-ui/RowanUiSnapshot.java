package com.rowan.tools.androidui;

import android.app.UiAutomation;
import android.graphics.Rect;
import android.os.SystemClock;
import android.util.Xml;
import android.view.accessibility.AccessibilityNodeInfo;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.lang.reflect.Method;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.atomic.AtomicBoolean;
import org.xmlpull.v1.XmlSerializer;

/** Independent read-only exporter. Never waits for app idle and never emits UI text to stdout. */
public final class RowanUiSnapshot {
    private static final int MAX_NODES = 2000, MAX_DEPTH = 48, MAX_BYTES = 1024 * 1024;
    private static final long ROOT_READY_MS = 2000, WATCHDOG_MS = 9000, DISCONNECT_MS = 400;
    private static final AtomicBoolean finished = new AtomicBoolean();
    private static final AtomicBoolean reported = new AtomicBoolean();
    private static long started;
    private static int nodes;
    private static String destination, captureId;
    private static Node captured;

    private static final class Failure extends Exception {
        final String code;
        Failure(String code) { this.code = code; }
    }
    private static final class Node {
        String id, type, pkg, text, description;
        final Rect bounds = new Rect();
        boolean enabled, checked, checkable, clickable, scrollable, focusable, focused, selected, longClickable, password, directInput;
        final List<Node> children = new ArrayList<>();
    }

    public static void main(String[] args) {
        started = SystemClock.uptimeMillis();
        if (args.length != 2 || !args[0].matches("/sdcard/rowan-[a-z0-9-]+\\.xml") || args[0].length() > 128 || !args[1].matches("[a-f0-9]{12}")) {
            report("INVALID_ARGUMENT", 2); Runtime.getRuntime().halt(2); return;
        }
        destination = args[0]; captureId = args[1];
        Thread watchdog = new Thread(() -> {
            SystemClock.sleep(WATCHDOG_MS);
            if (!finished.get()) {
                deleteOutput(); report("WATCHDOG_TIMEOUT", 124); Runtime.getRuntime().halt(124);
            }
        }, "rowan-ui-watchdog");
        watchdog.setDaemon(true); watchdog.start();
        Object wrapper = null;
        int exit = 1;
        String code = "CAPTURE_FAILED";
        try {
            File target = new File(destination);
            if (target.exists() && !target.delete()) throw new Failure("STALE_OUTPUT_DELETE_FAILED");
            Class<?> wrapperClass = Class.forName("com.android.uiautomator.core.UiAutomationShellWrapper");
            wrapper = wrapperClass.getDeclaredConstructor().newInstance();
            wrapperClass.getMethod("connect").invoke(wrapper);
            wrapperClass.getMethod("setCompressedLayoutHierarchy", boolean.class).invoke(wrapper, false);
            UiAutomation automation = (UiAutomation) wrapperClass.getMethod("getUiAutomation").invoke(wrapper);
            AccessibilityNodeInfo root = null;
            long rootDeadline = SystemClock.uptimeMillis() + ROOT_READY_MS;
            do {
                root = automation.getRootInActiveWindow();
                if (root != null) break;
                SystemClock.sleep(80);
            } while (SystemClock.uptimeMillis() < rootDeadline);
            if (root == null) throw new Failure("ROOT_NOT_READY");
            try { captured = read(root, 0); } finally { root.recycle(); }
            ByteArrayOutputStream bytes = new ByteArrayOutputStream();
            XmlSerializer xml = Xml.newSerializer(); xml.setOutput(bytes, "UTF-8");
            xml.startDocument("UTF-8", true); xml.startTag(null, "hierarchy");
            xml.attribute(null, "capture-id", captureId);
            xml.attribute(null, "rotation", "-1"); // Unknown rather than guessed; bounds are actual screen coordinates.
            write(xml, captured, 0, bytes);
            xml.endTag(null, "hierarchy"); xml.endDocument(); xml.flush();
            if (bytes.size() > MAX_BYTES) throw new Failure("BYTE_LIMIT");
            try (FileOutputStream stream = new FileOutputStream(target)) { bytes.writeTo(stream); stream.flush(); }
            exit = 0; code = "OK";
        } catch (Failure failure) { code = failure.code; deleteOutput(); }
        catch (Throwable failure) { code = "AUTOMATION_FAILURE"; deleteOutput(); }
        finally {
            if (wrapper != null) {
                final Object connected = wrapper;
                Thread cleanup = new Thread(() -> {
                    try { connected.getClass().getMethod("disconnect").invoke(connected); } catch (Throwable ignored) { }
                }, "rowan-ui-disconnect");
                cleanup.setDaemon(true); cleanup.start();
                try { cleanup.join(DISCONNECT_MS); } catch (InterruptedException ignored) { Thread.currentThread().interrupt(); }
            }
        }
        finished.set(true); report(code, exit);
        // Binder/thread shutdown must not leave an app_process helper behind, including a stuck disconnect.
        Runtime.getRuntime().halt(exit);
    }

    private static Node read(AccessibilityNodeInfo source, int depth) throws Exception {
        if (depth > MAX_DEPTH) throw new Failure("DEPTH_LIMIT");
        if (++nodes > MAX_NODES) throw new Failure("NODE_LIMIT");
        Node node = new Node();
        node.id = value(source.getViewIdResourceName(), 512); node.type = value(source.getClassName(), 256); node.pkg = value(source.getPackageName(), 256);
        node.password = source.isPassword();
        String tail = node.id.substring(node.id.lastIndexOf('/') + 1).toLowerCase(java.util.Locale.ROOT);
        boolean knownAuth = tail.matches("(?:account|registration|recovery)_(?:email|password|confirmation|code)") || tail.contains("captcha");
        node.directInput = node.password || knownAuth || source.isEditable() || node.type.endsWith("EditText");
        node.text = node.directInput ? "[redacted]" : publicText(source.getText());
        node.description = node.directInput ? "[redacted]" : publicText(source.getContentDescription());
        source.getBoundsInScreen(node.bounds);
        node.enabled = source.isEnabled(); node.checked = source.isChecked(); node.checkable = source.isCheckable();
        node.clickable = source.isClickable(); node.scrollable = source.isScrollable(); node.focusable = source.isFocusable();
        node.focused = source.isFocused(); node.selected = source.isSelected(); node.longClickable = source.isLongClickable();
        int count = source.getChildCount();
        if (count > MAX_NODES) throw new Failure("NODE_LIMIT");
        for (int index = 0; index < count; index++) {
            AccessibilityNodeInfo child = source.getChild(index);
            if (child == null) continue;
            try { if (child.isVisibleToUser()) node.children.add(read(child, depth + 1)); } finally { child.recycle(); }
        }
        // A custom OTP view may expose the same value in sibling display cells.
        // Redact a direct input's local group, without hiding unrelated ancestor page labels.
        boolean localInput = false;
        for (Node child : node.children) localInput |= child.directInput;
        if (localInput) for (Node child : node.children) redact(child);
        return node;
    }

    private static void redact(Node node) {
        node.text = "[redacted]"; node.description = "[redacted]";
        for (Node child : node.children) redact(child);
    }
    private static String publicText(CharSequence value) {
        if (value != null && value.length() > 1024) return "[text truncated]";
        return value(value, 1024)
            .replaceAll("[^\\s<>\"@]+@[^\\s<>\"@]+", "[redacted-email]")
            .replaceAll("(?i)wss?://[^\\s]+", "[redacted-url]");
    }
    private static String value(CharSequence sequence, int limit) {
        if (sequence == null) return "";
        String raw = sequence.toString();
        if (raw.length() > limit) {
            if (Character.isHighSurrogate(raw.charAt(limit - 1))) limit--;
            raw = raw.substring(0, limit);
        }
        StringBuilder clean = new StringBuilder();
        for (int i = 0; i < raw.length(); i++) {
            char c = raw.charAt(i);
            if (c == 9 || c == 10 || c == 13 || c >= 32 && c != 0xFFFE && c != 0xFFFF) clean.append(c);
        }
        return clean.toString();
    }
    private static void write(XmlSerializer xml, Node node, int index, ByteArrayOutputStream bytes) throws Exception {
        xml.startTag(null, "node");
        xml.attribute(null, "index", Integer.toString(index)); xml.attribute(null, "text", node.text);
        xml.attribute(null, "resource-id", node.id); xml.attribute(null, "class", node.type); xml.attribute(null, "package", node.pkg);
        xml.attribute(null, "content-desc", node.description); xml.attribute(null, "bounds", "[" + node.bounds.left + "," + node.bounds.top + "][" + node.bounds.right + "," + node.bounds.bottom + "]");
        xml.attribute(null, "enabled", Boolean.toString(node.enabled)); xml.attribute(null, "checked", Boolean.toString(node.checked));
        xml.attribute(null, "checkable", Boolean.toString(node.checkable)); xml.attribute(null, "clickable", Boolean.toString(node.clickable));
        xml.attribute(null, "scrollable", Boolean.toString(node.scrollable)); xml.attribute(null, "focusable", Boolean.toString(node.focusable));
        xml.attribute(null, "focused", Boolean.toString(node.focused)); xml.attribute(null, "selected", Boolean.toString(node.selected));
        xml.attribute(null, "long-clickable", Boolean.toString(node.longClickable)); xml.attribute(null, "password", Boolean.toString(node.password));
        xml.flush(); if (bytes.size() > MAX_BYTES) throw new Failure("BYTE_LIMIT");
        for (int child = 0; child < node.children.size(); child++) write(xml, node.children.get(child), child, bytes);
        xml.endTag(null, "node");
    }
    private static void deleteOutput() { if (destination != null) try { new File(destination).delete(); } catch (Throwable ignored) { } }
    private static void report(String code, int exit) {
        if (!reported.compareAndSet(false, true)) return;
        String type = captured == null ? "" : captured.type.replaceAll("[^A-Za-z0-9_.$]", "");
        int width = captured == null ? 0 : captured.bounds.width(), height = captured == null ? 0 : captured.bounds.height();
        System.out.println("{\"code\":\"" + code + "\",\"exitCode\":" + exit + ",\"captureId\":\"" + (captureId == null ? "" : captureId) + "\",\"nodes\":" + nodes + ",\"rootClass\":\"" + type + "\",\"width\":" + width + ",\"height\":" + height + ",\"elapsedMs\":" + (SystemClock.uptimeMillis() - started) + "}");
        System.out.flush();
    }
}
