import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApiUrl } from "./api";

/**
 * Estratégia de numeração de orçamento.
 *
 * O `proposal_number` é uma sequência de negócio GLOBAL (independente do
 * chamado e do proposal_id), sempre calculada pelo cliente (o app já fazia
 * isso no caminho online: busca o último número no servidor e soma 1 antes
 * de enviar o cabeçalho — ver `obterProximoNumeroOrcamento` em
 * OrcamentoChamado.tsx). Este serviço estende a MESMA estratégia para o
 * caminho offline, em vez de criar uma nova:
 *
 * - `@orcamento_ultimo_numero_conhecido`: cache do maior proposal_number
 *   que este dispositivo já confirmou ter visto no servidor. Atualizado
 *   sempre que o app consulta o servidor com sucesso (online) e sempre que
 *   um orçamento reservado offline é confirmado pela sincronização.
 * - `@orcamento_numeros_offline_reservados`: números já entregues a
 *   orçamentos criados/editados offline por ESTE dispositivo, mas que
 *   ainda não foram confirmados pelo servidor. Permite que vários
 *   orçamentos criados offline, em sequência, no mesmo dispositivo, nunca
 *   recebam o mesmo número (433, depois 434, ...).
 *
 * Limite conhecido (não resolvível só no cliente): se DOIS dispositivos
 * diferentes estiverem offline ao mesmo tempo e reservarem o mesmo número
 * antes de sincronizar, ainda existe uma janela de colisão entre eles.
 * Para reduzir (não eliminar) esse risco, o handler de sincronização
 * (`sync.ts`) faz uma revalidação contra o servidor imediatamente antes de
 * enviar um orçamento novo, e corrige o número se ele já tiver sido usado
 * por outra pessoa nesse meio tempo — ver `revalidarNumeroAntesDeEnviar`.
 * Uma garantia 100% livre de colisão só é possível com numeração atômica
 * no servidor.
 */

const CHAVE_ULTIMO_CONHECIDO = "@orcamento_ultimo_numero_conhecido";
const CHAVE_RESERVADOS_OFFLINE = "@orcamento_numeros_offline_reservados";

async function lerUltimoConhecido(): Promise<number> {
  try {
    const v = await AsyncStorage.getItem(CHAVE_ULTIMO_CONHECIDO);
    return v ? Number(v) || 0 : 0;
  } catch {
    return 0;
  }
}

async function gravarUltimoConhecido(numero: number) {
  try {
    const atual = await lerUltimoConhecido();
    if (numero > atual) {
      await AsyncStorage.setItem(CHAVE_ULTIMO_CONHECIDO, String(numero));
    }
  } catch {
    // cache é só uma otimização; falha aqui não deve travar o fluxo principal
  }
}

async function lerReservadosOffline(): Promise<number[]> {
  try {
    const v = await AsyncStorage.getItem(CHAVE_RESERVADOS_OFFLINE);
    return v ? JSON.parse(v) : [];
  } catch {
    return [];
  }
}

async function gravarReservadosOffline(lista: number[]) {
  try {
    await AsyncStorage.setItem(CHAVE_RESERVADOS_OFFLINE, JSON.stringify(lista));
  } catch {
    // idem
  }
}

/**
 * Consulta o servidor pelo maior proposal_number existente e atualiza o
 * cache local de "último número conhecido". Usado no caminho ONLINE
 * (mesmo comportamento de antes, só que agora também alimenta o cache
 * usado pela reserva offline).
 */
export async function obterProximoNumeroOrcamentoOnline(): Promise<number | null> {
  try {
    const token = await AsyncStorage.getItem("token");
    const response = await fetch(await getApiUrl(), {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        class: "ProposalService",
        method: "loadAll",
        limit: 1,
        order: "proposal_number",
        direction: "desc",
      }),
    });
    const result = await response.json();
    const ultimoNoServidor =
      result.status === "success" && result.data && result.data.length > 0
        ? Number(result.data[0].proposal_number) || 0
        : 0;

    await gravarUltimoConhecido(ultimoNoServidor);

    // O próximo número precisa ser maior que o último do servidor E maior
    // que qualquer número já reservado offline por este dispositivo (caso
    // existam orçamentos offline ainda não sincronizados aguardando).
    const reservados = await lerReservadosOffline();
    const maiorReservado = reservados.length > 0 ? Math.max(...reservados) : 0;
    return Math.max(ultimoNoServidor, maiorReservado) + 1;
  } catch (e) {
    console.log("Erro ao buscar o próximo número de orçamento:", e);
    return null;
  }
}

/**
 * Reserva o próximo número disponível para um orçamento criado/editado
 * OFFLINE, sem depender de rede. Garante sequência única entre múltiplos
 * orçamentos criados offline neste mesmo dispositivo (ex.: 433 e depois
 * 434), a partir do último número que o app já confirmou ter visto no
 * servidor (cache) somado a qualquer reserva offline ainda pendente.
 */
export async function reservarProximoNumeroOffline(): Promise<number> {
  const [ultimoConhecido, reservados] = await Promise.all([
    lerUltimoConhecido(),
    lerReservadosOffline(),
  ]);

  const maiorReservado = reservados.length > 0 ? Math.max(...reservados) : 0;
  const proximo = Math.max(ultimoConhecido, maiorReservado) + 1;

  await gravarReservadosOffline([...reservados, proximo]);
  return proximo;
}

/**
 * Marca um número reservado offline como confirmado pelo servidor: remove
 * da lista de reservas pendentes e garante que o "último número conhecido"
 * reflita, no mínimo, esse número. Deve ser chamado pelo handler de
 * sincronização assim que o cabeçalho do orçamento é salvo com sucesso.
 */
export async function confirmarNumeroSincronizado(numero: number) {
  if (!numero) return;
  const reservados = await lerReservadosOffline();
  const restantes = reservados.filter((n) => n !== numero);
  if (restantes.length !== reservados.length) {
    await gravarReservadosOffline(restantes);
  }
  await gravarUltimoConhecido(numero);
}

/**
 * Revalida, junto ao servidor, se um número reservado offline ainda está
 * livre — chamado pelo handler de sincronização imediatamente antes de
 * criar (não atualizar) um orçamento novo. Reduz a janela de colisão entre
 * dispositivos diferentes que reservaram offline ao mesmo tempo: se, nesse
 * meio tempo, alguém já sincronizou um orçamento com número igual ou maior,
 * o número é corrigido para o próximo disponível antes do envio.
 *
 * Retorna o número que deve realmente ser enviado ao servidor (igual ao
 * reservado, quando ainda está livre; ou um novo número seguro, corrigido).
 */
export async function revalidarNumeroAntesDeEnviar(
  numeroReservado: number,
  token: string
): Promise<number> {
  try {
    const response = await fetch(await getApiUrl(), {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        class: "ProposalService",
        method: "loadAll",
        limit: 1,
        order: "proposal_number",
        direction: "desc",
      }),
    });
    const result = await response.json();
    const ultimoNoServidorAgora =
      result.status === "success" && result.data && result.data.length > 0
        ? Number(result.data[0].proposal_number) || 0
        : 0;

    await gravarUltimoConhecido(ultimoNoServidorAgora);

    if (numeroReservado > ultimoNoServidorAgora) {
      // Ainda está livre — mantém o número que o técnico já viu offline.
      return numeroReservado;
    }

    // Colisão detectada: outro dispositivo já usou esse número (ou maior)
    // enquanto este estava offline. Corrige para o próximo disponível.
    return ultimoNoServidorAgora + 1;
  } catch (e) {
    // Sem conseguir revalidar, mantém o número reservado — não bloquear a
    // sincronização por uma falha de leitura pontual.
    return numeroReservado;
  }
}