import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";
import { registrarLog } from "./logger";
import { isOnline } from "./network";
import { buscarFila, salvarFila } from "./offlineQueue";
import { deslogarForcado, validarSessaoDispositivo } from "./session";
import { getApiUrl } from "@/services/api";

const MAX_TENTATIVAS = 5;

let sincronizando = false;
let alertaSyncDeslogarVisivel = false;

export function estaSincronizando() {
  return sincronizando;
}

export async function sincronizarPendentes() {
  if (sincronizando) return;

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

      const sucesso = await processarItem(item, token);

      if (sucesso) {
        filaAtual = filaAtual.filter((p: any) => p.criadoEm !== item.criadoEm);
        await salvarFila(filaAtual);
      } else {
        filaAtual = filaAtual.map((p: any) => {
          if (p.criadoEm === item.criadoEm) {
            return {
              ...p,
              tentativas: (p.tentativas || 0) + 1,
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

    //console.log("⚠️ Tipo desconhecido na fila, removendo:", item.tipo);
    return true;
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

async function sincronizarFinalizacao(item: any, token: string) {
  const r = item.relatorioFinal;
  const ticketId = Number(item.ticketId);

  if (!r) {
    //console.log("⚠️ relatorioFinal ausente no item de finalização, removendo da fila");
    return true;
  }

  registrarLog("INFO", "SYNC_FINALIZACAO", `Iniciando finalização do chamado #${ticketId}`);

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
      registrarLog("ERROR", "SYNC_FINALIZACAO", `Falha no checklist do ticket #${ticketId}`, dataChecklist);
      return false;
    }
  }

  // 2. Assinatura
  if (r.assinatura) {
    const { exists } = await FileSystem.getInfoAsync(r.assinatura);
    if (exists) {
      const nomeArquivo = "assinatura.png";
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
        registrarLog("ERROR", "SYNC_FINALIZACAO", `Falha na assinatura do ticket #${ticketId}`, dataAssinatura);
        return false;
      }
    }
  }

  // 3. Fotos
  if (Array.isArray(r.fotos) && r.fotos.length > 0) {
    const caminhosBanco = r.fotos.map((_: any, i: number) =>
      `files/calendar/${ticketId}/foto_${i + 1}_${Date.now()}.jpg`
    );

    for (const [i, fotoUri] of r.fotos.entries()) {
      const { exists } = await FileSystem.getInfoAsync(fotoUri);
      if (!exists) continue;

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
        type: "image/jpeg",
      } as any);

      const resFoto = await fetch(await getApiUrl(), {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formDataFoto,
      });
      const dataFoto = await resFoto.json();

      if (dataFoto.status !== "success") {
        registrarLog("ERROR", "SYNC_FINALIZACAO", `Falha no upload da foto ${i + 1} do ticket #${ticketId}`, dataFoto);
        return false;
      }

      try {
        await FileSystem.deleteAsync(fotoUri, { idempotent: true });
      } catch (e) {}
    }
  }

  // 4. Relatório principal
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
    registrarLog("ERROR", "SYNC_FINALIZACAO", `Falha no relatório do ticket #${ticketId}`, dataRelatorio);
    return false;
  }

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

    let filaAtual = await buscarFila();
    filaAtual = filaAtual.filter((p: any) => String(p.ticketId) !== String(ticketId));
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
  } catch (e) {}

  return true;
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