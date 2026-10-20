package local.university.edinoeokno.network

import android.content.Context
import local.university.edinoeokno.BuildConfig
import okhttp3.HttpUrl.Companion.toHttpUrlOrNull
import okhttp3.Interceptor
import okhttp3.Response

class ServerConfig(context: Context) {
    private val preferences = context.getSharedPreferences("server_config", Context.MODE_PRIVATE)

    val address: String
        get() = if (BuildConfig.DEBUG) {
            preferences.getString("address", BuildConfig.API_BASE) ?: BuildConfig.API_BASE
        } else BuildConfig.API_BASE

    fun save(value: String): Boolean {
        if (!BuildConfig.DEBUG) return false
        val normalized = value.trim().trimEnd('/')
        val parsed = normalized.toHttpUrlOrNull()
        require(parsed != null && parsed.encodedPath == "/api/v1" &&
            parsed.query == null && parsed.fragment == null &&
            parsed.username.isEmpty() && parsed.password.isEmpty()) {
            "Укажи адрес сервера, например http://192.168.1.10:3000/api/v1"
        }
        if (normalized == address) return false
        preferences.edit().putString("address", normalized).apply()
        return true
    }
}

class ServerRoutingInterceptor(private val server: ServerConfig) : Interceptor {
    override fun intercept(chain: Interceptor.Chain): Response {
        val request = chain.request()
        val base = requireNotNull(server.address.toHttpUrlOrNull())
        val destination = request.url.newBuilder()
            .scheme(base.scheme).host(base.host).port(base.port).build()
        return chain.proceed(request.newBuilder().url(destination).build())
    }
}
