package local.university.edinoeokno.network

import local.university.edinoeokno.model.*
import retrofit2.http.*

/** Контракт REST API. Пути соответствуют ТЗ раздел 11 (+ расширения). */
interface OknoApi {

    // — аутентификация —
    @POST("auth/login")
    suspend fun login(@Body body: LoginRequest): LoginResponse

    @POST("auth/logout")
    suspend fun logout(@Body body: RefreshRequest)

    @GET("auth/me")
    suspend fun me(): User

    // — типы заявок —
    @GET("application-types")
    suspend fun applicationTypes(): List<ApplicationType>

    @GET("application-types/{id}")
    suspend fun applicationType(@Path("id") id: String): ApplicationType

    // — заявки —
    @GET("applications")
    suspend fun applications(
        @Query("scope") scope: String = "my",
        @Query("status") status: String? = null,
        @Query("q") q: String? = null,
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 20,
    ): Page<Application>

    @GET("applications/{id}")
    suspend fun application(@Path("id") id: String): Application

    @POST("applications")
    suspend fun createApplication(@Body body: CreateApplicationRequest): Application

    @POST("applications/{id}/submit")
    suspend fun submit(@Path("id") id: String): Application

    @POST("applications/{id}/resubmit")
    suspend fun resubmit(@Path("id") id: String): Application

    @POST("applications/{id}/cancel")
    suspend fun cancel(@Path("id") id: String, @Body body: Map<String, String>): Application

    @POST("applications/{id}/stages/{stageId}/approve")
    suspend fun approveStage(
        @Path("id") id: String,
        @Path("stageId") stageId: String,
        @Body body: Map<String, String>,
    ): Application

    @POST("applications/{id}/stages/{stageId}/return")
    suspend fun returnStage(
        @Path("id") id: String,
        @Path("stageId") stageId: String,
        @Body body: CommentRequest,
    ): Application

    @POST("applications/{id}/stages/{stageId}/reject")
    suspend fun rejectStage(
        @Path("id") id: String,
        @Path("stageId") stageId: String,
        @Body body: CommentRequest,
    ): Application

    @POST("applications/{id}/confirm-signature")
    suspend fun confirmSignature(@Path("id") id: String): Application

    // — ячейки —
    @GET("cells")
    suspend fun cells(@Query("status") status: String? = null): List<Cell>

    @POST("cells/{id}/issue")
    suspend fun issueCell(@Path("id") id: String): Cell

    // — бронирование —
    @GET("booking-periods")
    suspend fun bookingPeriods(): List<BookingPeriod>

    @POST("bookings")
    suspend fun createBooking(@Body body: CreateBookingRequest): Booking

    @POST("bookings/{id}/cancel")
    suspend fun cancelBooking(@Path("id") id: String): Booking

    // — уведомления и устройства —
    @GET("notifications")
    suspend fun notifications(@Query("unreadOnly") unreadOnly: Boolean? = null): List<Notification>

    @POST("notifications/{id}/read")
    suspend fun markRead(@Path("id") id: String)

    @POST("notifications/read-all")
    suspend fun markAllRead()

    @POST("devices")
    suspend fun registerDevice(@Body body: DeviceRequest)

    // — реестр освобождённых —
    @GET("absences")
    suspend fun absences(
        @Query("group") group: String? = null,
        @Query("course") course: Int? = null,
        @Query("from") from: String? = null,
        @Query("to") to: String? = null,
        @Query("q") q: String? = null,
    ): List<AbsenceRow>

    // — расширения —
    @GET("announcements")
    suspend fun announcements(): List<Announcement>

    @GET("slot-windows")
    suspend fun slotWindows(@Query("scope") scope: String = "available"): List<SlotWindow>

    @GET("slot-windows/{id}/slots")
    suspend fun slots(@Path("id") id: String): SlotsResponse

    @POST("slot-bookings")
    suspend fun bookSlot(@Body body: BookSlotRequest)
}
