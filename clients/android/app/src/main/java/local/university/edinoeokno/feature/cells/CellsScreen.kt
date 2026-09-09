package local.university.edinoeokno.feature.cells

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
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
import local.university.edinoeokno.model.Cell
import local.university.edinoeokno.network.userMessage
import javax.inject.Inject

@HiltViewModel
class CellsViewModel @Inject constructor(private val repo: OknoRepository) : ViewModel() {
    private val _state = MutableStateFlow<UiState<List<Cell>>>(UiState.Loading)
    val state: StateFlow<UiState<List<Cell>>> = _state

    fun load() {
        viewModelScope.launch {
            _state.value = UiState.Loading
            runCatching { repo.cells() }
                .onSuccess { _state.value = UiState.Data(it) }
                .onFailure { _state.value = UiState.Error(it.userMessage()) }
        }
    }

    fun issue(cellId: String) {
        viewModelScope.launch {
            runCatching { repo.issueCell(cellId) }.onSuccess { load() }
        }
    }
}

@Composable
fun CellsScreen(viewModel: CellsViewModel = hiltViewModel()) {
    val state by viewModel.state.collectAsState()
    LaunchedEffect(Unit) { viewModel.load() }
    var selected by remember { mutableStateOf<Cell?>(null) }

    Column(Modifier.fillMaxSize().background(Brand.White)) {
        ScreenHeader(kicker = "ячейки выдачи", title = "Ячейки")

        Box(Modifier.weight(1f).padding(horizontal = 20.dp)) {
            when (val s = state) {
                is UiState.Loading -> SkeletonList()
                is UiState.Error -> ErrorBox(s.message) { viewModel.load() }
                is UiState.Data -> Column {
                    val free = s.value.count { it.status == "FREE" }
                    val occupied = s.value.count { it.status == "OCCUPIED" }
                    val service = s.value.count { it.status == "MAINTENANCE" }

                    Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        StatTile("свободно", free, Brand.Blue, Modifier.weight(1f))
                        StatTile("занято", occupied, Brand.Black, Modifier.weight(1f))
                        StatTile("сервис", service, Brand.TextMuted, Modifier.weight(1f))
                    }
                    Spacer(Modifier.height(16.dp))

                    selected?.let { cell ->
                        BrandCard(shape = RoundedCornerShape(Radius.Card.dp)) {
                            Text("Ячейка ${cell.code}", style = MaterialTheme.typography.headlineMedium)
                            Spacer(Modifier.height(6.dp))
                            Text(
                                if (cell.status == "OCCUPIED") "Код получения: ${cell.pickupCode}"
                                else "Ячейка свободна",
                                style = MaterialTheme.typography.bodyMedium,
                                color = Brand.TextMuted,
                            )
                            if (cell.status == "OCCUPIED") {
                                Spacer(Modifier.height(12.dp))
                                BrandButton("Подтвердить выдачу", {
                                    viewModel.issue(cell.id)
                                    selected = null
                                }, variant = ButtonVariant.Dark)
                            }
                            Spacer(Modifier.height(8.dp))
                            BrandButton("Закрыть", { selected = null }, variant = ButtonVariant.Secondary)
                        }
                        Spacer(Modifier.height(16.dp))
                    }

                    LazyVerticalGrid(
                        columns = GridCells.Fixed(4),
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        items(s.value, key = { it.id }) { cell ->
                            CellTile(cell) { selected = cell }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun StatTile(label: String, value: Int, color: Color, modifier: Modifier = Modifier) {
    BrandCard(modifier = modifier) {
        Text("$value", style = NumericStyle, color = color)
        Spacer(Modifier.height(4.dp))
        Text(label, style = MaterialTheme.typography.bodySmall, color = Brand.TextMuted)
    }
}

@Composable
private fun CellTile(cell: Cell, onClick: () -> Unit) {
    val shape = RoundedCornerShape(Radius.Pill.dp)
    val (bg, fg, border) = when (cell.status) {
        "OCCUPIED" -> Triple(Brand.Blue, Brand.White, Brand.Blue)
        "MAINTENANCE" -> Triple(Brand.Grey, Brand.TextMuted, Brand.Grey)
        else -> Triple(Brand.White, Brand.Black, Brand.Line)
    }
    Column(
        Modifier
            .aspectRatio(1f)
            .background(bg, shape)
            .border(1.dp, border, shape)
            .clickable { onClick() }
            .padding(4.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Text(cell.code, style = MaterialTheme.typography.titleSmall, color = fg)
        Text(
            when (cell.status) {
                "FREE" -> "свободна"
                "OCCUPIED" -> cell.pickupCode.orEmpty()
                else -> "сервис"
            },
            style = MaterialTheme.typography.labelSmall,
            color = fg.copy(alpha = 0.8f),
        )
    }
}
