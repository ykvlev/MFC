package local.university.edinoeokno.network

import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow

/** Сигнал «сессия истекла» — UI уводит пользователя на экран входа. */
class SessionState {
    private val _expired = MutableStateFlow(false)
    val expired: StateFlow<Boolean> = _expired

    fun expire() { _expired.value = true }
    fun reset() { _expired.value = false }
}
