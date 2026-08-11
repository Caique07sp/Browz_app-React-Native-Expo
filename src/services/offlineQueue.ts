import AsyncStorage from "@react-native-async-storage/async-storage";

const CHAVE_FILA = "@offline_queue";

// ─── Tipos ───────────────────────────────────────────────────────────────────

export interface QueueItemBase {
  criadoEm: string;   // ISO timestamp — identificador único do item
  tentativas: number;
  ultimoErro?: string;
}

export interface QueueItemFoto extends QueueItemBase {
  tipo: "foto_chamado";
  ticketId: string;
  uri: string;         // caminho permanente no documentDirectory
  fileName: string;
  description?: string;
}

// NOVO: Suporte para Fila de Vídeos Offline
export interface QueueItemVideo extends QueueItemBase {
  tipo: "video_chamado";
  ticketId: string;
  uri: string;         // caminho permanente no documentDirectory
  fileName: string;
  description?: string;
}

export interface QueueItemStatus extends QueueItemBase {
  tipo: "status_chamado";
  ticketId: string;
  status: number;
  extraData?: Record<string, unknown>;
}

export interface QueueItemCheckin extends QueueItemBase {
  tipo: "checkin";
  ticketId: string;
  checkinData?: Record<string, unknown>;
}

export interface QueueItemFinalizacao extends QueueItemBase {
  tipo: "finalizacao";
  ticketId: string;
  relatorioFinal: Record<string, unknown>;
}

export interface QueueItemEventoLinhaTempo extends QueueItemBase {
  tipo: "evento_linha_tempo";
  ticketId?: string;
  data: Record<string, unknown>;
}

export interface QueueItemEventoCheckin extends QueueItemBase {
  tipo: "evento_checkin";
  ticketId?: string;
  data: Record<string, unknown>;
}

export interface QueueItemPausa extends QueueItemBase {
  tipo: "pausar_chamado";
  ticketId: string;
  data?: {
    pausa_motivo?: string;
    pausa_data?: string;
  };
}

export type QueueItem =
  | QueueItemFoto
  | QueueItemVideo
  | QueueItemStatus
  | QueueItemCheckin
  | QueueItemFinalizacao
  | QueueItemEventoLinhaTempo
  | QueueItemEventoCheckin
  | QueueItemPausa;

// ─── Funções públicas ─────────────────────────────────────────────────────────

/**
 * Lê a fila persistida no AsyncStorage.
 * Retorna array vazio se não houver nada salvo ou em caso de erro de parse.
 */
export async function buscarFila(): Promise<QueueItem[]> {
  try {
    const raw = await AsyncStorage.getItem(CHAVE_FILA);
    if (!raw) return [];
    return JSON.parse(raw) as QueueItem[];
  } catch (error) {
    console.warn("⚠️ Erro ao ler fila offline:", error);
    return [];
  }
}

/**
 * Persiste a fila no AsyncStorage.
 */
export async function salvarFila(fila: QueueItem[]): Promise<void> {
  try {
    await AsyncStorage.setItem(CHAVE_FILA, JSON.stringify(fila));
  } catch (error) {
    console.warn("⚠️ Erro ao salvar fila offline:", error);
  }
}

/**
 * Adiciona um item à fila e persiste imediatamente.
 * Garante atomicidade: lê → adiciona → salva em sequência.
 */
export async function adicionarNaFila(item: QueueItem): Promise<void> {
  const fila = await buscarFila();
  fila.push(item);
  await salvarFila(fila);
  //console.log(`➕ Item adicionado à fila [${item.tipo}] total: ${fila.length}`);
}

/**
 * Retorna quantos itens estão pendentes na fila.
 */
export async function contarPendentes(): Promise<number> {
  const fila = await buscarFila();
  return fila.length;
}

/**
 * Retorna todos os itens pendentes de um tipo específico.
 */
export async function buscarPorTipo<T extends QueueItem>(
  tipo: T["tipo"]
): Promise<T[]> {
  const fila = await buscarFila();
  return fila.filter((item) => item.tipo === tipo) as T[];
}
