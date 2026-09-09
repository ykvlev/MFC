package local.university.edinoeokno.feature.auth

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import local.university.edinoeokno.model.User
import local.university.edinoeokno.network.SessionState
import local.university.edinoeokno.network.userMessage
import javax.inject.Inject

data class AuthUiState(
    val booting: Boolean = true,
    val busy: Boolean = false,
    val error: String? = null,
    val user: User? = null,
)

@HiltViewModel
class AuthViewModel @Inject constructor(
    private val repo: AuthRepository,
    private val session: SessionState,
) : ViewModel() {

    private val _state = MutableStateFlow(AuthUiState())
    val state: StateFlow<AuthUiState> = _state

    init {
        viewModelScope.launch {
            val ok = repo.restore()
            _state.value = _state.value.copy(booting = false, user = if (ok) repo.user.value else null)
        }
        viewModelScope.launch {
            session.expired.collect { expired ->
                if (expired) {
                    _state.value = _state.value.copy(user = null)
                    session.reset()
                }
            }
        }
    }

    fun login(email: String, password: String) {
        viewModelScope.launch {
            _state.value = _state.value.copy(busy = true, error = null)
            runCatching { repo.login(email, password) }
                .onSuccess { _state.value = _state.value.copy(busy = false, user = repo.user.value) }
                .onFailure { _state.value = _state.value.copy(busy = false, error = it.userMessage()) }
        }
    }

    fun logout() {
        viewModelScope.launch {
            repo.logout()
            _state.value = AuthUiState(booting = false)
        }
    }
}
