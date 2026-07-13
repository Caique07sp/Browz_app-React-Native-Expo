import { useTheme } from "@/theme/ThemeContext";
import { useRouter } from "expo-router";
import { ScreenWrapper } from "@/components/ScreenWrapper";
import { ArrowLeft, ShieldCheck } from "lucide-react-native";
import React from "react";
import {
    Platform,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

export default function SegurancaScreen() {
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
        <Text style={[styles.title, { color: theme.text }]}>Segurança</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.iconContainer}>
          <ShieldCheck color={theme.primary} size={44} />
          <Text style={[styles.screenTitle, { color: theme.text }]}>
            Segurança e Confidencialidade
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          
          <Text style={[styles.sectionSubtitle, { color: theme.primary }]}>1. Definições</Text>
          <Text style={[styles.paragraph, { color: theme.text }]}>
            • <Text style={styles.boldText}>ERP:</Text> Sistema de Gestão Integrada utilizado para processamento de dados empresariais.{"\n"}
            • <Text style={styles.boldText}>Usuário:</Text> Qualquer indivíduo ou entidade que acesse o sistema ERP.{"\n"}
            • <Text style={styles.boldText}>Dados Confidenciais:</Text> Informações sensíveis, incluindo dados pessoais, financeiros, estratégicos ou operacionais.{"\n"}
            • <Text style={styles.boldText}>LGPD:</Text> Lei Geral de Proteção de Dados (Lei nº 13.709/2018).
          </Text>

          <Text style={[styles.sectionSubtitle, { color: theme.primary }]}>2. Responsabilidades do Usuário</Text>
          <Text style={[styles.paragraph, { color: theme.text }]}>
            O usuário é responsável por manter a confidencialidade de suas credenciais de acesso (login e senha). Não deve compartilhar credenciais ou permitir acesso não autorizado ao sistema, devendo notificar imediatamente a administração em caso de suspeita de violação.
          </Text>

          <Text style={[styles.sectionSubtitle, { color: theme.primary }]}>3. Segurança da Informação</Text>
          <Text style={[styles.paragraph, { color: theme.text }]}>
            O sistema ERP adota medidas técnicas e administrativas para proteger os dados contra acessos não autorizados, vazamentos ou perdas. O uso de criptografia, firewalls e autenticação multifatorial pode ser aplicado conforme a necessidade, garantindo acesso restrito por níveis de permissão.
          </Text>

          <Text style={[styles.sectionSubtitle, { color: theme.primary }]}>4. Confidencialidade dos Dados</Text>
          <Text style={[styles.paragraph, { color: theme.text }]}>
            As informações tratadas no ERP são de propriedade da empresa e não devem ser divulgadas a terceiros sem autorização expressa. O usuário concorda em não copiar, reproduzir ou distribuir dados sem consentimento prévio.
          </Text>

          <Text style={[styles.sectionSubtitle, { color: theme.primary }]}>5. Conformidade com a LGPD</Text>
          <Text style={[styles.paragraph, { color: theme.text }]}>
            O sistema opera em conformidade com a LGPD, garantindo finalidade específica no tratamento de dados legítimos, minimização das informações armazenadas, respeito aos direitos dos titulares (acesso, correção e exclusão) e geração de relatórios de incidentes à ANPD quando aplicável.
          </Text>

          <Text style={[styles.sectionSubtitle, { color: theme.primary }]}>6. Sanções por Descumprimento</Text>
          <Text style={[styles.paragraph, { color: theme.text }]}>
            Violações das políticas de segurança e confidencialidade podem resultar em suspensão ou cancelamento do acesso ao sistema, além de responsabilização civil e penal conforme a legislação aplicável.
          </Text>

          <Text style={[styles.sectionSubtitle, { color: theme.primary }]}>7. Disposições Finais</Text>
          <Text style={[styles.paragraph, { color: theme.text }]}>
            A empresa reserva-se o direito de atualizar estes termos conforme necessidades legais ou operacionais. O uso contínuo do sistema ERP implica aceitação dos termos vigentes.
          </Text>

          <View style={styles.divider} />
          <Text style={[styles.dateText, { color: theme.subText }]}>
            Data de vigência: 01/08/2025
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
  content: { padding: 20, paddingBottom: 40, gap: 16 },
  iconContainer: { alignItems: "center", marginVertical: 10, gap: 8 },
  screenTitle: { fontSize: 18, fontWeight: "bold", textAlign: "center" },
  card: { borderRadius: 16, padding: 18, borderWidth: 1, gap: 14 },
  sectionSubtitle: { fontSize: 14, fontWeight: "bold", marginTop: 6 },
  paragraph: { fontSize: 14, lineHeight: 22 },
  boldText: { fontWeight: "bold" },
  divider: { height: 1, backgroundColor: "transparent", borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#ccc", marginVertical: 8 },
  dateText: { fontSize: 12, textAlign: "center", fontWeight: "600" }
});