import React, { useEffect, useState, useRef } from "react";
import {
  ScrollView,
  StatusBar,
  Switch,
  Text,
  TouchableOpacity,
  View,
  Animated
} from "react-native";

import { ScreenWrapper } from "@/components/ScreenWrapper";
import { obterStatusNotificacaoSalva, requisitarEPersistirPermissao } from "@/services/notifications";
import { logout } from "@/services/session";
import { useTheme } from "@/theme/ThemeContext";
import { useRouter } from "expo-router";
import {
  ArrowLeft,
  Bell,
  ChevronRight,
  Info,
  LogOut,
  Moon,
  Shield,
  Terminal,
  User
} from "lucide-react-native";
import { styles } from "../styles/settings.styles";

// Componente auxiliar para fazer os itens surgirem suavemente de baixo para cima
function FadeInItem({ children, delay }: { children: React.ReactNode; delay: number }) {
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: 1,
      duration: 1000,
      delay: delay,
      useNativeDriver: true,
    }).start();
  }, []);

  const translateY = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [15, 0],
  });

  return (
    <Animated.View style={{ opacity: animatedValue, transform: [{ translateY }] }}>
      {children}
    </Animated.View>
  );
}

export default function Configuracoes() {
  const router = useRouter();
  const { theme, darkMode, toggleTheme } = useTheme();

  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  
  // Valor animado para controlar o fade na troca de tema
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    async function carregarPreferencia() {
      const ativado = await obterStatusNotificacaoSalva();
      setNotificationsEnabled(ativado);
    }
    carregarPreferencia();
  }, []);

  async function handleToggleNotifications(valor: boolean) {
    const resultado = await requisitarEPersistirPermissao(valor);
    setNotificationsEnabled(resultado);
  }

  // Função que faz o fade out, troca o tema e depois faz o fade in suave
  function handleToggleTheme(valor: boolean) {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 10,
      useNativeDriver: true,
    }).start(() => {
      toggleTheme(valor);

      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 901,
        useNativeDriver: true,
      }).start();
    });
  }

  async function fazerLogout() {
    await logout();
    router.replace("/");
  }

  return (
    <ScreenWrapper
      style={[
        styles.container,
        {
          backgroundColor: theme.background,
        },
      ]}
    >
      <StatusBar barStyle={darkMode ? "light-content" : "dark-content"} />

      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        
        {/* HEADER */}
        <View
          style={[
            styles.header,
            {
              backgroundColor: theme.background,
            },
          ]}
        >
          <TouchableOpacity
            style={[
              styles.backBtn,
              {
                backgroundColor: theme.card,
                borderColor: theme.border,
              },
            ]}
            onPress={() => router.back()}
          >
            <ArrowLeft color={theme.text} size={24} />
          </TouchableOpacity>

          <Text style={[styles.title, { color: theme.text }]}>
            Configurações
          </Text>

          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          
          {/* SEÇÃO: CONTA */}
          <FadeInItem delay={100}>
            <Text style={[styles.sectionTitle, { color: theme.subText }]}>
              Conta
            </Text>

            <TouchableOpacity
              style={[
                styles.item,
                {
                  backgroundColor: theme.card,
                  borderColor: theme.border,
                },
              ]}
              onPress={() => router.navigate("/perfil")}
            >
              <View style={styles.itemLeft}>
                <User color={theme.primary} size={22} />
                <View>
                  <Text style={[styles.itemTitle, { color: theme.text }]}>
                    Perfil
                  </Text>
                  <Text style={[styles.itemSubtitle, { color: theme.subText }]}>
                    Editar dados do usuário
                  </Text>
                </View>
              </View>

              <ChevronRight color={theme.subText} size={22} />
            </TouchableOpacity>
          </FadeInItem>

          {/* SEÇÃO: PREFERÊNCIAS */}
          <FadeInItem delay={200}>
            <Text style={[styles.sectionTitle, { color: theme.subText }]}>
              Preferências
            </Text>

            <View
              style={[
                styles.item,
                {
                  backgroundColor: theme.card,
                  borderColor: theme.border,
                },
              ]}
            >
              <View style={styles.itemLeft}>
                <Bell color={theme.primary} size={22} />
                <View>
                  <Text style={[styles.itemTitle, { color: theme.text }]}>
                    Notificações
                  </Text>
                  <Text
                    style={[
                      styles.itemSubtitle,
                      {
                        color: notificationsEnabled ? "#22c55e" : "#ef4444",
                        fontWeight: "600",
                      },
                    ]}
                  >
                    {notificationsEnabled ? "● Notificações ativadas" : "○ Notificações desativadas"}
                  </Text>
                </View>
              </View>

              <Switch
                value={notificationsEnabled}
                onValueChange={handleToggleNotifications}
                trackColor={{
                  false: theme.border,
                  true: theme.primary,
                }}
                thumbColor="#fff"
              />
            </View>

            <View
              style={[
                styles.item,
                {
                  backgroundColor: theme.card,
                  borderColor: theme.border,
                },
              ]}
            >
              <View style={styles.itemLeft}>
                <Moon color={theme.primary} size={22} />
                <View>
                  <Text style={[styles.itemTitle, { color: theme.text }]}>
                    Modo escuro
                  </Text>
                  <Text style={[styles.itemSubtitle, { color: theme.subText }]}>
                    Tema escuro ativado
                  </Text>
                </View>
              </View>

              <Switch
                value={darkMode}
                onValueChange={handleToggleTheme}
                trackColor={{
                  false: theme.border,
                  true: theme.primary,
                }}
                thumbColor="#fff"
              />
            </View>
          </FadeInItem>

          {/* SEÇÃO: SISTEMA */}
          <FadeInItem delay={300}>
            <Text style={[styles.sectionTitle, { color: theme.subText }]}>
              Sistema
            </Text>

            <TouchableOpacity
              style={[
                styles.item,
                {
                  backgroundColor: theme.card,
                  borderColor: theme.border,
                },
              ]}
              onPress={() =>router.navigate("/seguranca")}
            >
              <View style={styles.itemLeft}>
                <Shield color={theme.primary} size={22} />
                <View>
                  <Text style={[styles.itemTitle, { color: theme.text }]}>
                    Segurança
                  </Text>
                  <Text style={[styles.itemSubtitle, { color: theme.subText }]}>
                    Senha e privacidade
                  </Text>
                </View>
              </View>

              <ChevronRight color={theme.subText} size={22} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.item,
                {
                  backgroundColor: theme.card,
                  borderColor: theme.border,
                },
              ]}
              onPress={() => router.navigate("/logs")}
            >
              <View style={styles.itemLeft}>
                <Terminal color={theme.primary} size={22} />
                <View>
                  <Text style={[styles.itemTitle, { color: theme.text }]}>
                    Logs do Sistema (DEV)
                  </Text>
                  <Text style={[styles.itemSubtitle, { color: theme.subText }]}>
                    Histórico de erros e requisições
                  </Text>
                </View>
              </View>

              <ChevronRight color={theme.subText} size={22} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.item,
                {
                  backgroundColor: theme.card,
                  borderColor: theme.border,
                },
              ]}
              onPress={() => router.navigate("/about")}
            >
              <View style={styles.itemLeft}>
                <Info color={theme.primary} size={22} />
                <View>
                  <Text style={[styles.itemTitle, { color: theme.text }]}>
                    Sobre o aplicativo
                  </Text>
                  <Text style={[styles.itemSubtitle, { color: theme.subText }]}>
                    Versão 1.4.0
                  </Text>
                </View>
              </View>

              <ChevronRight color={theme.subText} size={22} />
            </TouchableOpacity>
          </FadeInItem>

          {/* BOTÃO DE SAIR */}
          <FadeInItem delay={400}>
            <TouchableOpacity style={styles.logoutBtn} onPress={fazerLogout}>
              <LogOut color="#fff" size={20} />
              <Text style={styles.logoutText}>Sair</Text>
            </TouchableOpacity>
          </FadeInItem>
          
        </ScrollView>
      </Animated.View>
    </ScreenWrapper>
  );
}