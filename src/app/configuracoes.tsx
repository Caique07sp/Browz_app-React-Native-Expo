import React, { useState } from "react";
import {
  SafeAreaView,
  StatusBar,
  StyleSheet,
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

export default function Configuracoes() {
  const router = useRouter();

  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [darkModeEnabled, setDarkModeEnabled] = useState(true);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft color="#fff" size={24} />
        </TouchableOpacity>

        <Text style={styles.title}>Configurações</Text>

        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionTitle}>Conta</Text>

        <TouchableOpacity style={styles.item}>
          <View style={styles.itemLeft}>
            <User color="#3b82f6" size={22} />
            <View>
              <Text style={styles.itemTitle}>Perfil</Text>
              <Text style={styles.itemSubtitle}>Editar dados do usuário</Text>
            </View>
          </View>
          <ChevronRight color="#64748b" size={22} />
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>Preferências</Text>

        <View style={styles.item}>
          <View style={styles.itemLeft}>
            <Bell color="#3b82f6" size={22} />
            <View>
              <Text style={styles.itemTitle}>Notificações</Text>
              <Text style={styles.itemSubtitle}>Receber alertas de chamados</Text>
            </View>
          </View>

          <Switch
            value={notificationsEnabled}
            onValueChange={setNotificationsEnabled}
            trackColor={{ false: "#334155", true: "#3b82f6" }}
            thumbColor="#fff"
          />
        </View>

        <View style={styles.item}>
          <View style={styles.itemLeft}>
            <Moon color="#3b82f6" size={22} />
            <View>
              <Text style={styles.itemTitle}>Modo escuro</Text>
              <Text style={styles.itemSubtitle}>Tema escuro ativado</Text>
            </View>
          </View>

          <Switch
            value={darkModeEnabled}
            onValueChange={setDarkModeEnabled}
            trackColor={{ false: "#334155", true: "#3b82f6" }}
            thumbColor="#fff"
          />
        </View>

        <Text style={styles.sectionTitle}>Sistema</Text>

        <TouchableOpacity style={styles.item}>
          <View style={styles.itemLeft}>
            <Shield color="#3b82f6" size={22} />
            <View>
              <Text style={styles.itemTitle}>Segurança</Text>
              <Text style={styles.itemSubtitle}>Senha e privacidade</Text>
            </View>
          </View>
          <ChevronRight color="#64748b" size={22} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.item}>
          <View style={styles.itemLeft}>
            <Info color="#3b82f6" size={22} />
            <View>
              <Text style={styles.itemTitle}>Sobre o aplicativo</Text>
              <Text style={styles.itemSubtitle}>Versão 1.0.0</Text>
            </View>
          </View>
          <ChevronRight color="#64748b" size={22} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.logoutBtn}>
          <LogOut color="#fff" size={20} />
          <Text style={styles.logoutText}>Sair da conta</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f172a" },

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
    backgroundColor: "#1e293b",
    justifyContent: "center",
    alignItems: "center",
  },

  title: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
  },

  content: {
    padding: 20,
    paddingBottom: 40,
  },

  sectionTitle: {
    color: "#64748b",
    fontSize: 12,
    fontWeight: "bold",
    marginBottom: 10,
    marginTop: 10,
    textTransform: "uppercase",
  },

  item: {
    backgroundColor: "#1e293b",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#334155",
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
    color: "#fff",
    fontSize: 15,
    fontWeight: "bold",
  },

  itemSubtitle: {
    color: "#94a3b8",
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