import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { registerDeviceToken } from "./api";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true
  })
});

export async function registerForPushNotificationsAsync() {
  if (!Device.isDevice) {
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    return null;
  }

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX
    });
  }

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;

  let token = "";
  let platform: "ANDROID" | "IOS" | "WEB" = "WEB";

  if (Platform.OS === "android") {
    const nativeToken = await Notifications.getDevicePushTokenAsync();
    token = String(nativeToken.data);
    platform = "ANDROID";
  } else if (Platform.OS === "ios") {
    const expoToken = await Notifications.getExpoPushTokenAsync({ projectId });
    token = expoToken.data;
    platform = "IOS";
  }

  if (token) {
    await registerDeviceToken(token, platform);
  }

  return token;
}
