import 'dotenv/config';

export default {
  expo: {
    name: "nayraa",
    slug: "nayraa",
    version: "1.0.0",
    platforms: ["android", "ios"],
    android: {
      package: "com.janesh.nayraa"
    },
    plugins: [
      [
        "expo-location",
        {
          locationAlwaysAndWhenInUsePermission: "Allow LocationMapApp to use your location."
        }
      ]
    ],
    extra: {
      GOOGLE_MAPS_API_KEY: process.env.GOOGLE_MAPS_API_KEY,
    },
  },
};
