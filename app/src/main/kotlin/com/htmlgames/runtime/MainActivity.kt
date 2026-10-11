package com.htmlgames.runtime

import android.annotation.SuppressLint
import android.content.Intent
import android.graphics.Color
import android.net.Uri
import android.os.Bundle
import android.view.View
import android.view.WindowManager
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
                    window.setBackgroundDrawableResource(android.R.color.black)
                }
            }
        }
        // game on top, optional banner slot (collapsed until an ad loads) underneath
        val slot = FrameLayout(this).apply { visibility = View.GONE; setBackgroundColor(Color.BLACK) }
        setContentView(LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setBackgroundColor(Color.TRANSPARENT)
            addView(web, LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, 0, 1f))
            addView(slot, LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT))
        })

        if (ads.optBoolean("enabled", false)) {
            val inter = ads.optString("interstitial").takeIf { it.isNotBlank() }?.let { AdInterstitial(this, it) }
            val reward = ads.optString("rewarded").takeIf { it.isNotBlank() }?.let { AdRewarded(this, it) }
            web.addJavascriptInterface(GameAdsBridge(this, web, inter, reward), "GameAdsBridge")
            AdsConsent.whenReady(this) { inter?.preload(); reward?.preload() }
            banner = AdBanner(this, ads.optString("banner")).also { it.attach(slot) }
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

    private companion object { const val ORIGIN_HOST = "appassets.androidplatform.net" }
}
