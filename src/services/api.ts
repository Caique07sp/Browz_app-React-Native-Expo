import AsyncStorage from "@react-native-async-storage/async-storage";

const DOMAIN_KEY = "@dominio_cliente";

function normalizarDominio(valor: string): string {
  let dominio = valor.trim().toLowerCase();
  dominio = dominio.replace(/^https?:\/\//, "");
  dominio = dominio.replace(/^www\./, "");
  dominio = dominio.replace(/\.browz\.com\.br.*$/, "");
  dominio = dominio.replace(/\/.*/, "");
  return dominio;
}


export async function salvarDominio(dominio: string): Promise<string> {
  const dominioLimpo = normalizarDominio(dominio);
  await AsyncStorage.setItem(DOMAIN_KEY, dominioLimpo);
  return dominioLimpo;
}

export async function obterDominio(): Promise<string | null> {
  return await AsyncStorage.getItem(DOMAIN_KEY);
}

export async function limparDominio(): Promise<void> {
  await AsyncStorage.removeItem(DOMAIN_KEY);
}

export async function getApiUrl(): Promise<string> {
  const dominio = await obterDominio();
  if (!dominio) {
    throw new Error("Domínio não configurado. Faça login novamente.");
  }
  return `https://${dominio}.browz.com.br/rest.php`;
}