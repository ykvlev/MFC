package local.university.edinoeokno.feature.catalog

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import kotlinx.serialization.json.JsonObject
import local.university.edinoeokno.data.OknoRepository
import local.university.edinoeokno.data.UiState
import local.university.edinoeokno.designsystem.*
import local.university.edinoeokno.feature.applications.ScreenHeader
import local.university.edinoeokno.model.ApplicationType
import local.university.edinoeokno.network.userMessage
import javax.inject.Inject

@HiltViewModel
class CatalogViewModel @Inject constructor(
    private val repo: OknoRepository,
) : ViewModel() {
    private val _state = MutableStateFlow<UiState<List<ApplicationType>>>(UiState.Loading)
    val state: StateFlow<UiState<List<ApplicationType>>> = _state

    private val _denied = MutableStateFlow<String?>(null)
    val denied: StateFlow<String?> = _denied

    fun load() {
        viewModelScope.launch {
            _state.value = UiState.Loading
            runCatching { repo.types() }
                .onSuccess { _state.value = UiState.Data(it) }
                .onFailure { _state.value = UiState.Error(it.userMessage()) }
        }
    }

    fun dismissDenied() { _denied.value = null }

    /**
     * Типы без обязательных полей подаются в один тап. Для типов с формой
     * нужен экран динамической формы — он появится следующим шагом.
     */
    fun submitSimple(type: ApplicationType, onCreated: (String) -> Unit) {
        if (!type.available) {
            _denied.value = type.denyMessage ?: "Этот тип заявки вам недоступен"
            return
        }
        viewModelScope.launch {
            runCatching { repo.createAndSubmit(type.id, JsonObject(emptyMap())) }
                .onSuccess { onCreated(it.id) }
                .onFailure { _denied.value = it.userMessage() }
        }
    }
}

@Composable
fun CatalogScreen(viewModel: CatalogViewModel = hiltViewModel(), onOpen: (String) -> Unit) {
    val state by viewModel.state.collectAsState()
    val denied by viewModel.denied.collectAsState()
    LaunchedEffect(Unit) { viewModel.load() }

    Column(Modifier.fillMaxSize().background(Brand.White)) {
        ScreenHeader(kicker = "новая заявка", title = "Каталог")

        Box(Modifier.weight(1f).padding(horizontal = 20.dp)) {
            when (val s = state) {
                is UiState.Loading -> SkeletonList()
                is UiState.Error -> ErrorBox(s.message) { viewModel.load() }
                is UiState.Data -> LazyColumn(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    denied?.let { message ->
                        item {
                            BrandCard(border = Brand.Alert, shape = RoundedCornerShape(Radius.Card.dp)) {
                                Text("Тип заявки недоступен", style = MaterialTheme.typography.headlineMedium)
                                Spacer(Modifier.height(8.dp))
                                Text(message, style = MaterialTheme.typography.bodyMedium)
                                Spacer(Modifier.height(12.dp))
                                BrandButton(
                                    "Понятно",
                                    viewModel::dismissDenied,
                                    variant = ButtonVariant.Secondary,
                                )
                            }
                        }
                    }
                    items(s.value, key = { it.id }) { type ->
                        TypeCard(type) { viewModel.submitSimple(type, onOpen) }
                    }
                    item { Spacer(Modifier.height(12.dp)) }
                }
            }
        }
    }
}

@Composable
private fun TypeCard(type: ApplicationType, onClick: () -> Unit) {
    val enabled = type.available
    BrandCard(onClick = onClick) {
        Row(verticalAlignment = Alignment.Top) {
            Box(
                Modifier
                    .size(40.dp)
                    .background(
                        if (enabled) Brand.BlueTint else Brand.Grey,
                        RoundedCornerShape(Radius.Icon.dp),
                    ),
                contentAlignment = Alignment.Center,
            ) {
                Text(
                    type.name.take(2).uppercase(),
                    style = MaterialTheme.typography.titleSmall,
                    color = if (enabled) Brand.Blue else Brand.TextMuted,
                    textAlign = TextAlign.Center,
                )
            }
            Spacer(Modifier.width(14.dp))
            Column(Modifier.weight(1f)) {
                Text(type.name, style = MaterialTheme.typography.titleMedium)
                type.description?.let {
                    Spacer(Modifier.height(4.dp))
                    Text(it, style = MaterialTheme.typography.bodySmall, color = Brand.TextMuted)
                }
                Spacer(Modifier.height(4.dp))
                Text(
                    when {
                        type.usesCell -> "выдача через ячейку"
                        type.usesBooking -> "бронирование места"
                        type.requiresSignature -> "нужна подпись"
                        else -> "${type.routeSteps.size} этап(а) согласования"
                    }.uppercase(),
                    style = MaterialTheme.typography.labelSmall,
                    color = if (enabled) Brand.Blue else Brand.TextMuted,
                )
            }
        }
    }
}
