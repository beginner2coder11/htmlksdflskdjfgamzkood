import groovy.json.JsonSlurper

plugins {
    // AGP 9 has built-in Kotlin support.
    alias(libs.plugins.android.application)
}

// Everything per-app comes from assets/app_settings.json, written by the builder's CI
// step (see .github/workflows/build.yml). Missing values fall back to safe defaults.
val appSettings: Map<*, *> = file("src/main/assets/app_settings.json").let { f ->
    if (f.exists()) JsonSlurper().parse(f) as Map<*, *> else emptyMap<String, Any?>()
}
val cfgPackage = (appSettings["package"] as? String)?.takeIf { it.isNotBlank() } ?: "com.htmlgames.demo"
val cfgVersionName = (appSettings["versionName"] as? String)?.takeIf { it.isNotBlank() } ?: "1.0.0"
val cfgVersionCode = (appSettings["versionCode"] as? Number)?.toInt() ?: 1
val cfgAppName = (appSettings["appName"] as? String)?.takeIf { it.isNotBlank() } ?: "My Game"
val cfgSplash = (appSettings["splashColor"] as? String)?.takeIf { Regex("^#[0-9a-fA-F]{6}$").matches(it) } ?: "#1b1446"

// The AdMob app id must be manifest meta-data, so it is injected at build time. It is
// always well-formed (Google's public sample id as fallback): a malformed value makes
// the Ads SDK crash the app on start.
val ads = (appSettings["ads"] as? Map<*, *>).orEmpty()
val cfgAdmobAppId = (ads["appId"] as? String)?.trim()
    ?.takeIf { Regex("""^ca-app-pub-\d{16}~\d{10}$""").matches(it) }
    ?: "ca-app-pub-3940256099942544~3347511713"

android {
    namespace = "com.htmlgames.runtime"
    compileSdk = 36

    defaultConfig {
        applicationId = cfgPackage
        minSdk = 23            // play-services-ads 25.x needs 23+
        targetSdk = 36
        versionCode = cfgVersionCode
        versionName = cfgVersionName
        manifestPlaceholders["appLabel"] = cfgAppName
        manifestPlaceholders["admobAppId"] = cfgAdmobAppId
        resValue("color", "splash_bg", cfgSplash)
    }

    // CI passes the signing key through SIGN_* env vars (a GitHub secret, never in
    // the repo). Local builds without them are signed with the debug key.
    signingConfigs {
        create("release") {
            val store = System.getenv("SIGN_STORE_FILE")
            if (!store.isNullOrBlank() && file(store).exists()) {
                storeFile = file(store)
                storePassword = System.getenv("SIGN_STORE_PASSWORD")
                keyAlias = System.getenv("SIGN_KEY_ALIAS")
                keyPassword = System.getenv("SIGN_KEY_PASSWORD")
            } else {
                val debug = signingConfigs.getByName("debug")
                storeFile = debug.storeFile; storePassword = debug.storePassword
                keyAlias = debug.keyAlias; keyPassword = debug.keyPassword
            }
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            signingConfig = signingConfigs.getByName("release")
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
        }
    }

    buildFeatures { resValues = true }

    // The game's own files are already compressed images/audio; keep them stored
    // so the WebView can stream them straight out of the APK.
    androidResources { noCompress += listOf("png", "webp", "jpg", "mp3", "ogg", "m4a", "woff2") }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}

kotlin {
    compilerOptions { jvmTarget = org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17 }
}

dependencies {
    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.appcompat)
    implementation(libs.androidx.webkit)
    implementation(libs.admob)
    implementation(libs.ump)
}
