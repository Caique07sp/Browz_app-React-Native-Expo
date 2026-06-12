import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";
import { isOnline } from "./network";
import { buscarFila, salvarFila } from "./offlineQueue";

const MAX_TENTATIVAS = 5;

let sincronizando = false;

export async function sincronizarPendentes() {
  if (sincronizando) return;

  const online = await isOnline();
  if (!online) return;

  sincronizando = true;

  try {
    const token = await AsyncStorage.getItem("token");
    if (!token) {
      console.log("⚠️ Sync abortado: sem token");
      return;
    }

    let fila = await buscarFila();
    console.log("📦 FILA PARA SINCRONIZAR:", fila.length, fila);

    if (fila.length === 0) return;

    // Itera sobre cópia estática — evita bugs de iteração ao reatribuir fila
    const itensParaProcessar = [...fila];

    for (const item of itensParaProcessar) {
      // Pula itens que já excederam o limite de tentativas
      if ((item.tentativas || 0) >= MAX_TENTATIVAS) {
        
        // Remove da fila para não acumular infinitamente
        fila = fila.filter((p: any) => p.criadoEm !== item.criadoEm);
        await salvarFila(fila);
        continue;
      }

      

      const sucesso = await processarItem(item, token);

      if (sucesso) {
        
        fila = fila.filter((p: any) => p.criadoEm !== item.criadoEm);
        await salvarFila(fila);
      } else {
     
        fila = fila.map((p: any) => {
          if (p.criadoEm === item.criadoEm) {
            return {
              ...p,
              tentativas: (p.tentativas || 0) + 1,
              ultimoErro: new Date().toISOString(),
            };
          }
          return p;
        });
        await salvarFila(fila);
      }
    }

    console.log("📭 Fila após sync:", fila.length, "pendentes");
  } catch (error) {
    console.log("💥 Erro geral ao sincronizar:", error);
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

    console.log("⚠️ Tipo desconhecido na fila, removendo:", item.tipo);
    return true; // Remove tipos desconhecidos para não travar a fila
  } catch (error) {
    console.log("💥 Exceção em processarItem:", item.tipo, error);
    return false;
  }
}

async function sincronizarStatusChamado(item: any, token: string) {
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

  console.log("📤 ENVIANDO STATUS:", JSON.stringify(payload));

  const response = await fetch("https://browz.com.br/rest.php", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  const result = await response.json();
  console.log("📥 RETORNO STATUS:", JSON.stringify(result));

  if (result.status === "success" && Number(item.extraData?.agenda_pause ?? 0) === 0) {
    // check-in: limpa flag de pausado para o cache refletir corretamente
    await AsyncStorage.removeItem(`@ticket_${item.ticketId}_pausado`);
  }

  return result.status === "success";
}

async function sincronizarCheckin(item: any, token: string) {
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

  console.log("📤 ENVIANDO CHECKIN:", JSON.stringify(payload));

  const response = await fetch("https://browz.com.br/rest.php", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  const result = await response.json();
  console.log("📥 RETORNO CHECKIN:", JSON.stringify(result));
  return result.status === "success";
}

async function sincronizarFinalizacao(item: any, token: string) {
  const r = item.relatorioFinal;
  const ticketId = Number(item.ticketId);

  if (!r) {
    console.log("⚠️ relatorioFinal ausente no item de finalização, removendo da fila");
    return true;
  }

  console.log(`📋 Iniciando sync de finalização para ticket ${ticketId}`);

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
    console.log("📤 SYNC CHECKLIST:", JSON.stringify(payloadChecklist));
    const resChecklist = await fetch("https://browz.com.br/rest.php", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(payloadChecklist),
    });
    const dataChecklist = await resChecklist.json();
    console.log("📥 RETORNO CHECKLIST:", JSON.stringify(dataChecklist));
    if (dataChecklist.status !== "success") {
      console.log("❌ Falhou ao sincronizar checklist");
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
      console.log("📤 SYNC ASSINATURA para ticket:", ticketId);
      const resAssinatura = await fetch("https://browz.com.br/rest.php", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formDataAssinatura,
      });
      const dataAssinatura = await resAssinatura.json();
      console.log("📥 RETORNO ASSINATURA:", JSON.stringify(dataAssinatura));
      if (dataAssinatura.status !== "success") {
        console.log("❌ Falhou ao sincronizar assinatura");
        return false;
      }
    } else {
      console.log("⚠️ Arquivo de assinatura não encontrado, continuando sem ela:", r.assinatura);
    }
  }

  // 3. Fotos
  if (Array.isArray(r.fotos) && r.fotos.length > 0) {
    const caminhosBanco = r.fotos.map((_: any, i: number) =>
      `files/calendar/${ticketId}/foto_${i + 1}_${Date.now()}.jpg`
    );

    for (const [i, fotoUri] of r.fotos.entries()) {
      const { exists } = await FileSystem.getInfoAsync(fotoUri);
      if (!exists) {
        console.log(`⚠️ Foto ${i + 1} não encontrada, pulando:`, fotoUri);
        continue;
      }

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

      console.log(`📤 SYNC FOTO ${i + 1}/${r.fotos.length} para ticket:`, ticketId);
      const resFoto = await fetch("https://browz.com.br/rest.php", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formDataFoto,
      });
      const dataFoto = await resFoto.json();
      console.log(`📥 RETORNO FOTO ${i + 1}:`, JSON.stringify(dataFoto));

      if (dataFoto.status !== "success") {
        console.log(`❌ Falhou ao sincronizar foto ${i + 1}`);
        return false;
      }

      // Remove foto local após upload com sucesso
      try {
        await FileSystem.deleteAsync(fotoUri, { idempotent: true });
      } catch (e) {
        console.log("⚠️ Erro ao remover foto local após upload (não crítico):", e);
      }
    }
  }

  // 4. Relatório principal + status 2 (finalizado) + checkout
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

  console.log("📤 SYNC RELATÓRIO:", JSON.stringify(payloadRelatorio));
  const resRelatorio = await fetch("https://browz.com.br/rest.php", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(payloadRelatorio),
  });
  const dataRelatorio = await resRelatorio.json();
  console.log("📥 RETORNO RELATÓRIO:", JSON.stringify(dataRelatorio));

  if (dataRelatorio.status !== "success") {
    console.log("❌ Falhou ao sincronizar relatório principal");
    return false;
  }

  // 5. Limpeza local após tudo sincronizado
  try {
    await AsyncStorage.multiRemove([
      `@rascunho_relatorio_${ticketId}`,
      `@assinatura_cliente_${ticketId}`,
      `@fotos_chamado_${ticketId}`,
      `foto_chamado_${ticketId}`,
      `notas_chamado_${ticketId}`,
      `@ticket_${ticketId}_status`,
    ]);

    // Remove assinatura do armazenamento permanente após upload
    if (r.assinatura) {
      await FileSystem.deleteAsync(r.assinatura, { idempotent: true });
    }

    // Atualiza cache de chamados para refletir status finalizado
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

    console.log(`✅ Finalização do ticket ${ticketId} sincronizada e limpa com sucesso`);
  } catch (e) {
    console.log("⚠️ Erro na limpeza pós-sync (não crítico):", e);
  }

  return true;
}

async function sincronizarEventoLinhaTempo(item: any, token: string) {
  const payload = {
    class: "CalendarEventService",
    method: "store",
    data: item.data,
  };

  console.log("📤 ENVIANDO EVENTO_LINHA_TEMPO:", JSON.stringify(payload));

  const response = await fetch("https://browz.com.br/rest.php", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  const result = await response.json();
  console.log("📥 RETORNO EVENTO_LINHA_TEMPO:", JSON.stringify(result));
  return result.status === "success";
}

async function sincronizarEventoCheckin(item: any, token: string) {
  const payload = {
    class: "CalendarCheckinService",
    method: "store",
    data: item.data,
  };

  console.log("📤 ENVIANDO EVENTO_CHECKIN:", JSON.stringify(payload));

  const response = await fetch("https://browz.com.br/rest.php", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  const result = await response.json();
  console.log("📥 RETORNO EVENTO_CHECKIN:", JSON.stringify(result));
  return result.status === "success";
}

async function sincronizarFotoChamado(item: any, token: string) {
  try {
    // Verifica se o arquivo ainda existe antes de tentar upload
    const fileInfo = await FileSystem.getInfoAsync(item.uri);
    if (!fileInfo.exists) {
      console.log("🗑️ Arquivo de foto não existe mais, removendo da fila:", item.uri);
      return true; // Retorna true para remover da fila sem tentar upload
    }

    console.log("📤 ENVIANDO FOTO:", item.uri, "ticket:", item.ticketId);

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

    const response = await fetch("https://browz.com.br/rest.php", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    const result = await response.json();
    console.log("📥 RETORNO FOTO:", JSON.stringify(result));

    if (result.status === "success") {
      try {
        await FileSystem.deleteAsync(item.uri, { idempotent: true });
        console.log("🗑️ Foto local removida após upload:", item.uri);
      } catch (e) {
        console.log("⚠️ Erro ao remover foto local (não crítico):", e);
      }
    }

    return result.status === "success";
  } catch (error) {
    console.log("💥 Erro no upload de foto:", error);
    return false;
  }
}

async function sincronizarPausaChamado(item: any, token: string) {
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

  console.log("📤 ENVIANDO PAUSA:", JSON.stringify(payload));

  const response = await fetch("https://browz.com.br/rest.php", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  const result = await response.json();
  console.log("📥 RETORNO PAUSA:", JSON.stringify(result));

  if (result.status === "success") {
    // Remove o flag local de pausado após confirmação da API
    await AsyncStorage.removeItem(`@ticket_${item.ticketId}_pausado`);
    console.log("🧹 Flag pausado removido para ticket:", item.ticketId);
  }

  return result.status === "success";
}
