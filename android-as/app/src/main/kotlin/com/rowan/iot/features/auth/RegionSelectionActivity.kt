package com.rowan.iot.features.auth

import android.app.Activity
import android.content.Intent
import android.graphics.Color
import android.graphics.drawable.GradientDrawable
import android.os.Bundle
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.view.inputmethod.InputMethodManager
import android.widget.*
import com.rowan.iot.R
import java.util.Locale

/** Full-screen native ISO region picker. No implicit default country or service-side restriction is invented. */
class RegionSelectionActivity : Activity() {
    private data class Region(val code: String, val name: String, val english: String) {
        val section get() = english.firstOrNull()?.uppercaseChar()?.takeIf { it in 'A'..'Z' } ?: '#'
    }
    private sealed interface Row {
        data class Header(val letter: Char) : Row
        data class Country(val region: Region, val first: Boolean, val last: Boolean) : Row
    }
    private val regions = Locale.getISOCountries().map { code ->
        val locale = Locale.Builder().setRegion(code).build()
        Region(code, locale.getDisplayCountry(Locale.SIMPLIFIED_CHINESE), locale.getDisplayCountry(Locale.ENGLISH))
    }.sortedBy { it.english.lowercase(Locale.ROOT) }
    private var rows: List<Row> = emptyList()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val selected = intent.getStringExtra("regionCode")?.takeIf { it in Locale.getISOCountries() }
        val ui = AuthFlowLayout(this, "国家或地区") { finish() }
        val panel = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; isFocusableInTouchMode = true; setPadding(ui.dp(16), 0, ui.dp(16), ui.dp(8)) }
        ui.replaceScrollWith(panel)
        val banner = ui.text("请选择国家或地区，协议将按所选地区提供。", 13f).apply {
            setTextColor(ui.orange); setPadding(ui.dp(12), ui.dp(10), ui.dp(12), ui.dp(10)); setBackgroundColor(Color.rgb(249, 242, 230))
        }
        panel.addView(banner, LinearLayout.LayoutParams(-1, -2)); panel.addView(Space(this), LinearLayout.LayoutParams(1, ui.dp(10)))
        val searchRow = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL; gravity = Gravity.CENTER_VERTICAL }
        val searchFrame = FrameLayout(this).apply { background = ui.visuals.rounded(Color.WHITE) }
        val search = EditText(this).apply {
            id = R.id.auth_region_search; hint = "请输入国家或地区名称"; textSize = 16f; isSingleLine = true; isSaveEnabled = false
            inputType = android.text.InputType.TYPE_CLASS_TEXT; minHeight = ui.dp(46); setTextColor(Color.BLACK); setHintTextColor(Color.GRAY)
            setPadding(ui.dp(16), ui.dp(10), ui.dp(44), ui.dp(10)); setBackgroundColor(Color.TRANSPARENT)
            setCompoundDrawablesWithIntrinsicBounds(ui.visuals.icon(R.drawable.auth_flow_search, 24), null, null, null); compoundDrawablePadding = ui.dp(8)
        }
        searchFrame.addView(search, FrameLayout.LayoutParams(-1, -2))
        val clear = ui.text("×", 24f).apply {
            gravity = Gravity.CENTER; contentDescription = "清空地区搜索"; isClickable = true; isFocusable = true; setTextColor(Color.GRAY)
            setOnClickListener { search.text.clear() }; visibility = View.GONE
        }
        searchFrame.addView(clear, FrameLayout.LayoutParams(ui.dp(44), -1, Gravity.END))
        searchRow.addView(searchFrame, LinearLayout.LayoutParams(0, -2, 1f))
        val cancel = ui.text("取消", 16f).apply {
            id = R.id.auth_region_cancel; minWidth = ui.dp(48); minHeight = ui.dp(44); gravity = Gravity.CENTER; isClickable = true; isFocusable = true; visibility = View.GONE
            setOnClickListener {
                search.text.clear(); search.clearFocus()
                (getSystemService(INPUT_METHOD_SERVICE) as InputMethodManager).hideSoftInputFromWindow(search.windowToken, 0)
                visibility = View.GONE; banner.visibility = View.VISIBLE
            }
        }
        searchRow.addView(cancel); panel.addView(searchRow)
        panel.addView(Space(this), LinearLayout.LayoutParams(1, ui.dp(12)))
        val listRow = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL }
        val list = ListView(this).apply { id = R.id.auth_region_list; divider = null; isSaveEnabled = false; setPadding(0, 0, 0, ui.dp(8)); clipToPadding = false }
        val empty = ui.text("未找到匹配的国家或地区", 14f).apply { id = R.id.auth_region_empty; gravity = Gravity.CENTER; setPadding(0, ui.dp(24), 0, ui.dp(24)); visibility = View.GONE }
        panel.addView(empty)
        listRow.addView(list, LinearLayout.LayoutParams(0, -1, 1f))
        val alphabet = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }
        val index = ScrollView(this).apply { isVerticalScrollBarEnabled = false; addView(alphabet) }
        listRow.addView(index, LinearLayout.LayoutParams(ui.dp(24), -1))
        panel.addView(listRow, LinearLayout.LayoutParams(-1, 0, 1f))
        val adapter = object : BaseAdapter() {
            override fun getCount() = rows.size
            override fun getItem(position: Int) = rows[position]
            override fun getItemId(position: Int) = position.toLong()
            override fun isEnabled(position: Int) = rows[position] is Row.Country
            override fun getView(position: Int, convertView: View?, parent: ViewGroup): View {
                return when (val row = rows[position]) {
                    is Row.Header -> ui.text(row.letter.toString(), 12f).apply {
                        setTextColor(Color.GRAY); setPadding(ui.dp(4), ui.dp(10), 0, ui.dp(6)); minHeight = ui.dp(30)
                    }
                    is Row.Country -> ui.text(if (row.region.code == selected) "${row.region.name}（当前）  ✓" else row.region.name, 16f).apply {
                        contentDescription = "${row.region.name}，${row.region.code}${if (row.region.code == selected) "，当前选择" else ""}"
                        minHeight = ui.dp(46); gravity = Gravity.CENTER_VERTICAL; setPadding(ui.dp(19), ui.dp(13), ui.dp(16), ui.dp(13))
                        setTextColor(if (row.region.code == selected) ui.blue else Color.BLACK)
                        background = GradientDrawable().apply {
                            setColor(Color.WHITE); val radius = ui.dp(8).toFloat()
                            cornerRadii = floatArrayOf(if (row.first) radius else 0f, if (row.first) radius else 0f, if (row.first) radius else 0f, if (row.first) radius else 0f,
                                if (row.last) radius else 0f, if (row.last) radius else 0f, if (row.last) radius else 0f, if (row.last) radius else 0f)
                        }
                    }
                }
            }
        }
        list.adapter = adapter
        fun filter() {
            val query = search.text.toString().trim()
            val matching = regions.filter { it.code.contains(query, true) || it.name.contains(query, true) || it.english.contains(query, true) }
            rows = if (query.isNotEmpty()) matching.mapIndexed { i, region -> Row.Country(region, i == 0, i == matching.lastIndex) }
            else buildList { for ((letter, group) in matching.groupBy { it.section }) { add(Row.Header(letter)); group.forEachIndexed { i, region -> add(Row.Country(region, i == 0, i == group.lastIndex)) } } }
            adapter.notifyDataSetChanged(); empty.visibility = if (rows.isEmpty()) View.VISIBLE else View.GONE
            index.visibility = if (query.isEmpty()) View.VISIBLE else View.GONE; clear.visibility = if (query.isEmpty()) View.GONE else View.VISIBLE
        }
        for (letter in 'A'..'Z') alphabet.addView(ui.text(letter.toString(), 10f).apply {
            gravity = Gravity.CENTER; minHeight = ui.dp(24); setTextColor(Color.GRAY); isClickable = true; isFocusable = true; contentDescription = "$letter 分组"
            setOnClickListener { val position = rows.indexOfFirst { it is Row.Header && it.letter == letter }; if (position >= 0) list.setSelection(position) }
        })
        AuthFlowLayout.watch(search) { filter() }
        search.setOnFocusChangeListener { _, focused -> cancel.visibility = if (focused) View.VISIBLE else View.GONE; banner.visibility = if (focused) View.GONE else View.VISIBLE }
        list.setOnItemClickListener { _, _, position, _ ->
            val row = rows.getOrNull(position) as? Row.Country ?: return@setOnItemClickListener
            setResult(RESULT_OK, Intent().putExtra("regionCode", row.region.code)); finish()
        }
        search.setText(savedInstanceState?.getString("regionQuery").orEmpty()); filter()
    }
}
