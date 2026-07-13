import React, { useEffect, useState } from "react";
import {
  ScrollView,
  StatusBar,
  Switch,
  Text,
  TouchableOpacity,
  View
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

export default function Configuracoes() {
  const router = useRouter();
  const { theme, darkMode, toggleTheme } = useTheme();

  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  // 1. Carrega o estado que está persistido no AsyncStorage ao entrar na tela
  useEffect(() => {
    async function carregarPreferencia() {
      const ativado = await obterStatusNotificacaoSalva();
      setNotificationsEnabled(ativado);
    }
    carregarPreferencia();
  }, []);

  // 2. Manipula a alteração do Switch salvando a preferência
  async function handleToggleNotifications(valor: boolean) {
    const resultado = await requisitarEPersistirPermissao(valor);
    setNotificationsEnabled(resultado);
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
          onPress={() => router.push("/perfil")}
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

        {/* SEÇÃO: PREFERÊNCIAS */}
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
            onValueChange={toggleTheme}
            trackColor={{
              false: theme.border,
              true: theme.primary,
            }}
            thumbColor="#fff"
          />
        </View>

        {/* SEÇÃO: SISTEMA */}
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
          onPress={() => router.push("/seguranca")}
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

        {/* LOGS DO SISTEMA */}
        <TouchableOpacity
          style={[
            styles.item,
            {
              backgroundColor: theme.card,
              borderColor: theme.border,
            },
          ]}
          onPress={() => router.push("/logs")}
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

        {/* SOBRE O APLICATIVO */}
        <TouchableOpacity
          style={[
            styles.item,
            {
              backgroundColor: theme.card,
              borderColor: theme.border,
            },
          ]}
          onPress={() => router.push("/about")}
        >
          <View style={styles.itemLeft}>
            <Info color={theme.primary} size={22} />
            <View>
              <Text style={[styles.itemTitle, { color: theme.text }]}>
                Sobre o aplicativo
              </Text>
              <Text style={[styles.itemSubtitle, { color: theme.subText }]}>
                Versão 1.0.0_08072026_1727
              </Text>
            </View>
          </View>

          <ChevronRight color={theme.subText} size={22} />
        </TouchableOpacity>

        {/* BOTÃO DE SAIR */}
        <TouchableOpacity style={styles.logoutBtn} onPress={fazerLogout}>
          <LogOut color="#fff" size={20} />
          <Text style={styles.logoutText}>Sair</Text>
        </TouchableOpacity>
      </ScrollView>
    </ScreenWrapper>
  );
}