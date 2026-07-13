import { salvarSessaoOnline, verificarSessao } from "@/services/session";
import { registrarDispositivo } from "@/services/Pushnotifications";
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Application from 'expo-application';
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  View
} from "react-native";
import { styles } from "../styles/index.styles";

import { Button } from "@/components/Button";
import { Input } from "@/components/input";
import { isOnline } from '@/services/network';

let alertaInicialVisivel = false;

export default function App() {
  const [login, setLogin] = useState("");
  const [senha, setSenha] = useState("");
  const [verificando, setVerificando] = useState(true);
  const [mounted, setMounted] = useState(false);

  const router = useRouter();

 useEffect(() => {
  setMounted(true);
}, []);

useEffect(() => {
  if (mounted) checarAutoLogin();
}, [mounted]);

  // Função auxiliar para capturar o ID único do dispositivo de forma persistente
  async function getDeviceDetails() {
    let deviceId = "";
    if (Platform.OS === 'android') {
      deviceId = Application.getAndroidId() ?? "";
    } else if (Platform.OS === 'ios') {
      deviceId = await Application.getIosIdForVendorAsync() ?? "";
    }

    return {
      deviceId: deviceId,
      deviceType: Platform.OS
    };
  }

  async function checarAutoLogin() {
    try {
      const tokenSalvo = await AsyncStorage.getItem("token");
      const representativeId = await AsyncStorage.getItem("representative_id");

      if (!tokenSalvo) {
        setVerificando(false);
        return;
      }

      const online = await isOnline();

      if (online) {
        // 1. Recupera o device_id do cache primeiro para evitar falhas nativas
        let deviceId = await AsyncStorage.getItem("device_id");
        if (!deviceId) {
          const deviceDetails = await getDeviceDetails();
          deviceId = deviceDetails.deviceId;
          if (deviceId) await AsyncStorage.setItem("device_id", deviceId);
        }

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
            device_id: deviceId // Usa o ID consistente
          }),
        });

        // Se o servidor retornar um erro HTTP gritante (Ex: 500, 502), não deslogue!
        if (!response.ok && response.status !== 401) {
          throw new Error("Servidor instável. Tentando modo offline.");
        }

        const data = await response.json();

        if (data.status === "success" && data.data?.status === "success") {
          const novoToken = data.data.data;
          await AsyncStorage.setItem("token", novoToken);
          await AsyncStorage.setItem("@ultimo_login_online", String(Date.now()));

          if (representativeId) {
            await carregarChamadosInicial(novoToken, representativeId);
          }

          router.replace("/home");
          return;
        }

       
        // 2. SÓ limpa a sessão se o backend invalidar explicitamente por regra de negócio
        if (data.data?.code === "SESSION_TERMINATED" || response.status === 401) {
          await limparSessaoLocal();

          // Se o alerta já está na tela, mata a execução das outras chamadas paralelas aqui
          if (alertaInicialVisivel) {
            return;
          }

          alertaInicialVisivel = true;

          Alert.alert(
            "Sessão Encerrada",
            data.data?.message || "Por favor, faça login novamente.",
            [
              {
                text: "OK",
                onPress: () => {
                  alertaInicialVisivel = false;
                  // Garante que ele fique parado na tela de login
                  router.replace("/");
                }
              }
            ],
            { cancelable: false } // Evita fechar tocando fora no Android
          );

          return; 
        }
      } else {
        const sessaoValida = await verificarSessao();
        if (sessaoValida) {
          router.replace("/home");
          return;
        }
      }
    } catch (error) {
      console.log("Erro na verificação de inicialização (Redirecionando para Offline seguro):", error);
      // Se der erro de rede/fetch, tenta manter logado offline em vez de travar na tela de login
      const sessaoValida = await verificarSessao();
      if (sessaoValida) {
        router.replace("/home");
        return;
      }
    } finally {
      setVerificando(false);
    }
  }

  async function limparSessaoLocal() {
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
      "device_id"
    ]);
  }

  async function carregarChamadosInicial(token: string, representativeId: any) {
    try {
      const response = await fetch("https://browz.com.br/rest.php", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          class: "CalendarService",
          method: "loadAll",
        }),
      });

      const data = await response.json();

      if (data.status === "success") {
        const chamadosDoTecnico = data.data.filter(
          (calendar: any) =>
            Number(calendar.representative_id) === Number(representativeId)
        );

        await AsyncStorage.setItem(
          "@cache_chamados",
          JSON.stringify(chamadosDoTecnico)
        );
      }
    } catch (e) {
      console.log("Erro ao carregar chamados iniciais:", e);
    }
  }

  async function fazerLogin() {
    try {
      const online = await isOnline();

      if (!online) {
        const loginSalvo = await AsyncStorage.getItem("login");
        const senhaSalva = await AsyncStorage.getItem("senha");
        const sessaoValida = await verificarSessao();

        if (loginSalvo === login && senhaSalva === senha && sessaoValida) {
          Alert.alert("Modo Offline", "Entrando em modo Offline");
          router.replace("/home");
          return;
        }

        Alert.alert("Sem internet", "A sessão expirou ou as credenciais locais estão incorretas.");
        return;
      }

      // Obtém os dados únicos do hardware para vincular ao login no backend
      const deviceDetails = await getDeviceDetails();

      // Obtém push token antes do login para enviar junto
      const pushToken = await registrarDispositivo().catch(() => null);

      const response = await fetch("https://browz.com.br/rest.php", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Basic 94ru30984rvnh4r2rjo",
        },
        body: JSON.stringify({
          class: "ApplicationAuthenticationRestService",
          method: "getToken",
          login: login,
          password: senha,
          device_id: deviceDetails.deviceId,
          device_type: deviceDetails.deviceType,
          push_token: pushToken ?? "",
        }),
      });

      const data = await response.json();

      if (data.status === "success") {
        const token = data.data;
        const payload = JSON.parse(atob(token.split(".")[1]));

        const nome = payload.username || login;
        const perfil = "Técnico";
        const representativeId = payload.userid;

        // Persiste as informações de login e o device_id de forma síncrona
        await salvarSessaoOnline(token, login, senha);
        await AsyncStorage.setItem("device_id", deviceDetails.deviceId);
        await AsyncStorage.setItem("nome", nome);
        await AsyncStorage.setItem("perfil", perfil);
        await AsyncStorage.setItem("representative_id", String(representativeId));

        await carregarChamadosInicial(token, representativeId);

        router.replace("/home");
      } else {
        Alert.alert("Erro", data.data || "Login ou senha inválidos");
      }

    } catch (error: any) {
      console.log("ERRO NO LOGIN:", error.message);
      Alert.alert("Erro", "Não foi possível conectar ao servidor");
    }
  }

  if (verificando) {
    return (
      <View style={{ flex: 1, backgroundColor: "#0D0D0D", justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.select({ ios: "padding", android: "height" })}
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <View style={styles.fundo}>
          <View style={styles.container}>
            <Image source={require("@/assets/browz.png")} style={styles.logo} />
            <View style={styles.form}>
              <Input placeholder="Login" value={login} onChangeText={setLogin} placeholderTextColor="#a09e9ec7" />
              <Input placeholder="Senha" value={senha} onChangeText={setSenha} secureTextEntry placeholderTextColor="#a09e9ec7" />
              <Button label="Entrar" onPress={fazerLogin} />
            </View>
            <View style={styles.divider} />
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}