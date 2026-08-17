import AsyncStorage from "@react-native-async-storage/async-storage";
import { isOnline } from "./network";
import { sincronizarPendentes } from "./sync";
import { getApiUrl } from "./api";

const SESSION_LIMIT = 7 * 24 * 60 * 60 * 1000;
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
    sincronizarPendentes().catch(e => console.log("Erro sync background:", e));
  }

  return true; 
}

export async function validarSessaoDispositivo(): Promise<boolean> {
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

      const response = await fetch(await getApiUrl(), {
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

      if (data.data?.code === "SESSION_TERMINATED") {
        return false;
      }

      return true; 

    } catch (error) {
      return true; 
    } finally {
      checagemEmAndamento = null; 
    }
  })();

  return checagemEmAndamento;
}

// NOVA FUNÇÃO: Limpeza profunda que varre todas as chaves dinamicamente
export async function limparDadosEmpresaCompleto() {
  const todasAsChaves = await AsyncStorage.getAllKeys();
  
  // Array com configurações GLOBAIS do app que pertencem ao dispositivo e não à empresa
  const chavesParaManter = [
    "device_id", 
    "@lembrar_login",
    "@theme"
    // Nota: A chave que armazena o próprio domínio não entra aqui porque 
    // a api cuidará de atualizá-la, mas o cache da empresa antiga vai sumir.
  ];

  const chavesParaRemover = todasAsChaves.filter(chave => !chavesParaManter.includes(chave));
  
  if (chavesParaRemover.length > 0) {
    await AsyncStorage.multiRemove(chavesParaRemover);
  }
}

export async function deslogarForcado() {
  await limparDadosEmpresaCompleto();
}

export async function logout() {
  await limparDadosEmpresaCompleto();
}