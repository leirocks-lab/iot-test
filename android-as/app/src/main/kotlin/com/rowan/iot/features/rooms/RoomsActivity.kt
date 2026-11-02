package com.rowan.iot.features.rooms

import androidx.activity.ComponentActivity
import androidx.activity.OnBackPressedCallback
import android.app.AlertDialog
import android.app.Dialog
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.os.Build
import android.os.Bundle
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.view.WindowInsets
import android.view.WindowManager
import android.widget.*
import com.rowan.iot.MainApplication
import com.rowan.iot.R
import com.rowan.iot.data.http.HttpRoomRepository
import com.rowan.iot.domain.rooms.*
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.collect

/** S097..102. Room membership is metadata, never a guessed list of device children. */
class RoomsActivity : ComponentActivity() {
    private val lifetime = MainScope()
    private val account get() = (application as MainApplication).services.account
    private var revision = 0L
    private lateinit var manager: RoomManager
    private lateinit var content: LinearLayout
    private lateinit var rows: LinearLayout
    private lateinit var status: TextView
    private lateinit var back: TextView
    private lateinit var edit: TextView
    private lateinit var add: Button
    private lateinit var refresh: Button
    private var work: Job? = null
    private var writing = false
    private var editor: Dialog? = null
    private var editorError: TextView? = null
    private var editorConfirm: View? = null
    private var restoreNotice = false
    private val pageColor = Color.rgb(242, 242, 242)
    private val blue = Color.rgb(0, 122, 221)

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        onBackPressedDispatcher.addCallback(this,object:OnBackPressedCallback(true) {
            override fun handleOnBackPressed()=routeBack()
        })
        revision = account.revision
        if (account.session == null) { finish(); return }
        manager = RoomManager(HttpRoomRepository(account, revision), ::current)
        restoreNotice = savedInstanceState?.getBoolean("rooms_pending") == true
        buildPage()
        lifetime.launch { manager.state.collect { render(it) } }
        runWork(false) { manager.load() }
    }

    private fun current() = account.revision == revision && account.session != null
    override fun onResume() {
        super.onResume()
        if (::manager.isInitialized && !current()) { work?.cancel(); editor?.dismiss(); finish() }
    }

    private fun buildPage() {
        content = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setBackgroundColor(pageColor)
            setPadding(dp(16), 0, dp(16), dp(18))
        }
        val header = LinearLayout(this).apply { gravity = Gravity.CENTER_VERTICAL }
        back = label("‹", 30f, R.id.rooms_back).apply { contentDescription = "返回"; setOnClickListener { routeBack() } }
        val title = label("房间管理", 17f, R.id.rooms_title).apply { gravity = Gravity.CENTER; setTypeface(null, Typeface.BOLD) }
        edit = label("编辑", 16f, R.id.rooms_edit).apply {
            setTextColor(blue); gravity = Gravity.END or Gravity.CENTER_VERTICAL
            setOnClickListener {
                if (manager.state.value.editing) runWork(true) { manager.saveEditing() }
                else manager.beginEditing()
            }
        }
        header.addView(back, LinearLayout.LayoutParams(dp(64), dp(56)))
        header.addView(title, LinearLayout.LayoutParams(0, dp(56), 1f))
        header.addView(edit, LinearLayout.LayoutParams(dp(64), dp(56)))
        content.addView(header)
        status = label("正在加载…", 14f, R.id.rooms_status).apply {
            setPadding(dp(4), dp(8), dp(4), dp(8)); accessibilityLiveRegion = View.ACCESSIBILITY_LIVE_REGION_POLITE
        }
        content.addView(status)
        rows = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; id = R.id.rooms_list }
        content.addView(ScrollView(this).apply { addView(rows); isFillViewport = false }, LinearLayout.LayoutParams(-1, 0, 1f))
        refresh = Button(this).apply {
            id = R.id.rooms_refresh; text = "刷新"; isAllCaps = false
            setOnClickListener { restoreNotice = false; runWork(false) { manager.load() } }
        }
        content.addView(refresh, LinearLayout.LayoutParams(-1, dp(48)))
        add = Button(this).apply {
            id = R.id.rooms_add; text = "添加房间"; isAllCaps = false; textSize = 16f
            setTextColor(Color.WHITE); background = rounded(Color.BLACK, 8)
            setOnClickListener { showNameEditor(null) }
        }
        content.addView(add, LinearLayout.LayoutParams(-1, dp(48)).apply { topMargin = dp(12) })
        setContentView(content)
        if (Build.VERSION.SDK_INT >= 30) {
            window.setDecorFitsSystemWindows(false)
            content.setOnApplyWindowInsetsListener { view, insets ->
                val bars = insets.getInsets(WindowInsets.Type.systemBars())
                view.setPadding(dp(16) + bars.left, bars.top, dp(16) + bars.right, dp(18) + bars.bottom)
                insets
            }
            val light = android.view.WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS or
                android.view.WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS
            window.decorView.windowInsetsController?.setSystemBarsAppearance(light, light)
        }
    }

    private fun render(state: RoomState) {
        if (state.sessionExpired) { editor?.dismiss(); finish(); return }
        status.text = when {
            state.error != null -> state.error
            state.busy -> if (writing) "正在保存，请勿重复提交…" else "正在加载…"
            restoreNotice && state.loaded -> "上次页面离开时操作未确认；已重新读取，请核对列表，不会自动重提"
            state.loaded && state.rooms.isEmpty() -> "还没有房间，添加一个房间开始整理设备"
            state.editing -> "调整房间顺序；仅可删除已确认空的非默认房间"
            else -> ""
        }
        status.setTextColor(if (state.error != null) Color.rgb(170, 40, 40) else Color.DKGRAY)
        status.visibility = if (status.text.isEmpty()) View.GONE else View.VISIBLE
        edit.id = if (state.editing) R.id.rooms_save else R.id.rooms_edit
        edit.text = if (state.editing) "完成" else "编辑"
        edit.isEnabled = state.loaded && !state.busy && !state.resultUnknown && (state.editing || state.rooms.isNotEmpty())
        edit.alpha = if (edit.isEnabled) 1f else .4f
        back.text = if (state.editing) "取消" else "‹"
        back.textSize = if (state.editing) 16f else 30f
        back.id = if (state.editing) R.id.rooms_cancel_edit else R.id.rooms_back
        back.isEnabled = !state.busy
        add.visibility = if (state.editing) View.GONE else View.VISIBLE
        add.isEnabled = state.loaded && !state.busy && !state.resultUnknown
        add.alpha = if (add.isEnabled) 1f else .4f
        refresh.isEnabled = !state.busy
        refresh.text = if (state.resultUnknown) "刷新并核对操作结果" else "刷新"
        editorError?.text = state.error ?: if (state.busy) "正在保存…" else ""
        editorConfirm?.isEnabled = !state.busy && !state.resultUnknown
        rows.removeAllViews()
        val visible = if (state.editing) state.draft else state.rooms
        visible.forEachIndexed { index, room ->
            val card = LinearLayout(this).apply {
                id = R.id.rooms_row; orientation = LinearLayout.VERTICAL
                background = rounded(Color.WHITE, 12); setPadding(dp(16), dp(4), dp(12), dp(4))
                contentDescription = "房间 ${room.name}，${room.deviceCount?.let { "$it 个设备" } ?: "设备数量未知"}"
            }
            val line = LinearLayout(this).apply { gravity = Gravity.CENTER_VERTICAL }
            if (state.editing) line.addView(action("−", R.id.rooms_remove, "删除${room.name}", state) {
                confirmRemoval(room)
            }, LinearLayout.LayoutParams(dp(36), dp(48)))
            line.addView(label(room.name, 16f).apply { minHeight = dp(48) }, LinearLayout.LayoutParams(0, -2, 1f))
            line.addView(label(room.deviceCount?.let { "$it 个设备" } ?: "数量未知", 13f).apply { setTextColor(Color.GRAY) })
            if (!state.editing) line.addView(action("✎", R.id.rooms_rename, "修改${room.name}名称", state) {
                showNameEditor(room)
            }, LinearLayout.LayoutParams(dp(48), dp(48)))
            else {
                line.addView(action("↑", R.id.rooms_move_up, "上移${room.name}", state) { manager.moveUp(room.id) }.apply {
                    isEnabled = isEnabled && index > 0
                }, LinearLayout.LayoutParams(dp(40), dp(48)))
                line.addView(action("↓", R.id.rooms_move_down, "下移${room.name}", state) { manager.moveDown(room.id) }.apply {
                    isEnabled = isEnabled && index < visible.lastIndex
                }, LinearLayout.LayoutParams(dp(40), dp(48)))
            }
            card.addView(line)
            if (room.isDefault == true) card.addView(label("默认房间", 12f).apply { setTextColor(Color.GRAY); setPadding(0, 0, 0, dp(8)) })
            rows.addView(card, LinearLayout.LayoutParams(-1, -2).apply { bottomMargin = dp(10) })
        }
    }

    private fun confirmRemoval(room: Room) {
        if (!current() || manager.state.value.busy) return
        try { requireRemovableRoom(room) }
        catch (_: RoomRuleBlocked) { manager.removeFromDraft(room.id); return }
        AlertDialog.Builder(this).setTitle("删除房间")
            .setMessage("删除“${room.name}”？当前未包含设备。完成编辑后才会保存。")
            .setNegativeButton("取消", null)
            .setPositiveButton("删除") { _, _ -> if (current()) manager.removeFromDraft(room.id) }.show()
    }

    private fun showNameEditor(room: Room?) {
        val state = manager.state.value
        if (!current() || state.busy || state.resultUnknown || state.editing || editor != null) return
        val panel = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL; setPadding(dp(16), dp(20), dp(16), dp(24))
            background = rounded(if (room == null) pageColor else Color.WHITE, 24)
        }
        val dialog = Dialog(this)
        dialog.setContentView(panel)
        editor = dialog
        val title = label(if (room == null) "添加房间" else "房间名称", 17f).apply {
            gravity = Gravity.CENTER; setTypeface(null, Typeface.BOLD); setPadding(0, 0, 0, dp(24))
        }
        panel.addView(title)
        if (room == null) panel.addView(label("房间名称", 16f).apply { setPadding(0, 0, 0, dp(12)) })
        val input = EditText(this).apply {
            id = R.id.rooms_name_input; hint = "请输入房间名称"; textSize = 16f; isSingleLine = true
            setText(room?.name ?: ""); setPadding(dp(14), dp(12), dp(14), dp(12))
            background = rounded(Color.WHITE, 8, Color.rgb(224, 224, 224)); selectAll()
        }
        panel.addView(input, LinearLayout.LayoutParams(-1, dp(50)))
        val error = label("", 14f, R.id.rooms_name_error).apply { setTextColor(Color.rgb(170, 40, 40)); setPadding(0, dp(8), 0, dp(8)) }
        editorError = error; panel.addView(error)
        if (room == null) {
            panel.addView(label("推荐名称", 16f).apply { setPadding(0, dp(20), 0, dp(12)) })
            // Single-name suggestions from the local Add Room design; no batch-create behavior.
            listOf("书房", "儿童房", "餐厅", "阳台", "浴室", "地下室").forEach { name ->
                panel.addView(label(name, 16f).apply {
                    setPadding(dp(16), dp(12), dp(16), dp(12)); background = rounded(Color.WHITE, 0)
                    setOnClickListener { input.setText(name); input.setSelection(name.length) }
                })
            }
        }
        val buttons = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL }
        val cancel = Button(this).apply {
            id = R.id.rooms_name_cancel; text = "取消"; isAllCaps = false; background = rounded(pageColor, 8)
            setOnClickListener { if (writing) work?.cancel(); dialog.dismiss() }
        }
        val confirm = Button(this).apply {
            id = R.id.rooms_name_confirm; text = "确定"; isAllCaps = false; setTextColor(Color.WHITE); background = rounded(Color.BLACK, 8)
            setOnClickListener {
                val value = input.text.toString()
                runWork(true) {
                    if (room == null) manager.create(value) else manager.rename(room.id, value)
                    val result = manager.state.value
                    if (!result.busy && result.error == null && !result.resultUnknown && current()) dialog.dismiss()
                }
            }
        }
        editorConfirm = confirm
        buttons.addView(cancel, LinearLayout.LayoutParams(0, dp(44), 1f).apply { marginEnd = dp(8) })
        buttons.addView(confirm, LinearLayout.LayoutParams(0, dp(44), 1f).apply { marginStart = dp(8) })
        panel.addView(buttons, LinearLayout.LayoutParams(-1, -2).apply { topMargin = dp(16) })
        dialog.setOnCancelListener { if (writing) work?.cancel() }
        dialog.setOnDismissListener { editor = null; editorError = null; editorConfirm = null }
        dialog.show()
        dialog.window?.apply {
            setBackgroundDrawableResource(android.R.color.transparent)
            setLayout(ViewGroup.LayoutParams.MATCH_PARENT, if (room == null) ViewGroup.LayoutParams.MATCH_PARENT else ViewGroup.LayoutParams.WRAP_CONTENT)
            setGravity(Gravity.BOTTOM)
            setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE)
        }
        if (room != null) input.requestFocus()
    }

    private fun runWork(write: Boolean, action: suspend () -> Unit) {
        if (!current() || work?.isActive == true) return
        if (write) restoreNotice = false
        writing = write
        work = lifetime.launch {
            try {
                action()
                val result = manager.state.value
                if (write && current() && result.loaded && result.error == null && !result.resultUnknown) setResult(RESULT_OK)
            }
            catch (error: CancellationException) { throw error }
            finally { writing = false; if (!isFinishing && !isDestroyed && ::manager.isInitialized) render(manager.state.value) }
        }
    }

    private fun routeBack() {
        if (::manager.isInitialized && manager.state.value.editing && !manager.state.value.busy) manager.cancelEditing()
        else if (::manager.isInitialized && manager.state.value.busy) {
            work?.cancel()
        } else finish()
    }

    override fun onSaveInstanceState(outState: Bundle) {
        if (::manager.isInitialized) outState.putBoolean("rooms_pending", manager.state.value.resultUnknown || (writing && manager.state.value.busy))
        super.onSaveInstanceState(outState)
    }
    override fun onDestroy() {
        editor?.dismiss(); lifetime.cancel(); super.onDestroy()
    }
    private fun action(text: String, viewId: Int, description: String, state: RoomState, click: () -> Unit) =
        label(text, 22f, viewId).apply {
            gravity = Gravity.CENTER; contentDescription = description
            isEnabled = !state.busy && !state.resultUnknown; setTextColor(if (text == "−") Color.rgb(255, 77, 77) else Color.GRAY)
            setOnClickListener { if (current()) click() }
        }
    private fun label(value: String, size: Float, viewId: Int = View.NO_ID) = TextView(this).apply {
        id = viewId; text = value; textSize = size; setTextColor(Color.BLACK); gravity = Gravity.CENTER_VERTICAL
    }
    private fun rounded(color: Int, radius: Int, border: Int? = null) = GradientDrawable().apply {
        setColor(color); cornerRadius = dp(radius).toFloat(); if (border != null) setStroke(dp(1), border)
    }
    private fun dp(value: Int) = (value * resources.displayMetrics.density).toInt()
}
