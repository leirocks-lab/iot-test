package com.rowan.iot.domain.device.capabilities

import java.math.BigDecimal

/** Schema validation only. No MQTT publication, role lookup or capability registration. */
object ThingConstraintValidator {
    fun accepts(attribute: ThingAttribute, value: Any?): Boolean {
        if (attribute.writeConstraintStatus != WriteConstraintStatus.COMPLETE) return false
        return when (attribute.kind) {
            ThingValueKind.BOOLEAN -> value is Boolean
            ThingValueKind.ENUM -> value is String && attribute.enumValues?.contains(value) == true
            ThingValueKind.INTEGER -> {
                val number = safeInteger(value) ?: return false
                val minimum = attribute.minimum ?: return false
                val maximum = attribute.maximum ?: return false
                val step = attribute.step ?: return false
                if (number < minimum || number > maximum) return false
                // Decimal arithmetic avoids subtraction/modulo losing a grid unit at
                // opposite safe-integer extremes. No rounding an illegal candidate.
                BigDecimal.valueOf(number).subtract(BigDecimal.valueOf(minimum))
                    .remainder(BigDecimal.valueOf(step)).compareTo(BigDecimal.ZERO) == 0
            }
            ThingValueKind.UNKNOWN -> false
        }
    }
}

/** Integers must remain exact when crossing the shared RN number boundary. */
internal fun safeInteger(value: Any?): Double? {
    if (value !is Number) return null
    val result = value.toDouble()
    if (!result.isFinite() || result < -9_007_199_254_740_991.0 || result > 9_007_199_254_740_991.0 || result % 1.0 != 0.0) return null
    // Reject an exotic Number that was rounded into the allowed boundary.
    val exact = try { BigDecimal(value.toString()) } catch (_: NumberFormatException) { return null }
    return if (exact.compareTo(BigDecimal.valueOf(result)) == 0) result else null
}
