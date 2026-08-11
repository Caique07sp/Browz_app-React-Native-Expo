import AsyncStorage from "@react-native-async-storage/async-storage";
import { isOnline } from "./network";
import { buscarFila } from "./offlineQueue";

export async function sincronizarChamados() {
  try {
    const online = await isOnline();

    if (!online) {
      //console.log("📴 Offline - usando cache");
      return;
    }

    const fila = await buscarFila();

    if (fila.length > 0) {
      //console.log("⏳ Existem pendências offline. Não vou atualizar chamados ainda.");
      return;
    }

    const token = await AsyncStorage.getItem("token");
    const representativeId = await AsyncStorage.getItem("representative_id");

    if (!token || !representativeId) return;

    const response = await fetch("https://browz.com.br/rest.php", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        class: "CalendarService",
        method: "loadAll",
      }),
    });

    const data = await response.json();

    if (data.status === "success") {
      const chamados = data.data.filter(
        (item: any) =>
          Number(item.representative_id) === Number(representativeId)
      );

      const chamadosTratados = await Promise.all(
        chamados.map(async (item: any) => {
          const pausadoLocal = await AsyncStorage.getItem(
            `@ticket_${item.calendar_id}_pausado`
          );

          if (pausadoLocal === "1") {
            return {
              ...item,
              calendar_status: 1,
              agenda_pause: 1,
            };
          }

          return item;
        })
      );

      await AsyncStorage.setItem(
        "@cache_chamados",
        JSON.stringify(chamadosTratados)
      );

      //console.log("✅ Chamados sincronizados:", chamadosTratados.length);
    }
  } catch (error) {
    //console.log("❌ Erro sincronizando chamados:", error);
  }
}