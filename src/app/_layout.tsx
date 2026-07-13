import NetInfo from "@react-native-community/netinfo";
import { Stack, useRootNavigationState, useRouter, useSegments } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Platform, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import * as NavigationBar from "expo-navigation-bar";

import { sincronizarChamados } from "@/services/chamadosSync";
import { verificarSessao } from "@/services/session";
import { sincronizarPendentes } from "@/services/sync";
import { ThemeProvider, useTheme } from "../theme/ThemeContext";

Notifications.setNotificationHandler({
  handleNotification: async () =>
  ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  } as Notifications.NotificationBehavior),
});

function NavigationGuard() {
  const router = useRouter();
  const segments = useSegments();
  const navigationState = useRootNavigationState();
  const [carregandoSessao, setCarregandoSessao] = useState(true);

  useEffect(() => {
    // Só prossegue se a árvore de navegação do Expo já estiver pronta
    if (!navigationState?.key) return;

    async function validarRotas() {
      try {
        const logado = await verificarSessao();
        const primeiroSegmento = String(segments?.[0] || "").trim();
        const estaNaTelaDeLogin = primeiroSegmento === "login" || primeiroSegmento === "";

        // O setTimeout joga o redirecionamento para o próximo "tick" do renderizador,
        // garantindo que a Stack/Slot já esteja montada na tela.
        setTimeout(() => {
          if (!logado && !estaNaTelaDeLogin) {
            router.replace("/");
          } else if (logado && estaNaTelaDeLogin) {
            router.replace("/home");
          }
        }, 0);
      } catch (e) {
        console.error("Erro ao validar rotas:", e);
      } finally {
        setCarregandoSessao(false);
      }
    }

    validarRotas();
  }, [navigationState?.key, segments]);

  if (carregandoSessao) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#0f172a" }}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="home" />
      <Stack.Screen name="notificacoes" />
      <Stack.Screen name="perfil" />
      <Stack.Screen name="configuracoes" />
    </Stack>
  );
}

function AppContent() {
  const { theme, darkMode } = useTheme();

  useEffect(() => {
    if (Platform.OS === "android") {
      async function aplicarCorBarraAndroid() {
        try {
          // 1. Torna a barra absoluta para o conteúdo passar por baixo
          await NavigationBar.setPositionAsync("absolute");

          // 2. Torna o fundo da barra transparente
          await NavigationBar.setBackgroundColorAsync("transparent");

          // 3. Define a cor dos botões (light = ícones brancos no escuro, dark = pretos no claro)
          await NavigationBar.setButtonStyleAsync(darkMode ? "light" : "dark");
        } catch (error) {
          console.error("Erro ao configurar NavigationBar:", error);
        }
      }

      aplicarCorBarraAndroid();
    }
  }, [darkMode, theme]);

  useEffect(() => {
    const unsubscribeNet = NetInfo.addEventListener((state) => {
      if (state.isConnected && state.isInternetReachable) {
        sincronizarPendentes();
        sincronizarChamados();
      }
    });

    const subscription = Notifications.addNotificationReceivedListener(async (notification) => {
      try {
        const { title, body, data } = notification.request.content;
        const tipoNotificacao = data?.tipo || "novo";
        const uniqueId = data?.uniqueId || `push_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

        const novaNotificacao = {
          uniqueId: uniqueId,
          titulo: title || "Nova Notificação",
          mensagem: body || "",
          tipo: tipoNotificacao,
          lida: false,
          timestamp: new Date().toISOString(),
          data: new Date().toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          }),
        };

        const salvas = await AsyncStorage.getItem("@notificacoes");
        let listaAtual = salvas ? JSON.parse(salvas) : [];

        const jaExiste = listaAtual.some((item: any) => item.uniqueId === uniqueId);

        if (!jaExiste) {
          listaAtual.unshift(novaNotificacao);
          await AsyncStorage.setItem("@notificacoes", JSON.stringify(listaAtual));
        }
      } catch (error) {
        console.error("❌ Erro ao processar gravação do push:", error);
      }
    });

    return () => {
      unsubscribeNet();
      subscription.remove();
    };
  }, []);

  return <NavigationGuard />;
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}