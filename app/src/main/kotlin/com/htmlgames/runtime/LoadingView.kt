package com.htmlgames.runtime

import android.animation.ValueAnimator
import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapShader
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.LinearGradient
import android.graphics.Matrix
import android.graphics.Paint
import android.graphics.Path
import android.graphics.RadialGradient
import android.graphics.RectF
import android.graphics.Shader
import android.graphics.Typeface
import android.view.View
import android.view.animation.LinearInterpolator
import androidx.core.content.res.ResourcesCompat

import kotlin.math.max
import kotlin.math.min
import kotlin.math.sin
import kotlin.random.Random

/**
 * The game-style loading screen shown while the game boots and the ads load behind it.
 *
 *  - background: the app's splash color as a deep vertical gradient, a soft glow and
 *    floating sparkles in the game's accent color
 *  - the app icon (rounded, white rim) gently bobbing, the app name in Lilita One
 *  - a chunky gradient progress bar (accent → light) with a glossy shine, moving stripes
 *    and a percentage. It follows the REAL loading progress ([target]); the fill eases
 *    toward it, so it never jumps and never runs ahead of what has actually loaded.
 *
 * Drawn entirely on a Canvas: no layouts, no extra libraries, one animator.
 */
class LoadingView(
    context: Context,
    private val appName: String,
    private val icon: Bitmap?,
    bgColor: Int,
    accent: Int,
) : View(context) {

    /** Real progress 0..1, set by MainActivity as each loading stage completes. */
    var target = 0f
        set(v) { field = v.coerceIn(field, 1f) }      // only ever moves forward

    /** While a stage is still running, the bar creeps slowly toward this (never past it),
     *  so it keeps moving instead of looking stuck. */
    var creepTo = 0f
    private var shown = 0f                               // eased fill actually drawn
    private var t = 0f                                   // seconds, drives all motion
    private val dp = resources.displayMetrics.density

    private val top = shade(bgColor, 1.25f)
    private val bottom = shade(bgColor, 0.45f)
    private val accentLight = mix(accent, Color.WHITE, 0.45f)
    private val accentDeep = shade(accent, 0.75f)

    private val bgPaint = Paint()
    private val glowPaint = Paint(Paint.ANTI_ALIAS_FLAG)
    private val sparkPaint = Paint(Paint.ANTI_ALIAS_FLAG)
    private val iconPaint = Paint(Paint.ANTI_ALIAS_FLAG or Paint.FILTER_BITMAP_FLAG)
    private val rimPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = Color.WHITE }
    private val shadowPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = Color.argb(70, 0, 0, 0) }
    private val trackPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = Color.argb(110, 0, 0, 0) }
    private val trackRim = Paint(Paint.ANTI_ALIAS_FLAG).apply { style = Paint.Style.STROKE; color = Color.argb(70, 255, 255, 255) }
    private val fillPaint = Paint(Paint.ANTI_ALIAS_FLAG)
    private val glossPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = Color.argb(80, 255, 255, 255) }
    private val stripePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = Color.argb(45, 255, 255, 255) }
    private val font: Typeface = runCatching { ResourcesCompat.getFont(context, R.font.lilita_one) }.getOrNull() ?: Typeface.DEFAULT_BOLD
    private val titlePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = Color.WHITE; typeface = font; textAlign = Paint.Align.CENTER
        setShadowLayer(6 * dp, 0f, 4 * dp, Color.argb(120, 0, 0, 0))
    }
    private val labelPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = Color.argb(225, 255, 255, 255); typeface = font; textAlign = Paint.Align.CENTER
    }

    private class Spark(var x: Float, var y: Float, val r: Float, val speed: Float, val phase: Float)
    private val sparks = List(26) { Spark(Random.nextFloat(), Random.nextFloat(), 1.5f + Random.nextFloat() * 4f, 0.02f + Random.nextFloat() * 0.05f, Random.nextFloat() * 6f) }

    private val anim = ValueAnimator.ofFloat(0f, 1f).apply {
        duration = 1000; repeatCount = ValueAnimator.INFINITE; interpolator = LinearInterpolator()
        var last = 0L
        addUpdateListener {
            val now = System.nanoTime()
            val dt = if (last == 0L) 0.016f else min(0.05f, (now - last) / 1e9f)
            last = now
            t += dt
            if (creepTo > target) target = min(creepTo, target + dt * 0.035f)
            shown += (target - shown) * min(1f, dt * 4.5f)          // ease toward the real progress
            if (target >= 1f && 1f - shown < 0.004f) shown = 1f
            for (s in sparks) { s.y -= s.speed * dt; if (s.y < -0.05f) { s.y = 1.05f; s.x = Random.nextFloat() } }
            invalidate()
        }
    }

    /** True once the bar has visibly reached 100%. */
    val finished: Boolean get() = shown >= 1f

    override fun onAttachedToWindow() { super.onAttachedToWindow(); anim.start() }
    override fun onDetachedFromWindow() { anim.cancel(); super.onDetachedFromWindow() }

    override fun onSizeChanged(w: Int, h: Int, ow: Int, oh: Int) {
        bgPaint.shader = LinearGradient(0f, 0f, 0f, h.toFloat(), intArrayOf(top, bottom), null, Shader.TileMode.CLAMP)
        glowPaint.shader = RadialGradient(w / 2f, h * 0.40f, w * 0.75f,
            intArrayOf(Color.argb(120, Color.red(accent()), Color.green(accent()), Color.blue(accent())), Color.TRANSPARENT), null, Shader.TileMode.CLAMP)
        titlePaint.textSize = min(34 * dp, w * 0.085f)
        labelPaint.textSize = 15 * dp
    }
    private fun accent() = mix(accentDeep, accentLight, 0.5f)

    override fun onDraw(c: Canvas) {
        val w = width.toFloat(); val h = height.toFloat()
        c.drawRect(0f, 0f, w, h, bgPaint)
        c.drawRect(0f, 0f, w, h, glowPaint)

        // sparkles drifting up
        for (s in sparks) {
            val a = (0.35f + 0.35f * sin(t * 2.2f + s.phase)).coerceIn(0f, 1f)
            sparkPaint.color = mix(accentLight, Color.WHITE, 0.3f).let { Color.argb((a * 255).toInt(), Color.red(it), Color.green(it), Color.blue(it)) }
            c.drawCircle(s.x * w, s.y * h, s.r * dp, sparkPaint)
        }

        // icon: rounded square with a white rim, bobbing
        val size = min(w * 0.34f, 132 * dp)
        val cx = w / 2f
        val cy = h * 0.40f + sin(t * 2.4f) * 6 * dp
        val r = size * 0.24f
        val box = RectF(cx - size / 2, cy - size / 2, cx + size / 2, cy + size / 2)
        c.drawRoundRect(RectF(box.left, box.top + 8 * dp, box.right, box.bottom + 8 * dp), r, r, shadowPaint)
        c.drawRoundRect(RectF(box.left - 5 * dp, box.top - 5 * dp, box.right + 5 * dp, box.bottom + 5 * dp), r + 5 * dp, r + 5 * dp, rimPaint)
        if (icon != null) {
            val sh = BitmapShader(icon, Shader.TileMode.CLAMP, Shader.TileMode.CLAMP)
            sh.setLocalMatrix(Matrix().apply { setScale(size / icon.width, size / icon.height); postTranslate(box.left, box.top) })
            iconPaint.shader = sh
            c.drawRoundRect(box, r, r, iconPaint)
        }

        // app name
        c.drawText(appName, cx, box.bottom + 5 * dp + 52 * dp, titlePaint)

        // progress bar
        val bw = min(w * 0.72f, 320 * dp); val bh = 22 * dp
        val bx = cx - bw / 2; val by = h * 0.72f
        val track = RectF(bx, by, bx + bw, by + bh)
        c.drawRoundRect(track, bh / 2, bh / 2, trackPaint)
        trackRim.strokeWidth = 2 * dp
        c.drawRoundRect(track, bh / 2, bh / 2, trackRim)
        val inset = 4 * dp
        val fw = max(bh - inset * 2, (bw - inset * 2) * shown)
        val fill = RectF(bx + inset, by + inset, bx + inset + fw, by + bh - inset)
        fillPaint.shader = LinearGradient(fill.left, 0f, fill.left + bw, 0f, intArrayOf(accentDeep, accent(), accentLight), null, Shader.TileMode.CLAMP)
        val rr = fill.height() / 2
        c.save()
        val clip = Path().apply { addRoundRect(fill, rr, rr, Path.Direction.CW) }
        c.clipPath(clip)
        c.drawRoundRect(fill, rr, rr, fillPaint)
        // moving diagonal stripes
        val step = 16 * dp
        val off = (t * 40 * dp) % step
        var x = fill.left - fill.height() - step + off
        while (x < fill.right) {
            val p = Path().apply {
                moveTo(x, fill.bottom); lineTo(x + step / 2, fill.bottom)
                lineTo(x + step / 2 + fill.height(), fill.top); lineTo(x + fill.height(), fill.top); close()
            }
            c.drawPath(p, stripePaint)
            x += step
        }
        // glossy highlight on the top half
        c.drawRoundRect(RectF(fill.left + rr * 0.5f, fill.top + 1.5f * dp, fill.right - rr * 0.5f, fill.centerY()), rr / 2, rr / 2, glossPaint)
        c.restore()

        // label
        val pct = (shown * 100).toInt().coerceIn(0, 100)
        c.drawText(if (pct >= 100) "Let's play!" else "Loading…  $pct%", cx, by + bh + 30 * dp, labelPaint)
    }

    private companion object {
        fun shade(c: Int, f: Float) = Color.rgb(
            (Color.red(c) * f).toInt().coerceIn(0, 255), (Color.green(c) * f).toInt().coerceIn(0, 255), (Color.blue(c) * f).toInt().coerceIn(0, 255))
        fun mix(a: Int, b: Int, k: Float) = Color.rgb(
            (Color.red(a) + (Color.red(b) - Color.red(a)) * k).toInt(),
            (Color.green(a) + (Color.green(b) - Color.green(a)) * k).toInt(),
            (Color.blue(a) + (Color.blue(b) - Color.blue(a)) * k).toInt())
    }
}
