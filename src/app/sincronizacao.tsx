import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  RefreshCw,
  Trash2,
  Wifi,
  WifiOff,
} from "lucide-react-native";
import NetInfo from "@react-native-community/netinfo";
import { router, useFocusEffect } from "expo-router";

import { ScreenWrapper } from "@/components/ScreenWrapper";
import { useTheme } from "@/theme/ThemeContext";

// Importações conectadas diretamente com sua estrutura real
import { buscarFila, salvarFila } from "@/services/offlineQueue";
import { estaSincronizando, sincronizarPendentes } from "@/services/sync";

export default function TelaSincronizacao() {
  const { theme } = useTheme();

  const [online, setOnline] = useState(true);
  const [sincronizando, setSincronizando] = useState(false);
  const [pendencias, setPendencias] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Monitora a conexão de rede
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setOnline(state.isConnected === true && state.isInternetReachable !== false);
    });

    return () => unsubscribe();
  }, []);

  // Recarrega a fila sempre que a tela ganha foco
  useFocusEffect(
    useCallback(() => {
      carregarDadosFila();
    }, [])
  );

  async function carregarDadosFila() {
    try {
      setLoading(true);
      const fila = await buscarFila();
      setPendencias(fila || []);
    } catch (error) {
      console.log("Erro ao carregar fila de sincronização:", error);
    } finally {
      setLoading(false);
    }
  }

  async function forcarSincronizacao() {
    if (!online) {
      Alert.alert("Sem Conexão", "Conecte-se à internet para forçar a sincronização.");
      return;
    }

    if (estaSincronizando()) {
      return;
    }

    try {
      setSincronizando(true);
      await sincronizarPendentes();
      await carregarDadosFila();
    } catch (error) {
      Alert.alert("Aviso", "Ocorreu um erro ao processar a sincronização.");
    } finally {
      setSincronizando(false);
    }
  }

  async function removerItemManual(itemParaRemover: any) {
    Alert.alert(
      "Remover Pendência",
      "Deseja realmente apagar esta pendência da fila? Esta ação não pode ser desfeita.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Remover",
          style: "destructive",
          onPress: async () => {
            const filaAtual = await buscarFila();
            const novaFila = filaAtual.filter(
              (p: any) => p.criadoEm !== itemParaRemover.criadoEm
            );
            await salvarFila(novaFila);
            setPendencias(novaFila);
          },
        },
      ]
    );
  }

  function getInfoAcao(item: any) {
    switch (item.tipo) {
      case "checkin":
        return { titulo: "📍 Check-in Realizado", cor: "#3b82f6" };
      case "status_chamado":
        return { titulo: "🔄 Alteração de Status", cor: "#f59e0b" };
      case "pausar_chamado":
        return { titulo: "⏸️ Chamado Pausado", cor: "#ec4899" };
      case "finalizacao":
        return { titulo: "✅ Finalização de Chamado", cor: "#10b981" };
      case "foto_chamado":
        return { titulo: "📷 Upload de Foto", cor: "#8b5cf6" };
      case "evento_linha_tempo":
        return { titulo: "⏱️ Evento da Linha do Tempo", cor: "#06b6d4" };
      case "evento_checkin":
        return { titulo: "📝 Registro de Check-in", cor: "#6366f1" };
      default:
        return { titulo: `⚡ ${item.tipo || "Ação Offline"}`, cor: "#64748b" };
    }
  }

  // Separa itens com erros/tentativas acumuladas para destaque
  const itensComErro = pendencias.filter((item) => (item.tentativas || 0) > 0);

  return (
    <ScreenWrapper style={{ backgroundColor: theme.background }}>
      {/* CABEÇALHO */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 16,
          paddingVertical: 14,
          gap: 12,
        }}
      >
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={{ fontSize: 20, fontWeight: "bold", color: theme.text }}>
          Fila de Sincronização
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 16 }}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={carregarDadosFila}
            tintColor="#3b82f6"
          />
        }
      >
        {/* CARD STATUS DA CONEXÃO */}
        <View
          style={{
            backgroundColor: theme.card,
            padding: 16,
            borderRadius: 16,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            borderWidth: 1,
            borderColor: theme.border,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            {online ? (
              <Wifi size={28} color="#22c55e" />
            ) : (
              <WifiOff size={28} color="#ef4444" />
            )}
            <View>
              <Text style={{ fontWeight: "bold", color: theme.text, fontSize: 16 }}>
                {online ? "Dispositivo Conectado" : "Modo Offline"}
              </Text>
              <Text style={{ color: theme.subText, fontSize: 13 }}>
                {online
                  ? "Sua conexão está ativa para sincronizar"
                  : "As alterações estão salvas localmente"}
              </Text>
            </View>
          </View>
        </View>

        {/* BOTÃO FORÇAR RE-SINCRONIZAÇÃO */}
        <TouchableOpacity
          disabled={sincronizando || !online || pendencias.length === 0}
          onPress={forcarSincronizacao}
          style={{
            backgroundColor:
              online && pendencias.length > 0 && !sincronizando
                ? "#3b82f6"
                : "#94a3b8",
            padding: 16,
            borderRadius: 12,
            flexDirection: "row",
            justifyContent: "center",
            alignItems: "center",
            gap: 10,
          }}
        >
          {sincronizando ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <RefreshCw size={20} color="#fff" />
              <Text style={{ color: "#fff", fontWeight: "bold", fontSize: 15 }}>
                Forçar Re-sincronização ({pendencias.length})
              </Text>
            </>
          )}
        </TouchableOpacity>

        {/* LISTA DE PENDÊNCIAS */}
        <View style={{ marginTop: 8 }}>
          <Text
            style={{
              fontSize: 16,
              fontWeight: "bold",
              color: theme.text,
              marginBottom: 12,
            }}
          >
            Ações Offline Gravadas ({pendencias.length})
          </Text>

          {pendencias.length === 0 ? (
            <View
              style={{
                backgroundColor: theme.card,
                padding: 24,
                borderRadius: 16,
                alignItems: "center",
                gap: 8,
                borderWidth: 1,
                borderColor: theme.border,
              }}
            >
              <CheckCircle2 size={36} color="#22c55e" />
              <Text style={{ color: theme.text, fontWeight: "600", fontSize: 15 }}>
                Tudo Sincronizado!
              </Text>
              <Text style={{ color: theme.subText, fontSize: 13, textAlign: "center" }}>
                Não existem ações offline pendentes no dispositivo.
              </Text>
            </View>
          ) : (
            pendencias.map((item, index) => {
              const acao = getInfoAcao(item);
              const temErro = (item.tentativas || 0) > 0;

              return (
                <View
                  key={item.criadoEm || index}
                  style={{
                    backgroundColor: theme.card,
                    padding: 14,
                    borderRadius: 14,
                    marginBottom: 10,
                    borderLeftWidth: 4,
                    borderLeftColor: temErro ? "#ef4444" : acao.cor,
                    borderWidth: 1,
                    borderColor: theme.border,
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontWeight: "bold", color: theme.text, fontSize: 15 }}>
                        {acao.titulo}
                      </Text>
                      {item.ticketId && (
                        <Text
                          style={{
                            color: theme.subText,
                            fontSize: 13,
                            marginTop: 2,
                            fontWeight: "500",
                          }}
                        >
                          Chamado / OS: #{item.ticketId}
                        </Text>
                      )}
                    </View>

                    <TouchableOpacity
                      onPress={() => removerItemManual(item)}
                      style={{ padding: 4 }}
                    >
                      <Trash2 size={18} color="#ef4444" />
                    </TouchableOpacity>
                  </View>

                  {/* DATA E HORA DA CRIAÇÃO */}
                  {item.criadoEm && (
                    <Text style={{ color: theme.subText, fontSize: 11, marginTop: 6 }}>
                      Criado em:{" "}
                      {new Date(item.criadoEm).toLocaleString("pt-BR", {
                        day: "2-digit",
                        month: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </Text>
                  )}

                  {/* INDICADOR DE ERROS / TENTATIVAS DA SUA LÓGICA SYNC */}
                  {temErro && (
                    <View
                      style={{
                        marginTop: 8,
                        padding: 8,
                        backgroundColor: "#ef444415",
                        borderRadius: 8,
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <AlertTriangle size={14} color="#ef4444" />
                      <Text style={{ color: "#ef4444", fontSize: 11, fontWeight: "600" }}>
                        Falha no envio ({item.tentativas}/5 tentativas)
                      </Text>
                    </View>
                  )}
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </ScreenWrapper>
  );
}