import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useRouter } from "expo-router";
import {
  AlertCircle,
  ArrowLeft,
  Bell,
  CheckCircle,
  Clock,
} from "lucide-react-native";
import React, { useCallback, useState } from "react";
import {
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function Notificacoes() {
  const router = useRouter();

  const [notificacoes, setNotificacoes] = useState<any[]>([]);

  useFocusEffect(
    useCallback(() => {
      carregarNotificacoes();
    }, [])
  );

  async function carregarNotificacoes() {
    const saved = await AsyncStorage.getItem("@notificacoes");

    if (saved) {
      const lista = JSON.parse(saved);

      lista.sort(
        (a: any, b: any) =>
          new Date(b.timestamp).getTime() -
          new Date(a.timestamp).getTime()
      );

      setNotificacoes(lista);
    }
  }

  function getIcon(tipo: string) {
    if (tipo === "novo")
      return <Bell color="#3b82f6" size={22} />;

    if (tipo === "andamento")
      return <Clock color="#60a5fa" size={22} />;

    if (tipo === "finalizado")
      return <CheckCircle color="#22c55e" size={22} />;

    return <AlertCircle color="#ef4444" size={22} />;
  }

  function getColor(tipo: string) {
    if (tipo === "novo") return "#0f172a";

    if (tipo === "andamento") return "#1e3a8a";

    if (tipo === "finalizado") return "#14532d";

    return "#7f1d1d";
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
        >
          <ArrowLeft color="#fff" size={24} />
        </TouchableOpacity>

        <Text style={styles.title}>Notificações</Text>

        <TouchableOpacity
          onPress={async () => {
            await AsyncStorage.multiRemove([
              "@notificacoes",
              "@notificacoes_ids",
              "@chamados_ja_carregados",
            ]);
            setNotificacoes([]);
          }}
        >
          <Text style={{ color: "#ef4444", fontWeight: "bold" }}>
            Limpar
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {notificacoes.length === 0 ? (
          <Text style={styles.emptyText}>
            Nenhuma notificação encontrada.
          </Text>
        ) : (
          notificacoes.map((item, index) => (
            <View
              key={index}
              style={styles.notificationCard}
            >
              <View
                style={[
                  styles.iconBox,
                  {
                    backgroundColor: getColor(item.tipo),
                  },
                ]}
              >
                {getIcon(item.tipo)}
              </View>

              <View style={styles.notificationInfo}>
                <Text style={styles.notificationTitle}>
                  {item.titulo}
                </Text>

                <Text style={styles.notificationText}>
                  {item.mensagem}
                </Text>

                <Text style={styles.notificationDate}>
                  {item.data}
                </Text>
              </View>
            </View>
          ))
        )}
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

  emptyText: {
    color: "#94a3b8",
    textAlign: "center",
    marginTop: 40,
  },
})