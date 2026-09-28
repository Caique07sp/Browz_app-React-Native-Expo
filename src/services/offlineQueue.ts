import AsyncStorage from "@react-native-async-storage/async-storage";

const CHAVE_FILA = "@offline_queue";

// ─── Tipos ───────────────────────────────────────────────────────────────────

export interface QueueItemBase {
  criadoEm: string;   // ISO timestamp — identificador único do item
  tentativas: number;
  ultimoErro?: string;
  /**
   * Quando true, indica que a última falha foi classificada como
   * PERMANENTE (ex.: payload inválido, autenticação inválida, recurso
   * inexistente) e não deve ser retentada automaticamente em segundo
   * plano — só numa sincronização MANUAL (botão "Forçar sincronização"),
   * já que retry infinito não resolveria o problema sozinho. O item
   * continua na fila (dado nunca é perdido), só some do ciclo automático.
   */
  erroPermanente?: boolean;
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

/**
 * Salva/atualiza o cabeçalho do orçamento (ProposalService.store) e, na mesma
 * operação atômica, os itens do orçamento que ainda estão pendentes de envio
 * (ProposalItemService.store), usando o proposal_id resolvido pelo próprio
 * cabeçalho. Cobre: criar orçamento, editar itens, alterar desconto,
 * aprovar/recusar.
 *
 * `data.itens` é reescrito pelo próprio handler de sincronização em caso de
 * sucesso parcial: só ficam nele os itens que ainda não foram confirmados
 * pelo servidor, para que um retry nunca recrie o cabeçalho nem reenvie um
 * item que já foi salvo (idempotência).
 */
export interface QueueItemOrcamentoUpsert extends QueueItemBase {
  tipo: "orcamento_upsert";
  ticketId: string;
  data: {
    header: Record<string, unknown>;
    itens: Array<Record<string, unknown>>;
  };
}

/** Exclui um item de orçamento já existente no servidor (ProposalItemService.delete). */
export interface QueueItemOrcamentoDeleteItem extends QueueItemBase {
  tipo: "orcamento_delete_item";
  ticketId: string;
  data: {
    proposal_item_id: number;
  };
}

// ─── Tipos LEGADOS (não são mais criados pelo app) ─────────────────────────
// Mantidos apenas para que itens já gravados no @offline_queue de instalações
// antigas do app (antes desta correção) continuem sendo processados por um
// handler de compatibilidade em sync.ts, em vez de ficarem presos ou serem
// descartados sem nunca terem sido enviados ao servidor.

/** @deprecated Substituído por QueueItemOrcamentoUpsert. */
export interface QueueItemOrcamentoStatusLegado extends QueueItemBase {
  tipo: "atualizar_status_orcamento";
  ticketId: string;
  data: Record<string, unknown>;
}

/** @deprecated Substituído por QueueItemOrcamentoUpsert. */
export interface QueueItemOrcamentoItemLegado extends QueueItemBase {
  tipo: "salvar_item_orcamento";
  ticketId: string;
  data: Record<string, unknown>;
}

/** @deprecated Substituído por QueueItemOrcamentoDeleteItem. */
export interface QueueItemOrcamentoDeleteLegado extends QueueItemBase {
  tipo: "deletar_item_orcamento";
  ticketId: string;
  data: Record<string, unknown>;
}

export type QueueItem =
  | QueueItemFoto
  | QueueItemVideo
  | QueueItemStatus
  | QueueItemCheckin
  | QueueItemFinalizacao
  | QueueItemEventoLinhaTempo
  | QueueItemEventoCheckin
  | QueueItemPausa
  | QueueItemOrcamentoUpsert
  | QueueItemOrcamentoDeleteItem
  | QueueItemOrcamentoStatusLegado
  | QueueItemOrcamentoItemLegado
  | QueueItemOrcamentoDeleteLegado;

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
 * Adiciona (ou atualiza) uma operação de upsert de orçamento na fila.
 *
 * Se já existir, para o MESMO chamado, uma entrada `orcamento_upsert` que
 * ainda não foi confirmada pelo servidor (ou seja, seu cabeçalho ainda não
 * tem `id`/`proposal_id`), essa entrada é atualizada em vez de criar uma
 * segunda entrada — evita que dois cliques em "Salvar" (ou "Salvar" seguido
 * de "Aprovar/Recusar") enquanto offline gerem duas tentativas
 * independentes de CRIAR o mesmo orçamento, o que duplicaria o registro no
 * servidor.
 *
 * @param substituirItens quando `true` (ação "Salvar"), a lista de itens
 * enviada é a fonte da verdade e substitui a lista anteriormente
 * enfileirada. Quando `false` (ex.: aprovar/recusar, que não toca nos
 * itens), a lista de itens já enfileirada é preservada.
 */
export async function enfileirarOuAtualizarOrcamentoUpsert(
  ticketId: string,
  header: Record<string, unknown>,
  itens: Array<Record<string, unknown>>,
  substituirItens: boolean
): Promise<void> {
  const fila = await buscarFila();

  const existenteIndex = fila.findIndex((i): i is QueueItemOrcamentoUpsert => {
    if (i.tipo !== "orcamento_upsert" || i.ticketId !== ticketId) return false;
    const h = i.data?.header as any;
    return !h?.id && !h?.proposal_id; // ainda não confirmado pelo servidor
  });

  if (existenteIndex >= 0) {
    const existente = fila[existenteIndex] as QueueItemOrcamentoUpsert;
    fila[existenteIndex] = {
      ...existente,
      tentativas: 0,
      ultimoErro: undefined,
      data: {
        header,
        itens: substituirItens ? itens : existente.data.itens,
      },
    };
    await salvarFila(fila);
    return;
  }

  fila.push({
    tipo: "orcamento_upsert",
    ticketId,
    data: { header, itens },
    criadoEm: new Date().toISOString(),
    tentativas: 0,
  });
  await salvarFila(fila);
}

/**
 * Adiciona (ou atualiza) a finalização de um chamado na fila.
 *
 * Se já existir uma entrada `finalizacao` pendente para o MESMO chamado,
 * ela é atualizada com o payload mais recente em vez de criar uma segunda
 * entrada (o que poderia gerar dois envios independentes do mesmo
 * relatório). Reseta tentativas/erroPermanente, já que é um payload novo.
 */
export async function enfileirarOuAtualizarFinalizacao(
  ticketId: string,
  relatorioFinal: Record<string, unknown>
): Promise<void> {
  const fila = await buscarFila();
  const existenteIndex = fila.findIndex(
    (i) => i.tipo === "finalizacao" && i.ticketId === ticketId
  );

  if (existenteIndex >= 0) {
    const existente = fila[existenteIndex] as QueueItemFinalizacao;
    fila[existenteIndex] = {
      ...existente,
      relatorioFinal,
      tentativas: 0,
      ultimoErro: undefined,
      erroPermanente: false,
    };
    await salvarFila(fila);
    return;
  }

  fila.push({
    tipo: "finalizacao",
    ticketId,
    relatorioFinal,
    criadoEm: new Date().toISOString(),
    tentativas: 0,
  });
  await salvarFila(fila);
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
 * Retorna a entrada `finalizacao` pendente de um chamado específico, se
 * existir. Usado pela tela de finalização para checar, logo após tentar
 * sincronizar, se o relatório realmente foi enviado (removido da fila) ou
 * se continua pendente/com erro.
 */
export async function buscarFinalizacaoPendente(
  ticketId: string
): Promise<QueueItemFinalizacao | null> {
  const fila = await buscarFila();
  const item = fila.find(
    (i): i is QueueItemFinalizacao => i.tipo === "finalizacao" && i.ticketId === ticketId
  );
  return item || null;
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