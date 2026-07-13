/**
 * pushNotifications.ts
 *
 * Responsável por registrar o dispositivo no Expo e obter o ExponentPushToken.
 * O token é enviado ao backend junto com o payload do login (getToken),
 * não há necessidade de um endpoint separado.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

/**
 * Registra o dispositivo no Expo Push e retorna o ExponentPushToken.
 * Salva no AsyncStorage para reutilizar sem re-registrar toda vez.
 */
export async function registrarDispositivo(): Promise<string | null> {
  try {
    console.log("🔍 [PUSH] Iniciando registro...");
    console.log("🔍 [PUSH] É dispositivo físico?", Device.isDevice);

    if (!Device.isDevice) {
      console.log("⚠️ [PUSH] Simulador detectado — push não funciona no Expo Go/simulador");
      return null;
    }

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "Browz",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#3b82f6",
        sound: "default",
      });
      console.log("🔍 [PUSH] Canal Android configurado");
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    console.log("🔍 [PUSH] Permissão atual:", existingStatus);
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
      console.log("🔍 [PUSH] Permissão solicitada, resultado:", finalStatus);
    }

    if (finalStatus !== "granted") {
      console.log("❌ [PUSH] Permissão negada pelo usuário");
      return null;
    }

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId;

    console.log("🔍 [PUSH] projectId:", projectId);

    if (!projectId) {
      console.log("❌ [PUSH] projectId não encontrado no app.json");
      return null;
    }

    console.log("🔍 [PUSH] Chamando getExpoPushTokenAsync...");
    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    const token = tokenData.data;

    console.log("📲 [PUSH] Token gerado:", token);
    await AsyncStorage.setItem("@expo_push_token", token);

    return token;
  } catch (error) {
    console.log("❌ [PUSH] Erro completo:", JSON.stringify(error));
    return null;
  }
}