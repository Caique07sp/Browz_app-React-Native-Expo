import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";

const NOTIFICATION_KEY = "@config_notifications_enabled";

export async function requisitarEPersistirPermissao(ativar: boolean): Promise<boolean> {
  if (!ativar) {
    // Salva localmente que o usuário desligou
    await AsyncStorage.setItem(NOTIFICATION_KEY, "false");
    return false;
  }

  // Se o usuário quer ativar, checa a permissão nativa do sistema
  const settings = await Notifications.getPermissionsAsync();
  let status = settings.status;

  if (status !== "granted") {
    const response = await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowBadge: true, allowSound: true },
    });
    status = response.status;
  }

  if (status === "granted") {
    await AsyncStorage.setItem(NOTIFICATION_KEY, "true");
    return true;
  } else {
    // Se o celular negou nativamente, mantém falso
    await AsyncStorage.setItem(NOTIFICATION_KEY, "false");
    return false;
  }
}

export async function obterStatusNotificacaoSalva(): Promise<boolean> {
  const salvo = await AsyncStorage.getItem(NOTIFICATION_KEY);
  // Se for a primeira vez acessando (novo celular), o padrão é pedir para ativar (retorna true)
  return salvo !== "false";
}