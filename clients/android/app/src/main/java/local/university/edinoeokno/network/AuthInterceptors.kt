package local.university.edinoeokno.network

import kotlinx.serialization.json.Json
import okhttp3.Authenticator
import okhttp3.Interceptor
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import okhttp3.Response
import okhttp3.Route
import local.university.edinoeokno.model.RefreshRequest
import local.university.edinoeokno.model.RefreshResponse

/** Подставляет Bearer access-token во все запросы, кроме авторизации. */
class AccessTokenInterceptor(private val tokens: TokenStore) : Interceptor {
    override fun intercept(chain: Interceptor.Chain): Response {
        val request = chain.request()
        val token = tokens.accessToken
        if (token == null || request.url.encodedPath.contains("/auth/")) {
            return chain.proceed(request)
        }
        return chain.proceed(
            request.newBuilder().header("Authorization", "Bearer $token").build()
        )
    }
}

/**
 * На 401 один раз обновляет пару токенов и повторяет запрос.
 * Ротация refresh сохраняется — сервер отзывает предыдущий (ТЗ 13.1).
 */
class RefreshAuthenticator(
    private val tokens: TokenStore,
    private val baseUrl: () -> String,
    private val json: Json,
    private val clientProvider: () -> OkHttpClient,
    private val onSessionExpired: () -> Unit,
) : Authenticator {

    override fun authenticate(route: Route?, response: Response): Request? {
        if (responseCount(response) >= 2) return null
        val refresh = tokens.refreshToken ?: return null

        synchronized(this) {
            // Другой поток мог уже обновить токен — пробуем текущий.
            val current = tokens.accessToken
            if (current != null && response.request.header("Authorization") != "Bearer $current") {
                return response.request.newBuilder()
                    .header("Authorization", "Bearer $current").build()
            }

            val body = json.encodeToString(RefreshRequest.serializer(), RefreshRequest(refresh))
                .toRequestBody("application/json".toMediaType())
            val refreshCall = Request.Builder().url("${baseUrl()}/auth/refresh").post(body).build()

            clientProvider().newCall(refreshCall).execute().use { res ->
                if (!res.isSuccessful) {
                    tokens.clear()
                    onSessionExpired()
                    return null
                }
                val payload = res.body?.string() ?: run {
                    tokens.clear(); onSessionExpired(); return null
                }
                val fresh = json.decodeFromString(RefreshResponse.serializer(), payload)
                tokens.accessToken = fresh.accessToken
                tokens.refreshToken = fresh.refreshToken
                return response.request.newBuilder()
                    .header("Authorization", "Bearer ${fresh.accessToken}").build()
            }
        }
    }

    private fun responseCount(response: Response): Int {
        var count = 1
        var prior = response.priorResponse
        while (prior != null) {
            count++
            prior = prior.priorResponse
        }
        return count
    }
}
