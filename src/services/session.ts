import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { isOnline } from "./network";
import { sincronizarPendentes } from "./sync";

const SESSION_LIMIT = 7 * 24 * 60 * 60 * 1000;

export async function salvarSessaoOnline(token: string, login: string, senha: string) {
  await AsyncStorage.setItem("token", token);
  await AsyncStorage.setItem("login", login);
  await AsyncStorage.setItem("senha", senha);
  await AsyncStorage.setItem("@ultimo_login_online", String(Date.now()));
}

// Alterado para retornar boolean (true = logado e válido, false = deslogado/expirado)
export async function verificarSessao(): Promise<boolean> {
  const ultimoLogin = await AsyncStorage.getItem("@ultimo_login_online");
  const token = await AsyncStorage.getItem("token");

  if (!token || !ultimoLogin) {
    return false;
  }


  const expirou = Date.now() - Number(ultimoLogin) > SESSION_LIMIT;

  if (expirou) {
    await AsyncStorage.multiRemove([
      "token",
      "login",
      "senha",
      "nome",
      "perfil",
      "representative_id",
      "@ultimo_login_online",
      "@cache_chamados",
      "@offline_queue",
    ]);

    return false;
  }

  const online = await isOnline();

  if (online) {
    await AsyncStorage.setItem("@ultimo_login_online", String(Date.now()));
    await sincronizarPendentes();
  }

  return true; // Sessão está ativa e dentro dos 7 dias!
}

export async function logout() {
  await AsyncStorage.multiRemove([
    "token",
    "login",
    "senha",
    "nome",
    "perfil",
    "representative_id",
    "@ultimo_login_online",
    "@cache_chamados",
    "@offline_queue",
  ]);
}