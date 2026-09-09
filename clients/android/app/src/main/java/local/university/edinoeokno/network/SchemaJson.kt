package local.university.edinoeokno.network

import kotlinx.serialization.json.Json

/** Отдельный Json для разбора fields_schema — вне графа Hilt (нужен в model). */
val SchemaJson: Json = Json {
    ignoreUnknownKeys = true
    explicitNulls = false
    isLenient = true
}
