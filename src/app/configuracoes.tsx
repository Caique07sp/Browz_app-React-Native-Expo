import React, { useState } from "react";
import {
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Platform,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
  Switch,
} from "react-native";

import { useRouter } from "expo-router";

import {
  ArrowLeft,
  User,
  Bell,
  Shield,
  Moon,
  Info,
  LogOut,
  ChevronRight,
} from "lucide-react-native";

import { useTheme } from "@/theme/ThemeContext";

export default function Configuracoes() {
  const router = useRouter();

  const { theme, darkMode, toggleTheme } = useTheme();

  const [notificationsEnabled, setNotificationsEnabled] =
    useState(true);

  return (
    <SafeAreaView
      style={[
        styles.container,
        {
          backgroundColor: theme.background,
        },
      ]}
    >
      <StatusBar
        barStyle={
          darkMode
            ? "light-content"
            : "dark-content"
        }
      />

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
          <ArrowLeft
            color={theme.text}
            size={24}
          />
        </TouchableOpacity>

        <Text
          style={[
            styles.title,
            {
              color: theme.text,
            },
          ]}
        >
          Configurações
        </Text>

        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
      >
        <Text
          style={[
            styles.sectionTitle,
            {
              color: theme.subText,
            },
          ]}
        >
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
        >
          <View style={styles.itemLeft}>
            <User
              color={theme.primary}
              size={22}
            />

            <View>
              <Text
                style={[
                  styles.itemTitle,
                  {
                    color: theme.text,
                  },
                ]}
              >
                Perfil
              </Text>

              <Text
                style={[
                  styles.itemSubtitle,
                  {
                    color: theme.subText,
                  },
                ]}
              >
                Editar dados do usuário
              </Text>
            </View>
          </View>

          <ChevronRight
            color={theme.subText}
            size={22}
          />
        </TouchableOpacity>

        <Text
          style={[
            styles.sectionTitle,
            {
              color: theme.subText,
            },
          ]}
        >
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
            <Bell
              color={theme.primary}
              size={22}
            />

            <View>
              <Text
                style={[
                  styles.itemTitle,
                  {
                    color: theme.text,
                  },
                ]}
              >
                Notificações
              </Text>

              <Text
                style={[
                  styles.itemSubtitle,
                  {
                    color: theme.subText,
                  },
                ]}
              >
                Receber alertas de chamados
              </Text>
            </View>
          </View>

          <Switch
            value={notificationsEnabled}
            onValueChange={
              setNotificationsEnabled
            }
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
            <Moon
              color={theme.primary}
              size={22}
            />

            <View>
              <Text
                style={[
                  styles.itemTitle,
                  {
                    color: theme.text,
                  },
                ]}
              >
                Modo escuro
              </Text>

              <Text
                style={[
                  styles.itemSubtitle,
                  {
                    color: theme.subText,
                  },
                ]}
              >
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

        <Text
          style={[
            styles.sectionTitle,
            {
              color: theme.subText,
            },
          ]}
        >
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
        >
          <View style={styles.itemLeft}>
            <Shield
              color={theme.primary}
              size={22}
            />

            <View>
              <Text
                style={[
                  styles.itemTitle,
                  {
                    color: theme.text,
                  },
                ]}
              >
                Segurança
              </Text>

              <Text
                style={[
                  styles.itemSubtitle,
                  {
                    color: theme.subText,
                  },
                ]}
              >
                Senha e privacidade
              </Text>
            </View>
          </View>

          <ChevronRight
            color={theme.subText}
            size={22}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.item,
            {
              backgroundColor: theme.card,
              borderColor: theme.border,
            },
          ]}
        >
          <View style={styles.itemLeft}>
            <Info
              color={theme.primary}
              size={22}
            />

            <View>
              <Text
                style={[
                  styles.itemTitle,
                  {
                    color: theme.text,
                  },
                ]}
              >
                Sobre o aplicativo
              </Text>

              <Text
                style={[
                  styles.itemSubtitle,
                  {
                    color: theme.subText,
                  },
                ]}
              >
                Versão 1.0.0
              </Text>
            </View>
          </View>

          <ChevronRight
            color={theme.subText}
            size={22}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.logoutBtn}
        >
          <LogOut
            color="#fff"
            size={20}
          />

          <Text style={styles.logoutText}>
            Sair da conta
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? 25 : 0,
  },

  header: {
    height: 70,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  title: {
    fontSize: 20,
    fontWeight: "bold",
  },

  content: {
    padding: 20,
    paddingBottom: 40,
  },

  sectionTitle: {
    fontSize: 12,
    fontWeight: "bold",
    marginBottom: 10,
    marginTop: 10,
    textTransform: "uppercase",
  },

  item: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  itemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },

  itemTitle: {
    fontSize: 15,
    fontWeight: "bold",
  },

  itemSubtitle: {
    fontSize: 12,
    marginTop: 3,
  },

  logoutBtn: {
    backgroundColor: "#ef4444",
    height: 58,
    borderRadius: 16,
    marginTop: 20,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
  },

  logoutText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
});