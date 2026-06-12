/**
 * offlinePhotos.ts
 *
 * Gerencia o armazenamento persistente de fotos para envio offline.
 *
 * Fluxo:
 * 1. Ao tirar uma foto offline, `salvarFotoParaSync` copia o arquivo para um
 *    diretório permanente (fora do cache) e enfileira o item no offlineQueue.
 * 2. Quando a internet voltar, `sincronizarPendentes` (sync.ts) processa a fila
 *    e chama `sincronizarFotoChamado`, que já lida com upload + remoção local.
 *
 * Por que copiar o arquivo?
 * - Fotos tiradas pela câmera ficam em diretórios temporários que o SO pode
 *   limpar. Copiar para `documentDirectory` garante que o arquivo sobreviva
 *   ao fechamento e reabertura do app.
 */


import { adicionarNaFila } from "./offlineQueue";
import * as ImagePicker from 'expo-image-picker';

// Diretório permanente dentro do documentDirectory do app
import * as FileSystem from "expo-file-system";

const FOTOS_OFFLINE_DIR = `${FileSystem.Paths.document.uri}fotos_offline/`;

/**
 * Garante que o diretório de fotos offline existe.
 */
async function garantirDiretorio(): Promise<void> {
  const info = await FileSystem.getInfoAsync(FOTOS_OFFLINE_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(FOTOS_OFFLINE_DIR, {
      intermediates: true,
    });
  }
}

/**
 * Salva uma foto localmente e a enfileira para sincronização.
 *
 * @param uriOrigem  URI da foto (câmera ou galeria)
 * @param ticketId   ID do chamado ao qual a foto pertence
 * @param descricao  Descrição opcional da foto
 * @returns          URI permanente onde o arquivo foi salvo
 */
export async function salvarFotoParaSync(
  uriOrigem: string,
  ticketId: string | number,
  descricao?: string
): Promise<string> {
  await garantirDiretorio();

  const nomeArquivo = `ticket_${ticketId}_${Date.now()}.jpg`;
  const uriDestino = `${FOTOS_OFFLINE_DIR}${nomeArquivo}`;

  // Copia para diretório permanente
  await FileSystem.copyAsync({ from: uriOrigem, to: uriDestino });

  console.log(`📁 Foto salva localmente: ${uriDestino}`);

  // Enfileira para sincronização
  await adicionarNaFila({
    tipo: "foto_chamado",
    ticketId: String(ticketId),
    uri: uriDestino,
    fileName: nomeArquivo,
    description: descricao || "Foto do chamado",
    criadoEm: new Date().toISOString(),
    tentativas: 0,
  });

  console.log(`📋 Foto enfileirada para sync — ticket: ${ticketId}`);

  return uriDestino;
}

/**
 * Lista todas as fotos offline pendentes de um ticket específico.
 * Útil para exibir previews mesmo sem internet.
 */
export async function listarFotosOfflineDoTicket(
  ticketId: string | number
): Promise<string[]> {
  await garantirDiretorio();

  const { exists } = await FileSystem.getInfoAsync(FOTOS_OFFLINE_DIR);
  if (!exists) return [];

  const arquivos = await FileSystem.readDirectoryAsync(FOTOS_OFFLINE_DIR);
  const prefixo = `ticket_${ticketId}_`;

  return arquivos
    .filter((nome) => nome.startsWith(prefixo))
    .map((nome) => `${FOTOS_OFFLINE_DIR}${nome}`);
}

/**
 * Remove todas as fotos offline de um ticket (após sincronização manual ou
 * cancelamento do chamado).
 */
export async function limparFotosOfflineDoTicket(
  ticketId: string | number
): Promise<void> {
  const fotos = await listarFotosOfflineDoTicket(ticketId);
  await Promise.all(
    fotos.map((uri) =>
      FileSystem.deleteAsync(uri, { idempotent: true }).catch((e) =>
        console.warn("⚠️ Erro ao remover foto offline:", e)
      )
    )
  );
  console.log(
    `🗑️ ${fotos.length} foto(s) offline removidas para ticket: ${ticketId}`
  );
}
