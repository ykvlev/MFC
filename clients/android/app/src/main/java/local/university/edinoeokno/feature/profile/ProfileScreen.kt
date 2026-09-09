package local.university.edinoeokno.feature.profile

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import local.university.edinoeokno.designsystem.*
import local.university.edinoeokno.feature.applications.ScreenHeader
import local.university.edinoeokno.model.User

@Composable
fun ProfileScreen(user: User, onLogout: () -> Unit) {
    Column(Modifier.fillMaxSize().background(Brand.White)) {
        ScreenHeader(kicker = "профиль", title = "Аккаунт")

        Column(
            Modifier
                .weight(1f)
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 20.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            BrandCard(shape = RoundedCornerShape(Radius.Card.dp)) {
                Text(user.fullName, style = MaterialTheme.typography.headlineMedium)
                Spacer(Modifier.height(6.dp))
                Text(
                    listOfNotNull(
                        user.groupName,
                        user.course?.let { "$it курс" },
                        user.department,
                        if (user.isBudget) "бюджет" else null,
                    ).joinToString(" · "),
                    style = MaterialTheme.typography.bodyMedium,
                    color = Brand.TextMuted,
                )
            }

            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                ProfileRow("Роль", user.role)
                ProfileRow("Email", user.email)
                user.studentCardNo?.let { ProfileRow("Студенческий", it) }
                user.department?.let { ProfileRow("Подразделение", it) }
            }

            BrandButton("Выйти", onLogout, variant = ButtonVariant.Danger)
            Spacer(Modifier.height(12.dp))
        }
    }
}

@Composable
private fun ProfileRow(key: String, value: String) {
    Row(
        Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
    ) {
        Text(key, style = MaterialTheme.typography.bodyMedium, color = Brand.TextMuted)
        Text(value, style = MaterialTheme.typography.bodyMedium)
    }
}
