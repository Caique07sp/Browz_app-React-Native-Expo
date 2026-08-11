import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";

const CHAVE_NOTIFICACAO = "@config_notificacoes_ativadas";

export async function requisitarEPersistirPermissao(ativar: boolean): Promise<boolean> {
  // Se o usuário desligou o Switch manualmente
  if (!ativar) {
    await AsyncStorage.setItem(CHAVE_NOTIFICACAO, "false");
    return false;
  }

  // Se o usuário quer ativar, verifica a permissão nativa
  try {
    const configuracoes = await Notifications.getPermissionsAsync();
    let status = configuracoes.status;

    // Se ainda não foi concedido (undetermined ou denied)
    if (status !== "granted") {
      const resposta = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
        },
      });
      status = resposta.status;
    }

    // Se o sistema permitiu
    if (status === "granted") {
      await AsyncStorage.setItem(CHAVE_NOTIFICACAO, "true");
      return true;
    } else {
      // Se o usuário recusou na janela nativa do celular
      await AsyncStorage.setItem(CHAVE_NOTIFICACAO, "false");
      return false;
    }
  } catch (error) {
    console.error("Erro ao solicitar permissão de notificação:", error);
    await AsyncStorage.setItem(CHAVE_NOTIFICACAO, "false");
    return false;
  }
}

export async function obterStatusNotificacaoSalva(): Promise<boolean> {
  try {
    const salvo = await AsyncStorage.getItem(CHAVE_NOTIFICACAO);

    // Consulta o status real atualizado direto do sistema operacional
    const configuracoes = await Notifications.getPermissionsAsync();
    const estaConcedidoNoSistema = configuracoes.status === "granted";

    // Se o usuário nunca interagiu (primeiro acesso)
    if (salvo === null) {
      await AsyncStorage.setItem(CHAVE_NOTIFICACAO, estaConcedidoNoSistema ? "true" : "false");
      return estaConcedidoNoSistema;
    }

    // Se no app está marcado como 'true', mas o usuário revogou a permissão nas 
    // configurações do celular, corrigimos o AsyncStorage e retornamos false
    if (salvo === "true" && !estaConcedidoNoSistema) {
      await AsyncStorage.setItem(CHAVE_NOTIFICACAO, "false");
      return false;
    }

    // Se ele desativou voluntariamente no app ('false'), mantemos 'false' 
    // mesmo que o sistema diga 'true' (respeitando a vontade dele dentro do app)
    return salvo === "true";
  } catch (error) {
    console.error("Erro ao ler preferência de notificação:", error);
    return false;
  }
}
