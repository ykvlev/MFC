package local.university.edinoeokno.feature.notifications

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.*
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
import local.university.edinoeokno.feature.applications.ScreenHeader
import local.university.edinoeokno.model.Notification
import local.university.edinoeokno.network.userMessage
import javax.inject.Inject

@HiltViewModel
class NotificationsViewModel @Inject constructor(
    private val repo: OknoRepository,
) : ViewModel() {
    private val _state = MutableStateFlow<UiState<List<Notification>>>(UiState.Loading)
    val state: StateFlow<UiState<List<Notification>>> = _state

    fun load() {
        viewModelScope.launch {
            _state.value = UiState.Loading
            runCatching { repo.notifications() }
                .onSuccess { _state.value = UiState.Data(it) }
                .onFailure { _state.value = UiState.Error(it.userMessage()) }
        }
    }

    fun markAllRead() {
        viewModelScope.launch {
            runCatching { repo.markAllRead() }.onSuccess { load() }
        }
    }
}

@Composable
fun NotificationsScreen(
    viewModel: NotificationsViewModel = hiltViewModel(),
    onOpenApplication: (String) -> Unit,
) {
    val state by viewModel.state.collectAsState()
    LaunchedEffect(Unit) { viewModel.load() }

    Column(Modifier.fillMaxSize().background(Brand.White)) {
        ScreenHeader(kicker = "уведомления", title = "Входящие")

        Box(Modifier.weight(1f).padding(horizontal = 20.dp)) {
            when (val s = state) {
                is UiState.Loading -> SkeletonList()
                is UiState.Error -> ErrorBox(s.message) { viewModel.load() }
                is UiState.Data -> if (s.value.isEmpty()) {
                    EmptyState(
                        "Уведомлений нет",
                        "Они появляются на каждом переходе статуса заявки.",
                    )
                } else {
                    LazyColumn(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        items(s.value, key = { it.id }) { note ->
                            BrandCard(
                                background = if (note.isRead) Brand.White else Brand.SurfaceMuted,
                                onClick = { note.applicationId?.let(onOpenApplication) },
                            ) {
                                Text(note.title, style = MaterialTheme.typography.titleMedium)
                                Spacer(Modifier.height(4.dp))
                                Text(note.body, style = MaterialTheme.typography.bodyMedium)
                            }
                        }
                        if (s.value.any { !it.isRead }) {
                            item {
                                BrandButton(
                                    "Отметить все прочитанными",
                                    viewModel::markAllRead,
                                    variant = ButtonVariant.Secondary,
                                )
                            }
                        }
                        item { Spacer(Modifier.height(12.dp)) }
                    }
                }
            }
        }
    }
}
