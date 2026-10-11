package com.htmlgames.runtime

import android.app.Activity
import android.util.Log
import android.view.View
import android.widget.FrameLayout
import com.google.android.gms.ads.AdListener
import com.google.android.gms.ads.AdRequest
import com.google.android.gms.ads.AdSize
import com.google.android.gms.ads.AdView
import com.google.android.gms.ads.LoadAdError

/**
 * Optional anchored adaptive banner under the game. The slot stays collapsed until an
 * ad actually arrives, so no fill costs no screen space; the game (a full-height web
 * page) simply gets the remaining height.
 */
class AdBanner(private val activity: Activity, private val unitId: String) {
    private var view: AdView? = null

    fun attach(slot: FrameLayout) {
        if (unitId.isBlank()) return
        AdsConsent.whenReady(activity) { load(slot) }
    }

    private fun load(slot: FrameLayout) = activity.runOnUiThread {
        if (activity.isFinishing || activity.isDestroyed) return@runOnUiThread
        runCatching {
            val dm = activity.resources.displayMetrics
            val widthDp = ((if (slot.width > 0) slot.width else dm.widthPixels) / dm.density).toInt().coerceAtLeast(320)
            val ad = AdView(activity).apply {
                adUnitId = unitId
                setAdSize(AdSize.getCurrentOrientationAnchoredAdaptiveBannerAdSize(activity, widthDp))
                adListener = object : AdListener() {
                    override fun onAdLoaded() { slot.visibility = View.VISIBLE }
                    override fun onAdFailedToLoad(error: LoadAdError) {
                        slot.visibility = View.GONE
                        Log.d(TAG, "banner not loaded: ${error.code} ${error.message}")
                    }
                }
            }
            view = ad
            slot.removeAllViews()
            slot.addView(ad)
            ad.loadAd(AdRequest.Builder().build())
        }.onFailure { Log.w(TAG, "banner unavailable", it) }
    }

    fun resume() = view?.resume()
    fun pause() = view?.pause()
    fun destroy() { view?.destroy(); view = null }

    private companion object { const val TAG = "AdBanner" }
}
