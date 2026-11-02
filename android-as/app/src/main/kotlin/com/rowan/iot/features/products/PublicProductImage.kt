package com.rowan.iot.features.products

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Color
import android.util.LruCache
import android.view.Gravity
import android.view.View
import android.widget.FrameLayout
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.TextView
import com.rowan.iot.R
import com.rowan.iot.domain.products.ProductLink
import java.io.ByteArrayOutputStream
import java.io.IOException
import java.util.concurrent.TimeUnit
import kotlinx.coroutines.*
import okhttp3.Authenticator
import okhttp3.Call
import okhttp3.Callback
import okhttp3.CookieJar
import okhttp3.Dispatcher
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.Response
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException

/** Public HTTPS assets only. Deliberately isolated from RN/native authenticated HTTP clients. */
internal object PublicProductImages {
    private const val MAX_BYTES = 2 * 1024 * 1024
    private val cache = object : LruCache<String, Bitmap>(8 * 1024 * 1024) {
        override fun sizeOf(key: String, value: Bitmap): Int = value.byteCount
    }
    private val client = OkHttpClient.Builder()
        .cookieJar(CookieJar.NO_COOKIES).authenticator(Authenticator.NONE).proxyAuthenticator(Authenticator.NONE)
        .cache(null).followRedirects(false).followSslRedirects(false).retryOnConnectionFailure(false)
        .connectTimeout(8, TimeUnit.SECONDS).readTimeout(8, TimeUnit.SECONDS).callTimeout(20, TimeUnit.SECONDS)
        .dispatcher(Dispatcher().apply { maxRequests = 4; maxRequestsPerHost = 2 }).build()

    suspend fun image(source: String, requestedEdge: Int): Bitmap = withContext(Dispatchers.IO) {
        val edge = requestedEdge.coerceIn(128, 1024)
        val key = "$source#$edge"
        cache.get(key)?.let { return@withContext it }
        var uri = ProductLink.uri(source) ?: throw IOException("Invalid public image")
        val bytes = withTimeout(20_000) {
            var result: ByteArray? = null
            for (hop in 0..3) {
                currentCoroutineContext().ensureActive()
                val reply = fetch(uri.toASCIIString())
                if (reply.redirect != null) {
                    if (hop == 3) throw IOException("Image redirect limit")
                    uri = ProductLink.uri(uri.resolve(reply.redirect).toASCIIString()) ?: throw IOException("Invalid image redirect")
                } else { result = reply.bytes; break }
            }
            result ?: throw IOException("Empty image")
        }
        currentCoroutineContext().ensureActive()
        val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
        BitmapFactory.decodeByteArray(bytes, 0, bytes.size, bounds)
        if (bounds.outWidth <= 0 || bounds.outHeight <= 0 || bounds.outWidth.toLong() * bounds.outHeight > 32_000_000L) throw IOException("Image dimensions unsupported")
        var sample = 1
        while (maxOf(bounds.outWidth, bounds.outHeight) / sample > edge) sample *= 2
        val bitmap = BitmapFactory.decodeByteArray(bytes, 0, bytes.size, BitmapFactory.Options().apply { inSampleSize = sample }) ?: throw IOException("Image decode failed")
        currentCoroutineContext().ensureActive()
        cache.put(key, bitmap)
        bitmap
    }
    private data class Reply(val bytes: ByteArray? = null, val redirect: String? = null)
    private suspend fun fetch(url: String): Reply = suspendCancellableCoroutine { continuation ->
        val call = client.newCall(Request.Builder().url(url).get().header("Accept", "image/*").build())
        continuation.invokeOnCancellation { call.cancel() }
        call.enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) { if (continuation.isActive) continuation.resumeWithException(IOException("Public image unavailable")) }
            override fun onResponse(call: Call, response: Response) {
                try {
                    val reply = response.use {
                        if (it.code in listOf(301, 302, 303, 307, 308)) Reply(redirect = it.header("Location") ?: throw IOException("Missing redirect"))
                        else {
                            if (it.code != 200) throw IOException("Image response failed")
                            val body = it.body ?: throw IOException("Empty image")
                            if (body.contentLength() > MAX_BYTES) throw IOException("Image too large")
                            val output = ByteArrayOutputStream()
                            body.byteStream().use { stream ->
                                val buffer = ByteArray(8192)
                                while (true) {
                                    if (call.isCanceled()) throw IOException("Cancelled image")
                                    val count = stream.read(buffer)
                                    if (count < 0) break
                                    if (output.size() + count > MAX_BYTES) throw IOException("Image too large")
                                    output.write(buffer, 0, count)
                                }
                            }
                            Reply(bytes = output.toByteArray())
                        }
                    }
                    if (continuation.isActive) continuation.resume(reply)
                } catch (_: Exception) { if (continuation.isActive) continuation.resumeWithException(IOException("Public image unavailable")) }
            }
        })
    }
}

/** Owns loading/retry presentation; never paints after detach, cancellation or an account change. */
internal class PublicProductImageView(context: Context) : FrameLayout(context) {
    private val picture = ImageView(context).apply { scaleType = ImageView.ScaleType.FIT_CENTER }
    private val progress = ProgressBar(context)
    private val message = TextView(context).apply { textSize = 11f; gravity = Gravity.CENTER; setTextColor(Color.GRAY); text = "图片加载中…" }
    private val retry = TextView(context).apply {
        id = R.id.products_image_retry; text = "重试图片"; textSize = 12f; gravity = Gravity.CENTER
        setTextColor(Color.rgb(24, 109, 175)); setPadding(8, 8, 8, 8); setOnClickListener { start() }
    }
    private var scope: CoroutineScope? = null
    private var current: () -> Boolean = { false }
    private var source: String? = null
    private var edge = 256
    private var job: Job? = null
    private var generation = 0
    private var loaded = false
    init {
        id = R.id.products_image
        addView(picture, LayoutParams(-1, -1))
        val state = LinearLayout(context).apply { orientation = LinearLayout.VERTICAL; gravity = Gravity.CENTER; addView(message); addView(retry) }
        addView(state, LayoutParams(-1, -1)); addView(progress, LayoutParams(28, 28, Gravity.CENTER))
    }
    fun bind(source: String?, scope: CoroutineScope, current: () -> Boolean, edge: Int, description: String) {
        cancelLoad(); this.source = source; this.scope = scope; this.current = current; this.edge = edge
        loaded = false; picture.setImageDrawable(null); picture.contentDescription = description
        start()
    }
    fun cancelLoad() { generation += 1; job?.cancel(); job = null }
    fun resumeLoad() { if (!loaded && job?.isActive != true) start() }
    override fun onDetachedFromWindow() { cancelLoad(); super.onDetachedFromWindow() }
    override fun onAttachedToWindow() { super.onAttachedToWindow(); resumeLoad() }
    private fun start() {
        val owner = scope ?: return
        if (!current() || loaded || job?.isActive == true) return
        val value = source
        if (ProductLink.uri(value) == null) { message.text = "暂无有效图片"; message.visibility = View.VISIBLE; progress.visibility = View.GONE; retry.visibility = View.GONE; return }
        generation += 1; val expected = generation
        message.visibility = View.GONE; retry.visibility = View.GONE; progress.visibility = View.VISIBLE
        job = owner.launch {
            try {
                val bitmap = PublicProductImages.image(requireNotNull(value), edge)
                ensureActive()
                if (generation != expected || !current()) return@launch
                picture.setImageBitmap(bitmap); loaded = true; message.visibility = View.GONE; retry.visibility = View.GONE
            } catch (error: CancellationException) { throw error }
            catch (_: Exception) {
                if (generation == expected && current()) { message.text = "图片加载失败"; message.visibility = View.VISIBLE; retry.visibility = View.VISIBLE }
            } finally { if (generation == expected) { progress.visibility = View.GONE; job = null } }
        }
    }
}

internal fun visitProductImages(view: View, action: (PublicProductImageView) -> Unit) {
    if (view is PublicProductImageView) action(view)
    if (view is android.view.ViewGroup) for (index in 0 until view.childCount) visitProductImages(view.getChildAt(index), action)
}
