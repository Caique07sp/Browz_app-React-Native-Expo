import { Stack, useRouter, useSegments, useRootNavigationState } from "expo-router";
import { useEffect, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import NetInfo from "@react-native-community/netinfo";

import { ThemeProvider } from "../theme/ThemeContext";
import { verificarSessao } from "@/services/session";
import { sincronizarPendentes } from "@/services/sync";
import { sincronizarChamados } from "@/services/chamadosSync";

function NavigationGuard() {
  const router = useRouter();
  const segments = useSegments();
  const navigationState = useRootNavigationState();
  const [carregandoSessao, setCarregandoSessao] = useState(true);

  useEffect(() => {
    // Se o roteador nativo do Expo não estiver pronto, não faz nada ainda
    if (!navigationState?.key) return;

    async function validarRotas() {
  try {
    const logado = await verificarSessao();
    
    // Forçamos o primeiro segmento a ser uma string limpa.
    // Se o usuário estiver na raiz ("/"), o primeiro segmento será uma string vazia ou undefined.
    const primeiroSegmento = String(segments?.[0] || "").trim();
    
    // Se não houver primeiro segmento ou se ele for explicitamente "index", está na tela de login
    const estaNaTelaDeLogin = primeiroSegmento === "" || primeiroSegmento === "index";

    if (logado && estaNaTelaDeLogin) {
      router.replace("/home");
    } else if (!logado && !estaNaTelaDeLogin) {
      router.replace("/");
    }
  } catch (error) {
    console.error("Erro na validação de rotas:", error);
  } finally {
    setCarregandoSessao(false);
  }
}

    validarRotas();
  }, [segments, navigationState?.key]);

  // Enquanto valida a sessão ou espera o roteador, segura no loading
  if (!navigationState?.key || carregandoSessao) {
    return (
      <View style={{ flex: 1, backgroundColor: "#0D0D0D", justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}

export default function Layout() {
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(async (state) => {
      const online = state.isConnected === true && state.isInternetReachable !== false;
      if (online) {
        await sincronizarPendentes();
        await sincronizarChamados();
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <ThemeProvider>
      <NavigationGuard />
    </ThemeProvider>
  );
}