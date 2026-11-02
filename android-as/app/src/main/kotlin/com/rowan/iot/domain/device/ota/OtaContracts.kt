package com.rowan.iot.domain.device.ota

/** Native-only authorized resource scope. No production permit issuer is installed in this batch. */
data class OtaScope internal constructor(val accountRevision: Long, val resourceId: String, val userId: String) {
    override fun toString() = "OtaScope(redacted)"
}
enum class OtaKind(val wire: String) { MCU("mcu"), WIFI("wifi") }
data class OtaFirmware(val id: String, val version: String, val remark: String?) {
    override fun toString() = "OtaFirmware(redacted)"
}
data class OtaDevice(val id: String, val name: String, val mac: String) {
    override fun toString() = "OtaDevice(redacted)"
}
data class OtaOffer(val kind: OtaKind, val firmware: OtaFirmware, val device: OtaDevice) {
    override fun toString() = "OtaOffer(redacted)"
}
data class OtaTask(val taskId: String, val kind: OtaKind, val firmwareId: String) {
    override fun toString() = "OtaTask(redacted)"
}
/** The complete V1.4 OTA-05 vocabulary. No synthesized percentage or download/install phase. */
enum class OtaResult(val wire: String) {
    UPDATING("updating"), SUCCESS("success"), FAILED("failed"), CANCELLED("cancelled");
    val terminal get() = this != UPDATING
}
enum class OtaEvidenceSource { REPORTED_CURRENT, DEVICE_METADATA }
/** online is meaningful only through an explicitly verified native product profile. */
data class OtaOnlineEvidence(
    val source: OtaEvidenceSource, val online: Boolean?, val stale: Boolean,
    val connectionEpoch: Long, val authorityRevision: Long,
)
/** Issued only by a future native authority, never by RN or from DEVICE-02 static online. */
data class OtaStartPermit internal constructor(
    val scope: OtaScope, val kind: OtaKind, val firmwareId: String,
    val evidence: OtaOnlineEvidence, val expiresAtMillis: Long,
) { override fun toString() = "OtaStartPermit(redacted)" }
/** A verified native cancellation window is required; UPDATING does not imply one. */
data class OtaCancelPermit internal constructor(val scope: OtaScope, val taskId: String, val expiresAtMillis: Long) {
    override fun toString() = "OtaCancelPermit(redacted)"
}
/** Local work limits, not advertised firmware timing or wire fields. Clock is monotonic milliseconds. */
data class OtaPolicy(val pollIntervalMillis: Long = 3000, val maxPolls: Int = 120, val requestTimeoutMillis: Long = 20_000) {
    init { require(pollIntervalMillis >= 3000); require(maxPolls in 1..1200); require(requestTimeoutMillis in 1L..120_000L) }
}
enum class OtaError { NO_CANDIDATE, START_NOT_PERMITTED, CANCEL_NOT_PERMITTED, TASK_ALREADY_EXISTS, RESULT_UNKNOWN, READ_FAILED, INVALID_RESPONSE, POLL_LIMIT, SCOPE_CHANGED }
data class OtaState(
    val candidate: OtaOffer? = null, val task: OtaTask? = null, val lastConfirmed: OtaResult? = null,
    val busy: Boolean = false, val resultUnknown: Boolean = false, val sessionExpired: Boolean = false,
    val observing: Boolean = true, val error: OtaError? = null,
)
interface OtaRepository {
    val scope: OtaScope
    suspend fun check(kind: OtaKind): OtaOffer
    suspend fun start(kind: OtaKind, firmwareId: String): String
    suspend fun query(taskId: String): OtaResult
    suspend fun cancel(taskId: String)
}
