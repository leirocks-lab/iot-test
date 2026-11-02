package com.rowan.iot.bridge

import org.junit.Assert.*
import org.junit.Test

class DevicePageClosePolicyTest {
    @Test fun delayedOldRootCloseCannotFinishTheReplacementPage() {
        var currentPage:String?="native-page-A"
        val finished=mutableListOf<String>()
        fun queuedClose(capturedPage:String):()->Unit = {
            if(canCloseDevicePage(capturedPage,currentPage,true,true))finished.add(currentPage!!)
        }
        val oldClose=queuedClose("native-page-A")
        currentPage="native-page-B"
        oldClose()
        assertTrue(finished.isEmpty())
        queuedClose("native-page-B")()
        assertEquals(listOf("native-page-B"),finished)
    }
    @Test fun bootstrapCanCloseItsOwnAuthorizedPageBeforeAnyObservationExists() {
        assertTrue(canCloseDevicePage("native-page-A","native-page-A",true,true))
    }
    @Test fun missingTokenPageOrAccountAuthorityCannotCloseAnything() {
        assertFalse(canCloseDevicePage("","native-page-B",true,true))
        assertFalse(canCloseDevicePage(" "," ",true,true))
        assertFalse(canCloseDevicePage("native-page-A",null,true,true))
        assertFalse(canCloseDevicePage("native-page-A","native-page-A",false,true))
    }
    @Test fun pausedReactPageCannotCloseBehindNativeUiButCanCloseAfterResume() {
        var resumed=false
        var finishes=0
        val close={if(canCloseDevicePage("native-page-A","native-page-A",true,resumed))finishes++}
        close()
        assertEquals(0,finishes)
        resumed=true
        close()
        assertEquals(1,finishes)
    }
}
