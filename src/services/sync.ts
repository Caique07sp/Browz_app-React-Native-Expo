import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";
import { registrarLog } from "./logger";
import { isOnline } from "./network";
import { buscarFila, salvarFila } from "./offlineQueue";
import { confirmarNumeroSincronizado, revalidarNumeroAntesDeEnviar } from "./Orcamentonumeracao";
import { deslogarForcado, validarSessaoDispositivo } from "./session";
import { getApiUrl } from "@/services/api";

const MAX_TENTATIVAS = 5;

let sincronizando = false;
let alertaSyncDeslogarVisivel = false;

export function estaSincronizando() {
  return sincronizando;
}

/**
 * Backoff exponencial para retry automático: a 1ª tentativa é imediata,
 * cada falha seguinte espera progressivamente mais antes de ser retentada
 * de novo pelo ciclo automático (10s, 30s, 90s, 270s...), com teto de 5
 * minutos. Evita bater na API repetidamente em pouco tempo quando a
 * conexão está oscilando e vários gatilhos disparam sincronizarPendentes()
 * em sequência (NetInfo, foreground, foco de tela...).
 */
function calcularBackoffMs(tentativas: number): number {
  if (tentativas <= 0) return 0;
  return Math.min(10_000 * Math.pow(3, tentativas - 1), 5 * 60_000);
}

function dentroDaJanelaDeBackoff(item: any): boolean {
  if (!item.ultimoErro) return false;
  const desdeUltimaFalhaMs = Date.now() - new Date(item.ultimoErro).getTime();
  return desdeUltimaFalhaMs < calcularBackoffMs(item.tentativas || 0);
}

export async function sincronizarPendentes(opts?: { manual?: boolean }) {
  if (sincronizando) return;
  const manual = opts?.manual === true;

  // 1. Verifica se a sessão caiu enquanto estava offline
  const sessaoAtiva = await validarSessaoDispositivo();

  if (!sessaoAtiva) {
    await deslogarForcado();

    if (alertaSyncDeslogarVisivel) {
      return false;
    }

    alertaSyncDeslogarVisivel = true;
    return false;
  }

  //console.log("Sessão válida! Iniciando envio da fila offline...");

  const online = await isOnline();
  if (!online) return;

  const token = await AsyncStorage.getItem("token");
  if (!token) return;

  const fila = await buscarFila();
  if (fila.length === 0) return;

  sincronizando = true;

  try {
    let filaAtual = await buscarFila();
    //console.log("📦 FILA PARA SINCRONIZAR:", filaAtual.length, filaAtual);

    if (filaAtual.length === 0) return;

    const itensParaProcessar = [...filaAtual];

    for (const item of itensParaProcessar) {
      if ((item.tentativas || 0) >= MAX_TENTATIVAS) {
        filaAtual = filaAtual.filter((p: any) => p.criadoEm !== item.criadoEm);
        await salvarFila(filaAtual);
        registrarLog("WARN", "SYNC", `Item removido após exceder ${MAX_TENTATIVAS} tentativas`, item);
        continue;
      }

      // Item com erro PERMANENTE (payload inválido, autenticação, recurso
      // inexistente...) não é retentado automaticamente em segundo plano —
      // continua na fila (dado preservado) e só é reprocessado numa
      // sincronização manual explícita (botão "Forçar sincronização").
      if (item.erroPermanente && !manual) {
        continue;
      }

      // Backoff: se a última falha foi muito recente, aguarda mais um
      // pouco antes de tentar de novo automaticamente (sincronização
      // manual sempre tenta na hora, ignorando o backoff).
      if (!manual && dentroDaJanelaDeBackoff(item)) {
        continue;
      }

      const sucesso = await processarItem(item, token);

      if (sucesso) {
        filaAtual = filaAtual.filter((p: any) => p.criadoEm !== item.criadoEm);
        await salvarFila(filaAtual);
      } else {
        filaAtual = filaAtual.map((p: any) => {
          if (p.criadoEm === item.criadoEm) {
            return {
              ...p,
              // item.erroPermanente pode ter sido setado pelo próprio
              // handler (mutação in-place) — propaga para a versão
              // persistida.
              erroPermanente: !!item.erroPermanente,
              tentativas: item.erroPermanente ? (p.tentativas || 0) : (p.tentativas || 0) + 1,
              ultimoErro: new Date().toISOString(),
            };
          }
          return p;
        });
        await salvarFila(filaAtual);
      }
    }

    //console.log("📭 Fila após sync:", filaAtual.length, "pendentes");

    if (filaAtual.length === 0) {
      await AsyncStorage.setItem("@status_sincronizacao", "concluido");
    }
  } catch (error) {
    //console.log("💥 Erro geral ao sincronizar:", error);
    registrarLog("ERROR", "SYNC", "Erro geral na função sincronizarPendentes", error);
  } finally {
    sincronizando = false;
  }
}

async function processarItem(item: any, token: string) {
  try {
    if (item.tipo === "pausar_chamado") {
      return await sincronizarPausaChamado(item, token);
    }
    if (item.tipo === "status_chamado") {
      return await sincronizarStatusChamado(item, token);
    }
    if (item.tipo === "checkin") {
      return await sincronizarCheckin(item, token);
    }
    if (item.tipo === "finalizacao") {
      return await sincronizarFinalizacao(item, token);
    }
    if (item.tipo === "evento_linha_tempo") {
      return await sincronizarEventoLinhaTempo(item, token);
    }
    if (item.tipo === "evento_checkin") {
      return await sincronizarEventoCheckin(item, token);
    }
    if (item.tipo === "foto_chamado") {
      return await sincronizarFotoChamado(item, token);
    }
    if (item.tipo === "orcamento_upsert") {
      return await sincronizarUpsertOrcamento(item, token);
    }
    if (item.tipo === "orcamento_delete_item") {
      return await sincronizarDeleteItemOrcamento(item, token);
    }

    // ─── Compatibilidade com itens legados (enfileirados por versões
    // anteriores do app, antes da correção da fila de orçamento). O app não
    // cria mais itens com esses tipos, mas eles precisam continuar sendo
    // processados de verdade em vez de descartados. ───────────────────────
    if (item.tipo === "atualizar_status_orcamento") {
      return await sincronizarUpsertOrcamento(
        { ...item, data: { header: item.data, itens: [] } },
        token
      );
    }
    if (item.tipo === "salvar_item_orcamento") {
      return await sincronizarItemOrcamentoLegado(item, token);
    }
    if (item.tipo === "deletar_item_orcamento") {
      return await sincronizarDeleteItemOrcamento(
        {
          ...item,
          data: { proposal_item_id: item.data?.proposal_item_id || item.data?.id },
        },
        token
      );
    }

    // Tipo realmente desconhecido (ex.: versão futura da fila, item
    // corrompido). NÃO descartar silenciosamente: registra erro e mantém
    // na fila para nova tentativa/diagnóstico — o mecanismo normal de
    // MAX_TENTATIVAS acima já garante que ele não fique preso para sempre.
    registrarLog(
      "ERROR",
      "SYNC",
      `Tipo de item desconhecido na fila: "${item.tipo}". Mantendo para diagnóstico/retry.`,
      item
    );
    return false;
  } catch (error) {
    //console.log("💥 Exceção em processarItem:", item.tipo, error);
    registrarLog("ERROR", "PROCESSAR_ITEM", `Exceção ao processar item do tipo ${item.tipo}`, error);
    return false;
  }
}

async function sincronizarStatusChamado(item: any, token: string) {
  try {
    const payload = {
      class: "CalendarService",
      method: "store",
      data: {
        id: Number(item.ticketId),
        calendar_id: Number(item.ticketId),
        calendar_status: Number(item.status),
        agenda_pause: Number(item.extraData?.agenda_pause ?? 0),
        ...item.extraData,
      },
    };

    registrarLog("INFO", "SYNC_STATUS", `Enviando status do chamado #${item.ticketId}`, payload);
    //console.log("📤 ENVIANDO STATUS:", JSON.stringify(payload));

    const response = await fetch(await getApiUrl(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    //console.log("📥 RETORNO STATUS:", JSON.stringify(result));

    if (result.status === "success") {
      if (Number(item.extraData?.agenda_pause ?? 0) === 0) {
        await AsyncStorage.removeItem(`@ticket_${item.ticketId}_pausado`);
      }

      registrarLog("SUCCESS", "SYNC_STATUS", `Status do chamado #${item.ticketId} sincronizado`);
      return true;
    } else {
      registrarLog("ERROR", "SYNC_STATUS", `API retornou erro no chamado #${item.ticketId}`, result);
      return false;
    }
  } catch (error: any) {
    //console.log("💥 Exceção em sincronizarStatusChamado:", error);
    registrarLog("ERROR", "SYNC_STATUS", `Falha no chamado #${item.ticketId}`, error?.message || error);
    return false;
  }
}

async function sincronizarCheckin(item: any, token: string) {
  try {
    const payload = {
      class: "CalendarService",
      method: "store",
      data: {
        id: Number(item.ticketId),
        calendar_id: Number(item.ticketId),
        calendar_status: 1,
        ...item.checkinData,
      },
    };

    registrarLog("INFO", "SYNC_CHECKIN", `Enviando Check-in do chamado #${item.ticketId}`, payload);

    const response = await fetch(await getApiUrl(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (result.status === "success") {
      registrarLog("SUCCESS", "SYNC_CHECKIN", `Check-in do chamado #${item.ticketId} realizado`);
      return true;
    } else {
      registrarLog("ERROR", "SYNC_CHECKIN", `Erro no Check-in #${item.ticketId}`, result);
      return false;
    }
  } catch (error: any) {
    registrarLog("ERROR", "SYNC_CHECKIN", `Falha de rede no Check-in #${item.ticketId}`, error?.message || error);
    return false;
  }
}

/**
 * Classifica uma falha de API como PERMANENTE (não adianta tentar de novo
 * sem intervenção: payload inválido, autenticação, recurso inexistente)
 * ou TEMPORÁRIA (timeout, erro de rede, instabilidade do servidor —
 * continuar tentando faz sentido).
 */
function ehErroPermanente(status: number | null, data: any): boolean {
  if (status && [400, 401, 403, 404, 422].includes(status)) return true;
  const msg = String(data?.message || "").toLowerCase();
  if (/invalid|validation|unauthoriz|forbidden|not found|não encontrad|inválid/.test(msg)) {
    return true;
  }
  return false;
}

async function sincronizarFinalizacao(item: any, token: string) {
  const r = item.relatorioFinal;
  const ticketId = Number(item.ticketId);

  if (!r) {
    registrarLog(
      "ERROR",
      "SYNC_FINALIZACAO",
      `Item de finalização sem relatorioFinal (ticket #${ticketId}) — mantendo para diagnóstico`,
      item
    );
    item.erroPermanente = true; // não há como recuperar dados que nunca existiram
    return false;
  }

  registrarLog("INFO", "SYNC_FINALIZACAO", `Iniciando finalização do chamado #${ticketId}`);

  const marcarFalha = (etapa: string, status: number | null, data: any) => {
    const permanente = ehErroPermanente(status, data);
    item.erroPermanente = permanente;
    registrarLog(
      "ERROR",
      "SYNC_FINALIZACAO",
      `Falha ${permanente ? "PERMANENTE" : "temporária"} em "${etapa}" do ticket #${ticketId} (HTTP ${status ?? "?"})`,
      data
    );
  };

  try {
    // 1. Checklist
    if (r.calendar_checklist_id && r.checklist_response) {
      const payloadChecklist = {
        class: "CalendarChecklistService",
        method: "store",
        data: {
          id: Number(r.calendar_checklist_id),
          calendar_checklist_id: Number(r.calendar_checklist_id),
          calendar_id: ticketId,
          calendar_checklist_template: JSON.stringify(r.checklist_template || []),
          calendar_checklist_response: JSON.stringify(r.checklist_response),
        },
      };
      const resChecklist = await fetch(await getApiUrl(), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payloadChecklist),
      });
      const dataChecklist = await resChecklist.json();
      if (dataChecklist.status !== "success") {
        marcarFalha("checklist", resChecklist.status, dataChecklist);
        return false;
      }
    }

    // 2. Assinatura
    if (r.assinatura) {
      const { exists } = await FileSystem.getInfoAsync(r.assinatura);
      if (exists) {
        const nomeArquivo = "assinatura.png";
        // Caminho estável (sem timestamp): um retry reenvia para o MESMO
        // caminho, então mesmo que uma resposta de sucesso se perca na
        // rede, a segunda tentativa apenas sobrescreve o mesmo arquivo em
        // vez de criar um registro duplicado.
        const caminhoBanco = `file/signatures/${ticketId}/${nomeArquivo}`;
        const formDataAssinatura = new FormData();
        formDataAssinatura.append("class", "CalendarService");
        formDataAssinatura.append("method", "store");
        formDataAssinatura.append("data[id]", String(ticketId));
        formDataAssinatura.append("data[calendar_signature]", caminhoBanco);
        formDataAssinatura.append("path", `file/signatures/${ticketId}`);
        formDataAssinatura.append("file", {
          uri: r.assinatura,
          name: nomeArquivo,
          type: "image/png",
        } as any);

        const resAssinatura = await fetch(await getApiUrl(), {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formDataAssinatura,
        });
        const dataAssinatura = await resAssinatura.json();
        if (dataAssinatura.status !== "success") {
          marcarFalha("assinatura", resAssinatura.status, dataAssinatura);
          return false;
        }
      }
    }

    // 3. Fotos
    if (Array.isArray(r.fotos) && r.fotos.length > 0) {
      // Nomes ESTÁVEIS, derivados só do índice (sem Date.now()): uma
      // segunda tentativa do MESMO item da fila sempre aponta para o
      // mesmo caminho remoto. Isso é o que garante que "API salvou mas a
      // resposta se perdeu" não resulte em duas fotos diferentes no
      // servidor — a segunda tentativa sobrescreve o mesmo arquivo.
      const caminhosBanco = r.fotos.map((uri: string, i: number) => {
        const ehVideo = uri.toLowerCase().endsWith(".mp4");
        return `files/calendar/${ticketId}/foto_${i + 1}.${ehVideo ? "mp4" : "jpg"}`;
      });

      for (const [i, fotoUri] of r.fotos.entries()) {
        const { exists } = await FileSystem.getInfoAsync(fotoUri);
        // Já não existe localmente = já foi enviada e apagada numa
        // tentativa anterior (ver limpeza no fim do loop). Idempotente:
        // não reenvia o que já foi confirmado.
        if (!exists) continue;

        const ehVideo = fotoUri.toLowerCase().endsWith(".mp4");
        const caminhoBanco = caminhosBanco[i];
        const nomeArquivo = caminhoBanco.split("/").pop() || `foto_${i + 1}.jpg`;

        const formDataFoto = new FormData();
        formDataFoto.append("class", "CalendarService");
        formDataFoto.append("method", "store");
        formDataFoto.append("data[id]", String(ticketId));
        formDataFoto.append("data[calendar_id]", String(ticketId));
        formDataFoto.append("data[calendar_images]", caminhosBanco.join(","));
        formDataFoto.append("path", `files/calendar/${ticketId}`);
        formDataFoto.append("file", {
          uri: fotoUri,
          name: nomeArquivo,
          type: ehVideo ? "video/mp4" : "image/jpeg",
        } as any);

        const resFoto = await fetch(await getApiUrl(), {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formDataFoto,
        });
        const dataFoto = await resFoto.json();

        if (dataFoto.status !== "success") {
          marcarFalha(`foto ${i + 1}`, resFoto.status, dataFoto);
          return false;
        }

        try {
          await FileSystem.deleteAsync(fotoUri, { idempotent: true });
        } catch (e) {}
      }
    }

    // 4. Relatório principal (é aqui que o chamado é efetivamente marcado
    // como finalizado no servidor — só é alcançado depois que checklist,
    // assinatura e fotos já foram confirmados).
    const now = new Date();
    const brasilDate = new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString();

    const payloadRelatorio = {
      class: "CalendarService",
      method: "store",
      data: {
        id: ticketId,
        calendar_id: ticketId,
        calendar_report: r.descricao,
        calendar_signatory_name: r.assinante_nome,
        calendar_signatory_email: r.assinante_contato,
        calendar_signature: `file/signatures/${ticketId}/assinatura.png`,
        calendar_status: 2,
        calendar_last_checkout_date: r.finalizado_em || brasilDate,
        calendar_last_checkout_geo: r.checkout_geo || "",
      },
    };

    const resRelatorio = await fetch(await getApiUrl(), {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(payloadRelatorio),
    });
    const dataRelatorio = await resRelatorio.json();

    if (dataRelatorio.status !== "success") {
      marcarFalha("relatório final", resRelatorio.status, dataRelatorio);
      return false;
    }

    // Sucesso total: a partir daqui qualquer falha é só limpeza local
    // (best-effort) — o servidor já confirmou o recebimento.
    item.erroPermanente = false;

    // 5. Limpeza local
    try {
      await AsyncStorage.multiRemove([
        `@rascunho_relatorio_${ticketId}`,
        `@assinatura_cliente_${ticketId}`,
        `@fotos_chamado_${ticketId}`,
        `foto_chamado_${ticketId}`,
        `notas_chamado_${ticketId}`,
        `@ticket_${ticketId}_status`,
      ]);

      // Remove só a entrada de finalização deste chamado — nunca as
      // demais entradas pendentes (ex.: um orçamento ou uma pausa ainda
      // não sincronizados do mesmo chamado, que não têm nenhuma relação
      // com este envio e não podem ser descartados junto).
      let filaAtual = await buscarFila();
      filaAtual = filaAtual.filter(
        (p: any) => !(p.tipo === "finalizacao" && String(p.ticketId) === String(ticketId))
      );
      await salvarFila(filaAtual);

      if (r.assinatura) {
        await FileSystem.deleteAsync(r.assinatura, { idempotent: true });
      }

      const cache = await AsyncStorage.getItem("@cache_chamados");
      if (cache) {
        const chamados = JSON.parse(cache);
        const atualizados = chamados.map((c: any) =>
          String(c.calendar_id) === String(ticketId)
            ? { ...c, calendar_status: 2, agenda_pause: 0 }
            : c
        );
        await AsyncStorage.setItem("@cache_chamados", JSON.stringify(atualizados));
      }

      registrarLog("SUCCESS", "SYNC_FINALIZACAO", `Finalização do chamado #${ticketId} concluída com sucesso`);
    } catch (e) {
      // Falha na limpeza local não desfaz o sucesso já confirmado pelo
      // servidor — só registra para diagnóstico.
      registrarLog("WARN", "SYNC_FINALIZACAO", `Finalização do ticket #${ticketId} confirmada pelo servidor, mas houve erro na limpeza local`, e);
    }

    return true;
  } catch (error: any) {
    // Exceção de rede (fetch falhou, JSON inválido, etc.) — sempre
    // temporária, nunca perde o item.
    item.erroPermanente = false;
    registrarLog(
      "ERROR",
      "SYNC_FINALIZACAO",
      `Exceção de rede ao sincronizar finalização do ticket #${ticketId}`,
      error?.message || error
    );
    return false;
  }
}

async function sincronizarEventoLinhaTempo(item: any, token: string) {
  try {
    const payload = {
      class: "CalendarEventService",
      method: "store",
      data: item.data,
    };

    const response = await fetch(await getApiUrl(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    return result.status === "success";
  } catch (e) {
    return false;
  }
}

async function sincronizarEventoCheckin(item: any, token: string) {
  try {
    const payload = {
      class: "CalendarCheckinService",
      method: "store",
      data: item.data,
    };

    const response = await fetch(await getApiUrl(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    return result.status === "success";
  } catch (e) {
    return false;
  }
}

async function sincronizarFotoChamado(item: any, token: string) {
  try {
    const fileInfo = await FileSystem.getInfoAsync(item.uri);
    if (!fileInfo.exists) {
      return true;
    }

    const formData = new FormData();
    formData.append("class", "CalendarFileService");
    formData.append("method", "store");
    formData.append("data", JSON.stringify({
      calendar_id: Number(item.ticketId),
      description: item.description || "Foto do chamado",
    }));
    formData.append("file", {
      uri: item.uri,
      name: item.fileName || `foto_${Date.now()}.jpg`,
      type: "image/jpeg",
    } as any);

    const response = await fetch(await getApiUrl(), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    const result = await response.json();

    if (result.status === "success") {
      try {
        await FileSystem.deleteAsync(item.uri, { idempotent: true });
      } catch (e) {}
    }

    return result.status === "success";
  } catch (error) {
    return false;
  }
}

/**
 * Sincroniza o cabeçalho de um orçamento (ProposalService.store) e, na
 * sequência, todos os itens ainda pendentes (ProposalItemService.store),
 * já usando o proposal_id resolvido pelo cabeçalho — nunca o valor que foi
 * capturado no momento em que o item entrou na fila (que pode estar
 * desatualizado/inexistente se o orçamento foi criado 100% offline).
 *
 * Idempotência / retry seguro:
 * - Depois que o cabeçalho é confirmado pela API, `item.data.header` é
 *   sobrescrito com o id real retornado. Numa eventual nova tentativa
 *   (ex.: um item falhou e o cabeçalho ficou na fila de novo), o cabeçalho
 *   vira um UPDATE (tem id) em vez de um novo CREATE.
 * - Cada item bem-sucedido é removido de `item.data.itens` antes de
 *   devolver o resultado. Se sobrar algum item com falha, ele permanece
 *   sozinho nessa lista — um retry só reenvia o que realmente falhou,
 *   nunca duplica um item que já foi salvo com sucesso.
 * - Em caso de sucesso total, atualiza também o cache local
 *   (`@orcamento_chamado_${ticketId}`) com os proposal_item_id reais,
 *   para que a tela de orçamento não tente recriar esses itens caso seja
 *   reaberta offline antes de buscar dados atualizados do servidor.
 */
async function sincronizarUpsertOrcamento(item: any, token: string) {
  try {
    const header = item.data?.header;
    const itens: any[] = Array.isArray(item.data?.itens) ? item.data.itens : [];

    if (!header || typeof header !== "object") {
      registrarLog(
        "ERROR",
        "SYNC_ORCAMENTO",
        `Item orcamento_upsert sem cabeçalho válido (ticket #${item.ticketId})`,
        item
      );
      return false; // mantém na fila para diagnóstico; nunca descarta silenciosamente
    }

    // 1) Upsert do cabeçalho do orçamento
    const ehCriacaoNova = !header.id && !header.proposal_id;

    if (ehCriacaoNova && header.proposal_number) {
      // O número pode ter sido reservado offline (ver services/orcamentoNumeracao.ts).
      // Revalida contra o servidor agora que há conexão: se outro dispositivo
      // já usou esse número (ou maior) enquanto este estava offline, corrige
      // antes de enviar, em vez de arriscar duplicidade de numeração.
      const numeroReservado = Number(header.proposal_number);
      const numeroSeguro = await revalidarNumeroAntesDeEnviar(numeroReservado, token);
      if (numeroSeguro !== numeroReservado) {
        registrarLog(
          "WARN",
          "SYNC_ORCAMENTO",
          `Número de orçamento reservado offline (#${numeroReservado}) já estava em uso; corrigido para #${numeroSeguro} (ticket #${item.ticketId})`
        );
      }
      header.proposal_number = numeroSeguro;
      item.data.header = header;
    }

    const payloadHeader = {
      class: "ProposalService",
      method: "store",
      data: header,
    };

    const resHeader = await fetch(await getApiUrl(), {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(payloadHeader),
    });
    const dataHeader = await resHeader.json();

    if (dataHeader.status !== "success") {
      registrarLog(
        "ERROR",
        "SYNC_ORCAMENTO",
        `Falha ao salvar cabeçalho do orçamento (ticket #${item.ticketId})`,
        dataHeader
      );
      return false;
    }

    const proposalId = Number(
      dataHeader.data?.proposal_id ||
        dataHeader.data?.id ||
        header.proposal_id ||
        header.id ||
        0
    );

    if (!proposalId) {
      registrarLog(
        "ERROR",
        "SYNC_ORCAMENTO",
        `API não retornou um proposal_id válido (ticket #${item.ticketId})`,
        dataHeader
      );
      return false; // sem proposal_id não há como vincular os itens com segurança
    }

    const proposalNumberConfirmado = Number(
      dataHeader.data?.proposal_number || header.proposal_number || 0
    );
    if (proposalNumberConfirmado) {
      await confirmarNumeroSincronizado(proposalNumberConfirmado);
    }

    // Cabeçalho confirmado: a partir de agora um eventual retry deve ser
    // um UPDATE (com id), nunca um novo CREATE.
    item.data.header = {
      ...header,
      id: proposalId,
      proposal_id: proposalId,
      ...(proposalNumberConfirmado ? { proposal_number: proposalNumberConfirmado } : {}),
    };

    // 2) Upsert de cada item pendente, usando o proposal_id já resolvido
    const itensConfirmados: any[] = [];
    const itensRestantes: any[] = [];

    for (const it of itens) {
      const idExistente = it.proposal_item_id || it.id;
      const payloadItem: any = {
        class: "ProposalItemService",
        method: "store",
        data: {
          ...it,
          proposal_id: proposalId,
        },
      };
      if (idExistente) {
        payloadItem.id = idExistente;
        payloadItem.data.id = idExistente;
        payloadItem.data.proposal_item_id = idExistente;
      }

      try {
        const resItem = await fetch(await getApiUrl(), {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify(payloadItem),
        });
        const dataItem = await resItem.json();

        if (dataItem.status === "success") {
          const proposalItemId = Number(
            dataItem.data?.proposal_item_id || dataItem.data?.id || idExistente || 0
          );
          itensConfirmados.push({ ...it, proposal_item_id: proposalItemId || undefined });
        } else {
          itensRestantes.push(it);
          registrarLog(
            "ERROR",
            "SYNC_ORCAMENTO",
            `Falha ao salvar item de orçamento (ticket #${item.ticketId})`,
            dataItem
          );
        }
      } catch (e: any) {
        itensRestantes.push(it);
        registrarLog(
          "ERROR",
          "SYNC_ORCAMENTO",
          `Exceção ao salvar item de orçamento (ticket #${item.ticketId})`,
          e?.message || e
        );
      }
    }

    // Só ficam pendentes na fila os itens que realmente falharam — os
    // confirmados nunca são reenviados num retry.
    item.data.itens = itensRestantes;

    if (itensRestantes.length > 0) {
      await atualizarCacheOrcamentoLocal(item.ticketId, item.data.header, itensConfirmados);
      return false;
    }

    await atualizarCacheOrcamentoLocal(item.ticketId, item.data.header, itensConfirmados);
    registrarLog(
      "SUCCESS",
      "SYNC_ORCAMENTO",
      `Orçamento do chamado #${item.ticketId} sincronizado com sucesso`
    );
    return true;
  } catch (error: any) {
    registrarLog(
      "ERROR",
      "SYNC_ORCAMENTO",
      `Exceção geral ao sincronizar orçamento (ticket #${item.ticketId})`,
      error?.message || error
    );
    return false;
  }
}

/**
 * Handler de compatibilidade para itens legados do tipo "salvar_item_orcamento"
 * (enfileirados por versões antigas do app). Só é seguro processá-los quando
 * já carregam um proposal_id válido (caso comum: edição de um item de um
 * orçamento que já existia no servidor antes de ficar offline). Quando não
 * há proposal_id válido, não há como saber a qual orçamento o item pertence
 * com segurança — nesse caso o item é mantido na fila e sinalizado para
 * diagnóstico manual, em vez de ser descartado ou vinculado a um orçamento
 * errado.
 */
async function sincronizarItemOrcamentoLegado(item: any, token: string) {
  try {
    const proposalId = Number(item.data?.proposal_id || 0);
    if (!proposalId) {
      registrarLog(
        "ERROR",
        "SYNC_ORCAMENTO",
        `Item legado "salvar_item_orcamento" sem proposal_id válido — requer verificação manual (ticket #${item.ticketId})`,
        item
      );
      return false;
    }

    const idExistente = item.data?.proposal_item_id || item.data?.id;
    const payloadItem: any = {
      class: "ProposalItemService",
      method: "store",
      data: { ...item.data, proposal_id: proposalId },
    };
    if (idExistente) {
      payloadItem.id = idExistente;
      payloadItem.data.id = idExistente;
      payloadItem.data.proposal_item_id = idExistente;
    }

    const res = await fetch(await getApiUrl(), {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(payloadItem),
    });
    const data = await res.json();

    if (data.status !== "success") {
      registrarLog(
        "ERROR",
        "SYNC_ORCAMENTO",
        `Falha ao salvar item legado de orçamento (ticket #${item.ticketId})`,
        data
      );
      return false;
    }

    return true;
  } catch (error: any) {
    registrarLog(
      "ERROR",
      "SYNC_ORCAMENTO",
      `Exceção ao sincronizar item legado de orçamento (ticket #${item.ticketId})`,
      error?.message || error
    );
    return false;
  }
}

/**
 * Exclui um item de orçamento (ProposalItemService.delete). Idempotente:
 * se o item já não existir no servidor (por já ter sido excluído numa
 * tentativa anterior que teve sucesso mas falhou ao remover da fila local,
 * por exemplo), considera sucesso em vez de ficar retentando para sempre.
 */
async function sincronizarDeleteItemOrcamento(item: any, token: string) {
  try {
    const proposalItemId = Number(item.data?.proposal_item_id || 0);
    if (!proposalItemId) {
      registrarLog(
        "ERROR",
        "SYNC_ORCAMENTO",
        `Item orcamento_delete_item sem proposal_item_id válido (ticket #${item.ticketId})`,
        item
      );
      return false;
    }

    const res = await fetch(await getApiUrl(), {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        class: "ProposalItemService",
        method: "delete",
        id: proposalItemId,
        data: { id: proposalItemId, proposal_item_id: proposalItemId },
      }),
    });
    const data = await res.json();

    // Alguns backends retornam erro/"not found" quando o registro já não
    // existe mais — tratamos isso como sucesso (o objetivo, "não existir
    // mais no servidor", já foi alcançado), para não retentar para sempre
    // uma exclusão que na prática já aconteceu.
    const jaNaoExiste =
      typeof data.message === "string" &&
      /not found|não encontrad/i.test(data.message);

    if (data.status === "success" || jaNaoExiste) {
      return true;
    }

    registrarLog(
      "ERROR",
      "SYNC_ORCAMENTO",
      `Falha ao excluir item de orçamento (ticket #${item.ticketId})`,
      data
    );
    return false;
  } catch (error: any) {
    registrarLog(
      "ERROR",
      "SYNC_ORCAMENTO",
      `Exceção ao excluir item de orçamento (ticket #${item.ticketId})`,
      error?.message || error
    );
    return false;
  }
}

/**
 * Atualiza o cache local do orçamento (`@orcamento_chamado_${ticketId}`)
 * depois de uma sincronização em segundo plano, marcando como sincronizados
 * (is_local_only=false, com o proposal_item_id real) os itens que acabaram
 * de ser confirmados pelo servidor. Isso evita que, se o técnico reabrir a
 * tela de orçamento ainda offline, o app tente reenviar (e duplicar) um
 * item que já foi salvo com sucesso.
 */
async function atualizarCacheOrcamentoLocal(
  ticketId: string,
  headerResolvido: any,
  itensConfirmados: any[]
) {
  try {
    const cacheChave = `@orcamento_chamado_${ticketId}`;
    const cacheAtual = await AsyncStorage.getItem(cacheChave);
    if (!cacheAtual) return;

    const cache = JSON.parse(cacheAtual);
    const itensCache: any[] = Array.isArray(cache.itens) ? cache.itens : [];

    const porLocalId = new Map(
      itensConfirmados.filter((i) => i.localId).map((i) => [i.localId, i])
    );

    const itensAtualizados = itensCache.map((i) => {
      const confirmado = i.localId ? porLocalId.get(i.localId) : undefined;
      if (confirmado) {
        return {
          ...i,
          proposal_item_id: confirmado.proposal_item_id,
          proposal_id: headerResolvido.proposal_id,
          is_local_only: false,
        };
      }
      return i;
    });

    await AsyncStorage.setItem(
      cacheChave,
      JSON.stringify({
        ...cache,
        proposal_id: headerResolvido.proposal_id,
        proposal_number: headerResolvido.proposal_number ?? cache.proposal_number,
        itens: itensAtualizados,
      })
    );
  } catch (e) {
    // Cache local é só uma otimização de UX; falha aqui não deve
    // interromper a sincronização que já foi confirmada pelo servidor.
  }
}

async function sincronizarPausaChamado(item: any, token: string) {
  try {
    const payload = {
      class: "CalendarService",
      method: "store",
      data: {
        id: Number(item.ticketId),
        calendar_id: Number(item.ticketId),
        calendar_status: 1,
        agenda_pause: 1,
        pausa_motivo: item.data?.pausa_motivo,
        pausa_data: item.data?.pausa_data,
      },
    };

    const response = await fetch(await getApiUrl(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (result.status === "success") {
      await AsyncStorage.removeItem(`@ticket_${item.ticketId}_pausado`);
      registrarLog("SUCCESS", "SYNC_PAUSA", `Chamado #${item.ticketId} pausado com sucesso`);
    }

    return result.status === "success";
  } catch (e) {
    return false;
  }
}