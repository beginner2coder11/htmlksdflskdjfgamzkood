package com.htmlgames.runtime

import android.app.Activity
import android.util.Log
import android.widget.FrameLayout
import com.google.android.gms.ads.AdListener
import com.google.android.gms.ads.AdRequest
import com.google.android.gms.ads.AdSize
import com.google.android.gms.ads.AdView
import com.google.android.gms.ads.LoadAdError

/**
 * Optional anchored adaptive banner under the game.
 *
 * The slot is sized to the banner from the very first frame (see [sizeFor]) and never
 * changes height: if it appeared or collapsed later, the game page would be resized
 * mid-play, which shows as a jump/stutter. A request that gets no fill is retried.
 */
class AdBanner(private val activity: Activity, private val unitId: String) {
    private var view: AdView? = null
    private var slot: FrameLayout? = null
    /** Called once after the first load finishes (loaded or failed). */
    var onSettled: (() -> Unit)? = null
    private fun settled() { onSettled?.invoke(); onSettled = null }

    fun attach(slot: FrameLayout) {
        if (unitId.isBlank()) return
        this.slot = slot
        AdsConsent.whenReady(activity) { load(slot) }
    }

    private fun load(slot: FrameLayout) = activity.runOnUiThread {
        if (activity.isFinishing || activity.isDestroyed) return@runOnUiThread
        runCatching {
            val ad = AdView(activity).apply {
                adUnitId = unitId
                setAdSize(sizeFor(activity))
                adListener = object : AdListener() {
                    override fun onAdLoaded() { settled() }
                    override fun onAdFailedToLoad(error: LoadAdError) {
                        settled()
                        Log.d(TAG, "banner not loaded: ${error.code} ${error.message}")
                        slot.postDelayed({ if (view === this@apply) loadAd(AdRequest.Builder().build()) }, 30_000)
                    }
                }
            }
            view = ad
            slot.removeAllViews()
            slot.addView(ad)
            ad.loadAd(AdRequest.Builder().build())
        }.onFailure { settled(); Log.w(TAG, "banner unavailable", it) }
    }

    fun resume() = view?.resume()
    fun pause() = view?.pause()
    fun destroy() { view?.destroy(); view = null }

    companion object {
        private const val TAG = "AdBanner"

        /** The adaptive banner size for the full screen width (known before any ad loads). */
        fun sizeFor(activity: Activity): AdSize {
            val dm = activity.resources.displayMetrics
            return AdSize.getCurrentOrientationAnchoredAdaptiveBannerAdSize(activity, (dm.widthPixels / dm.density).toInt())
        }
    }
}
