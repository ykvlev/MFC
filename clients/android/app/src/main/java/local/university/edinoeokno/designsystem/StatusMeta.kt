package local.university.edinoeokno.designsystem

import androidx.compose.ui.graphics.Color

data class StatusMeta(val label: String, val background: Color, val foreground: Color)

/** Карта статусов заявки — из прототипа (design/prototype.dc.html, объект ST). */
fun statusMeta(status: String): StatusMeta = when (status) {
    "DRAFT" -> StatusMeta("черновик", Brand.Grey, Brand.Black)
    "SUBMITTED" -> StatusMeta("принята", Brand.BlueTint, Brand.Blue)
    "IN_REVIEW" -> StatusMeta("на согласовании", Brand.BlueTint, Brand.Blue)
    "NEEDS_FIX" -> StatusMeta("на доработке", Brand.WarnBg, Brand.WarnFg)
    "AWAITING_SIGNATURE" -> StatusMeta("нужна подпись", Brand.BlueTint, Brand.Blue)
    "APPROVED" -> StatusMeta("согласовано", Brand.BlueTint, Brand.Blue)
    "READY" -> StatusMeta("готово к выдаче", Brand.Blue, Brand.White)
    "ISSUED" -> StatusMeta("выдано", Brand.Black, Brand.White)
    "REJECTED" -> StatusMeta("отклонено", Brand.Alert, Brand.White)
    "CANCELLED" -> StatusMeta("отменено", Brand.Grey, Brand.TextMuted)
    else -> StatusMeta(status.lowercase(), Brand.Grey, Brand.Black)
}

data class StageColors(val dot: Color, val fill: Color, val line: Color)

fun stageColors(status: String): StageColors = when (status) {
    "APPROVED" -> StageColors(Brand.Blue, Brand.Blue, Brand.Blue)
    "ACTIVE" -> StageColors(Brand.Blue, Brand.White, Brand.Grey)
    "RETURNED", "REJECTED" -> StageColors(Brand.Alert, Brand.Alert, Brand.Grey)
    else -> StageColors(Brand.Line, Brand.White, Brand.Grey)
}
