package local.university.edinoeokno.feature.catalog

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
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
import local.university.edinoeokno.model.ApplicationType
import local.university.edinoeokno.model.parseFieldsSchema
import local.university.edinoeokno.network.userMessage
import javax.inject.Inject

@HiltViewModel
class NewApplicationViewModel @Inject constructor(
    private val repo: OknoRepository,
) : ViewModel() {

    private val _type = MutableStateFlow<UiState<ApplicationType>>(UiState.Loading)
    val type: StateFlow<UiState<ApplicationType>> = _type

    private val _busy = MutableStateFlow(false)
    val busy: StateFlow<Boolean> = _busy

    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error

    fun load(typeId: String) {
        viewModelScope.launch {
            _type.value = UiState.Loading
            runCatching { repo.type(typeId) }
                .onSuccess { _type.value = UiState.Data(it) }
                .onFailure { _type.value = UiState.Error(it.userMessage()) }
        }
    }

    fun submit(typeId: String, state: DynamicFormState, onDone: (String) -> Unit) {
        if (!state.validate()) return
        viewModelScope.launch {
            _busy.value = true
            _error.value = null
            runCatching { repo.createAndSubmit(typeId, state.toJson()) }
                .onSuccess { onDone(it.id) }
                .onFailure { _error.value = it.userMessage() }
            _busy.value = false
        }
    }

    fun clearError() { _error.value = null }
}

/**
 * Подача заявки: форма собирается по `fields_schema` типа, ничего не
 * захардкожено. Новый тип, заведённый админом, появляется здесь сам.
 */
@Composable
fun NewApplicationScreen(
    typeId: String,
    viewModel: NewApplicationViewModel = hiltViewModel(),
    onBack: () -> Unit,
    onSubmitted: (String) -> Unit,
) {
    val typeState by viewModel.type.collectAsState()
    val busy by viewModel.busy.collectAsState()
    val error by viewModel.error.collectAsState()

    LaunchedEffect(typeId) { viewModel.load(typeId) }

    Column(Modifier.fillMaxSize().background(Brand.White)) {
        Row(
            Modifier.fillMaxWidth().padding(start = 20.dp, end = 20.dp, top = 12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            TextButton(onClick = onBack) { Text("← Каталог", color = Brand.Blue) }
        }

        Box(Modifier.weight(1f).padding(horizontal = 20.dp)) {
            when (val s = typeState) {
                is UiState.Loading -> SkeletonList(4)
                is UiState.Error -> ErrorBox(s.message) { viewModel.load(typeId) }
                is UiState.Data -> {
                    val type = s.value
                    val schema = remember(type.id) { parseFieldsSchema(type.fieldsSchema) }
                    val formState = rememberDynamicFormState(schema)

                    Column(
                        Modifier.verticalScroll(rememberScrollState()),
                        verticalArrangement = Arrangement.spacedBy(20.dp),
                    ) {
                        Column {
                            SectionLabel("подача заявки")
                            Text(type.name, style = MaterialTheme.typography.headlineLarge)
                            type.description?.let {
                                Spacer(Modifier.height(6.dp))
                                Text(
                                    it,
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = Brand.TextMuted,
                                )
                            }
                        }

                        BrandCard(background = Brand.SurfaceMuted, border = Brand.SurfaceMuted) {
                            Text(
                                "Форма собрана по схеме полей типа. Проверка обязательных полей " +
                                    "одинаковая на телефоне и на сервере.",
                                style = MaterialTheme.typography.bodySmall,
                                color = Brand.TextMuted,
                            )
                        }

                        DynamicForm(state = formState)

                        // Маршрут согласования — чтобы студент видел, куда пойдёт заявка.
                        if (type.routeSteps.isNotEmpty()) {
                            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                                SectionLabel("маршрут согласования")
                                type.routeSteps.sortedBy { it.orderNum }.forEach { step ->
                                    Row(
                                        Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.spacedBy(10.dp),
                                    ) {
                                        Text(
                                            "${step.orderNum}",
                                            style = MaterialTheme.typography.bodyMedium,
                                            color = Brand.Blue,
                                            modifier = Modifier.widthIn(min = 18.dp),
                                        )
                                        Text(
                                            step.name,
                                            style = MaterialTheme.typography.bodyMedium,
                                            modifier = Modifier.weight(1f),
                                        )
                                        Text(
                                            if (step.isAuto) "авто" else "${step.slaDays ?: "—"} дн.",
                                            style = MaterialTheme.typography.bodySmall,
                                            color = Brand.TextMuted,
                                        )
                                    }
                                }
                            }
                        }

                        val pendingFiles = formState.pendingFileFields()
                        if (pendingFiles.isNotEmpty()) {
                            BrandCard(background = Brand.WarnBg, border = Brand.WarnBg) {
                                Text(
                                    "Загрузка файлов появится в следующей версии. " +
                                        "Обязательные вложения: " +
                                        pendingFiles.joinToString(", ") { it.label.lowercase() } +
                                        ". Пока подайте такую заявку с компьютера.",
                                    style = MaterialTheme.typography.bodySmall,
                                )
                            }
                        }

                        error?.let {
                            BrandCard(border = Brand.Alert, shape = RoundedCornerShape(Radius.Card.dp)) {
                                Text(it, style = MaterialTheme.typography.bodyMedium)
                                Spacer(Modifier.height(10.dp))
                                BrandButton(
                                    "Понятно",
                                    viewModel::clearError,
                                    variant = ButtonVariant.Secondary,
                                )
                            }
                        }

                        BrandButton(
                            text = "Подать заявку",
                            onClick = { viewModel.submit(typeId, formState, onSubmitted) },
                            enabled = pendingFiles.isEmpty(),
                            loading = busy,
                        )
                        Spacer(Modifier.height(16.dp))
                    }
                }
            }
        }
    }
}
