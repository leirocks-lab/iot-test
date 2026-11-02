package com.rowan.iot.domain.account

/** Reading time counts only while loaded content is visible in the foreground. */
class LegalReadGate(private val durationMs: Long, private val clock: () -> Long) {
    private var loaded = false
    private var visible = false
    private var reachedBottom = false
    private var accumulated = 0L
    private var startedAt: Long? = null
    private val elapsed: Long get() = accumulated + (startedAt?.let { (clock() - it).coerceAtLeast(0) } ?: 0)
    val remainingSeconds: Int get() = ((durationMs - elapsed).coerceAtLeast(0) + 999).div(1000).toInt()
    val canComplete: Boolean get() = loaded && reachedBottom && remainingSeconds == 0

    fun setVisible(value: Boolean) {
        startedAt?.let { accumulated += (clock() - it).coerceAtLeast(0) }
        visible = value
        startedAt = if (visible && loaded) clock() else null
    }
    fun contentLoaded() {
        reset()
        loaded = true
        startedAt = if (visible) clock() else null
    }
    fun reachBottom() { if (loaded) reachedBottom = true }
    fun reset() {
        loaded = false; reachedBottom = false; accumulated = 0; startedAt = null
    }
}
