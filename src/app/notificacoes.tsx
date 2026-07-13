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
import { ScreenWrapper } from "@/components/ScreenWrapper";
import { useTheme } from "@/theme/ThemeContext";
import {
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function Notificacoes() {
  const router = useRouter();
  const { theme, darkMode } = useTheme();

  const [notificacoes, setNotificacoes] = useState<any[]>([]);

  useFocusEffect(
    useCallback(() => {
      carregarNotificacoes();
    }, [])
  );

  async function carregarNotificacoes() {
    const saved = await AsyncStorage.getItem("@notificacoes");

    if (saved) {
      let lista = JSON.parse(saved);

      lista = lista.filter(
        (item: any, index: number, self: any[]) =>
          index === self.findIndex((t) => t.uniqueId === item.uniqueId)
      );

      lista.sort(
        (a: any, b: any) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      const listaAtualizada = lista.map((item: any) => ({
        ...item,
        lida: true,
      }));

      setNotificacoes(listaAtualizada);
      await AsyncStorage.setItem(
        "@notificacoes",
        JSON.stringify(listaAtualizada)
      );
    }
  }

  function getIcon(tipo: string) {
    if (tipo === "novo") return <Bell color="#3b82f6" size={22} />;

    if (tipo === "andamento") return <Clock color="#60a5fa" size={22} />;

    if (tipo === "finalizado") return <CheckCircle color="#22c55e" size={22} />;

    return <AlertCircle color="#ef4444" size={22} />;
  }

  function getIconBgColor(tipo: string) {
    if (tipo === "novo") return darkMode ? "#0f172a" : "#dbeafe";

    if (tipo === "andamento") return darkMode ? "#1e3a8a" : "#bfdbfe";

    if (tipo === "finalizado") return darkMode ? "#14532d" : "#dcfce7";

    return darkMode ? "#7f1d1d" : "#fee2e2";
  }

  return (
    <ScreenWrapper style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={darkMode ? "light-content" : "dark-content"} />

      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.backBtn, { backgroundColor: theme.card, borderColor: theme.border }]}
          onPress={() => router.back()}
        >
          <ArrowLeft color={theme.text} size={24} />
        </TouchableOpacity>

        <Text style={[styles.title, { color: theme.text }]}>Notificações</Text>

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
          <Text style={{ color: "#ef4444", fontWeight: "bold" }}>Limpar</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {notificacoes.length === 0 ? (
          <Text style={[styles.emptyText, { color: theme.subText }]}>
            Nenhuma notificação encontrada.
          </Text>
        ) : (
          notificacoes.map((item, index) => (
            <View
              key={index}
              style={[
                styles.notificationCard,
                {
                  backgroundColor: theme.card,
                  borderColor: theme.border,
                },
              ]}
            >
              <View
                style={[
                  styles.iconBox,
                  {
                    backgroundColor: getIconBgColor(item.tipo),
                  },
                ]}
              >
                {getIcon(item.tipo)}
              </View>

              <View style={styles.notificationInfo}>
                <Text style={[styles.notificationTitle, { color: theme.text }]}>
                  {item.titulo}
                </Text>

                <Text style={[styles.notificationText, { color: theme.subText }]}>
                  {item.mensagem}
                </Text>

                <Text style={[styles.notificationDate, { color: theme.subText }]}>
                  {item.data}
                </Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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

  notificationCard: {
    borderRadius: 16,
    padding: 15,
    marginBottom: 14,
    flexDirection: "row",
    borderWidth: 1,
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
    fontSize: 15,
    fontWeight: "bold",
    marginBottom: 4,
  },

  notificationText: {
    fontSize: 13,
    lineHeight: 18,
  },

  notificationDate: {
    fontSize: 12,
    marginTop: 8,
  },

  emptyText: {
    textAlign: "center",
    marginTop: 40,
  },
});