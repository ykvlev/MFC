package local.university.edinoeokno.feature.auth

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import local.university.edinoeokno.designsystem.Brand
import local.university.edinoeokno.designsystem.BrandButton
import local.university.edinoeokno.designsystem.Radius
import local.university.edinoeokno.designsystem.SectionLabel

@Composable
fun LoginScreen(state: AuthUiState, onLogin: (String, String) -> Unit) {
    var email by rememberSaveable { mutableStateOf("") }
    var password by rememberSaveable { mutableStateOf("") }

    Column(
        Modifier
            .fillMaxSize()
            .background(Brand.Blue)
            .safeDrawingPadding()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 28.dp, vertical = 40.dp),
        verticalArrangement = Arrangement.spacedBy(24.dp),
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
            Text(
                "ИНФОРМАЦИОННАЯ СИСТЕМА ВУЗА",
                style = MaterialTheme.typography.labelMedium,
                color = Brand.White.copy(alpha = 0.8f),
            )
            Text(
                "единое окно студента",
                style = MaterialTheme.typography.displayLarge,
                color = Brand.White,
            )
            Text(
                "Заявления без обхода кабинетов. Статус — в кармане.",
                style = MaterialTheme.typography.bodyLarge,
                color = Brand.White.copy(alpha = 0.9f),
            )
        }

        Column(
            Modifier
                .fillMaxWidth()
                .background(Brand.White, RoundedCornerShape(Radius.Card.dp))
                .padding(20.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            SectionLabel("вход")

            OutlinedTextField(
                value = email,
                onValueChange = { email = it },
                label = { Text("Email") },
                singleLine = true,
                shape = RoundedCornerShape(Radius.Pill.dp),
                keyboardOptions = KeyboardOptions(
                    keyboardType = KeyboardType.Email,
                    imeAction = ImeAction.Next,
                ),
                colors = brandFieldColors(),
                modifier = Modifier.fillMaxWidth(),
            )
            OutlinedTextField(
                value = password,
                onValueChange = { password = it },
                label = { Text("Пароль") },
                singleLine = true,
                shape = RoundedCornerShape(Radius.Pill.dp),
                visualTransformation = PasswordVisualTransformation(),
                keyboardOptions = KeyboardOptions(
                    keyboardType = KeyboardType.Password,
                    imeAction = ImeAction.Done,
                ),
                colors = brandFieldColors(),
                modifier = Modifier.fillMaxWidth(),
            )

            state.error?.let {
                Text(it, style = MaterialTheme.typography.bodySmall, color = Brand.Alert)
            }

            BrandButton(
                text = "Войти",
                onClick = { onLogin(email, password) },
                enabled = email.isNotBlank() && password.isNotBlank(),
                loading = state.busy,
            )
        }
    }
}

@Composable
private fun brandFieldColors() = OutlinedTextFieldDefaults.colors(
    focusedBorderColor = Brand.Blue,
    unfocusedBorderColor = Brand.Line,
    focusedLabelColor = Brand.Blue,
    unfocusedLabelColor = Brand.TextMuted,
    cursorColor = Brand.Blue,
)
