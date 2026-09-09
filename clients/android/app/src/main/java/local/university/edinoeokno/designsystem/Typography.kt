package local.university.edinoeokno.designsystem

import androidx.compose.material3.Typography
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp

/**
 * Типометрия брендбука: трекинг всегда 0, крупный кегль — плотнее интерлиньяж.
 */
fun brandTypography(): Typography {
    val body = TextStyle(
        fontFamily = BrandType.Body,
        fontWeight = FontWeight.Normal,
        fontSize = 15.sp,
        lineHeight = 22.sp,
        letterSpacing = 0.sp,
    )
    return Typography(
        // Титульный — Actay Wide, строчными, до 4 слов
        displayLarge = TextStyle(
            fontFamily = BrandType.Title,
            fontWeight = FontWeight.Bold,
            fontSize = 36.sp,
            lineHeight = 34.sp,
            letterSpacing = 0.sp,
        ),
        // Заголовки — Stolzl Medium
        headlineLarge = TextStyle(
            fontFamily = BrandType.Heading,
            fontWeight = FontWeight.Medium,
            fontSize = 26.sp,
            lineHeight = 29.sp,
            letterSpacing = (-0.2).sp,
        ),
        headlineMedium = TextStyle(
            fontFamily = BrandType.Heading,
            fontWeight = FontWeight.Medium,
            fontSize = 20.sp,
            lineHeight = 24.sp,
            letterSpacing = 0.sp,
        ),
        titleMedium = TextStyle(
            fontFamily = BrandType.Heading,
            fontWeight = FontWeight.Medium,
            fontSize = 17.sp,
            lineHeight = 21.sp,
            letterSpacing = 0.sp,
        ),
        titleSmall = TextStyle(
            fontFamily = BrandType.Heading,
            fontWeight = FontWeight.Medium,
            fontSize = 14.sp,
            lineHeight = 18.sp,
            letterSpacing = 0.sp,
        ),
        bodyLarge = body,
        bodyMedium = body.copy(fontSize = 14.sp, lineHeight = 20.sp),
        bodySmall = body.copy(fontSize = 13.sp, lineHeight = 19.sp),
        // Подстрочник — Stolzl Medium в верхнем регистре с разрядкой
        labelMedium = TextStyle(
            fontFamily = BrandType.Heading,
            fontWeight = FontWeight.Medium,
            fontSize = 11.sp,
            lineHeight = 14.sp,
            letterSpacing = 1.1.sp,
        ),
        labelSmall = TextStyle(
            fontFamily = BrandType.Heading,
            fontWeight = FontWeight.Medium,
            fontSize = 10.sp,
            lineHeight = 13.sp,
            letterSpacing = 0.8.sp,
        ),
    )
}

/** Числовые значения — только Stolzl Light (правило брендбука). */
val NumericStyle = TextStyle(
    fontFamily = BrandType.Numeric,
    fontWeight = FontWeight.Light,
    fontSize = 28.sp,
    lineHeight = 28.sp,
    letterSpacing = 0.sp,
)
