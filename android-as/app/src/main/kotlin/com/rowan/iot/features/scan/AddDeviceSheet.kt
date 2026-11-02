package com.rowan.iot.features.scan

import android.app.Activity
import android.app.Dialog
import android.content.Intent
import android.graphics.Color
import android.graphics.drawable.GradientDrawable
import android.view.Gravity
import android.view.ViewGroup
import android.widget.Button
import android.widget.LinearLayout
import com.rowan.iot.R
import com.rowan.iot.features.products.ProductCatalogActivity
import com.rowan.iot.features.products.ProductDetailsActivity

/** S036 only: native entry selection; product discovery remains in its existing owner. */
object AddDeviceSheet {
    fun show(activity:Activity,revision:Long,current:()->Boolean) {
        if(!current()||activity.isFinishing)return
        val dialog=Dialog(activity)
        val density=activity.resources.displayMetrics.density
        val content=LinearLayout(activity).apply {
            orientation=LinearLayout.VERTICAL;setPadding((20*density).toInt(),(16*density).toInt(),(20*density).toInt(),(24*density).toInt())
            background=GradientDrawable().apply {setColor(Color.WHITE);cornerRadius=16*density}
        }
        fun action(label:String,id:Int,run:()->Unit){content.addView(Button(activity).apply {this.id=id;text=label;setOnClickListener {dialog.dismiss();if(current())run()}},LinearLayout.LayoutParams(-1,-2))}
        action("扫一扫",R.id.add_scan){activity.startActivity(Intent(activity,ScanActivity::class.java).putExtra(ScanActivity.EXTRA_ACCOUNT_REVISION,revision))}
        action("手动添加",R.id.add_manual){activity.startActivity(Intent(activity,ProductCatalogActivity::class.java).putExtra(ProductDetailsActivity.EXTRA_ACCOUNT_REVISION,revision))}
        action("取消",R.id.add_cancel){}
        dialog.setContentView(content);dialog.window?.setBackgroundDrawableResource(android.R.color.transparent)
        dialog.window?.setGravity(Gravity.BOTTOM);dialog.show();dialog.window?.setLayout(ViewGroup.LayoutParams.MATCH_PARENT,ViewGroup.LayoutParams.WRAP_CONTENT)
    }
}
