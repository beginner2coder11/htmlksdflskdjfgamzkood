# Methods called from the game's JavaScript must keep their names.
-keepclassmembers class com.htmlgames.runtime.GameAdsBridge {
    @android.webkit.JavascriptInterface <methods>;
}
-keepattributes JavascriptInterface
