package local.university.edinoeokno.feature.registry

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
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
import local.university.edinoeokno.model.AbsenceRow
import local.university.edinoeokno.network.userMessage
import javax.inject.Inject

@HiltViewModel
class RegistryViewModel @Inject constructor(private val repo: OknoRepository) : ViewModel() {
    private val _state = MutableStateFlow<UiState<List<AbsenceRow>>>(UiState.Loading)
    val state: StateFlow<UiState<List<AbsenceRow>>> = _state

    fun load(group: String? = null, q: String? = null) {
        viewModelScope.launch {
            _state.value = UiState.Loading
            runCatching { repo.absences(group, q) }
                .onSuccess { _state.value = UiState.Data(it) }
                .onFailure { _state.value = UiState.Error(it.userMessage()) }
        }
    }
}

/** Реестр освобождённых — только чтение (ТЗ 9.1). */
@Composable
fun RegistryScreen(viewModel: RegistryViewModel = hiltViewModel()) {
    val state by viewModel.state.collectAsState()
    var query by rememberSaveable { mutableStateOf("") }

    LaunchedEffect(query) { viewModel.load(q = query) }

    Column(Modifier.fillMaxSize().background(Brand.White)) {
        ScreenHeader(kicker = "реестр освобождённых", title = "Освобождения")

        OutlinedTextField(
            value = query,
            onValueChange = { query = it },
            label = { Text("Поиск по ФИО") },
            singleLine = true,
            shape = RoundedCornerShape(Radius.Pill.dp),
            modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp),
        )
        Spacer(Modifier.height(12.dp))

        Box(Modifier.weight(1f).padding(horizontal = 20.dp)) {
            when (val s = state) {
                is UiState.Loading -> SkeletonList()
                is UiState.Error -> ErrorBox(s.message) { viewModel.load(q = query) }
                is UiState.Data -> if (s.value.isEmpty()) {
                    EmptyState("Нет записей", "По выбранным фильтрам освобождённых не найдено.")
                } else {
                    LazyColumn(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        items(s.value, key = { it.number }) { row ->
                            BrandCard {
                                Row(
                                    Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                ) {
                                    Text(row.fullName, style = MaterialTheme.typography.titleMedium)
                                    Text(
                                        listOfNotNull(row.groupName, row.course?.let { "$it курс" })
                                            .joinToString(" · "),
                                        style = MaterialTheme.typography.bodySmall,
                                        color = Brand.TextMuted,
                                    )
                                }
                                Spacer(Modifier.height(6.dp))
                                Text(
                                    "${row.periodFrom} — ${row.periodTo}",
                                    style = MaterialTheme.typography.bodyMedium,
                                )
                                Spacer(Modifier.height(4.dp))
                                Text(
                                    "№ ${row.number} · ${row.reason} · ${row.approvedBy}",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = Brand.TextMuted,
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
