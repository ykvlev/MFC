package local.university.edinoeokno.network

import android.content.Context
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
/**
 * TZ-GAP: на мобильном refresh-токен хранится в EncryptedSharedPreferences,
 * а не в httpOnly cookie (ТЗ 13.1), и передаётся в теле POST /auth/refresh.
 * Access-токен живёт только в памяти процесса.
 */
class TokenStore(context: Context) {

    private val prefs by lazy {
        val key = MasterKey.Builder(context)
            .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
            .build()
        EncryptedSharedPreferences.create(
            context,
            "edinoe_okno_auth",
            key,
            EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
            EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM,
        )
    }

    @Volatile
    var accessToken: String? = null

    var refreshToken: String?
        get() = prefs.getString(KEY_REFRESH, null)
        set(value) = prefs.edit().apply {
            if (value == null) remove(KEY_REFRESH) else putString(KEY_REFRESH, value)
        }.apply()

    fun clear() {
        accessToken = null
        refreshToken = null
    }

    private companion object {
        const val KEY_REFRESH = "refresh_token"
    }
}
