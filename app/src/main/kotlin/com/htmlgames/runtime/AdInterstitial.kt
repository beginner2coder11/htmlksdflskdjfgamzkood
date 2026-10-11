package com.htmlgames.runtime

import android.app.Activity
import android.util.Log
import com.google.android.gms.ads.AdError
import com.google.android.gms.ads.AdRequest
import com.google.android.gms.ads.FullScreenContentCallback
import com.google.android.gms.ads.LoadAdError
import com.google.android.gms.ads.interstitial.InterstitialAd
import com.google.android.gms.ads.interstitial.InterstitialAdLoadCallback

/**
 * The full-screen ad the game asks for between levels / rounds. The game decides
 * WHEN (its config.js has the frequency); this only keeps one loaded and shows it.
 * [show] always ends in exactly one call to `done`, shown or not, so the game never
 * waits on an ad that isn't coming.
 */
class AdInterstitial(private val activity: Activity, private val unitId: String) {
    private var ad: InterstitialAd? = null
    private var loading = false
    /** Called once after the next load finishes (loaded or failed). */
    var onSettled: (() -> Unit)? = null
    private fun settled() { onSettled?.invoke(); onSettled = null }

    fun preload() {
        if (unitId.isBlank() || ad != null || loading) return
        if (!AdsConsent.canRequestAds) return AdsConsent.whenReady(activity) { preload() }
        loading = true
        runCatching {
            InterstitialAd.load(activity, unitId, AdRequest.Builder().build(), object : InterstitialAdLoadCallback() {
                override fun onAdLoaded(a: InterstitialAd) { loading = false; ad = a; settled() }
                override fun onAdFailedToLoad(e: LoadAdError) { loading = false; ad = null; settled(); Log.d(TAG, "not loaded: ${e.code} ${e.message}") }
            })
        }.onFailure { loading = false; settled(); Log.w(TAG, "request failed", it) }
    }

    fun show(done: () -> Unit) {
        val a = ad ?: return run { preload(); done() }
        ad = null
        a.fullScreenContentCallback = object : FullScreenContentCallback() {
            override fun onAdDismissedFullScreenContent() { done(); preload() }
            override fun onAdFailedToShowFullScreenContent(e: AdError) { done(); preload() }
        }
        runCatching { a.show(activity) }.onFailure { done(); preload() }
    }

    private companion object { const val TAG = "AdInterstitial" }
}
