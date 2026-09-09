package local.university.edinoeokno.data

/** Четыре состояния экрана из ТЗ 13.4: загрузка, пусто, ошибка, данные. */
sealed interface UiState<out T> {
    data object Loading : UiState<Nothing>
    data class Error(val message: String) : UiState<Nothing>
    data class Data<T>(val value: T) : UiState<T>
}
