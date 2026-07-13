import React, { useCallback, useState } from "react";
import {
  Alert,
  FlatList,
  Platform,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { ArrowLeft, Bug, RefreshCw, Trash2 } from "lucide-react-native";
import { router, useFocusEffect } from "expo-router";

import { ScreenWrapper } from "@/components/ScreenWrapper";
import { useTheme } from "@/theme/ThemeContext";
import { LogEntry, limparLogs, obterLogs } from "@/services/logger";

export default function TelaLogsDev() {
  const { theme } = useTheme();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useFocusEffect(
    useCallback(() => {
      carregarLogs();
    }, [])
  );

  async function carregarLogs() {
    setLoading(true);
    const dados = await obterLogs();
    setLogs(dados);
    setLoading(false);
  }

  async function handleLimpar() {
    Alert.alert("Limpar Logs", "Deseja remover todo o histórico de logs do app?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Limpar",
        style: "destructive",
        onPress: async () => {
          await limparLogs();
          setLogs([]);
        },
      },
    ]);
  }

  function getCorTipo(tipo: LogEntry["tipo"]) {
    switch (tipo) {
      case "ERROR":
        return "#ef4444";
      case "WARN":
        return "#f59e0b";
      case "SUCCESS":
        return "#22c55e";
      default:
        return "#3b82f6";
    }
  }

  return (
    <ScreenWrapper style={{ backgroundColor: theme.background }}>
      {/* CABEÇALHO */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 16,
          paddingVertical: 14,
          borderBottomWidth: 1,
          borderBottomColor: theme.border,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={{ fontSize: 18, fontWeight: "bold", color: theme.text }}>
            Logs de Desenvolvimento
          </Text>
        </View>

        <View style={{ flexDirection: "row", gap: 12 }}>
          <TouchableOpacity onPress={carregarLogs}>
            <RefreshCw size={20} color={theme.text} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleLimpar}>
            <Trash2 size={20} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={logs}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, gap: 10 }}
        ListEmptyComponent={
          <View style={{ alignItems: "center", marginTop: 40, gap: 8 }}>
            <Bug size={40} color={theme.subText} />
            <Text style={{ color: theme.subText }}>Nenhum log registrado até o momento.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View
            style={{
              backgroundColor: theme.card,
              padding: 12,
              borderRadius: 10,
              borderLeftWidth: 4,
              borderLeftColor: getCorTipo(item.tipo),
              borderWidth: 1,
              borderColor: theme.border,
            }}
          >
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
              <Text style={{ fontSize: 11, fontWeight: "bold", color: getCorTipo(item.tipo) }}>
                [{item.tipo}] [{item.tag}]
              </Text>
              <Text style={{ fontSize: 10, color: theme.subText }}>
                {new Date(item.timestamp).toLocaleTimeString("pt-BR")}
              </Text>
            </View>

            <Text style={{ fontSize: 13, color: theme.text, fontWeight: "500" }}>
              {item.mensagem}
            </Text>

            {item.detalhes && (
              <Text
                style={{
                  fontSize: 11,
                  fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
                  color: theme.subText,
                  backgroundColor: theme.background,
                  padding: 8,
                  borderRadius: 6,
                  marginTop: 6,
                }}
              >
                {item.detalhes}
              </Text>
            )}
          </View>
        )}
      />
    </ScreenWrapper>
  );
}