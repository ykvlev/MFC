package local.university.edinoeokno.designsystem

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import local.university.edinoeokno.R

/**
 * Дизайн-система РСО. Палитра — четыре базовых значения, всё остальное —
 * служебные нейтрали из брендбука. Динамические цвета Material намеренно
 * не используются: бренд задаёт цвет жёстко.
 */
object Brand {
    val Blue = Color(0xFF0804FF)
    val BlueBright = Color(0xFF5552FF)
    val BlueTint = Color(0xFFE1E0FF)
    val BlueDeep = Color(0xFF0040CB)

    val White = Color(0xFFFFFFFF)
    val Grey = Color(0xFFEEEEEE)
    val Black = Color(0xFF000000)

    val SurfaceMuted = Color(0xFFF5F5F5)
    val SurfaceFooter = Color(0xFFF9F9F9)
    val Line = Color(0xFFCCCCCC)
    val Hairline = Color(0xFFA8A8A8)
    val TextMuted = Color(0xFF818C99)
    val TextDim = Color(0xFF99A2AD)
    val Alert = Color(0xFFF23838)
    val WarnBg = Color(0xFFFFE9CC)
    val WarnFg = Color(0xFF8A4B00)
}

/** Радиусы брендбука: карточка 32, чип и поле 20, иконка 16. */
object Radius {
    val Card = 32
    val Pill = 20
    val Icon = 16
}

private val Actay = FontFamily(Font(R.font.actay_wide_bold, FontWeight.Bold))
private val Stolzl = FontFamily(
    Font(R.font.stolzl_regular, FontWeight.Normal),
    Font(R.font.stolzl_medium, FontWeight.Medium),
)
private val StolzlLight = FontFamily(Font(R.font.stolzl_light, FontWeight.Light))
private val Onest = FontFamily(
    Font(R.font.onest_regular, FontWeight.Normal),
    Font(R.font.onest_medium, FontWeight.Medium),
)

/** Четыре роли шрифта из брендбука. */
object BrandType {
    val Title = Actay          // титульный, до 4 слов
    val Heading = Stolzl       // заголовки и подписи
    val Numeric = StolzlLight  // только числа
    val Body = Onest           // основной текст
}

private val BrandColorScheme = lightColorScheme(
    primary = Brand.Blue,
    onPrimary = Brand.White,
    primaryContainer = Brand.BlueTint,
    onPrimaryContainer = Brand.Blue,
    secondary = Brand.Black,
    onSecondary = Brand.White,
    background = Brand.White,
    onBackground = Brand.Black,
    surface = Brand.White,
    onSurface = Brand.Black,
    surfaceVariant = Brand.SurfaceMuted,
    onSurfaceVariant = Brand.TextMuted,
    outline = Brand.Line,
    outlineVariant = Brand.Grey,
    error = Brand.Alert,
    onError = Brand.White,
)

@Composable
fun EdinoeOknoTheme(content: @Composable () -> Unit) {
    // Брендбук — светлый; тёмная тема не предусмотрена.
    MaterialTheme(
        colorScheme = BrandColorScheme,
        typography = brandTypography(),
        content = content,
    )
}
