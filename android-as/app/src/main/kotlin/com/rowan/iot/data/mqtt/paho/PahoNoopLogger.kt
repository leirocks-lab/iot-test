package com.rowan.iot.data.mqtt.paho

import java.util.ResourceBundle
import org.eclipse.paho.client.mqttv3.logging.Logger

/**
 * Public no-arg implementation instantiated reflectively by Paho 1.2.5 LoggerFactory.
 * Never retains, interpolates or invokes toString on IDs, URLs, parameters or causes.
 * Implements all 28 abstract methods in the pinned jar, including direct formatting.
 */
class PahoNoopLogger : Logger {
    override fun initialise(bundle: ResourceBundle?, loggerID: String?, resourceName: String?) = Unit
    override fun setResourceName(value: String?) = Unit
    override fun isLoggable(level: Int) = false
    override fun severe(sourceClass: String?, sourceMethod: String?, message: String?) = Unit
    override fun severe(sourceClass: String?, sourceMethod: String?, message: String?, inserts: Array<out Any?>?) = Unit
    override fun severe(sourceClass: String?, sourceMethod: String?, message: String?, inserts: Array<out Any?>?, thrown: Throwable?) = Unit
    override fun warning(sourceClass: String?, sourceMethod: String?, message: String?) = Unit
    override fun warning(sourceClass: String?, sourceMethod: String?, message: String?, inserts: Array<out Any?>?) = Unit
    override fun warning(sourceClass: String?, sourceMethod: String?, message: String?, inserts: Array<out Any?>?, thrown: Throwable?) = Unit
    override fun info(sourceClass: String?, sourceMethod: String?, message: String?) = Unit
    override fun info(sourceClass: String?, sourceMethod: String?, message: String?, inserts: Array<out Any?>?) = Unit
    override fun info(sourceClass: String?, sourceMethod: String?, message: String?, inserts: Array<out Any?>?, thrown: Throwable?) = Unit
    override fun config(sourceClass: String?, sourceMethod: String?, message: String?) = Unit
    override fun config(sourceClass: String?, sourceMethod: String?, message: String?, inserts: Array<out Any?>?) = Unit
    override fun config(sourceClass: String?, sourceMethod: String?, message: String?, inserts: Array<out Any?>?, thrown: Throwable?) = Unit
    override fun fine(sourceClass: String?, sourceMethod: String?, message: String?) = Unit
    override fun fine(sourceClass: String?, sourceMethod: String?, message: String?, inserts: Array<out Any?>?) = Unit
    override fun fine(sourceClass: String?, sourceMethod: String?, message: String?, inserts: Array<out Any?>?, thrown: Throwable?) = Unit
    override fun finer(sourceClass: String?, sourceMethod: String?, message: String?) = Unit
    override fun finer(sourceClass: String?, sourceMethod: String?, message: String?, inserts: Array<out Any?>?) = Unit
    override fun finer(sourceClass: String?, sourceMethod: String?, message: String?, inserts: Array<out Any?>?, thrown: Throwable?) = Unit
    override fun finest(sourceClass: String?, sourceMethod: String?, message: String?) = Unit
    override fun finest(sourceClass: String?, sourceMethod: String?, message: String?, inserts: Array<out Any?>?) = Unit
    override fun finest(sourceClass: String?, sourceMethod: String?, message: String?, inserts: Array<out Any?>?, thrown: Throwable?) = Unit
    override fun log(level: Int, sourceClass: String?, sourceMethod: String?, message: String?, inserts: Array<out Any?>?, thrown: Throwable?) = Unit
    override fun trace(level: Int, sourceClass: String?, sourceMethod: String?, message: String?, inserts: Array<out Any?>?, thrown: Throwable?) = Unit
    override fun formatMessage(message: String?, inserts: Array<out Any?>?) = "[Paho logging disabled]"
    override fun dumpTrace() = Unit
}
