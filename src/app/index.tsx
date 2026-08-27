import { registrarDispositivo } from "@/services/Pushnotifications";
import { getApiUrl, obterDominio, salvarDominio } from "@/services/api";
// Modificação: Importando a nova função de limpeza profunda do session
import { salvarSessaoOnline, verificarSessao, limparDadosEmpresaCompleto } from "@/services/session";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Application from "expo-application";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { isOnline } from "@/services/network";
import { styles } from "../styles/index.styles";

let alertaInicialVisivel = false;

export default function App() {
  const [dominio, setDominio] = useState("");
  const [login, setLogin] = useState("");
  const [senha, setSenha] = useState("");
  const [lembrarLogin, setLembrarLogin] = useState(false);
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [verificando, setVerificando] = useState(true);
  const [mounted, setMounted] = useState(false);

  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      carregarDominioSalvo();
      carregarLoginSalvo();
      checarAutoLogin();
    }
  }, [mounted]);

  async function carregarDominioSalvo() {
    try {
      const dominioSalvo = await obterDominio();
      if (dominioSalvo) {
        setDominio(dominioSalvo);
      }
    } catch (e) {
      // Falha silenciosa
    }
  }

  async function carregarLoginSalvo() {
    try {
      const loginGuardado = await AsyncStorage.getItem("@lembrar_login");
      if (loginGuardado) {
        setLogin(loginGuardado);
        setLembrarLogin(true);
      }
    } catch (e) {
      // Falha silenciosa
    }
  }

  async function getDeviceDetails() {
    let deviceId = "";
    if (Platform.OS === "android") {
      deviceId = Application.getAndroidId() ?? "";
    } else if (Platform.OS === "ios") {
      deviceId = (await Application.getIosIdForVendorAsync()) ?? "";
    }
    return {
      deviceId: deviceId,
      deviceType: Platform.OS,
    };
  }

  async function checarAutoLogin() {
    try {
      const tokenSalvo = await AsyncStorage.getItem("token");
      const representativeId = await AsyncStorage.getItem("representative_id");
      const dominioSalvo = await obterDominio();

      if (!tokenSalvo || !dominioSalvo) {
        setVerificando(false);
        return;
      }

      const online = await isOnline();

      if (online) {
        let deviceId = await AsyncStorage.getItem("device_id");
        if (!deviceId) {
          const deviceDetails = await getDeviceDetails();
          deviceId = deviceDetails.deviceId;
          if (deviceId) await AsyncStorage.setItem("device_id", deviceId);
        }

        const response = await fetch(await getApiUrl(), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: process.env.EXPO_PUBLIC_API_BASIC_AUTH,
          },
          body: JSON.stringify({
            class: "ApplicationAuthenticationRestService",
            method: "refreshToken",
            token: tokenSalvo,
            device_id: deviceId,
          }),
        });

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

        if (data.data?.code === "SESSION_TERMINATED" || response.status === 401) {
          // Utiliza a nova função centralizada
          await limparDadosEmpresaCompleto();

          if (alertaInicialVisivel) return;
          alertaInicialVisivel = true;

          Alert.alert(
            "Sessão Encerrada",
            data.data?.message || "Por favor, faça login novamente.",
            [
              {
                text: "OK",
                onPress: () => {
                  alertaInicialVisivel = false;
                  router.replace("/");
                },
              },
            ],
            { cancelable: false }
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
      const sessaoValida = await verificarSessao();
      if (sessaoValida) {
        router.replace("/home");
        return;
      }
    } finally {
      setVerificando(false);
    }
  }

  async function carregarChamadosInicial(token: string, representativeId: any) {
    try {
      const response = await fetch(await getApiUrl(), {
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
      // Ignora erro
    }
  }

  async function fazerLogin() {
    try {
      if (!dominio.trim()) {
        Alert.alert("Domínio obrigatório", "Informe o domínio da sua empresa para continuar.");
        return;
      }

      // --- NOVA LÓGICA DE ISOLAMENTO DE DOMÍNIO ---
      const dominioInformadoNormalizado = dominio.trim().toLowerCase();
      const dominioAnterior = await obterDominio();
      const dominioAnteriorNormalizado = dominioAnterior ? dominioAnterior.trim().toLowerCase() : "";

      // Verifica se existe um domínio salvo E se ele é diferente do informado agora
      if (dominioAnteriorNormalizado && dominioAnteriorNormalizado !== dominioInformadoNormalizado) {
        // Bloqueia a execução, limpa completamente o banco do AsyncStorage
        await limparDadosEmpresaCompleto();
      }

      // Só então atualiza o domínio global
      const dominioSalvo = await salvarDominio(dominioInformadoNormalizado);
      setDominio(dominioSalvo);
      // --------------------------------------------

      if (lembrarLogin) {
        await AsyncStorage.setItem("@lembrar_login", login);
      } else {
        await AsyncStorage.removeItem("@lembrar_login");
      }

      const online = await isOnline();

      if (!online) {
        const loginSalvo = await AsyncStorage.getItem("login");
        const senhaSalva = await AsyncStorage.getItem("senha");
        const sessaoValida = await verificarSessao();

        // Se trocou o domínio off-line, a limpeza acima apagou loginSalvo, logo isso falhará corretamente.
        if (loginSalvo === login && senhaSalva === senha && sessaoValida) {
          Alert.alert("Modo Offline", "Entrando em modo Offline");
          router.replace("/home");
          return;
        }

        Alert.alert(
          "Sem internet",
          "A sessão expirou ou as credenciais locais estão incorretas."
        );
        return;
      }

      const deviceDetails = await getDeviceDetails();
      const pushToken = await registrarDispositivo().catch(() => null);

      const response = await fetch(await getApiUrl(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: process.env.EXPO_PUBLIC_API_BASIC_AUTH,
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

        await salvarSessaoOnline(token, login, senha);
        await AsyncStorage.setItem("device_id", deviceDetails.deviceId);
        await AsyncStorage.setItem("nome", nome);
        await AsyncStorage.setItem("perfil", perfil);
        await AsyncStorage.setItem(
          "representative_id",
          String(representativeId)
        );

        await carregarChamadosInicial(token, representativeId);

        router.replace("/home");
      } else {
        Alert.alert("Erro", data.data || "Login ou senha inválidos");
      }
    } catch (error: any) {
      Alert.alert("Erro", "Não foi possível conectar ao servidor");
    }
  }

  if (verificando) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0052FF" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.flexOne}
      behavior={Platform.select({ ios: "padding", android: "height" })}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        <View style={styles.background}>
          <View style={styles.card}>
            <View style={styles.logoContainer}>
              <Image source={require("@/assets/new_logo_horizontal_black.png")} style={{ ...styles.logoImage, width: 1000 }} resizeMode="contain" />
              <Text style={styles.subtitleText}>
                Gestão de <Text style={styles.boldBlueText}>serviços</Text> na palma da sua <Text style={styles.boldBlueText}>mão.</Text>
              </Text>
            </View>

            <View style={styles.form}>
              <View style={styles.inputContainer}>
                <View style={styles.iconBox}>
                  <Ionicons name="business-outline" size={20} color="#0052FF" />
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="Domínio"
                  value={dominio}
                  onChangeText={setDominio}
                  placeholderTextColor="#A0A0A0"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <View style={styles.inputContainer}>
                <View style={styles.iconBox}>
                  <Ionicons name="person-outline" size={20} color="#0052FF" />
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="Login"
                  value={login}
                  onChangeText={setLogin}
                  placeholderTextColor="#A0A0A0"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputContainer}>
                <View style={styles.iconBox}>
                  <Ionicons name="lock-closed-outline" size={20} color="#0052FF" />
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="Senha"
                  value={senha}
                  onChangeText={setSenha}
                  secureTextEntry={!mostrarSenha}
                  placeholderTextColor="#A0A0A0"
                />
                <TouchableOpacity style={styles.eyeIcon} onPress={() => setMostrarSenha(!mostrarSenha)}>
                  <Ionicons name={mostrarSenha ? "eye-off-outline" : "eye-outline"} size={22} color="#A0A0A0" />
                </TouchableOpacity>
              </View>

              <View style={styles.optionsRow}>
                <TouchableOpacity style={styles.checkboxContainer} onPress={() => setLembrarLogin(!lembrarLogin)}>
                  <View style={[styles.checkbox, lembrarLogin && styles.checkboxChecked]}>
                    {lembrarLogin && <Ionicons name="checkmark" size={14} color="#FFF" />}
                  </View>
                  <Text style={styles.checkboxLabel}>Lembrar meu login</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={styles.buttonSubmit} onPress={fazerLogin} activeOpacity={0.8}>
                <Ionicons name="arrow-forward-outline" size={20} color="#FFF" style={{ marginRight: 8 }} />
                <Text style={styles.buttonSubmitText}>Entrar</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.versionText}>Versão 1.4.0</Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}