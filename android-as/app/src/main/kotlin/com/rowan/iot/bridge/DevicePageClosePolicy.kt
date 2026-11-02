package com.rowan.iot.bridge

/** The caller's initial native page capability cannot authorize a later root's navigation. */
internal fun canCloseDevicePage(requestedPage:String,currentPage:String?,pageAuthorized:Boolean,pageResumed:Boolean):Boolean =
    requestedPage.isNotBlank()&&requestedPage==currentPage&&pageAuthorized&&pageResumed
