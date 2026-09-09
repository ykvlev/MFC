# kotlinx.serialization — сохраняем сериализаторы моделей
-keepattributes *Annotation*, InnerClasses
-dontnote kotlinx.serialization.**
-keepclassmembers class local.university.edinoeokno.model.** {
    *** Companion;
    <fields>;
}
-keepclasseswithmembers class local.university.edinoeokno.model.** {
    kotlinx.serialization.KSerializer serializer(...);
}

# Retrofit / OkHttp
-dontwarn okhttp3.**
-dontwarn retrofit2.**
-keepattributes Signature, Exceptions
