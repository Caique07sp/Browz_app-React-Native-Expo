import { ScreenWrapper } from "@/components/ScreenWrapper";
import { isOnline } from "@/services/network";
import { useTheme } from "@/theme/ThemeContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useRouter } from "expo-router";
import { getApiUrl } from "@/services/api";
import {
    Building2,
    ChevronLeft,
    IdCard,
    Mail,
    Phone,
    Shield,
    User,
} from "lucide-react-native";
import React, { useState } from "react";
import {
    ActivityIndicator,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

interface DadosTecnico {
  nome: string;
  email: string;
  login: string;
  perfil: string;
  representativeId: string;
  telefone?: string;
  empresa?: string;
  totalChamados?: number;
  chamadosFinalizados?: number;
  chamadosAbertos?: number;
}

export default function Perfil() {
  const router = useRouter();
  const { theme, darkMode } = useTheme();
  const [loading, setLoading] = useState(true);
  const [dados, setDados] = useState<DadosTecnico | null>(null);

  useFocusEffect(
    React.useCallback(() => {
      carregarPerfil();
    }, [])
  );

  async function carregarPerfil() {
    try {
      setLoading(true);

      const nome = await AsyncStorage.getItem("nome") ?? "";
      const login = await AsyncStorage.getItem("login") ?? "";
      const perfil = await AsyncStorage.getItem("perfil") ?? "Técnico";
      const representativeId = await AsyncStorage.getItem("representative_id") ?? "";
      const email = await AsyncStorage.getItem("usermail") ?? "";

      // Estatísticas do cache local
      const cacheChamados = await AsyncStorage.getItem("@cache_chamados");
      let totalChamados = 0;
      let chamadosFinalizados = 0;
      let chamadosAbertos = 0;

      if (cacheChamados) {
        const lista = JSON.parse(cacheChamados);
        totalChamados = lista.length;
        chamadosFinalizados = lista.filter((c: any) => Number(c.calendar_status) === 2).length;
        chamadosAbertos = lista.filter((c: any) => Number(c.calendar_status) !== 2).length;
      }

      setDados({
        nome,
        email,
        login,
        perfil,
        representativeId,
        totalChamados,
        chamadosFinalizados,
        chamadosAbertos,
      });

      // Tenta enriquecer com dados da API se online
      const online = await isOnline();
      if (online) {
        await buscarDadosAPI(representativeId);
      }
    } catch (e) {
      //console.log("Erro ao carregar perfil:", e);
    } finally {
      setLoading(false);
    }
  }

  async function buscarDadosAPI(representativeId: string) {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) return;

      const response = await fetch(await getApiUrl(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          class: "RepresentativeService",
          method: "load",
          data: { id: representativeId },
        }),
      });

      const data = await response.json();

      if (data.status === "success" && data.data) {
        const rep = data.data;
        setDados((prev) =>
          prev
            ? {
                ...prev,
                telefone: rep.phone ?? rep.telefone ?? prev.telefone,
                empresa: rep.company ?? rep.empresa ?? prev.empresa,
              }
            : prev
        );
      }
    } catch (e) {
      // Silencioso — dados locais já estão exibidos
    }
  }

  if (loading) {
    return (
      <ScreenWrapper style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={[styles.loadingText, { color: theme.subText }]}>
            Carregando perfil...
          </Text>
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.topBar}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={[styles.backBtn, { backgroundColor: theme.card }]}
          >
            <ChevronLeft size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.pageTitle, { color: theme.text }]}>Meu Perfil</Text>
          <View style={{ width: 44 }} />
        </View>

        {/* Avatar + Nome */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarInitial}>
              {dados?.nome?.charAt(0)?.toUpperCase() ?? "?"}
            </Text>
          </View>
          <Text style={[styles.nomeText, { color: theme.text }]}>{dados?.nome}</Text>
          <View style={styles.perfilBadge}>
            <Shield size={12} color="#3b82f6" />
            <Text style={styles.perfilBadgeText}>{dados?.perfil}</Text>
          </View>
        </View>

        {/* Estatísticas */}
        <View style={[styles.statsRow]}>
          <View style={[styles.statCard, { backgroundColor: theme.card }]}>
            <Text style={styles.statNumber}>{dados?.totalChamados ?? 0}</Text>
            <Text style={[styles.statLabel, { color: theme.subText }]}>Total</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: theme.card }]}>
            <Text style={[styles.statNumber, { color: "#3b82f6" }]}>
              {dados?.chamadosAbertos ?? 0}
            </Text>
            <Text style={[styles.statLabel, { color: theme.subText }]}>Em aberto</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: theme.card }]}>
            <Text style={[styles.statNumber, { color: "#22c55e" }]}>
              {dados?.chamadosFinalizados ?? 0}
            </Text>
            <Text style={[styles.statLabel, { color: theme.subText }]}>Finalizados</Text>
          </View>
        </View>

        {/* Dados pessoais */}
        <View style={[styles.section, { backgroundColor: theme.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.subText }]}>INFORMAÇÕES</Text>

          <InfoRow
            icon={<User size={18} color="#3b82f6" />}
            label="Nome"
            value={dados?.nome ?? "—"}
            theme={theme}
          />
          <InfoRow
            icon={<Mail size={18} color="#3b82f6" />}
            label="E-mail"
            value={dados?.login ?? "—"}
            theme={theme}
          />
          {dados?.telefone ? (
            <InfoRow
              icon={<Phone size={18} color="#3b82f6" />}
              label="Telefone"
              value={dados.telefone}
              theme={theme}
            />
          ) : null}
          {dados?.empresa ? (
            <InfoRow
              icon={<Building2 size={18} color="#3b82f6" />}
              label="Empresa"
              value={dados.empresa}
              theme={theme}
            />
          ) : null}
          <InfoRow
            icon={<IdCard size={18} color="#64748b" />}
            label="ID Técnico"
            value={`#${dados?.representativeId ?? "—"}`}
            theme={theme}
            last
          />
        </View>
      </ScrollView>
    </ScreenWrapper>
  );
}

function InfoRow({
  icon,
  label,
  value,
  theme,
  last = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  theme: any;
  last?: boolean;
}) {
  return (
    <View style={[styles.infoRow, !last && { borderBottomWidth: 1, borderBottomColor: theme.border }]}>
      <View style={styles.infoIcon}>{icon}</View>
      <View style={styles.infoContent}>
        <Text style={[styles.infoLabel, { color: theme.subText }]}>{label}</Text>
        <Text style={[styles.infoValue, { color: theme.text }]}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.OS === "android" ? 35 : 0,
  },
  scroll: {
    padding: 20,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 28,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  pageTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  avatarSection: {
    alignItems: "center",
    marginBottom: 28,
  },
  avatarCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "#3b82f6",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
    shadowColor: "#3b82f6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  avatarInitial: {
    fontSize: 36,
    fontWeight: "800",
    color: "#fff",
  },
  nomeText: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 8,
  },
  perfilBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#1d4ed820",
    borderWidth: 1,
    borderColor: "#3b82f640",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
  },
  perfilBadgeText: {
    color: "#3b82f6",
    fontSize: 13,
    fontWeight: "600",
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
    gap: 4,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: "800",
    color: "#f59e0b",
  },
  statLabel: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  section: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.2,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    gap: 14,
  },
  infoIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#3b82f610",
    justifyContent: "center",
    alignItems: "center",
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: "600",
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: "500",
  },
});