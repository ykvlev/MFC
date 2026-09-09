package local.university.edinoeokno.designsystem

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.foundation.text.KeyboardOptions
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import local.university.edinoeokno.model.FieldSchema

/**
 * Динамическая форма по `fields_schema` (ТЗ 4.3).
 * Клиентская валидация повторяет серверную: обязательность, длина, диапазон
 * чисел, порядок дат. Итог — `JsonObject` для `POST /applications`.
 */

/** Значение одного поля во внутреннем виде. */
private sealed interface FieldValue {
    data class Text(val value: String) : FieldValue
    data class Number(val value: String) : FieldValue
    data class Bool(val value: Boolean) : FieldValue
    data class Choice(val value: String) : FieldValue
    data class Range(val from: String, val to: String) : FieldValue
    data class FileRef(val name: String) : FieldValue
}

class DynamicFormState(schema: List<FieldSchema>) {
    val fields: List<FieldSchema> = schema
    val values = mutableStateMapOf<String, FieldValue>()
    val errors = mutableStateMapOf<String, String>()

    init {
        schema.forEach { field ->
            val def = (field.default as? JsonPrimitive)?.content
            if (def != null) {
                values[field.key] = when (field.type) {
                    "NUMBER" -> FieldValue.Number(def)
                    "CHECKBOX" -> FieldValue.Bool(def.toBooleanStrictOrNull() ?: false)
                    "SELECT" -> FieldValue.Choice(def)
                    else -> FieldValue.Text(def)
                }
            }
        }
    }

    fun text(key: String): String = when (val v = values[key]) {
        is FieldValue.Text -> v.value
        is FieldValue.Number -> v.value
        is FieldValue.Choice -> v.value
        else -> ""
    }

    fun bool(key: String): Boolean = (values[key] as? FieldValue.Bool)?.value ?: false
    fun range(key: String): FieldValue.Range = values[key] as? FieldValue.Range ?: FieldValue.Range("", "")
    fun fileName(key: String): String? = (values[key] as? FieldValue.FileRef)?.name

    fun set(key: String, value: FieldValue) {
        values[key] = value
        errors.remove(key)
    }

    /** Проверка по правилам схемы. Возвращает true, если форма валидна. */
    fun validate(): Boolean {
        errors.clear()
        fields.forEach { field ->
            val raw = values[field.key]
            val empty = when (raw) {
                null -> true
                is FieldValue.Text -> raw.value.isBlank()
                is FieldValue.Number -> raw.value.isBlank()
                is FieldValue.Choice -> raw.value.isBlank()
                is FieldValue.Range -> raw.from.isBlank() || raw.to.isBlank()
                is FieldValue.FileRef -> raw.name.isBlank()
                is FieldValue.Bool -> false
            }
            if (field.required && empty) {
                errors[field.key] = "Поле обязательно"
                return@forEach
            }
            if (empty) return@forEach

            when (field.type) {
                "TEXT", "TEXTAREA" -> {
                    val s = (raw as FieldValue.Text).value
                    field.minLength?.let { if (s.length < it) errors[field.key] = "Минимум $it символов" }
                    field.maxLength?.let { if (s.length > it) errors[field.key] = "Максимум $it символов" }
                    field.pattern?.let {
                        if (!runCatching { Regex(it).matches(s) }.getOrDefault(true)) {
                            errors[field.key] = "Неверный формат"
                        }
                    }
                }
                "NUMBER" -> {
                    val n = (raw as FieldValue.Number).value.toDoubleOrNull()
                    if (n == null) {
                        errors[field.key] = "Введите число"
                    } else {
                        field.min?.let { if (n < it) errors[field.key] = "Минимум ${fmt(it)}" }
                        field.max?.let { if (n > it) errors[field.key] = "Максимум ${fmt(it)}" }
                    }
                }
                "DATE_RANGE" -> {
                    val r = raw as FieldValue.Range
                    if (r.to < r.from) errors[field.key] = "Дата окончания раньше начала"
                }
            }
        }
        return errors.isEmpty()
    }

    /** Сбор значений в тело запроса. Файловые поля не входят — они грузятся отдельно. */
    fun toJson(): JsonObject = buildJsonObject {
        fields.forEach { field ->
            when (val v = values[field.key]) {
                is FieldValue.Text -> if (v.value.isNotBlank()) put(field.key, v.value)
                is FieldValue.Choice -> if (v.value.isNotBlank()) put(field.key, v.value)
                is FieldValue.Bool -> put(field.key, v.value)
                is FieldValue.Number -> v.value.toDoubleOrNull()?.let { n ->
                    if (n == n.toLong().toDouble()) put(field.key, n.toLong()) else put(field.key, n)
                }
                is FieldValue.Range -> if (v.from.isNotBlank() && v.to.isNotBlank()) {
                    put(field.key, buildJsonObject { put("from", v.from); put("to", v.to) })
                }
                is FieldValue.FileRef, null -> Unit
            }
        }
    }

    /** Файловые поля, которые сервер потребует при подаче. */
    fun pendingFileFields(): List<FieldSchema> =
        fields.filter { it.isFile && it.required && fileName(it.key) == null }

    private fun fmt(d: Double) = if (d == d.toLong().toDouble()) d.toLong().toString() else d.toString()
}

@Composable
fun rememberDynamicFormState(schema: List<FieldSchema>): DynamicFormState =
    remember(schema) { DynamicFormState(schema) }

@Composable
fun DynamicForm(
    state: DynamicFormState,
    modifier: Modifier = Modifier,
    onPickFile: ((FieldSchema) -> Unit)? = null,
) {
    Column(modifier, verticalArrangement = Arrangement.spacedBy(18.dp)) {
        state.fields.forEach { field ->
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Row(verticalAlignment = Alignment.Bottom) {
                    Text(field.label, style = MaterialTheme.typography.titleSmall)
                    if (field.required) {
                        Text(" *", style = MaterialTheme.typography.titleSmall, color = Brand.Alert)
                    }
                }

                when (field.type) {
                    "TEXT" -> FormTextField(state, field, singleLine = true)
                    "TEXTAREA" -> FormTextField(state, field, singleLine = false, minLines = 4)
                    "NUMBER" -> NumberStepper(state, field)
                    "SELECT" -> ChoiceChips(state, field)
                    "DATE" -> FormTextField(state, field, singleLine = true, placeholder = "ГГГГ-ММ-ДД")
                    "DATE_RANGE" -> DateRangeRow(state, field)
                    "CHECKBOX" -> CheckboxRow(state, field)
                    "FILE" -> FileRow(state, field, onPickFile)
                    else -> FormTextField(state, field, singleLine = true)
                }

                val error = state.errors[field.key]
                if (error != null) {
                    Text(error, style = MaterialTheme.typography.bodySmall, color = Brand.Alert)
                } else if (field.hint != null) {
                    Text(field.hint, style = MaterialTheme.typography.bodySmall, color = Brand.TextMuted)
                }
            }
        }
    }
}

@Composable
private fun FormTextField(
    state: DynamicFormState,
    field: FieldSchema,
    singleLine: Boolean,
    minLines: Int = 1,
    placeholder: String? = null,
) {
    OutlinedTextField(
        value = state.text(field.key),
        onValueChange = { state.set(field.key, FieldValue.Text(it)) },
        singleLine = singleLine,
        minLines = minLines,
        placeholder = placeholder?.let { { Text(it, color = Brand.TextMuted) } },
        isError = state.errors.containsKey(field.key),
        shape = RoundedCornerShape(Radius.Pill.dp),
        colors = formFieldColors(),
        modifier = Modifier.fillMaxWidth(),
    )
}

@Composable
private fun NumberStepper(state: DynamicFormState, field: FieldSchema) {
    val current = state.text(field.key).toDoubleOrNull() ?: field.min ?: 0.0
    val min = field.min ?: 0.0
    val max = field.max ?: Double.MAX_VALUE

    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
        StepperButton("−") {
            val next = (current - 1).coerceAtLeast(min)
            state.set(field.key, FieldValue.Number(next.toLong().toString()))
        }
        Text(
            current.toLong().toString(),
            style = NumericStyle.copy(fontSize = 26.sp, lineHeight = 30.sp),
            modifier = Modifier.widthIn(min = 40.dp),
        )
        StepperButton("+") {
            val next = (current + 1).coerceAtMost(max)
            state.set(field.key, FieldValue.Number(next.toLong().toString()))
        }
    }
}

@Composable
private fun StepperButton(label: String, onClick: () -> Unit) {
    val shape = RoundedCornerShape(Radius.Icon.dp)
    Box(
        Modifier
            .size(44.dp)
            .border(1.dp, Brand.Line, shape)
            .clickable { onClick() },
        contentAlignment = Alignment.Center,
    ) {
        Text(label, style = MaterialTheme.typography.headlineMedium)
    }
}

@Composable
private fun ChoiceChips(state: DynamicFormState, field: FieldSchema) {
    val selected = state.text(field.key)
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        field.selectOptions.chunked(2).forEach { row ->
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                row.forEach { option ->
                    val active = option.value == selected
                    val shape = RoundedCornerShape(Radius.Pill.dp)
                    Box(
                        Modifier
                            .weight(1f)
                            .heightIn(min = 44.dp)
                            .background(if (active) Brand.Blue else Brand.White, shape)
                            .border(1.dp, if (active) Brand.Blue else Brand.Line, shape)
                            .clickable { state.set(field.key, FieldValue.Choice(option.value)) }
                            .padding(horizontal = 14.dp, vertical = 10.dp),
                        contentAlignment = Alignment.Center,
                    ) {
                        Text(
                            option.label,
                            style = MaterialTheme.typography.bodyMedium,
                            color = if (active) Brand.White else Brand.Black,
                        )
                    }
                }
                repeat(2 - row.size) { Spacer(Modifier.weight(1f)) }
            }
        }
    }
}

@Composable
private fun DateRangeRow(state: DynamicFormState, field: FieldSchema) {
    val range = state.range(field.key)
    Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
        OutlinedTextField(
            value = range.from,
            onValueChange = { state.set(field.key, FieldValue.Range(it, range.to)) },
            placeholder = { Text("с (ГГГГ-ММ-ДД)", color = Brand.TextMuted) },
            singleLine = true,
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
            shape = RoundedCornerShape(Radius.Pill.dp),
            colors = formFieldColors(),
            modifier = Modifier.weight(1f),
        )
        OutlinedTextField(
            value = range.to,
            onValueChange = { state.set(field.key, FieldValue.Range(range.from, it)) },
            placeholder = { Text("по", color = Brand.TextMuted) },
            singleLine = true,
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
            shape = RoundedCornerShape(Radius.Pill.dp),
            colors = formFieldColors(),
            modifier = Modifier.weight(1f),
        )
    }
}

@Composable
private fun CheckboxRow(state: DynamicFormState, field: FieldSchema) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Checkbox(
            checked = state.bool(field.key),
            onCheckedChange = { state.set(field.key, FieldValue.Bool(it)) },
            colors = CheckboxDefaults.colors(checkedColor = Brand.Blue),
        )
        Spacer(Modifier.width(6.dp))
        Text("Да", style = MaterialTheme.typography.bodyMedium)
    }
}

@Composable
private fun FileRow(
    state: DynamicFormState,
    field: FieldSchema,
    onPickFile: ((FieldSchema) -> Unit)?,
) {
    val name = state.fileName(field.key)
    val shape = RoundedCornerShape(Radius.Pill.dp)
    Row(
        Modifier
            .fillMaxWidth()
            .border(1.dp, Brand.Hairline, shape)
            .clickable(enabled = onPickFile != null) { onPickFile?.invoke(field) }
            .padding(16.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(
            Modifier
                .size(32.dp)
                .background(Brand.BlueTint, RoundedCornerShape(Radius.Icon.dp)),
            contentAlignment = Alignment.Center,
        ) {
            Text("+", style = MaterialTheme.typography.titleMedium, color = Brand.Blue)
        }
        Spacer(Modifier.width(12.dp))
        Column {
            Text(
                name ?: "Прикрепить файл",
                style = MaterialTheme.typography.titleSmall,
            )
            Text(
                buildString {
                    if (field.accept.isNotEmpty()) append(field.accept.joinToString(", "))
                    field.maxSizeMb?.let {
                        if (isNotEmpty()) append(" · ")
                        append("до ${it.toInt()} МБ")
                    }
                },
                style = MaterialTheme.typography.bodySmall,
                color = Brand.TextMuted,
            )
        }
    }
}

@Composable
private fun formFieldColors() = OutlinedTextFieldDefaults.colors(
    focusedBorderColor = Brand.Blue,
    unfocusedBorderColor = Brand.Line,
    errorBorderColor = Brand.Alert,
    cursorColor = Brand.Blue,
)
