package local.university.edinoeokno.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive

/**
 * Схема поля формы — формат ТЗ 4.3. Единый контракт с бэкендом и десктопом
 * (packages/shared). Клиент рендерит форму по этой схеме, сервер по ней же
 * валидирует `data` и отбрасывает лишние ключи.
 */
@Serializable
data class FieldSchema(
    val key: String,
    val label: String,
    val type: String,
    val required: Boolean = false,
    val hint: String? = null,
    val default: JsonElement? = null,

    // TEXT / TEXTAREA
    val minLength: Int? = null,
    val maxLength: Int? = null,
    val pattern: String? = null,

    // NUMBER
    val min: Double? = null,
    val max: Double? = null,

    // DATE / DATE_RANGE — "today", "today+30" или ISO-дата
    val minDate: String? = null,
    val maxDate: String? = null,

    // SELECT
    val options: List<JsonElement> = emptyList(),
    val multiple: Boolean = false,

    // FILE
    val accept: List<String> = emptyList(),
    @SerialName("maxSizeMb") val maxSizeMb: Double? = null,
) {
    /** Варианты SELECT: строка либо объект {value,label}. */
    val selectOptions: List<SelectOption>
        get() = options.map { element ->
            val primitive = element as? JsonPrimitive
            if (primitive != null && primitive.isString) {
                SelectOption(primitive.content, primitive.content)
            } else {
                val obj = element.jsonObject
                SelectOption(
                    value = obj["value"]?.jsonPrimitive?.content.orEmpty(),
                    label = obj["label"]?.jsonPrimitive?.content
                        ?: obj["value"]?.jsonPrimitive?.content.orEmpty(),
                )
            }
        }

    /** Поле, которое заполняется загрузкой файла отдельным запросом. */
    val isFile: Boolean get() = type == "FILE"
}

data class SelectOption(val value: String, val label: String)

/** Разбирает `fieldsSchema` типа заявки; при кривом JSON возвращает пустой список. */
fun parseFieldsSchema(element: JsonElement?): List<FieldSchema> {
    if (element == null) return emptyList()
    return runCatching {
        element.jsonArray.map { item ->
            local.university.edinoeokno.network.SchemaJson
                .decodeFromJsonElement(FieldSchema.serializer(), item)
        }
    }.getOrDefault(emptyList())
}
