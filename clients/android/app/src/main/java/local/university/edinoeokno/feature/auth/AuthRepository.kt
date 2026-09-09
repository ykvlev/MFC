package local.university.edinoeokno.feature.auth

import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import local.university.edinoeokno.model.LoginRequest
import local.university.edinoeokno.model.RefreshRequest
import local.university.edinoeokno.model.User
import local.university.edinoeokno.network.OknoApi
import local.university.edinoeokno.network.TokenStore
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class AuthRepository @Inject constructor(
    private val api: OknoApi,
    private val tokens: TokenStore,
) {
    private val _user = MutableStateFlow<User?>(null)
    val user: StateFlow<User?> = _user

    suspend fun login(email: String, password: String) {
        val res = api.login(LoginRequest(email.trim(), password))
        tokens.accessToken = res.accessToken
        tokens.refreshToken = res.refreshToken
        _user.value = res.user
    }

    /** Восстановление сессии при старте: refresh лежит в защищённом хранилище. */
    suspend fun restore(): Boolean {
        if (tokens.refreshToken == null) return false
        return runCatching {
            // Первый же запрос с истёкшим access вызовет RefreshAuthenticator.
            _user.value = api.me()
            true
        }.getOrElse { false }
    }

    suspend fun logout() {
        val refresh = tokens.refreshToken
        if (refresh != null) runCatching { api.logout(RefreshRequest(refresh)) }
        tokens.clear()
        _user.value = null
    }
}
