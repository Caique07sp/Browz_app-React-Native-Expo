import AsyncStorage from "@react-native-async-storage/async-storage";

// ✅ Chave padronizada para todo o app
export const LOGS_KEY = "@logs_sistema_v1";
const MAX_LOGS = 100;

export interface LogEntry {
  id: string;
  timestamp: string;
  tipo: "INFO" | "SUCCESS" | "WARN" | "ERROR";
  tag: string;
  mensagem: string;
  detalhes?: any;
}

export async function registrarLog(
  tipo: LogEntry["tipo"],
  tag: string,
  mensagem: string,
  detalhes?: any
) {
  try {
    const logsSalvos = await AsyncStorage.getItem(LOGS_KEY);
    const logs: LogEntry[] = logsSalvos ? JSON.parse(logsSalvos) : [];

    const novoLog: LogEntry = {
      id: `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      tipo,
      tag,
      mensagem,
      detalhes: detalhes ? JSON.stringify(detalhes, null, 2) : undefined,
    };

    logs.unshift(novoLog);
    const logsLimitados = logs.slice(0, MAX_LOGS);

    await AsyncStorage.setItem(LOGS_KEY, JSON.stringify(logsLimitados));
  } catch (e) {
    console.log("Erro ao salvar log local:", e);
  }
}

export async function obterLogs(): Promise<LogEntry[]> {
  try {
    const logsSalvos = await AsyncStorage.getItem(LOGS_KEY);
    return logsSalvos ? JSON.parse(logsSalvos) : [];
  } catch (e) {
    return [];
  }
}

export async function limparLogs(): Promise<void> {
  try {
    await AsyncStorage.removeItem(LOGS_KEY);
  } catch (e) {
    console.log("Erro ao limpar logs:", e);
  }
}