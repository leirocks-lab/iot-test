package com.rowan.iot.domain.device.mqtt

/**
 * Last-writer-wins per path, including subtree replacement barriers. Object patches merge;
 * missing properties never clear state. A null/scalar barrier hides older descendants but
 * preserves newer descendants that arrived first. No full packet history is retained.
 */
internal class ReportedTree {
    private class Node {
        var objectVersion = -1L
        var replacementVersion = -1L
        var replacement: ShadowValue = ShadowValue.Null
        val children = linkedMapOf<String, Node>()
    }
    data class Observed(val value: ShadowValue?, val version: Long)
    private val root = Node()

    fun apply(value: ShadowValue, version: Long): Boolean = apply(root, value, version)

    private fun apply(node: Node, value: ShadowValue, version: Long): Boolean {
        if (value is ShadowValue.Fields) {
            var changed = false
            if (version > node.objectVersion) { node.objectVersion = version; changed = true }
            for ((key, child) in value.value) {
                changed = apply(node.children.getOrPut(key) { Node() }, child, version) || changed
            }
            return changed
        }
        if (version <= node.replacementVersion) return false
        node.replacementVersion = version
        node.replacement = value
        return true
    }

    fun snapshot(): ShadowValue.Fields = resolve(root, -1).value as? ShadowValue.Fields ?: ShadowValue.Fields(emptyMap())

    fun at(path: ShadowPath): Observed {
        var node = root
        var floor = -1L
        for (key in path) {
            floor = maxOf(floor, node.replacementVersion)
            node = node.children[key] ?: return Observed(null, floor)
        }
        return resolve(node, floor)
    }

    private fun resolve(node: Node, ancestorFloor: Long): Observed {
        val floor = maxOf(ancestorFloor, node.replacementVersion)
        val children = node.children.mapValues { resolve(it.value, floor) }.filterValues { it.value != null }
        if (children.isNotEmpty()) {
            return Observed(ShadowValue.Fields(children.mapValues { it.value.value!! }), children.values.maxOf { it.version })
        }
        if (node.objectVersion > floor) return Observed(ShadowValue.Fields(emptyMap()), node.objectVersion)
        if (node.replacementVersion > ancestorFloor) {
            return Observed(node.replacement.takeUnless { it == ShadowValue.Null }, node.replacementVersion)
        }
        return Observed(null, ancestorFloor)
    }
}
