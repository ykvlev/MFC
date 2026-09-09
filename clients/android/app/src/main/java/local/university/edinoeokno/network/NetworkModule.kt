package local.university.edinoeokno.network

import android.content.Context
import com.jakewharton.retrofit2.converter.kotlinx.serialization.asConverterFactory
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import kotlinx.serialization.json.Json
import local.university.edinoeokno.BuildConfig
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import java.util.concurrent.TimeUnit
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object NetworkModule {

    @Provides
    @Singleton
    fun json(): Json = Json {
        ignoreUnknownKeys = true
        explicitNulls = false
        encodeDefaults = true
    }

    @Provides
    @Singleton
    fun tokenStore(@ApplicationContext context: Context): TokenStore = TokenStore(context)

    @Provides
    @Singleton
    fun sessionState(): SessionState = SessionState()

    @Provides
    @Singleton
    fun okHttp(tokens: TokenStore, json: Json, session: SessionState): OkHttpClient {
        // Отдельный «голый» клиент для запроса refresh — иначе рекурсия аутентификатора.
        val bare = OkHttpClient.Builder()
            .connectTimeout(15, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .build()

        val builder = OkHttpClient.Builder()
            .connectTimeout(15, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .addInterceptor(AccessTokenInterceptor(tokens))
            .authenticator(
                RefreshAuthenticator(
                    tokens = tokens,
                    baseUrl = BuildConfig.API_BASE,
                    json = json,
                    clientProvider = { bare },
                    onSessionExpired = { session.expire() },
                )
            )

        if (BuildConfig.DEBUG) {
            builder.addInterceptor(
                HttpLoggingInterceptor().apply { level = HttpLoggingInterceptor.Level.BASIC }
            )
        }
        return builder.build()
    }

    @Provides
    @Singleton
    fun retrofit(client: OkHttpClient, json: Json): Retrofit = Retrofit.Builder()
        .baseUrl(BuildConfig.API_BASE.trimEnd('/') + "/")
        .client(client)
        .addConverterFactory(json.asConverterFactory("application/json".toMediaType()))
        .build()

    @Provides
    @Singleton
    fun api(retrofit: Retrofit): OknoApi = retrofit.create(OknoApi::class.java)
}
