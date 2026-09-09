package local.university.edinoeokno.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject

/**
 * Модели контракта API. Соответствуют openapi.json бэкенда; при подключении
 * генератора клиента этот файл заменяется сгенерированным.
 */

@Serializable
data class User(
    val id: String,
    val email: String,
    val fullName: String,
    val role: String,
    val groupName: String? = null,
    val course: Int? = null,
    val department: String? = null,
    val isBudget: Boolean = false,
    val studentCardNo: String? = null,
)

@Serializable
data class LoginRequest(val email: String, val password: String)

@Serializable
data class LoginResponse(val accessToken: String, val refreshToken: String, val user: User)

@Serializable
data class RefreshRequest(val refreshToken: String)

@Serializable
data class RefreshResponse(val accessToken: String, val refreshToken: String)

@Serializable
data class Stage(
    val id: String,
    val orderNum: Int,
    val name: String,
    val approverDepartment: String,
    val status: String,
    val comment: String? = null,
    val dueAt: String? = null,
    val actedAt: String? = null,
    val parallelGroup: Int? = null,
)

@Serializable
data class RouteStep(
    val orderNum: Int,
    val name: String,
    val approverDepartment: String,
    val slaDays: Int? = null,
    val isAuto: Boolean = false,
    val parallelGroup: Int? = null,
)

@Serializable
data class ApplicationType(
    val id: String,
    val code: String,
    val name: String,
    val description: String? = null,
    val usesCell: Boolean = false,
    val usesBooking: Boolean = false,
    val requiresSignature: Boolean = false,
    val fieldsSchema: JsonElement? = null,
    val routeSteps: List<RouteStep> = emptyList(),
    val available: Boolean = true,
    val denyMessage: String? = null,
)

@Serializable
data class Cell(
    val id: String,
    val code: String,
    val status: String,
    val pickupCode: String? = null,
    val expiresAt: String? = null,
    val location: String? = null,
)

@Serializable
data class FileMeta(
    val id: String,
    val kind: String,
    val originalName: String,
    val fieldKey: String? = null,
    val createdAt: String,
)

@Serializable
data class Application(
    val id: String,
    val number: String,
    val status: String,
    val data: JsonObject = JsonObject(emptyMap()),
    val createdAt: String,
    val submittedAt: String? = null,
    val rejectReason: String? = null,
    val type: ApplicationType,
    val stages: List<Stage> = emptyList(),
    val cell: Cell? = null,
    val files: List<FileMeta> = emptyList(),
    val user: ApplicantInfo? = null,
)

@Serializable
data class ApplicantInfo(
    val fullName: String,
    val groupName: String? = null,
    val course: Int? = null,
)

@Serializable
data class Page<T>(val items: List<T>, val total: Int, val page: Int, val limit: Int)

@Serializable
data class Notification(
    val id: String,
    val title: String,
    val body: String,
    val isRead: Boolean,
    val applicationId: String? = null,
    val createdAt: String,
)

@Serializable
data class CreateApplicationRequest(val typeId: String, val data: JsonObject)

@Serializable
data class CommentRequest(val comment: String)

@Serializable
data class BookingPeriod(
    val id: String,
    val name: String,
    val startDate: String,
    val endDate: String,
    val quota: Int,
    val isOpen: Boolean,
    val confirmed: Int = 0,
    val freeSlots: Int = 0,
)

@Serializable
data class Booking(
    val id: String,
    val periodId: String,
    val status: String,
    val queuePosition: Int? = null,
)

@Serializable
data class CreateBookingRequest(val applicationId: String, val periodId: String)

@Serializable
data class Announcement(
    val id: String,
    val title: String,
    val body: String,
    val createdAt: String,
    val authorName: String = "",
    val recipients: Int = 0,
)

@Serializable
data class SlotWindow(
    val id: String,
    val title: String,
    val location: String? = null,
    val date: String,
    val startTime: String,
    val endTime: String,
    val slotMinutes: Int = 15,
    val capacity: Int = 1,
    val isOpen: Boolean = true,
    val booked: Int = 0,
    val ownerName: String = "",
    val ownerDepartment: String? = null,
)

@Serializable
data class SlotAvailability(
    val slotStart: String,
    val capacity: Int,
    val booked: Int,
    val free: Int,
)

@Serializable
data class SlotsResponse(val window: SlotWindow, val slots: List<SlotAvailability>)

@Serializable
data class BookSlotRequest(val windowId: String, val slotStart: String, val comment: String? = null)

@Serializable
data class DeviceRequest(val platform: String, val token: String)

@Serializable
data class AbsenceRow(
    val number: String,
    val fullName: String,
    val groupName: String? = null,
    val course: Int? = null,
    val periodFrom: String = "",
    val periodTo: String = "",
    val reason: String = "",
    val approvedBy: String = "",
)

@Serializable
data class ApiErrorBody(val error: ApiErrorDetail)

@Serializable
data class ApiErrorDetail(val code: String, val message: String, val details: JsonElement? = null)
