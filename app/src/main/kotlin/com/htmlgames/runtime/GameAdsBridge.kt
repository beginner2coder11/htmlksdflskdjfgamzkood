package com.htmlgames.runtime

import android.app.Activity
import android.webkit.JavascriptInterface
import android.webkit.WebView
import android.widget.Toast

/**
 * window.GameAdsBridge — the contract every game's js/ads.js already speaks:
 *
 *   GameAdsBridge.showInterstitial()  → later window.onAdClosed()
 *   GameAdsBridge.showRewarded()      → later window.onRewardedResult(true|false)
 *
 * Only the game bundled in this APK is ever loaded (no remote pages), so exposing
 * the interface to the page carries no third-party risk.
 */
class GameAdsBridge(
    private val activity: Activity,
    private val web: WebView,
    private val interstitial: AdInterstitial?,
    private val rewarded: AdRewarded?,
) {
    private fun js(code: String) = activity.runOnUiThread { runCatching { web.evaluateJavascript(code, null) } }

    @JavascriptInterface
    fun showInterstitial() = activity.runOnUiThread {
        val ad = interstitial ?: return@runOnUiThread js("window.onAdClosed&&window.onAdClosed()")
        ad.show { js("window.onAdClosed&&window.onAdClosed()") }
    }

    @JavascriptInterface
    fun showRewarded() = activity.runOnUiThread {
        val ad = rewarded ?: return@runOnUiThread js("window.onRewardedResult&&window.onRewardedResult(false)")
        var earned = false
        ad.show(
            onReward = { _, _ -> earned = true },
            onClosed = { js("window.onRewardedResult&&window.onRewardedResult($earned)") },
            onUnavailable = {
                Toast.makeText(activity, R.string.no_ad, Toast.LENGTH_SHORT).show()
                js("window.onRewardedResult&&window.onRewardedResult(false)")
            },
        )
    }
}
