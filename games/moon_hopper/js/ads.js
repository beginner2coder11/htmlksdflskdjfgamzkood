/* ==========================================================================
   ADS — one place to wire any ad network.

   The game only ever calls:
     Ads.showInterstitial()  -> Promise<void>     (between games)
     Ads.showRewarded()      -> Promise<boolean>  (true = reward the player)

   Built-in routes, tried in order:
   1. Android WebView bridge (AdMob in a web-to-APK wrapper):
        native exposes  window.GameAdsBridge.showInterstitial()
                        window.GameAdsBridge.showRewarded()
        and calls back  window.onAdClosed()            after an interstitial
                        window.onRewardedResult(true|false) after a rewarded ad
   2. Your own web SDK (CrazyGames, Poki, GameDistribution, AdSense H5):
        fill in webSdk.interstitial / webSdk.rewarded below.
   3. Simulated overlay (GAME_CONFIG.ads.simulate) so you can test the flow.
   ========================================================================== */
window.Ads = (() => {
  const C = window.GAME_CONFIG;
  let pendingInter = null, pendingReward = null;

  // Native bridge callbacks
  window.onAdClosed = () => { if (pendingInter) { pendingInter(); pendingInter = null; } };
  window.onRewardedResult = granted => {
    if (pendingReward) { pendingReward(granted === true || granted === "true"); pendingReward = null; }
  };

  // Example for a web SDK — return a Promise; leave null to skip.
  const webSdk = {
    interstitial: null, // () => new Promise(res => CrazyGames.SDK.ad.requestAd("midgame", { adFinished: res, adError: res }))
    rewarded: null      // () => new Promise(res => CrazyGames.SDK.ad.requestAd("rewarded", { adFinished: () => res(true), adError: () => res(false) }))
  };

  function simulate(rewarded) {
    return new Promise(resolve => {
      const el = document.createElement("div");
      el.className = "ad-sim";
      let n = rewarded ? 3 : 2;
      el.innerHTML = `<div class="ad-sim-card"><div class="ad-sim-tag">AD</div>
        <p>${rewarded ? "Rewarded" : "Interstitial"} ad placeholder</p>
        <b class="ad-sim-count">${n}</b>
        <small>Simulated — connect your ad network in <code>js/ads.js</code></small></div>`;
      document.body.appendChild(el);
      document.body.classList.add("ad-open");
      const t = setInterval(() => {
        n--;
        el.querySelector(".ad-sim-count").textContent = n;
        if (n <= 0) {
          clearInterval(t);
          el.remove();
          document.body.classList.remove("ad-open");
          resolve(true);
        }
      }, 1000);
    });
  }

  const bridge = () => window.GameAdsBridge;

  return {
    showInterstitial() {
      if (!C.ads.enabled) return Promise.resolve();
      const b = bridge();
      if (b && b.showInterstitial) {
        return new Promise(res => {
          pendingInter = res;
          // safety net if the native side never calls back
          setTimeout(() => window.onAdClosed(), 20000);
          b.showInterstitial();
        });
      }
      if (webSdk.interstitial) return webSdk.interstitial().catch(() => {});
      if (C.ads.simulate) return simulate(false).then(() => {});
      return Promise.resolve();
    },

    showRewarded() {
      if (!C.ads.enabled) return Promise.resolve(true);
      const b = bridge();
      if (b && b.showRewarded) {
        return new Promise(res => {
          pendingReward = res;
          setTimeout(() => window.onRewardedResult(false), 60000);
          b.showRewarded();
        });
      }
      if (webSdk.rewarded) return webSdk.rewarded().catch(() => false);
      if (C.ads.simulate) return simulate(true);
      return Promise.resolve(false);
    }
  };
})();
