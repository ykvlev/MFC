package local.university.edinoeokno.network

import kotlinx.serialization.json.Json
import local.university.edinoeokno.model.ApiErrorBody
import retrofit2.HttpException

/** Достаёт человекочитаемое сообщение из единого формата ошибок (ТЗ 11.7). */
fun Throwable.userMessage(json: Json = Json { ignoreUnknownKeys = true }): String = when (this) {
    is java.net.ConnectException, is java.net.UnknownHostException,
    is java.net.SocketTimeoutException ->
        "Сервер недоступен. Проверь его адрес, запуск API и подключение телефона к компьютеру. Адрес 10.0.2.2 работает только в эмуляторе."
    is HttpException -> runCatching {
        val raw = response()?.errorBody()?.string().orEmpty()
        json.decodeFromString(ApiErrorBody.serializer(), raw).error.message
    }.getOrElse { defaultHttpMessage(code()) }
    else -> message ?: "Нет связи с сервером"
}

private fun defaultHttpMessage(code: Int): String = when (code) {
    401 -> "Нужно войти заново"
    403 -> "Недостаточно прав"
    404 -> "Не найдено"
    409 -> "Действие сейчас невозможно"
    else -> "Ошибка сервера ($code)"
}
