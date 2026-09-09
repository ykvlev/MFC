package local.university.edinoeokno.feature.slots

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
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
import local.university.edinoeokno.model.SlotAvailability
import local.university.edinoeokno.model.SlotWindow
import local.university.edinoeokno.network.userMessage
import javax.inject.Inject

@HiltViewModel
class SlotsViewModel @Inject constructor(private val repo: OknoRepository) : ViewModel() {
    private val _windows = MutableStateFlow<UiState<List<SlotWindow>>>(UiState.Loading)
    val windows: StateFlow<UiState<List<SlotWindow>>> = _windows

    private val _slots = MutableStateFlow<List<SlotAvailability>>(emptyList())
    val slots: StateFlow<List<SlotAvailability>> = _slots

    private val _message = MutableStateFlow<String?>(null)
    val message: StateFlow<String?> = _message

    fun load() {
        viewModelScope.launch {
            _windows.value = UiState.Loading
            runCatching { repo.slotWindows() }
                .onSuccess { _windows.value = UiState.Data(it) }
                .onFailure { _windows.value = UiState.Error(it.userMessage()) }
        }
    }

    fun openWindow(windowId: String) {
        viewModelScope.launch {
            runCatching { repo.slots(windowId) }
                .onSuccess { _slots.value = it.slots }
                .onFailure { _message.value = it.userMessage() }
        }
    }

    fun book(windowId: String, slotStart: String) {
        viewModelScope.launch {
            runCatching { repo.bookSlot(windowId, slotStart) }
                .onSuccess {
                    _message.value = "Вы записаны на $slotStart"
                    openWindow(windowId)
                }
                .onFailure { _message.value = it.userMessage() }
        }
    }

    fun clearMessage() { _message.value = null }
    fun closeWindow() { _slots.value = emptyList() }
}

/** Запись на приём: приёмные окна и свободные слоты. */
@Composable
fun SlotsScreen(viewModel: SlotsViewModel = hiltViewModel()) {
    val windows by viewModel.windows.collectAsState()
    val slots by viewModel.slots.collectAsState()
    val message by viewModel.message.collectAsState()
    var openedId by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(Unit) { viewModel.load() }

    Column(Modifier.fillMaxSize().background(Brand.White)) {
        ScreenHeader(kicker = "запись на приём", title = "Приёмные окна")

        Box(Modifier.weight(1f).padding(horizontal = 20.dp)) {
            when (val s = windows) {
                is UiState.Loading -> SkeletonList()
                is UiState.Error -> ErrorBox(s.message) { viewModel.load() }
                is UiState.Data -> LazyColumn(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    message?.let { text ->
                        item {
                            BrandCard(background = Brand.BlueTint, border = Brand.BlueTint) {
                                Text(text, style = MaterialTheme.typography.bodyMedium)
                                Spacer(Modifier.height(10.dp))
                                BrandButton(
                                    "Понятно",
                                    viewModel::clearMessage,
                                    variant = ButtonVariant.Secondary,
                                )
                            }
                        }
                    }

                    if (s.value.isEmpty()) {
                        item {
                            EmptyState(
                                "Приёмных окон нет",
                                "Как только деканат или преподаватель откроет запись, окна появятся здесь.",
                            )
                        }
                    }

                    items(s.value, key = { it.id }) { window ->
                        BrandCard(
                            onClick = {
                                if (openedId == window.id) {
                                    openedId = null
                                    viewModel.closeWindow()
                                } else {
                                    openedId = window.id
                                    viewModel.openWindow(window.id)
                                }
                            }
                        ) {
                            Text(window.title, style = MaterialTheme.typography.titleMedium)
                            Spacer(Modifier.height(4.dp))
                            Text(
                                listOfNotNull(
                                    "${window.date} · ${window.startTime}–${window.endTime}",
                                    window.location,
                                    window.ownerName.ifBlank { null },
                                ).joinToString(" · "),
                                style = MaterialTheme.typography.bodySmall,
                                color = Brand.TextMuted,
                            )

                            if (openedId == window.id && slots.isNotEmpty()) {
                                Spacer(Modifier.height(12.dp))
                                SectionLabel("свободные слоты")
                                Spacer(Modifier.height(8.dp))
                                FlowRowSlots(slots) { slot ->
                                    viewModel.book(window.id, slot.slotStart)
                                }
                            }
                        }
                    }
                    item { Spacer(Modifier.height(12.dp)) }
                }
            }
        }
    }
}

@Composable
private fun FlowRowSlots(slots: List<SlotAvailability>, onPick: (SlotAvailability) -> Unit) {
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        slots.chunked(4).forEach { row ->
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                row.forEach { slot ->
                    val free = slot.free > 0
                    val shape = RoundedCornerShape(Radius.Pill.dp)
                    Box(
                        Modifier
                            .weight(1f)
                            .background(if (free) Brand.White else Brand.Grey, shape)
                            .border(1.dp, if (free) Brand.Line else Brand.Grey, shape)
                            .clickable(enabled = free) { onPick(slot) }
                            .padding(vertical = 10.dp),
                        contentAlignment = androidx.compose.ui.Alignment.Center,
                    ) {
                        Text(
                            slot.slotStart,
                            style = MaterialTheme.typography.titleSmall,
                            color = if (free) Brand.Black else Brand.TextMuted,
                        )
                    }
                }
                repeat(4 - row.size) { Spacer(Modifier.weight(1f)) }
            }
        }
    }
}
