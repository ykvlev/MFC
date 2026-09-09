package local.university.edinoeokno.designsystem

import androidx.compose.animation.core.tween
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp

/**
 * Примитивы РСО: карточки контурные, теней нет ни одной,
 * движение — 120–200 мс только по цвету и прозрачности.
 */

private val CardShape = RoundedCornerShape(Radius.Card.dp)
private val PillShape = RoundedCornerShape(Radius.Pill.dp)

@Composable
fun BrandCard(
    modifier: Modifier = Modifier,
    background: Color = Brand.White,
    border: Color = Brand.Line,
    shape: androidx.compose.ui.graphics.Shape = PillShape,
    onClick: (() -> Unit)? = null,
    content: @Composable ColumnScope.() -> Unit,
) {
    Column(
        modifier = modifier
            .fillMaxWidth()
            .background(background, shape)
            .border(BorderStroke(1.dp, border), shape)
            .then(if (onClick != null) Modifier.clickable { onClick() } else Modifier)
            .padding(16.dp),
        content = content,
    )
}

@Composable
fun SectionLabel(text: String, modifier: Modifier = Modifier) {
    Text(
        text.uppercase(),
        modifier = modifier,
        style = MaterialTheme.typography.labelMedium,
        color = Brand.TextMuted,
    )
}

@Composable
fun BrandButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    loading: Boolean = false,
    variant: ButtonVariant = ButtonVariant.Primary,
) {
    val (bg, fg, border) = when (variant) {
        ButtonVariant.Primary -> Triple(Brand.Blue, Brand.White, Brand.Blue)
        ButtonVariant.Secondary -> Triple(Brand.White, Brand.Black, Brand.Line)
        ButtonVariant.Danger -> Triple(Brand.White, Brand.Alert, Brand.Alert)
        ButtonVariant.Dark -> Triple(Brand.Black, Brand.White, Brand.Black)
    }
    val alpha by animateFloatAsStateBrand(if (enabled && !loading) 1f else 0.5f)

    Box(
        modifier = modifier
            .fillMaxWidth()
            .heightIn(min = 56.dp)
            .background(bg.copy(alpha = alpha), PillShape)
            .border(BorderStroke(1.dp, border.copy(alpha = alpha)), PillShape)
            .clickable(enabled = enabled && !loading) { onClick() }
            .padding(horizontal = 20.dp, vertical = 16.dp),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            if (loading) "…" else text,
            style = MaterialTheme.typography.titleMedium,
            color = fg.copy(alpha = alpha),
            textAlign = TextAlign.Center,
        )
    }
}

enum class ButtonVariant { Primary, Secondary, Danger, Dark }

@Composable
private fun animateFloatAsStateBrand(target: Float) =
    androidx.compose.animation.core.animateFloatAsState(
        targetValue = target,
        animationSpec = tween(durationMillis = 160),
        label = "brandAlpha",
    )

@Composable
fun StatusBadge(status: String, modifier: Modifier = Modifier) {
    val meta = statusMeta(status)
    Text(
        meta.label.uppercase(),
        modifier = modifier
            .background(meta.background, PillShape)
            .padding(horizontal = 9.dp, vertical = 5.dp),
        style = MaterialTheme.typography.labelSmall,
        color = meta.foreground,
    )
}

@Composable
fun EmptyState(title: String, text: String? = null, action: (@Composable () -> Unit)? = null) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .border(BorderStroke(1.dp, Brand.Hairline), CardShape)
            .padding(horizontal = 24.dp, vertical = 36.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        Text(title, style = MaterialTheme.typography.headlineMedium, textAlign = TextAlign.Center)
        if (text != null) {
            Text(
                text,
                style = MaterialTheme.typography.bodyMedium,
                color = Brand.TextMuted,
                textAlign = TextAlign.Center,
            )
        }
        action?.invoke()
    }
}

@Composable
fun SkeletonList(rows: Int = 3) {
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        repeat(rows) {
            Column(
                Modifier
                    .fillMaxWidth()
                    .border(BorderStroke(1.dp, Brand.Grey), PillShape)
                    .padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                Box(Modifier.fillMaxWidth(0.38f).height(11.dp).background(Brand.Grey, PillShape))
                Box(Modifier.fillMaxWidth(0.8f).height(19.dp).background(Brand.Grey, PillShape))
                Box(Modifier.fillMaxWidth(0.56f).height(11.dp).background(Brand.SurfaceMuted, PillShape))
            }
        }
    }
}

@Composable
fun ErrorBox(message: String, onRetry: (() -> Unit)? = null) {
    Column(
        Modifier
            .fillMaxWidth()
            .border(BorderStroke(1.dp, Brand.Alert), CardShape)
            .padding(20.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Text("Не удалось загрузить", style = MaterialTheme.typography.headlineMedium)
        Text(message, style = MaterialTheme.typography.bodyMedium, color = Brand.TextMuted)
        if (onRetry != null) {
            BrandButton("Повторить", onRetry, variant = ButtonVariant.Secondary)
        }
    }
}
