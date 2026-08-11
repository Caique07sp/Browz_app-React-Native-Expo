import { useTheme } from "@/theme/ThemeContext";
import { useRouter } from "expo-router";
import { ArrowLeft, CheckCircle2, Code, Cpu, Heart, Layers, ShieldCheck } from "lucide-react-native";
import React from "react";
import { Platform, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { ScreenWrapper } from "@/components/ScreenWrapper";

export default function SobreScreen() {
  const router = useRouter();
  const { theme, darkMode } = useTheme();

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
        <Text style={[styles.title, { color: theme.text }]}>Sobre o Aplicativo</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.logoContainer}>
          <View style={[styles.logoPlaceholder, { backgroundColor: theme.primary }]}>
            <Code color="#fff" size={36} />
          </View>
          <Text style={[styles.appName, { color: theme.text }]}>Browz Mobile</Text>
          <Text style={[styles.versionText, { color: theme.subText }]}>Versão 1.0.0_140726_1336</Text>
        </View>

        {/* Card de Propósito e Visão Geral */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.cardHeader}>
            <Cpu color={theme.primary} size={20} />
            <Text style={[styles.cardTitle, { color: theme.text }]}>O que é o Browz?</Text>
          </View>
          <Text style={[styles.cardText, { color: theme.subText }]}>
            O Browz Mobile é a extensão de campo oficial da nossa plataforma de gestão integrada (ERP). 
            Ele foi projetado especificamente para atender às necessidades diárias da equipe técnica, 
            eliminando processos manuais em papel e centralizando todo o fluxo de trabalho diretamente no dispositivo móvel.
          </Text>
        </View>

        {/* Card de Recursos e Funcionalidades Principais */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.cardHeader}>
            <CheckCircle2 color={theme.primary} size={20} />
            <Text style={[styles.cardTitle, { color: theme.text }]}>Recursos do Ecossistema</Text>
          </View>
          
          <View style={styles.bulletItem}>
            <Text style={[styles.bulletTitle, { color: theme.text }]}>• Gestão de Chamados em Tempo Real</Text>
            <Text style={[styles.bulletText, { color: theme.subText }]}>Receba ordens de serviço instantaneamente, com detalhes completos sobre a abertura, descrição do problema e nível de prioridade.</Text>
          </View>

          <View style={styles.bulletItem}>
            <Text style={[styles.bulletTitle, { color: theme.text }]}>• Controle de Status e Check-in</Text>
            <Text style={[styles.bulletText, { color: theme.subText }]}>Registre o momento exato de chegada e saída do atendimento com validações de segurança e registros transparentes de auditoria.</Text>
          </View>

          <View style={styles.bulletItem}>
            <Text style={[styles.bulletTitle, { color: theme.text }]}>• Sincronização Inteligente</Text>
            <Text style={[styles.bulletText, { color: theme.subText }]}>Arquitetura híbrida preparada para armazenar dados localmente e sincronizar de forma resiliente com o servidor central quando houver conexão.</Text>
          </View>

          <View style={styles.bulletItem}>
            <Text style={[styles.bulletTitle, { color: theme.text }]}>• Histórico e Logs Técnicos</Text>
            <Text style={[styles.bulletText, { color: theme.subText }]}>Acompanhamento completo do ciclo de vida de cada chamado técnico, garantindo rastreabilidade mútua para o profissional e para a empresa.</Text>
          </View>
        </View>

        {/* Card de Especificações do Sistema */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.cardHeader}>
            <Layers color={theme.primary} size={20} />
            <Text style={[styles.cardTitle, { color: theme.text }]}>Especificações Técnicas</Text>
          </View>
          
          <View style={styles.specRow}>
            <Text style={[styles.specLabel, { color: theme.text }]}>Ambiente Ativo:</Text>
            <Text style={[styles.specValue, { color: theme.subText }]}>Produção Corporativa</Text>
          </View>
          <View style={styles.specRow}>
            <Text style={[styles.specLabel, { color: theme.text }]}>Integração:</Text>
            <Text style={[styles.specValue, { color: theme.subText }]}>API RESTful dedicada (ERP)</Text>
          </View>
          <View style={styles.specRow}>
            <Text style={[styles.specLabel, { color: theme.text }]}>Criptografia:</Text>
            <Text style={[styles.specValue, { color: theme.subText }]}>SSL / Armazenamento Seguro</Text>
          </View>
        </View>

        {/* Link para Termos de Segurança */}
        <TouchableOpacity 
          style={[styles.linkItem, { backgroundColor: theme.card, borderColor: theme.border }]}
          onPress={() => router.replace("/seguranca")} 
        >
          <View style={styles.linkLeft}>
            <ShieldCheck color={theme.primary} size={22} />
            <Text style={[styles.linkText, { color: theme.text }]}>Políticas de Segurança e LGPD</Text>
          </View>
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={{ color: theme.subText, fontSize: 12, textAlign: "center" }}>
            Desenvolvido pela L&L Tech <Heart color="#ef4444" size={12} fill="#ef4444" />
          </Text>
        </View>
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: Platform.OS === 'android' ? 25 : 0 },
  header: { height: 70, paddingHorizontal: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  backBtn: { width: 40, height: 40, borderRadius: 12, borderWidth: 1, justifyContent: "center", alignItems: "center" },
  title: { fontSize: 20, fontWeight: "bold" },
  content: { padding: 20, gap: 16 },
  logoContainer: { alignItems: "center", marginTop: 10, marginBottom: 20, gap: 6 },
  logoPlaceholder: { width: 76, height: 76, borderRadius: 20, justifyContent: "center", alignItems: "center", elevation: 2, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  appName: { fontSize: 22, fontWeight: "bold" },
  versionText: { fontSize: 13, fontWeight: "500" },
  card: { borderRadius: 16, padding: 16, borderWidth: 1, gap: 12 },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 4 },
  cardTitle: { fontSize: 15, fontWeight: "bold" },
  cardText: { fontSize: 14, lineHeight: 22 },
  bulletItem: { gap: 2, paddingLeft: 4 },
  bulletTitle: { fontSize: 14, fontWeight: "bold" },
  bulletText: { fontSize: 13, lineHeight: 18, paddingLeft: 12 },
  specRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 2 },
  specLabel: { fontSize: 14, fontWeight: "600" },
  specValue: { fontSize: 13 },
  linkItem: { borderRadius: 16, padding: 18, borderWidth: 1, flexDirection: "row", alignItems: "center", marginTop: 4 },
  linkLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  linkText: { fontSize: 14, fontWeight: "bold" },
  footer: { marginTop: 30, alignItems: "center", marginBottom: 20 }
});