package local.university.edinoeokno.navigation

object Routes {
    const val MyApplications = "applications"
    const val Queue = "queue"
    const val Catalog = "catalog"
    const val Cells = "cells"
    const val Registry = "registry"
    const val Slots = "slots"
    const val Notifications = "notifications"
    const val Profile = "profile"
    const val Detail = "applications/{id}"
    const val NewApplication = "catalog/{typeId}/new"

    fun detail(id: String) = "applications/$id"
    fun newApplication(typeId: String) = "catalog/$typeId/new"
}

data class Tab(val route: String, val label: String)

/** Набор вкладок по роли — как в прототипе (design/prototype.dc.html). */
fun tabsFor(role: String): List<Tab> = when (role) {
    "STUDENT" -> listOf(
        Tab(Routes.MyApplications, "Заявки"),
        Tab(Routes.Catalog, "Каталог"),
        Tab(Routes.Slots, "Приём"),
        Tab(Routes.Notifications, "Входящие"),
        Tab(Routes.Profile, "Профиль"),
    )
    "STAFF" -> listOf(
        Tab(Routes.Queue, "Очередь"),
        Tab(Routes.Cells, "Ячейки"),
        Tab(Routes.Notifications, "Входящие"),
        Tab(Routes.Profile, "Профиль"),
    )
    "TEACHER" -> listOf(
        Tab(Routes.Registry, "Реестр"),
        Tab(Routes.Slots, "Приём"),
        Tab(Routes.Profile, "Профиль"),
    )
    else -> listOf(
        Tab(Routes.Queue, "Заявки"),
        Tab(Routes.Cells, "Ячейки"),
        Tab(Routes.Registry, "Реестр"),
        Tab(Routes.Profile, "Профиль"),
    )
}
