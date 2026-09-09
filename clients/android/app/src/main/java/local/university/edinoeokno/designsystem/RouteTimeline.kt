package local.university.edinoeokno.designsystem

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import local.university.edinoeokno.model.Stage

/** Вертикальный степпер маршрута — точки и линия, как в прототипе. */
@Composable
fun RouteTimeline(stages: List<Stage>, modifier: Modifier = Modifier) {
    val sorted = stages.sortedBy { it.orderNum }
    Column(modifier) {
        sorted.forEachIndexed { index, stage ->
            val c = stageColors(stage.status)
            Row(Modifier.height(IntrinsicSize.Min)) {
                Column(
                    Modifier.width(14.dp),
                    horizontalAlignment = androidx.compose.ui.Alignment.CenterHorizontally,
                ) {
                    Box(
                        Modifier
                            .padding(top = 3.dp)
                            .size(14.dp)
                            .background(c.fill, CircleShape)
                            .border(2.dp, c.dot, CircleShape)
                    )
                    if (index < sorted.lastIndex) {
                        Box(
                            Modifier
                                .width(2.dp)
                                .weight(1f)
                                .heightIn(min = 22.dp)
                                .background(c.line)
                        )
                    }
                }
                Spacer(Modifier.width(14.dp))
                Column(Modifier.weight(1f).padding(bottom = 18.dp)) {
                    Text(stage.name, style = MaterialTheme.typography.titleSmall)
                    Text(
                        stageMeta(stage),
                        style = MaterialTheme.typography.bodySmall,
                        color = Brand.TextMuted,
                        modifier = Modifier.padding(top = 2.dp),
                    )
                    stage.comment?.let {
                        Box(
                            Modifier
                                .padding(top = 8.dp)
                                .background(Brand.SurfaceMuted, MaterialTheme.shapes.small)
                                .padding(10.dp)
                        ) {
                            Text(it, style = MaterialTheme.typography.bodySmall)
                        }
                    }
                }
            }
        }
    }
}

private fun stageMeta(s: Stage): String = when (s.status) {
    "APPROVED" -> "Согласовано · ${s.approverDepartment}"
    "ACTIVE" -> "Сейчас здесь · ${s.approverDepartment}"
    "RETURNED" -> "Возвращено · ${s.approverDepartment}"
    "REJECTED" -> "Отклонено · ${s.approverDepartment}"
    else -> "Ожидает · ${s.approverDepartment}"
}
