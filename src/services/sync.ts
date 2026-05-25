import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImageManipulator from 'expo-image-manipulator';
import { isOnline } from './network';

export async function sincronizarPendentes() {

  const online = await isOnline();

  if (!online) return;

  const pendentes =
    await AsyncStorage.getItem("@sync_pendente");

  if (!pendentes) return;

  const lista = JSON.parse(pendentes);

  const restantes = [];

  const token =
    await AsyncStorage.getItem("token");

  for (const item of lista) {

    try {



      console.log("SINCRONIZANDO:", item);

      if (item.tipo === "evento_linha_tempo") {
        await fetch("https://browz.com.br/rest.php", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
    },
      body: JSON.stringify({
        class: "CalendarEventService",
        method: "store",
        data: item.data,
      }),
  });
  }

  // STATUS CHAMADO
  if (item.tipo === "status_chamado") {

    const payload = {
      class: "CalendarService",
      method: "store",
      data: {
        id: Number(item.ticketId),
        calendar_id: Number(item.ticketId),
        calendar_status: item.status,
        ...item.extraData,
      },
    };

    if (item.tipo === "evento_checkin") {
      const token = await AsyncStorage.getItem("token");

      const response = await fetch("https://browz.com.br/rest.php", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          class: "CalendarCheckinService",
          method: "store",
          data: item.data,
        }),
      });

      const result = await response.json();

      if (result.status !== "success") {
        restantes.push(item);
      }

      continue;
    }

    const response = await fetch(
      "https://browz.com.br/rest.php",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      }
    );

    const data = await response.json();

    console.log("RETORNO API:", data);

    // SE DER ERRO
    if (data.status !== "success") {
      restantes.push(item);
    }
  }

  // FINALIZAÇÃO
  else if (item.tipo === "finalizacao") {

    const relatorio = item.relatorioFinal;

    // RELATÓRIO
    const payload = {
      class: "CalendarService",
      method: "store",
      data: {
        id: Number(item.chamadoId),
        calendar_id: Number(item.chamadoId),

        calendar_report: relatorio.descricao,

        calendar_signatory_name:
          relatorio.assinante_nome,

        calendar_signatory_email:
          relatorio.assinante_contato,

        calendar_status: 2,
      },
    };

    const response = await fetch(
      "https://browz.com.br/rest.php",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      }
    );

    const data = await response.json();

    console.log("FINALIZAÇÃO:", data);

    if (data.status !== "success") {
      restantes.push(item);
      continue;
    }

    // ATUALIZA CACHE LOCAL
    const cache =
      await AsyncStorage.getItem("@cache_chamados");

    if (cache) {

      const chamados = JSON.parse(cache);

      const atualizados = chamados.map((c: any) => {

        if (
          String(c.calendar_id) ===
          String(item.chamadoId)
        ) {

          return {
            ...c,
            calendar_status: 2,
            agenda_pause: 0,
          };
        }

        return c;
      });

      await AsyncStorage.setItem(
        "@cache_chamados",
        JSON.stringify(atualizados)
      );
    }
  }

} catch (error) {

  console.log("ERRO SYNC:", error);

  restantes.push(item);
}
  }

await AsyncStorage.setItem(
  "@sync_pendente",
  JSON.stringify(restantes)
);
}

async function comprimirImagemSync(uri: string) {
  try {
    const manipResult = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 1024 } }],
      { compress: 0.5 }
    );
    return manipResult.uri;
  } catch (error) {
    return uri;
  }
}

export async function processarFilaSincronizacao() {
  try {
    const pendentesStr = await AsyncStorage.getItem("@sync_pendente");
    if (!pendentesStr) return;

    const listaPendentes = JSON.parse(pendentesStr);
    if (listaPendentes.length === 0) return;

    const token = await AsyncStorage.getItem('token');
    const restante = [...listaPendentes];

    for (const item of listaPendentes) {
      if (item.tipo === "finalizacao") {
        const { chamadoId, relatorioFinal } = item;
        console.log(`🔄 Sincronizando chamado #${chamadoId} que foi feito offline...`);

        // 1. ENVIAR CHECKLIST
        const payloadChecklist = {
          class: 'CalendarChecklistService',
          method: 'store',
          data: {
            id: Number(relatorioFinal.calendar_checklist_id),
            calendar_checklist_id: Number(relatorioFinal.calendar_checklist_id),
            calendar_id: Number(chamadoId),
            calendar_checklist_template: JSON.stringify(relatorioFinal.checklist_template),
            calendar_checklist_response: JSON.stringify(relatorioFinal.checklist_response),
          },
        };

        const resChecklist = await fetch('https://browz.com.br/rest.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(payloadChecklist),
        });
        const dataChecklist = await resChecklist.json();

        // 2. ENVIAR RELATÓRIO/STATUS
        const payloadRelatorio = {
          class: 'CalendarService',
          method: 'store',
          data: {
            id: Number(chamadoId),
            calendar_id: Number(chamadoId),
            calendar_report: relatorioFinal.descricao,
            calendar_signatory_name: relatorioFinal.assinante_nome,
            calendar_signatory_email: relatorioFinal.assinante_contato,
            calendar_signature: `file/signatures/${chamadoId}/assinatura.png`,
            calendar_status: 2,
            calendar_last_checkout_date: relatorioFinal.finalizado_em,
            calendar_last_checkout_geo: '',
          },
        };

        const resRelatorio = await fetch('https://browz.com.br/rest.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(payloadRelatorio),
        });
        const dataRelatorio = await resRelatorio.json();

        // 3. ENVIAR ASSINATURA (FormData)
        let enviadoAssinatura = true;
        if (relatorioFinal.assinatura) {
          const formDataSig = new FormData();
          formDataSig.append('class', 'CalendarService');
          formDataSig.append('method', 'store');
          formDataSig.append('data[id]', String(chamadoId));
          formDataSig.append('data[calendar_signature]', `file/signatures/${chamadoId}/assinatura.png`);
          formDataSig.append('path', `file/signatures/${chamadoId}`);
          formDataSig.append('file', {
            uri: relatorioFinal.assinatura,
            name: `assinatura.png`,
            type: 'image/png'
          } as any);

          const resSig = await fetch('https://browz.com.br/rest.php', {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: formDataSig,
          });
          const dataSig = await resSig.json();
          enviadoAssinatura = dataSig.status === 'success';
        }

        // 4. ENVIAR FOTOS DA GALERIA (FormData)
        let enviadoFotos = true;
        const listaFotos = relatorioFinal.fotos || [];

        if (listaFotos.length > 0) {
          const caminhosBanco = listaFotos.map((_: any, idx: number) => {
            return `files/calendar/${chamadoId}/foto_${idx + 1}_${Date.now()}.jpg`;
          });

          for (const [idx, fotoUri] of listaFotos.entries()) {
            const uriComprimida = await comprimirImagemSync(fotoUri);
            const formDataFoto = new FormData();
            const caminhoBanco = caminhosBanco[idx];
            const nomeArquivo = caminhoBanco.split('/').pop() || `foto_${Date.now()}_${idx}.jpg`;

            formDataFoto.append('class', 'CalendarService');
            formDataFoto.append('method', 'store');
            formDataFoto.append('data[id]', String(chamadoId));
            formDataFoto.append('data[calendar_id]', String(chamadoId));
            formDataFoto.append('data[calendar_images]', caminhosBanco.join(','));
            formDataFoto.append('path', `files/calendar/${chamadoId}`);
            formDataFoto.append('file', {
              uri: uriComprimida,
              name: nomeArquivo,
              type: 'image/jpeg',
            } as any);

            const resFoto = await fetch('https://browz.com.br/rest.php', {
              method: 'POST',
              headers: { Authorization: `Bearer ${token}` },
              body: formDataFoto,
            });
            const dataFoto = await resFoto.json();
            if (dataFoto.status !== 'success') enviadoFotos = false;
          }
        }

        // Se tudo deu certo para esse chamado, removemos ele da fila
        if (dataChecklist.status === 'success' && dataRelatorio.status === 'success' && enviadoAssinatura && enviadoFotos) {
          console.log(`✅ Chamado #${chamadoId} sincronizado com sucesso total!`);

          // Limpa caches locais específicos desse chamado que já subiu
          await AsyncStorage.multiRemove([
            `@rascunho_relatorio_${chamadoId}`,
            `@assinatura_cliente_${chamadoId}`,
            `@fotos_chamado_${chamadoId}`,
            `foto_chamado_${chamadoId}`,
            `notas_chamado_${chamadoId}`,
          ]);

          const index = restante.findIndex(i => i.chamadoId === chamadoId);
          if (index !== -1) restante.splice(index, 1);
        }
      }
    }

    // Atualiza a fila com o que sobrou (caso algum tenha falhado)
    await AsyncStorage.setItem("@sync_pendente", JSON.stringify(restante));

  } catch (error) {
    console.log("❌ Erro ao processar fila de sincronização:", error);
  }
}