export default {
  expo: {
    name: "Ngumu's Eye",
    slug: "ngumus-eye",
    owner: "referredby",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    splash: {
      image: "./assets/splash.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff",
    },
    assetBundlePatterns: ["**/*"],
    ios: {
      supportsTablet: false,
      bundleIdentifier: "com.ngumuseye.app",
      infoPlist: {
        NSLocationWhenInUseUsageDescription:
          "This app needs your location to report incidents in your area.",
        NSLocationAlwaysUsageDescription:
          "This app needs your location to alert you about nearby incidents.",
        NSCameraUsageDescription:
          "This app needs camera access to capture photos of incidents.",
        NSPhotoLibraryUsageDescription:
          "This app needs photo library access to upload images of incidents.",
      },
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#1d9bf0",
      },
      package: "com.ngumuseye.app",
      config: {
        googleMaps: {
          apiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY,
        },
      },
      permissions: [
        "android.permission.ACCESS_COARSE_LOCATION",
        "android.permission.ACCESS_FINE_LOCATION",
        "android.permission.CAMERA",
        "android.permission.READ_EXTERNAL_STORAGE",
        "android.permission.WRITE_EXTERNAL_STORAGE",
        "android.permission.RECORD_AUDIO",
      ],
    },
    plugins: [
      [
        "expo-location",
        {
          locationAlwaysAndWhenInUsePermission:
            "Allow Ngumu's Eye to use your location to report and receive alerts about nearby incidents.",
        },
      ],
      [
        "expo-image-picker",
        {
          photosPermission:
            "Allow Ngumu's Eye to access your photos to upload incident images.",
          cameraPermission:
            "Allow Ngumu's Eye to access your camera to capture incident photos.",
        },
      ],
      "expo-secure-store",
    ],
    extra: {
      supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
      siteUrl: process.env.EXPO_PUBLIC_SITE_URL,
      eas: {
        projectId: "087a5521-1213-416d-92bf-761dd8fb245a",
      },
    },
  },
};