package local.university.edinoeokno.feature.applications

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import local.university.edinoeokno.data.OknoRepository
import local.university.edinoeokno.data.UiState
import local.university.edinoeokno.designsystem.*
import local.university.edinoeokno.model.Application
import local.university.edinoeokno.network.userMessage
import javax.inject.Inject

@HiltViewModel
class ApplicationsViewModel @Inject constructor(
    private val repo: OknoRepository,
) : ViewModel() {
    private val _state = MutableStateFlow<UiState<List<Application>>>(UiState.Loading)
    val state: StateFlow<UiState<List<Application>>> = _state

    fun load(scope: String) {
        viewModelScope.launch {
            _state.value = UiState.Loading
            runCatching { repo.applications(scope) }
                .onSuccess { _state.value = UiState.Data(it.items) }
                .onFailure { _state.value = UiState.Error(it.userMessage()) }
        }
    }
}

@Composable
fun ApplicationsListScreen(
    scope: String,
    viewModel: ApplicationsViewModel = hiltViewModel(),
    onOpen: (String) -> Unit,
) {
    val state by viewModel.state.collectAsState()
    LaunchedEffect(scope) { viewModel.load(scope) }

    val isQueue = scope == "queue"

    Column(Modifier.fillMaxSize().background(Brand.White)) {
        ScreenHeader(
            kicker = if (isQueue) "очередь согласования" else "мои заявки",
            title = if (isQueue) "На мне" else "Заявки",
        )

        Box(Modifier.weight(1f).padding(horizontal = 20.dp)) {
            when (val s = state) {
                is UiState.Loading -> SkeletonList()
                is UiState.Error -> ErrorBox(s.message) { viewModel.load(scope) }
                is UiState.Data -> if (s.value.isEmpty()) {
                    EmptyState(
                        title = if (isQueue) "Очередь пуста" else "Заявок пока нет",
                        text = if (isQueue)
                            "Новые заявки появятся, как только этап дойдёт до вашего подразделения."
                        else "Выберите тип в каталоге — форма соберётся по схеме полей автоматически.",
                    )
                } else {
                    LazyColumn(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        items(s.value, key = { it.id }) { app ->
                            ApplicationCard(app, isQueue) { onOpen(app.id) }
                        }
                        item { Spacer(Modifier.height(12.dp)) }
                    }
                }
            }
        }
    }
}

@Composable
private fun ApplicationCard(app: Application, isQueue: Boolean, onClick: () -> Unit) {
    val active = app.stages.firstOrNull { it.status == "ACTIVE" }
    BrandCard(onClick = onClick) {
        Row(
            Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(
                "№ ${app.number}",
                style = MaterialTheme.typography.labelSmall,
                color = Brand.TextMuted,
            )
            StatusBadge(app.status)
        }
        Spacer(Modifier.height(8.dp))
        Text(app.type.name, style = MaterialTheme.typography.titleMedium)
        Spacer(Modifier.height(4.dp))
        Text(
            when {
                isQueue -> listOfNotNull(app.user?.fullName, app.user?.groupName, active?.name)
                    .joinToString(" · ")
                app.status == "READY" && app.cell != null ->
                    "Ячейка ${app.cell.code} · код ${app.cell.pickupCode}"
                active != null -> "Ждёт: ${active.name}"
                else -> "Маршрут завершён"
            },
            style = MaterialTheme.typography.bodySmall,
            color = Brand.TextMuted,
        )
        Spacer(Modifier.height(10.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
            app.stages.sortedBy { it.orderNum }.forEach { stage ->
                Box(
                    Modifier
                        .weight(1f)
                        .height(4.dp)
                        .background(
                            when (stage.status) {
                                "APPROVED" -> Brand.Blue
                                "ACTIVE" -> Brand.BlueBright
                                "RETURNED", "REJECTED" -> Brand.Alert
                                else -> Brand.Grey
                            }
                        )
                )
            }
        }
    }
}

@Composable
fun ScreenHeader(kicker: String, title: String, trailing: (@Composable () -> Unit)? = null) {
    Row(
        Modifier
            .fillMaxWidth()
            .padding(start = 20.dp, end = 20.dp, top = 12.dp, bottom = 12.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.Bottom,
    ) {
        Column(Modifier.weight(1f)) {
            SectionLabel(kicker)
            Text(title, style = MaterialTheme.typography.headlineLarge)
        }
        trailing?.invoke()
    }
}
