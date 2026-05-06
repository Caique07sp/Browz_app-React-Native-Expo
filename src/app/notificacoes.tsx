import React from "react";
import {
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { ArrowLeft, Bell, CheckCircle, AlertCircle, Clock } from "lucide-react-native";

export default function Notificacoes() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft color="#fff" size={24} />
        </TouchableOpacity>

        <Text style={styles.title}>Notificações</Text>

        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.notificationCard}>
          <View style={styles.iconBox}>
            <Bell color="#3b82f6" size={22} />
          </View>

          <View style={styles.notificationInfo}>
            <Text style={styles.notificationTitle}>Novo chamado atribuído</Text>
            <Text style={styles.notificationText}>
              O chamado #10293 foi atribuído para você.
            </Text>
            <Text style={styles.notificationDate}>Hoje às 10:45</Text>
          </View>
        </View>

        <View style={styles.notificationCard}>
          <View style={[styles.iconBox, { backgroundColor: "#1e3a8a" }]}>
            <Clock color="#60a5fa" size={22} />
          </View>

          <View style={styles.notificationInfo}>
            <Text style={styles.notificationTitle}>Atendimento em andamento</Text>
            <Text style={styles.notificationText}>
              Você iniciou o atendimento do chamado #10293.
            </Text>
            <Text style={styles.notificationDate}>Hoje às 11:00</Text>
          </View>
        </View>

        <View style={styles.notificationCard}>
          <View style={[styles.iconBox, { backgroundColor: "#14532d" }]}>
            <CheckCircle color="#22c55e" size={22} />
          </View>

          <View style={styles.notificationInfo}>
            <Text style={styles.notificationTitle}>Chamado concluído</Text>
            <Text style={styles.notificationText}>
              O atendimento foi finalizado com sucesso.
            </Text>
            <Text style={styles.notificationDate}>Hoje às 12:30</Text>
          </View>
        </View>

        <View style={styles.notificationCard}>
          <View style={[styles.iconBox, { backgroundColor: "#7f1d1d" }]}>
            <AlertCircle color="#ef4444" size={22} />
          </View>

          <View style={styles.notificationInfo}>
            <Text style={styles.notificationTitle}>Atenção</Text>
            <Text style={styles.notificationText}>
              Existe um chamado aguardando atendimento.
            </Text>
            <Text style={styles.notificationDate}>Ontem às 16:20</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f172a",
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

  notificationCard: {
    backgroundColor: "#1e293b",
    borderRadius: 16,
    padding: 15,
    marginBottom: 14,
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "#334155",
  },

  iconBox: {
    width: 45,
    height: 45,
    borderRadius: 14,
    backgroundColor: "#0f172a",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },

  notificationInfo: {
    flex: 1,
  },

  notificationTitle: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "bold",
    marginBottom: 4,
  },

  notificationText: {
    color: "#94a3b8",
    fontSize: 13,
    lineHeight: 18,
  },

  notificationDate: {
    color: "#64748b",
    fontSize: 12,
    marginTop: 8,
  },
});