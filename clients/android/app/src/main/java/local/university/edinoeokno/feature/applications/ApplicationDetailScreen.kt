package local.university.edinoeokno.feature.applications

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
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
import kotlinx.serialization.json.JsonPrimitive
import local.university.edinoeokno.data.OknoRepository
import local.university.edinoeokno.data.UiState
import local.university.edinoeokno.designsystem.*
import local.university.edinoeokno.model.Application
import local.university.edinoeokno.network.userMessage
import javax.inject.Inject

@HiltViewModel
class ApplicationDetailViewModel @Inject constructor(
    private val repo: OknoRepository,
) : ViewModel() {
    private val _state = MutableStateFlow<UiState<Application>>(UiState.Loading)
    val state: StateFlow<UiState<Application>> = _state

    private val _busy = MutableStateFlow(false)
    val busy: StateFlow<Boolean> = _busy

    fun load(id: String) {
        viewModelScope.launch {
            _state.value = UiState.Loading
            runCatching { repo.application(id) }
                .onSuccess { _state.value = UiState.Data(it) }
                .onFailure { _state.value = UiState.Error(it.userMessage()) }
        }
    }

    private fun act(block: suspend () -> Application) {
        viewModelScope.launch {
            _busy.value = true
            runCatching { block() }
                .onSuccess { _state.value = UiState.Data(it) }
                .onFailure { _state.value = UiState.Error(it.userMessage()) }
            _busy.value = false
        }
    }

    fun approve(id: String, stageId: String) = act { repo.approve(id, stageId, null) }
    fun returnStage(id: String, stageId: String, comment: String) = act { repo.returnStage(id, stageId, comment) }
    fun reject(id: String, stageId: String, comment: String) = act { repo.rejectStage(id, stageId, comment) }
    fun resubmit(id: String) = act { repo.resubmit(id) }
    fun cancel(id: String) = act { repo.cancel(id) }
    fun confirmSignature(id: String) = act { repo.confirmSignature(id) }
}

@Composable
fun ApplicationDetailScreen(
    applicationId: String,
    role: String,
    department: String?,
    onBack: () -> Unit,
    viewModel: ApplicationDetailViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsState()
    val busy by viewModel.busy.collectAsState()
    LaunchedEffect(applicationId) { viewModel.load(applicationId) }

    var mode by rememberSaveable { mutableStateOf("none") }
    var comment by rememberSaveable { mutableStateOf("") }

    Column(Modifier.fillMaxSize().background(Brand.White)) {
        Row(
            Modifier.fillMaxWidth().padding(start = 20.dp, end = 20.dp, top = 12.dp, bottom = 12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            TextButton(onClick = onBack) { Text("← Назад", color = Brand.Blue) }
        }

        Box(Modifier.weight(1f).padding(horizontal = 20.dp)) {
            when (val s = state) {
                is UiState.Loading -> SkeletonList(4)
                is UiState.Error -> ErrorBox(s.message) { viewModel.load(applicationId) }
                is UiState.Data -> {
                    val app = s.value
                    val active = app.stages.firstOrNull { it.status == "ACTIVE" }
                    val canAct = active != null && (role == "ADMIN" || active.approverDepartment == department)

                    Column(
                        Modifier.verticalScroll(rememberScrollState()),
                        verticalArrangement = Arrangement.spacedBy(18.dp),
                    ) {
                        BrandCard(shape = RoundedCornerShape(Radius.Card.dp)) {
                            Row(
                                Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                Text(
                                    "№ ${app.number}",
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = Brand.TextMuted,
                                )
                                StatusBadge(app.status)
                            }
                            Spacer(Modifier.height(10.dp))
                            Text(app.type.name, style = MaterialTheme.typography.headlineMedium)
                            app.user?.let {
                                Spacer(Modifier.height(4.dp))
                                Text(
                                    listOfNotNull(it.fullName, it.groupName).joinToString(" · "),
                                    style = MaterialTheme.typography.bodySmall,
                                    color = Brand.TextMuted,
                                )
                            }
                            app.rejectReason?.let {
                                Spacer(Modifier.height(12.dp))
                                Box(
                                    Modifier
                                        .fillMaxWidth()
                                        .background(Brand.WarnBg, RoundedCornerShape(Radius.Pill.dp))
                                        .padding(14.dp)
                                ) {
                                    Text(it, style = MaterialTheme.typography.bodyMedium)
                                }
                            }
                        }

                        // Код получения — крупно, как в прототипе.
                        if (app.status == "READY" && app.cell != null) {
                            BrandCard(
                                background = Brand.Blue,
                                border = Brand.Blue,
                                shape = RoundedCornerShape(Radius.Card.dp),
                            ) {
                                SectionLabelOnBlue("документ готов к выдаче")
                                Spacer(Modifier.height(14.dp))
                                Row(horizontalArrangement = Arrangement.spacedBy(22.dp)) {
                                    Column {
                                        Text(
                                            "ячейка",
                                            style = MaterialTheme.typography.bodySmall,
                                            color = Brand.White.copy(alpha = 0.75f),
                                        )
                                        Text(
                                            app.cell.code,
                                            style = MaterialTheme.typography.displayLarge,
                                            color = Brand.White,
                                        )
                                    }
                                    Column {
                                        Text(
                                            "код получения",
                                            style = MaterialTheme.typography.bodySmall,
                                            color = Brand.White.copy(alpha = 0.75f),
                                        )
                                        Text(
                                            app.cell.pickupCode.orEmpty(),
                                            style = NumericStyle,
                                            color = Brand.White,
                                        )
                                    }
                                }
                            }
                        }

                        Column {
                            SectionLabel("маршрут")
                            Spacer(Modifier.height(12.dp))
                            RouteTimeline(app.stages)
                        }

                        if (app.data.isNotEmpty()) {
                            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                SectionLabel("данные заявки")
                                app.data.forEach { (key, value) ->
                                    Row(
                                        Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                    ) {
                                        Text(
                                            key,
                                            style = MaterialTheme.typography.bodyMedium,
                                            color = Brand.TextMuted,
                                        )
                                        Text(
                                            (value as? JsonPrimitive)?.content ?: value.toString(),
                                            style = MaterialTheme.typography.bodyMedium,
                                        )
                                    }
                                }
                            }
                        }

                        Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                            if (canAct && mode == "none") {
                                BrandButton(
                                    "Согласовать этап",
                                    { viewModel.approve(app.id, active!!.id) },
                                    loading = busy,
                                )
                                BrandButton(
                                    "Вернуть на доработку",
                                    { mode = "return" },
                                    variant = ButtonVariant.Secondary,
                                )
                                BrandButton("Отклонить", { mode = "reject" }, variant = ButtonVariant.Danger)
                            }
                            if (canAct && mode != "none") {
                                OutlinedTextField(
                                    value = comment,
                                    onValueChange = { comment = it },
                                    label = { Text("Причина, минимум 10 символов") },
                                    minLines = 3,
                                    shape = RoundedCornerShape(Radius.Pill.dp),
                                    modifier = Modifier.fillMaxWidth(),
                                )
                                BrandButton(
                                    "Подтвердить",
                                    {
                                        if (mode == "return") {
                                            viewModel.returnStage(app.id, active!!.id, comment)
                                        } else {
                                            viewModel.reject(app.id, active!!.id, comment)
                                        }
                                        mode = "none"
                                        comment = ""
                                    },
                                    enabled = comment.trim().length >= 10,
                                    loading = busy,
                                    variant = if (mode == "reject") ButtonVariant.Danger else ButtonVariant.Primary,
                                )
                                BrandButton("Отмена", { mode = "none" }, variant = ButtonVariant.Secondary)
                            }
                            if (role == "STUDENT") {
                                if (app.status == "NEEDS_FIX") {
                                    BrandButton(
                                        "Отправить повторно",
                                        { viewModel.resubmit(app.id) },
                                        loading = busy,
                                    )
                                }
                                if (app.status in listOf("DRAFT", "SUBMITTED", "IN_REVIEW", "NEEDS_FIX")) {
                                    BrandButton(
                                        "Отменить заявку",
                                        { viewModel.cancel(app.id) },
                                        variant = ButtonVariant.Danger,
                                    )
                                }
                            }
                            if (app.status == "AWAITING_SIGNATURE" && role != "STUDENT") {
                                BrandButton(
                                    "Скан проверен — подтвердить",
                                    { viewModel.confirmSignature(app.id) },
                                    loading = busy,
                                )
                            }
                        }
                        Spacer(Modifier.height(16.dp))
                    }
                }
            }
        }
    }
}

@Composable
private fun SectionLabelOnBlue(text: String) {
    Text(
        text.uppercase(),
        style = MaterialTheme.typography.labelMedium,
        color = Brand.White.copy(alpha = 0.75f),
    )
}
