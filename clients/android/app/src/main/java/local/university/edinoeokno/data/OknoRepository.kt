package local.university.edinoeokno.data

import local.university.edinoeokno.model.*
import local.university.edinoeokno.network.OknoApi
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class OknoRepository @Inject constructor(private val api: OknoApi) {

    suspend fun applications(scope: String, q: String? = null) =
        api.applications(scope = scope, q = q?.ifBlank { null })

    suspend fun application(id: String) = api.application(id)

    suspend fun types() = api.applicationTypes()

    suspend fun createAndSubmit(typeId: String, data: kotlinx.serialization.json.JsonObject): Application {
        val created = api.createApplication(CreateApplicationRequest(typeId, data))
        return api.submit(created.id)
    }

    suspend fun resubmit(id: String) = api.resubmit(id)
    suspend fun cancel(id: String) = api.cancel(id, emptyMap())

    suspend fun approve(id: String, stageId: String, comment: String?) =
        api.approveStage(id, stageId, comment?.let { mapOf("comment" to it) } ?: emptyMap())

    suspend fun returnStage(id: String, stageId: String, comment: String) =
        api.returnStage(id, stageId, CommentRequest(comment))

    suspend fun rejectStage(id: String, stageId: String, comment: String) =
        api.rejectStage(id, stageId, CommentRequest(comment))

    suspend fun confirmSignature(id: String) = api.confirmSignature(id)

    suspend fun cells() = api.cells()
    suspend fun issueCell(id: String) = api.issueCell(id)

    suspend fun notifications() = api.notifications()
    suspend fun markAllRead() = api.markAllRead()

    suspend fun absences(group: String?, q: String?) =
        api.absences(group = group?.ifBlank { null }, q = q?.ifBlank { null })

    suspend fun slotWindows() = api.slotWindows()
    suspend fun slots(windowId: String) = api.slots(windowId)
    suspend fun bookSlot(windowId: String, slotStart: String) =
        api.bookSlot(BookSlotRequest(windowId, slotStart))

    suspend fun registerDevice(token: String) = api.registerDevice(DeviceRequest("ANDROID", token))
}
