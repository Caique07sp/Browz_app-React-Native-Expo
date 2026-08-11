import AsyncStorage from "@react-native-async-storage/async-storage";
import { isOnline } from "./network";
import { sincronizarPendentes } from "./sync";

const SESSION_LIMIT = 7 * 24 * 60 * 60 * 1000;

// CONTROLE DE CONCORRÊNCIA: Impede chamadas simultâneas
let checagemEmAndamento: Promise<boolean> | null = null;

export async function salvarSessaoOnline(token: string, login: string, senha: string) {
  await AsyncStorage.setItem("token", token);
  await AsyncStorage.setItem("login", login);
  await AsyncStorage.setItem("senha", senha);
  await AsyncStorage.setItem("@ultimo_login_online", String(Date.now()));
}

export async function verificarSessao(): Promise<boolean> {
  const ultimoLogin = await AsyncStorage.getItem("@ultimo_login_online");
  const token = await AsyncStorage.getItem("token");

  if (!token || !ultimoLogin) {
    return false;
  }

  const expirou = Date.now() - Number(ultimoLogin) > SESSION_LIMIT;

  if (expirou) {
    await deslogarForcado();
    return false;
  }

  const online = await isOnline();

  if (online) {
    await AsyncStorage.setItem("@ultimo_login_online", String(Date.now()));
    // Executa em background sem dar await travando o fluxo da tela
    sincronizarPendentes().catch(e => console.log("Erro sync background:", e));
  }

  return true; 
}

export async function validarSessaoDispositivo(): Promise<boolean> {
  // Se já houver uma validação idêntica voando via HTTP, reaproveita a mesma promessa
  // Isso evita o atropelo de tokens idênticos sendo enviados seguidamente
  if (checagemEmAndamento) {
    return checagemEmAndamento;
  }

  checagemEmAndamento = (async () => {
    try {
      const online = await isOnline();
      if (!online) return true; 

      const tokenSalvo = await AsyncStorage.getItem("token");
      const deviceId = await AsyncStorage.getItem("device_id") || ""; 

      if (!tokenSalvo) return false;

      const response = await fetch("https://browz.com.br/rest.php", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Basic 94ru30984rvnh4r2rjo",
        },
        body: JSON.stringify({
          class: "ApplicationAuthenticationRestService",
          method: "refreshToken",
          token: tokenSalvo,
          device_id: deviceId
        }),
      });

      const data = await response.json();

      if (data.status === "success" && data.data?.status === "success") {
        if (data.data.data) {
          await AsyncStorage.setItem("token", data.data.data);
        }
        await AsyncStorage.setItem("@ultimo_login_online", String(Date.now()));
        return true;
      }

      // Se o backend explicitamente barrou por SESSION_TERMINATED
      if (data.data?.code === "SESSION_TERMINATED") {
        return false;
      }

      // Para qualquer outro erro de rede instável ou timeout, não desloga o usuário direto
      return true; 

    } catch (error) {
      //console.log("Erro ao validar sessão em tempo real:", error);
      return true; 
    } finally {
      checagemEmAndamento = null; // Libera o semáforo
    }
  })();

  return checagemEmAndamento;
}

export async function deslogarForcado() {
  await AsyncStorage.multiRemove([
    "token",
    "login",
    "senha",
    "name",
    "perfil",
    "representative_id",
    "@ultimo_login_online",
    "@cache_chamados",
    "@offline_queue",
    "device_id"
  ]);
}
export async function logout() {
  await AsyncStorage.multiRemove([
    "token",
    "login",
    "senha",
    "name",
    "perfil",
    "representative_id",
    "@ultimo_login_online",
    "@cache_chamados",
    "@offline_queue",
    "device_id"
  ]);
}