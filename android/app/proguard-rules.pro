# Keep React Native & BLE Plx native classes
-keep class com.polidea.reactnativeble.** { *; }
-keep class com.meshconnect.** { *; }

# Keep React Native Java interface classes & JNI bindings
-keep class com.facebook.react.** { *; }
-keep class com.facebook.soloader.** { *; }

# Enable R8/ProGuard optimizations
-optimizationpasses 5
-dontusemixedcaseclassnames
-dontskipnonpubliclibraryclasses
-verbose

# Strip debug logging calls in production release builds
-assumenosideeffects class android.util.Log {
    public static *** d(...);
    public static *** v(...);
}
