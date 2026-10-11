package com.htmlgames.runtime

import android.annotation.SuppressLint
import android.content.Intent
import android.graphics.Color
import android.net.Uri
import android.os.Bundle
import android.view.View
import android.view.WindowManager
import android.webkit.JavascriptInterface
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.FrameLayout
import android.widget.LinearLayout
import androidx.activity.OnBackPressedCallback
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import androidx.webkit.WebViewAssetLoader
import org.json.JSONObject

/**
 * The whole app: one full-screen WebView running the bundled game from
 * assets/web/ over https://appassets.androidplatform.net (so storage, fetch and
 * audio behave exactly like on the web), plus AdMob behind window.GameAdsBridge.
 */
class MainActivity : AppCompatActivity() {

    private lateinit var web: WebView
    private lateinit var loader: WebViewAssetLoader
    private var banner: AdBanner? = null
    private var spinner: View? = null

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        immersive()
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)

        val settings = runCatching { JSONObject(assets.open("app_settings.json").bufferedReader().readText()) }.getOrElse { JSONObject() }
        val ads = settings.optJSONObject("ads") ?: JSONObject()

        loader = WebViewAssetLoader.Builder()
            .addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(this))
            .build()

        web = WebView(this).apply {
            setBackgroundColor(Color.TRANSPARENT)
            // hidden until the game has painted its first settled frame (see tryReveal);
            // until then the launch screen (splash color + icon) stays up
            alpha = 0f
            if (android.os.Build.VERSION.SDK_INT >= 26) setRendererPriorityPolicy(WebView.RENDERER_PRIORITY_IMPORTANT, false)
            overScrollMode = View.OVER_SCROLL_NEVER
            isVerticalScrollBarEnabled = false
            isHorizontalScrollBarEnabled = false
            with(this.settings) {
                javaScriptEnabled = true
                domStorageEnabled = true
                mediaPlaybackRequiresUserGesture = false
                textZoom = 100                       // the phone's font size must not break the game layout
                allowFileAccess = false
                allowContentAccess = false
                offscreenPreRaster = true
            }
            webViewClient = object : WebViewClient() {
                override fun shouldInterceptRequest(view: WebView, request: WebResourceRequest): WebResourceResponse? =
                    loader.shouldInterceptRequest(request.url)

                // links out of the game (privacy policy, more games…) open in the browser
                override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                    if (request.url.host == ORIGIN_HOST) return false
                    runCatching { startActivity(Intent(Intent.ACTION_VIEW, request.url)) }
                    return true
                }

                override fun onPageFinished(view: WebView, url: String) {
                    // reveal once web fonts are in and two frames have been drawn, so the
                    // player never sees the page assembling itself (font swap, layout pops)
                    view.evaluateJavascript(
                        "(document.fonts?document.fonts.ready:Promise.resolve()).then(function(){requestAnimationFrame(function(){requestAnimationFrame(function(){GameShell.ready()})})})", null)
                    view.postDelayed({ pageReady = true; tryReveal() }, 2500)   // safety net
                }
            }
        }
        web.addJavascriptInterface(object {
            @JavascriptInterface fun ready() = runOnUiThread { pageReady = true; tryReveal() }
            @JavascriptInterface fun smooth() = runOnUiThread { smooth = true; tryReveal() }
        }, "GameShell")

        // game on top; the banner slot (if any) has its final height from the first frame,
        // so the game is never resized when the ad arrives
        val adsOn = ads.optBoolean("enabled", false)
        val bannerUnit = if (adsOn) ads.optString("banner") else ""
        val slot = FrameLayout(this).apply { setBackgroundColor(Color.BLACK) }
        val slotHeight = if (bannerUnit.isNotBlank()) AdBanner.sizeFor(this).getHeightInPixels(this) else 0
        val column = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setBackgroundColor(Color.TRANSPARENT)
            addView(web, LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, 0, 1f))
            addView(slot, LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, slotHeight))
        }
        // small spinner under the launch icon while the game and ads load
        val dp = resources.displayMetrics.density
        spinner = android.widget.ProgressBar(this).apply {
            indeterminateTintList = android.content.res.ColorStateList.valueOf(Color.WHITE)
            alpha = 0.8f
        }
        setContentView(FrameLayout(this).apply {
            addView(column, FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT))
            addView(spinner, FrameLayout.LayoutParams((32 * dp).toInt(), (32 * dp).toInt(), android.view.Gravity.CENTER).apply { topMargin = (110 * dp).toInt() })
        })

        if (adsOn) {
            val inter = ads.optString("interstitial").takeIf { it.isNotBlank() }?.let { AdInterstitial(this, it) }
            val reward = ads.optString("rewarded").takeIf { it.isNotBlank() }?.let { AdRewarded(this, it) }
            web.addJavascriptInterface(GameAdsBridge(this, web, inter, reward), "GameAdsBridge")
            // Loading ads is heavy: every ad is web content, and all WebViews of an app
            // share ONE renderer process, so while ads load the game's own frames stall
            // (measured on a Galaxy A05: 60 fps → 9 fps for ~4 s). So the ads load while the
            // launch screen is still up, and the game appears once they have settled
            // (or after ADS_WARMUP_MAX_MS at most) — the player never sees the stall.
            val b = bannerUnit.takeIf { it.isNotBlank() }?.let { AdBanner(this, it) }
            banner = b
            val loaders = listOfNotNull<Any>(b, inter, reward)
            adsPending = loaders.size
            val one = { runOnUiThread { adsPending--; tryReveal() } }
            b?.onSettled = one; inter?.onSettled = one; reward?.onSettled = one
            b?.attach(slot)
            AdsConsent.whenReady(this) { inter?.preload(); reward?.preload() }
            web.postDelayed({ adsPending = 0; tryReveal() }, ADS_WARMUP_MAX_MS)
        }

        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                // a game can take over Back by defining window.onAndroidBack() → true
                web.evaluateJavascript("(function(){try{return !!(window.onAndroidBack&&window.onAndroidBack())}catch(e){return false}})()") { handled ->
                    if (handled != "true") confirmExit()
                }
            }
        })

        if (savedInstanceState != null) web.restoreState(savedInstanceState)
        else web.loadUrl("https://$ORIGIN_HOST/assets/web/index.html")
    }

    private var revealed = false
    private val createdAt = android.os.SystemClock.uptimeMillis()
    private var pageReady = false
    private var adsPending = 0

    private var smooth = false
    private var smoothCheck = false

    /**
     * The game appears once its page has painted, the ads have finished loading AND the
     * game has been drawing smoothly again for a moment (ad loading keeps the shared
     * renderer busy for a while after the "loaded" callbacks).
     */
    private fun tryReveal() {
        if (revealed || isFinishing || !pageReady || adsPending > 0) return
        if (!smooth) {
            if (!smoothCheck) {
                smoothCheck = true
                web.evaluateJavascript(SMOOTH_JS, null)
                web.postDelayed({ smooth = true; tryReveal() }, SMOOTH_MAX_MS)
            }
            return
        }
        revealed = true
        android.util.Log.d("GameApk", "game shown ${android.os.SystemClock.uptimeMillis() - createdAt} ms after launch")
        spinner?.let { (it.parent as? android.view.ViewGroup)?.removeView(it) }
        web.animate().alpha(1f).setDuration(220).withEndAction {
            window.setBackgroundDrawableResource(android.R.color.black)
        }.start()
    }

    private fun confirmExit() {
        AlertDialog.Builder(this)
            .setTitle(R.string.exit_title)
            .setPositiveButton(R.string.exit_yes) { _, _ -> finish() }
            .setNegativeButton(R.string.exit_no, null)
            .show()
    }

    private fun immersive() {
        WindowCompat.setDecorFitsSystemWindows(window, false)
        WindowInsetsControllerCompat(window, window.decorView).apply {
            hide(WindowInsetsCompat.Type.systemBars())
            systemBarsBehavior = WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
        }
    }

    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)
        if (hasFocus) immersive()
    }

    // pause the game's timers/audio with the app (the page also gets visibilitychange)
    override fun onPause() { web.onPause(); banner?.pause(); super.onPause() }
    override fun onResume() { super.onResume(); web.onResume(); banner?.resume() }
    override fun onSaveInstanceState(outState: Bundle) { super.onSaveInstanceState(outState); web.saveState(outState) }
    override fun onDestroy() { banner?.destroy(); web.destroy(); super.onDestroy() }

    private companion object {
        const val ORIGIN_HOST = "appassets.androidplatform.net"
        const val ADS_WARMUP_MAX_MS = 3500L
        const val SMOOTH_MAX_MS = 1500L
        /** Calls GameShell.smooth() after 30 frames in a row under 25 ms (~0.5 s at 60 fps). */
        const val SMOOTH_JS = "(function(){var ok=0,l=0;function f(t){if(l&&t-l<25)ok++;else ok=0;l=t;if(ok>=30)GameShell.smooth();else requestAnimationFrame(f)}requestAnimationFrame(f)})()"
    }
}
