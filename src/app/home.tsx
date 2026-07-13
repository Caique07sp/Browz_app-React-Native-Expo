import { obterStatusNotificacaoSalva, requisitarEPersistirPermissao } from "@/services/notifications";
import { contarPendencias } from "@/services/syncStatus";
import { useTheme } from "@/theme/ThemeContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from "@react-native-community/datetimepicker";
import NetInfo from "@react-native-community/netinfo";
import * as Notifications from "expo-notifications";
import { useFocusEffect } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  Bell,
  ChevronRight,
  Inbox,
  LayoutDashboard,
  LogOut,
  MapPin,
  Menu,
  RefreshCw,
  Search,
  Settings,
  SlidersHorizontal,
  User,
  X
} from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { styles } from "../styles/home.styles";

import { ScreenWrapper } from "@/components/ScreenWrapper";
import { estaSincronizando, sincronizarPendentes } from "@/services/sync";

import { isOnline } from '@/services/network';
import { logout } from "@/services/session";
import { router } from "expo-router";

let alertaDeslogarVisivel = false;

export default function Browz() {
  const [filterVisible, setFilterVisible] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);

  const [selectedStatus, setSelectedStatus] = useState<string[]>([]);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [nome, setNome] = useState("");
  const [perfil, setPerfil] = useState("");
  const [tecnicos, setTecnicos] = useState<any>({});
  const [categorias, setCategorias] = useState<any>({});
  const [clientes, setClientes] = useState<any>({});
  const [searchText, setSearchText] = useState("");

  const [todosChamados, setTodosChamados] = useState<any[]>([]);
  const [filteredChamados, setFilteredChamados] = useState<any[]>([]);

  const [ultimosChamados, setUltimosChamados] = useState<any[]>([]);
  const [quantidadeNotificacoes, setQuantidadeNotificacoes] = useState(0);
  const { theme, darkMode } = useTheme();

  const [online, setOnline] = useState(true);
  const [pendencias, setPendencias] = useState(0);

  const logoLight = require("../assets/browz.png");
  const logoDark = require("../assets/logo-white.png");

  // ==========================================
  // LÓGICA 1: VALIDAÇÃO ISOLADA DA SESSÃO LOCAL
  // ==========================================
  async function verificarSessaoValida() {
    const token = await AsyncStorage.getItem("token");
    const representativeId = await AsyncStorage.getItem("representative_id");

    if (!token || !representativeId) {
      console.log("❌ Sessão corrompida localmente. Redirecionando para login...");
      await logout();
      router.replace("/");
      return false;
    }
    return true;
  }

  // ==========================================
  // LÓGICA 2: CARREGAMENTO DOS DADOS DE APOIO
  // ==========================================
  async function carregarDadosDeApoio() {
    console.log("⚡ Carregando dados de apoio em paralelo...");
    await Promise.all([
      buscarTecnicos(),
      buscarCategorias(),
      buscarClientes()
    ]);
  }

  // ==========================================
  // LÓGICA 3: SINCRONIZAÇÃO E BUSCA DE OS
  // ==========================================
  async function sincronizarEBuscarChamados() {
    if (estaSincronizando()) {
      console.log("⏳ Sincronização em andamento por segundo plano...");
      return;
    }

    // Executa sincronização de pendências
    await sincronizarPendentes();
    const qtd = await contarPendencias();
    setPendencias(qtd);

    // Se não há pendências na fila offline, busca do servidor online
    if (qtd === 0) {
      await buscarChamados();
    } else {
      // Se possui pendência offline ativa, preserva o cache local de chamados na tela
      const cacheChamados = await AsyncStorage.getItem("@cache_chamados");
      if (cacheChamados) {
        const chamadosSalvos = JSON.parse(cacheChamados);
        setTodosChamados(chamadosSalvos);
        aplicarFiltros(chamadosSalvos);
      }
    }
  }

  useFocusEffect(
    React.useCallback(() => {
      async function carregarTudo() {
        try {
          setLoading(true);

          // Atualiza a badge sempre que a tela Home ganha foco (ex: ao voltar da tela de notificações)
          await carregarQuantidadeNotificacoes();

          // PASSO 1: Valida a sessão local prioritariamente. Se falhar, interrompe o resto.
          const sessaoOk = await verificarSessaoValida();
          if (!sessaoOk) return;

          // Carrega os filtros persistidos na memória interna
          const filtrosSalvos = await AsyncStorage.getItem("@saved_selected_status");
          if (filtrosSalvos) setSelectedStatus(JSON.parse(filtrosSalvos));

          const dataInicioSalva = await AsyncStorage.getItem("@saved_start_date");
          if (dataInicioSalva) setStartDate(new Date(dataInicioSalva));

          const dataFimSalva = await AsyncStorage.getItem("@saved_end_date");
          if (dataFimSalva) setEndDate(new Date(dataFimSalva));

          await carregarUsuario();
          await carregarQuantidadeNotificacoes();

          // PASSO 2: Carrega dados leves e estáticos na memória
          await carregarDadosDeApoio();

          // PASSO 3: Realiza a sincronização e busca das ordens de serviço (Processo pesado de rede)
          await sincronizarEBuscarChamados();

        } catch (error) {
          console.log("Erro no carregamento modular da home:", error);
        } finally {
          setLoading(false);
        }
      }

      carregarTudo();
    }, [])
  );

  useEffect(() => {
    // Escuta a chegada de notificações enquanto você está com a Home aberta
    const subscription = Notifications.addNotificationReceivedListener(() => {
      // Sempre que chegar uma notificação, recarrega a contagem da badge imediatamente
      carregarQuantidadeNotificacoes();
    });

    return () => subscription.remove();
  }, []);

  useEffect(() => {
    aplicarFiltros();
  }, [searchText, selectedStatus, startDate, endDate, todosChamados, clientes]);

  useEffect(() => {
    async function carregarStatus() {
      const qtd = await contarPendencias();
      setPendencias(qtd);
    }

    carregarStatus();

    const unsubscribe = NetInfo.addEventListener(async (state) => {
      setOnline(
        state.isConnected === true &&
        state.isInternetReachable !== false
      );

      const qtd = await contarPendencias();
      setPendencias(qtd);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    async function iniciarNotificacoes() {
      const ativadaPeloUsuario = await obterStatusNotificacaoSalva();
      if (ativadaPeloUsuario) {
        // Dispara o fluxo de ativação / pedido se for um novo dispositivo
        await requisitarEPersistirPermissao(true);
      }
    }
    iniciarNotificacoes();
  }, []);

  // Listeners de notificação push
  useEffect(() => {
    // Recebeu notificação com app em foreground — recarrega chamados
    const subRecebida = Notifications.addNotificationReceivedListener(() => {
      console.log("🔔 Notificação recebida em foreground, recarregando chamados...");
      buscarChamados();
    });

    // Usuário tocou na notificação — recarrega chamados e navega se tiver calendar_id
    const subToque = Notifications.addNotificationResponseReceivedListener((response) => {
      console.log("👆 Notificação tocada:", response.notification.request.content.data);
      buscarChamados();
    });

    return () => {
      subRecebida.remove();
      subToque.remove();
    };
  }, []);

  async function fazerLogout() {
    await logout();
    setMenuVisible(false);
    router.replace("/");
  }

  async function buscarChamados(isRefresh = false) {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const isOnlineStatus = await isOnline();

      if (!isOnlineStatus) {
        console.log("📴 Sem internet, carregando cache");
        const cacheChamados = await AsyncStorage.getItem("@cache_chamados");

        if (cacheChamados) {
          const chamadosSalvos = JSON.parse(cacheChamados);
          setTodosChamados(chamadosSalvos);
          aplicarFiltros(chamadosSalvos);
        }
        return;
      }

      // ONLINE
      const token = await AsyncStorage.getItem("token");

      const response = await fetch(
        "https://browz.com.br/rest.php",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            class: "CalendarService",
            method: "loadAll",
          }),
        }
      );

      const data = await response.json();

      if (response.status === 401 || data.data?.code === "SESSION_TERMINATED") {
        // 1. Desativa os loadings imediatamente para não travar a interface visual
        setLoading(false);
        setRefreshing(false);

        // 2. Executa o logout local imediatamente para limpar o AsyncStorage
        await logout();

        // Se o alerta JÁ ESTIVER sendo exibido, ignora as próximas chamadas paralelas
        if (alertaDeslogarVisivel) {
          router.replace("/");
          return;
        }

        // Ativa a trava para os próximos disparos paralelos não entrarem aqui
        alertaDeslogarVisivel = true;

        Alert.alert(
          "Sessão Encerrada",
          "Sua conexão caiu ou este usuário foi conectado em outro dispositivo.",
          [
            {
              text: "OK",
              onPress: () => {
                // Destrava a flag apenas quando o usuário clicar em OK
                alertaDeslogarVisivel = false;
                router.replace("/");
              },
            },
          ],
          { cancelable: false } // Impede o usuário de fechar clicando fora (no Android)
        );

        return;
      }

      if (data.status === "error") {
        console.log("Erro interno do servidor ao buscar chamados, usando cache local.");
        const cacheChamados = await AsyncStorage.getItem("@cache_chamados");
        if (cacheChamados) {
          const chamadosSalvos = JSON.parse(cacheChamados);
          setTodosChamados(chamadosSalvos);
          aplicarFiltros(chamadosSalvos);
        }
        return;
      }

      if (data.status === "success") {
        const representativeId = await AsyncStorage.getItem("representative_id");

        const chamadosDoTecnico = data.data.filter(
          (calendar: any) =>
            Number(calendar.representative_id) === Number(representativeId)
        );

        const chamadosComEstadoLocal = await Promise.all(
          chamadosDoTecnico.map(async (item: any) => {
            const pausadoLocal = await AsyncStorage.getItem(
              `@ticket_${item.calendar_id}_pausado`
            );
            if (pausadoLocal === "1") {
              return { ...item, calendar_status: 1, agenda_pause: 1 };
            }
            return item;
          })
        );

        await AsyncStorage.setItem(
          "@cache_chamados",
          JSON.stringify(chamadosComEstadoLocal)
        );

        await verificarAlteracoes(chamadosComEstadoLocal);

        if (token) cachearChecklistsNovos(token, chamadosComEstadoLocal).catch(() => { });

        setUltimosChamados(chamadosComEstadoLocal);
        setTodosChamados(chamadosComEstadoLocal);
        aplicarFiltros(chamadosComEstadoLocal);
      }
    } catch (error) {
      console.log("ERRO AO BUSCAR OS CHAMADOS DA API:", error);
      const cacheChamados = await AsyncStorage.getItem("@cache_chamados");

      if (cacheChamados) {
        const chamadosSalvos = JSON.parse(cacheChamados);
        setTodosChamados(chamadosSalvos);
        aplicarFiltros(chamadosSalvos);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }


  function aplicarFiltros(listaOriginal = todosChamados) {
    let lista = [...listaOriginal];

    if (!selectedStatus.includes("finalizado")) {
      lista = lista.filter((item) => Number(item.calendar_status) !== 2);
    }

    if (selectedStatus.length > 0) {
      lista = lista.filter((item) => {
        const status = Number(item.calendar_status);
        const pausado = Number(item.agenda_pause) === 1;

        if (selectedStatus.includes("aberto") && status === 0) return true;
        if (selectedStatus.includes("em_atendimento") && status === 1 && !pausado) return true;
        if (selectedStatus.includes("aguardando") && status === 1 && pausado) return true;
        if (selectedStatus.includes("finalizado") && status === 2) return true;

        return false;
      });
    }

    if (searchText.trim()) {
      const termo = searchText.toLowerCase();

      lista = lista.filter((item) => {
        const cliente = getClienteText(item.customer_id).toLowerCase();
        const descricao = String(item.calendar_observation || "").toLowerCase();
        const categoria = getCategoriaText(item.service_type_id).toLowerCase();
        const id = String(item.calendar_id);

        return (
          cliente.includes(termo) ||
          descricao.includes(termo) ||
          categoria.includes(termo) ||
          id.includes(termo)
        );
      });
    }

    if (startDate && endDate) {
      const inicio = new Date(startDate);
      inicio.setHours(0, 0, 0, 0);

      const fim = new Date(endDate);
      fim.setHours(23, 59, 59, 999);

      lista = lista.filter((item) => {
        if (!item.calendar_start) return false;

        const dataChamado = new Date(item.calendar_start);
        return dataChamado >= inicio && dataChamado <= fim;
      });

    } else {
      const hoje = new Date();

      const inicioSemana = new Date(hoje);
      inicioSemana.setDate(hoje.getDate() - hoje.getDay());
      inicioSemana.setHours(0, 0, 0, 0);

      const fimSemana = new Date(inicioSemana);
      fimSemana.setDate(inicioSemana.getDate() + 6);
      fimSemana.setHours(23, 59, 59, 999);

      lista = lista.filter((item) => {
        if (!item.calendar_start) return false;

        const dataChamado = new Date(item.calendar_start);
        return dataChamado >= inicioSemana && dataChamado <= fimSemana;
      });
    }

    lista.sort((a, b) => {
      if (!a.calendar_start) return 1;
      if (!b.calendar_start) return -1;

      const dataA = new Date(a.calendar_start).getTime();
      const dataB = new Date(b.calendar_start).getTime();

      return dataA - dataB;
    });

    setFilteredChamados(lista);
  }

  async function buscarTecnicos() {
    try {
      const isOnlineStatus = await isOnline();

      if (!isOnlineStatus) {
        const cache = await AsyncStorage.getItem("@cache_tecnicos");
        if (cache) setTecnicos(JSON.parse(cache));
        return;
      }

      const token = await AsyncStorage.getItem("token");

      const response = await fetch(
        "https://browz.com.br/rest.php",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            class: "RepresentativeService",
            method: "loadAll",
          }),
        }
      );

      const data = await response.json();

      if (data.status === "success") {
        const mapa: any = {};
        data.data.forEach((usuario: any) => {
          mapa[usuario.id] = usuario.name;
        });

        setTecnicos(mapa);
        await AsyncStorage.setItem("@cache_tecnicos", JSON.stringify(mapa));
      }
    } catch (error) {
      console.log("ERRO TECNICOS:", error);
      const cache = await AsyncStorage.getItem("@cache_tecnicos");
      if (cache) setTecnicos(JSON.parse(cache));
    }
  }

  async function buscarCategorias() {
    try {
      const isOnlineStatus = await isOnline();

      if (!isOnlineStatus) {
        const cache = await AsyncStorage.getItem("@cache_categorias");
        if (cache) setCategorias(JSON.parse(cache));
        return;
      }

      const token = await AsyncStorage.getItem("token");

      const response = await fetch(
        "https://browz.com.br/rest.php",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            class: "ServiceTypeService",
            method: "loadAll",
          }),
        }
      );

      const data = await response.json();

      if (data.status === "success") {
        const mapa: any = {};
        data.data.forEach((categoria: any) => {
          mapa[categoria.service_type_id] = categoria.service_type_name;
        });

        setCategorias(mapa);
        await AsyncStorage.setItem("@cache_categorias", JSON.stringify(mapa));
      }
    } catch (error) {
      console.log("ERRO CATEGORIAS:", error);
      const cache = await AsyncStorage.getItem("@cache_categorias");
      if (cache) setCategorias(JSON.parse(cache));
    }
  }

  async function buscarClientes() {
    try {
      const isOnlineStatus = await isOnline();

      if (!isOnlineStatus) {
        const cache = await AsyncStorage.getItem("@cache_clientes");
        if (cache) setClientes(JSON.parse(cache));
        return;
      }

      const token = await AsyncStorage.getItem("token");

      const response = await fetch(
        "https://browz.com.br/rest.php",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            class: "CustomerService",
            method: "loadAll",
          }),
        }
      );

      const data = await response.json();

      if (data.status === "success") {
        const mapa: any = {};
        data.data.forEach((cliente: any) => {
          mapa[cliente.customer_id] = cliente.customer_name;
        });

        setClientes(mapa);
        await AsyncStorage.setItem("@cache_clientes", JSON.stringify(mapa));
      }
    } catch (error) {
      console.log("ERRO CLIENTES:", error);
      const cache = await AsyncStorage.getItem("@cache_clientes");
      if (cache) setClientes(JSON.parse(cache));
    }
  }

  const toggleStatus = async (status: string) => {
    try {
      setSelectedStatus((prev) => {
        const novoStatus = prev.includes(status)
          ? prev.filter((item) => item !== status)
          : [...prev, status];

        AsyncStorage.setItem("@saved_selected_status", JSON.stringify(novoStatus)).catch(
          (err) => console.log("Erro ao salvar status do filtro:", err)
        );

        return novoStatus;
      });
    } catch (error) {
      console.log("Erro na função toggleStatus:", error);
    }
  };

  const limparFiltros = async () => {
    setSelectedStatus([]);
    setStartDate(null);
    setEndDate(null);
    setSearchText("");
    try {
      await AsyncStorage.removeItem("@saved_selected_status");
      await AsyncStorage.removeItem("@saved_start_date");
      await AsyncStorage.removeItem("@saved_end_date");
    } catch (error) {
      console.log("Erro ao limpar filtros no cache:", error);
    }
  };

  async function carregarUsuario() {
    const nomeSalvo = await AsyncStorage.getItem("nome");
    const perfilSalvo = await AsyncStorage.getItem("perfil");

    if (nomeSalvo) setNome(nomeSalvo);
    if (perfilSalvo) setPerfil(perfilSalvo);
  }

  function getStatusText(status: any, agendaPause?: any) {
    const s = Number(status ?? -1);
    const pausado = Number(agendaPause) === 1;

    if (s === 0) return "Aberto";
    if (s === 1 && pausado) return "Pausado";
    if (s === 1) return "Em atendimento";
    if (s === 2) return "Finalizado";

    return "Desconhecido";
  }

  function getStatusColor(status: any, agendaPause?: any) {
    const s = Number(status);
    const pausado = Number(agendaPause) === 1;

    if (s === 0) return "#e9ae37b4";
    if (s === 1 && pausado) return "#e673998e";
    if (s === 1) return "#4b9eddb9";
    if (s === 2) return "#0d9e479f";

    return "#334155";
  }

  function getStatusDotColor(status: any, agendaPause?: any) {
    const s = Number(status);
    const pausado = Number(agendaPause) === 1;

    if (s === 0) return "#ffa200ff";
    if (s === 1 && pausado) return "#ff00776e";
    if (s === 1) return "#3b82f6";
    if (s === 2) return "#22c55e";

    return "#94a3b8";
  }

  function getCategoriaText(serviceTypeId: any) {
    return categorias[serviceTypeId] || `Categoria ID: ${serviceTypeId}`;
  }

  function getClienteText(customerId: any) {
    return clientes[customerId] || `Cliente ID: ${customerId}`;
  }

  async function salvarNotificacao(
    titulo: string,
    mensagem: string,
    tipo: string,
    uniqueId: string,
    calendarId: any
  ) {
    const saved = await AsyncStorage.getItem("@notificacoes");
    const savedIds = await AsyncStorage.getItem("@notificacoes_ids");
    const jaCarregados = await AsyncStorage.getItem("@chamados_ja_carregados");

    let lista = saved ? JSON.parse(saved) : [];
    let ids = savedIds ? JSON.parse(savedIds) : [];
    let chamadosCarregados = jaCarregados ? JSON.parse(jaCarregados) : [];

    // Evita duplicar se o uniqueId já existir nos IDs ou na lista
    if (ids.includes(uniqueId) || lista.some((item: any) => item.uniqueId === uniqueId)) {
      return;
    }

    if (!chamadosCarregados.includes(calendarId)) {
      chamadosCarregados.push(calendarId);
      await AsyncStorage.setItem("@chamados_ja_carregados", JSON.stringify(chamadosCarregados));
    }

    ids.push(uniqueId);

    lista.unshift({
      titulo,
      mensagem,
      tipo,
      uniqueId,
      lida: false, // Inicia como não lida
      data: new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }),
      timestamp: new Date().toISOString(),
    });

    await AsyncStorage.setItem("@notificacoes", JSON.stringify(lista));
    await AsyncStorage.setItem("@notificacoes_ids", JSON.stringify(ids));

    // Conta apenas as não lidas e únicas
    const naoLidas = lista.filter((item: any) => !item.lida);
    setQuantidadeNotificacoes(naoLidas.length);
  }

  async function verificarAlteracoes(novosChamados: any[]) {
    const chamadosSalvosStr = await AsyncStorage.getItem("@ultimos_chamados_sync");
    const ultimosSalvos = chamadosSalvosStr ? JSON.parse(chamadosSalvosStr) : [];

    // 1. Se for a primeira inicialização do app, atualiza o cache local e encerra
    if (ultimosSalvos.length === 0 && novosChamados.length > 0) {
      await AsyncStorage.setItem("@ultimos_chamados_sync", JSON.stringify(novosChamados));
      return;
    }

    // 2. Compara apenas MUDANÇAS DE STATUS em chamados já existentes
    for (const novo of novosChamados) {
      const antigo = ultimosSalvos.find(
        (item: any) => String(item.calendar_id) === String(novo.calendar_id)
      );

      // Se o chamado já existia na lista e mudou para finalizado
      if (antigo && Number(antigo.calendar_status) !== Number(novo.calendar_status)) {
        if (Number(novo.calendar_status) === 2) {
          await salvarNotificacao(
            "Chamado finalizado",
            `Chamado #${novo.calendar_id} foi finalizado`,
            "finalizado",
            `finalizado_${novo.calendar_id}`,
            novo.calendar_id
          );
        }
      }
    }

    // Atualiza o cache local para a próxima verificação
    await AsyncStorage.setItem("@ultimos_chamados_sync", JSON.stringify(novosChamados));
  }

  async function cachearChecklistsNovos(token: string, chamados: any[]) {
    try {
      const semCache: any[] = [];
      for (const chamado of chamados) {
        const cached = await AsyncStorage.getItem(`@checklist_${chamado.calendar_id}`);
        if (!cached) semCache.push(chamado);
      }

      if (semCache.length === 0) return;

      const response = await fetch("https://browz.com.br/rest.php", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          class: "CalendarChecklistService",
          method: "loadAll",
        }),
      });

      const data = await response.json();

      if (data.status !== "success" || !Array.isArray(data.data)) return;

      for (const chamado of semCache) {
        const id = chamado.calendar_id;
        const item = data.data.find((c: any) => String(c.calendar_id) === String(id));

        if (!item || !item.calendar_checklist_template) continue;

        try {
          const template = JSON.parse(item.calendar_checklist_template);
          const ordenado = template.sort((a: any, b: any) => Number(a.order) - Number(b.order));
          await AsyncStorage.setItem(
            `@checklist_${id}`,
            JSON.stringify({
              calendar_checklist_id: item.calendar_checklist_id,
              template: ordenado,
            })
          );
        } catch (e) {
          console.log(`❌ erro ao salvar checklist do chamado ${id}:`, e);
        }
      }
    } catch (error) {
      console.log("❌ [CHECKLIST] Erro geral:", error);
    }
  }

  async function carregarQuantidadeNotificacoes() {
    const saved = await AsyncStorage.getItem("@notificacoes");

    if (saved) {
      const lista: any[] = JSON.parse(saved);

      // Filtra apenas as notificações que ainda NÃO foram lidas
      const naoLidas = lista.filter((item) => !item.lida);

      setQuantidadeNotificacoes(naoLidas.length);
    } else {
      setQuantidadeNotificacoes(0);
    }
  }

  return (
    <ScreenWrapper
      style={[
        styles.container,
        {
          backgroundColor: theme.background,
        },
      ]}
    >

      <StatusBar style={darkMode ? "light" : "dark"} />

      {/* HEADER */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: theme.background,
          },
        ]}
      >
        <View style={styles.logoContainer}>
          <Image source={darkMode ? logoDark : logoLight} style={styles.logoImage} />
        </View>

        <View style={styles.headerIcons}>

          <TouchableOpacity
            style={[styles.iconButton, { marginRight: 4, position: 'relative' }]}
            onPress={() => router.push("/notificacoes")}
          >
            <Bell size={24} color={theme.text} />

            {/* BADGE COM CONTADOR DE NOTIFICAÇÕES */}
            {quantidadeNotificacoes > 0 && (
              <View
                style={{
                  position: 'absolute',
                  right: -2,
                  top: -2,
                  backgroundColor: '#ef4444', // Vermelho ativo
                  borderRadius: 10,
                  minWidth: 18,
                  height: 18,
                  justifyContent: 'center',
                  alignItems: 'center',
                  paddingHorizontal: 4,
                  borderWidth: 1.5,
                  borderColor: theme.card
                }}
              >
                <Text style={{ color: '#fff', fontSize: 10, fontWeight: 'bold' }}>
                  {quantidadeNotificacoes}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.iconButton} onPress={() => setMenuVisible(true)}>
            <Menu size={24} color={theme.text} />
          </TouchableOpacity>
        </View>
      </View>

      {/* CONTEÚDO */}
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              try {
                setRefreshing(true);
                const sessaoOk = await verificarSessaoValida();
                if (!sessaoOk) return;

                await sincronizarEBuscarChamados();
              } catch (e) {
                console.log("Erro no onRefresh:", e);
              } finally {
                setRefreshing(false);
              }
            }}
            tintColor="#3b82f6"
            colors={["#3b82f6"]}
          />
        }
      >
        <View style={styles.searchSection}>
          <View
            style={[
              styles.searchBar,
              {
                backgroundColor: theme.card,
                borderColor: theme.border,
              },
            ]}
          >
            <Search size={20} color="#94a3b8" style={{ marginLeft: 10 }} />
            <TextInput
              placeholder="Pesquisar chamados..."
              placeholderTextColor={theme.subText}
              style={[
                styles.input,
                {
                  color: theme.text,
                },
              ]}
              value={searchText}
              onChangeText={setSearchText}
            />
          </View>


          <TouchableOpacity style={styles.filterButton} onPress={() => setFilterVisible(true)}>
            <SlidersHorizontal size={20} color="#fff" />
          </TouchableOpacity>
        </View>


        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3b82f6" />
            <Text style={[styles.loadingText, { color: theme.subText }]}>
              Carregando chamados...
            </Text>
          </View>
        ) : filteredChamados.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.illustrationContainer}>
              <View style={[styles.isometricBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Inbox size={60} color="#3b82f6" />
              </View>
            </View>

            <Text style={[styles.emptyTitle, { color: theme.text }]}>
              Nenhum chamado corresponde aos filtros selecionados
            </Text>

            <Text style={[styles.emptySubtitle, { color: theme.subText }]}>
              ↓ Arraste para baixo para sincronizar
            </Text>
          </View>

        ) : (
          filteredChamados.map((calendar, index) => (
            <TouchableOpacity
              key={calendar.calendar_id || index}
              activeOpacity={0.8}
              onPress={() =>
                router.push({
                  pathname: "/detalhes",
                  params: { id: calendar.calendar_id },
                })
              }
            >
              <View
                style={{
                  marginBottom: 15,
                  borderRadius: 16,
                  backgroundColor: getStatusColor(calendar.calendar_status, calendar.agenda_pause),
                  paddingRight: 3,
                }}
              >
                <View style={{ backgroundColor: theme.card, borderRadius: 16, padding: 16 }}>
                  <View style={styles.cardHeader}>
                    <View style={[styles.idBadge, { backgroundColor: theme.background, borderColor: theme.border }]}>
                      <Text style={[styles.idText, { color: theme.subText }]}>
                        #{calendar.calendar_id}
                      </Text>
                    </View>

                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(calendar.calendar_status, calendar.agenda_pause) }]}>
                      <View style={[styles.statusDot, { backgroundColor: getStatusDotColor(calendar.calendar_status, calendar.agenda_pause) }]} />
                      <Text style={styles.statusText}>
                        {getStatusText(calendar.calendar_status, calendar.agenda_pause)}
                      </Text>
                    </View>
                  </View>

                  <Text style={[styles.footerDate, { color: theme.subText }]}>
                    {new Date(calendar.calendar_start).toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </Text>

                  <Text style={[styles.cardTitle, { color: theme.text }]}>
                    {getClienteText(calendar.customer_id)}
                  </Text>

                  <Text style={[styles.cardDescription, { color: theme.subText }]}>
                    {calendar.calendar_address || "Sem descrição"}
                  </Text>

                  <View style={styles.cardFooter}>
                    <View style={styles.footerInfo}>
                      <Inbox size={14} color="#64748b" />
                      <Text style={[styles.footerText, { color: theme.subText }]}>
                        {getCategoriaText(calendar.service_type_id)}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* MODAL FILTRO */}
      <Modal transparent animationType="fade" visible={filterVisible} onRequestClose={() => setFilterVisible(false)}>
        <View style={styles.overlay}>
          <View style={[styles.modalBox, { backgroundColor: theme.card }]}>
            <View style={styles.modalDragIndicator} />

            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { color: theme.text }]}>Filtrar Chamados</Text>
                <Text style={{ color: theme.subText, fontSize: 13, marginTop: 2 }}>
                  Refine a sua listagem de ordens de serviço
                </Text>
              </View>
              <TouchableOpacity style={styles.modalCloseButton} onPress={() => setFilterVisible(false)}>
                <X size={20} color={theme.text} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.modalLabel, { color: theme.text, fontWeight: "600" }]}>Status do Chamado</Text>

            <View style={styles.statusGrid}>
              <TouchableOpacity
                style={[
                  styles.filterOptionBtn,
                  {
                    backgroundColor: selectedStatus.includes("aberto") ? "#ffaa0088" : theme.background,
                    borderColor: "#ffa200",
                    // 👇 Adicione essas duas linhas abaixo para centralizar o conteúdo
                    justifyContent: 'center',
                    alignItems: 'center'
                  }
                ]}
                onPress={() => toggleStatus("aberto")}
              >
                <Text
                  style={[
                    styles.optionText,
                    {
                      color: selectedStatus.includes("aberto") ? "#ffffff" : theme.text,
                      fontWeight: selectedStatus.includes("aberto") ? "700" : "400",
                      // Opcional: garante que o texto interno também se comporte como centralizado
                      textAlign: 'center'
                    }
                  ]}
                >
                  Aberto
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.filterOptionBtn,
                  {
                    backgroundColor: selectedStatus.includes("em_atendimento") ? "#4b9dd880" : theme.background,
                    borderColor: "#3b82f6",
                    justifyContent: 'center',
                    alignItems: 'center'
                  }
                ]}
                onPress={() => toggleStatus("em_atendimento")}
              >
                <Text
                  style={[
                    styles.optionText,
                    {
                      color: selectedStatus.includes("em_atendimento") ? "#ffffff" : theme.text,
                      fontWeight: selectedStatus.includes("em_atendimento") ? "700" : "400",
                      textAlign: 'center'
                    }
                  ]}
                >
                  Em atendimento
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.filterOptionBtn,
                  {
                    backgroundColor: selectedStatus.includes("aguardando") ? "#e673997e" : theme.background,
                    borderColor: "#ff0077",
                    justifyContent: 'center',
                    alignItems: 'center'
                  }
                ]}
                onPress={() => toggleStatus("aguardando")}
              >
                <Text
                  style={[
                    styles.optionText,
                    {
                      color: selectedStatus.includes("aguardando") ? "#ffffff" : theme.text,
                      fontWeight: selectedStatus.includes("aguardando") ? "700" : "400",
                      textAlign: 'center'
                    }
                  ]}
                >
                  Pausado
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.filterOptionBtn, {
                  backgroundColor: selectedStatus.includes("finalizado") ? "#0d9e4788" : theme.background, borderColor: "#22c55e",
                  justifyContent: 'center',
                  alignItems: 'center'
                }]}
                onPress={() => toggleStatus("finalizado")}
              >
                <Text
                  style={[
                    styles.optionText,
                    {
                      color: selectedStatus.includes("finalizado") ? "#ffffff" : theme.text,
                      fontWeight: selectedStatus.includes("finalizado") ? "700" : "400",
                      textAlign: 'center'
                    }
                  ]}
                >
                  Finalizado
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={[styles.modalLabel, { color: theme.text, fontWeight: "600", marginTop: 20 }]}>Período de Data</Text>

            <View style={{ flexDirection: "row", gap: 10 }}>
              <TouchableOpacity
                style={[styles.dateInput, { flex: 1, backgroundColor: theme.background, borderColor: theme.border }]}
                onPress={() => { setShowEndPicker(false); setShowStartPicker(true); }}
              >
                <Text style={{ fontSize: 12, color: theme.subText, marginBottom: 2 }}>De:</Text>
                <Text style={{ color: startDate ? theme.text : theme.subText, fontWeight: startDate ? "600" : "400" }}>
                  {startDate ? startDate.toLocaleDateString("pt-BR") : "--/--/----"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.dateInput, { flex: 1, backgroundColor: theme.background, borderColor: theme.border }]}
                onPress={() => { setShowStartPicker(false); setShowEndPicker(true); }}
              >
                <Text style={{ fontSize: 12, color: theme.subText, marginBottom: 2 }}>Até:</Text>
                <Text style={{ color: endDate ? theme.text : theme.subText, fontWeight: endDate ? "600" : "400" }}>
                  {endDate ? endDate.toLocaleDateString("pt-BR") : "--/--/----"}
                </Text>
              </TouchableOpacity>
            </View>

            {(startDate || endDate) && (
              <TouchableOpacity
                style={styles.clearDateBtn}
                onPress={async () => {
                  setStartDate(null);
                  setEndDate(null);
                  await AsyncStorage.removeItem("@saved_start_date");
                  await AsyncStorage.removeItem("@saved_end_date");
                }}
              >
                <Text style={styles.clearDateText}>Limpar período de data</Text>
              </TouchableOpacity>
            )}

            <View style={styles.filterFooterActions}>
              <TouchableOpacity
                style={[styles.modalSecondaryBtn, { borderColor: theme.border }]}
                onPress={() => { limparFiltros(); setFilterVisible(false); }}
              >
                <Text style={[styles.modalSecondaryBtnText, { color: theme.text }]}>Limpar Tudo</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.modalPrimaryBtn} onPress={() => { aplicarFiltros(); setFilterVisible(false); }}>
                <Text style={styles.modalPrimaryBtnText}>Aplicar Filtros</Text>
              </TouchableOpacity>
            </View>

            {/* DATA INICIAL */}
            {showStartPicker && Platform.OS === "android" && (
              <DateTimePicker
                value={startDate || new Date()}
                mode="date"
                display="default"
                locale="pt-BR"
                onChange={(event, date) => {
                  setShowStartPicker(false);

                  if (event.type === "dismissed") return;

                  if (date) {
                    setStartDate(date);
                    AsyncStorage.setItem(
                      "@saved_start_date",
                      date.toISOString()
                    ).catch(console.log);
                  }
                }}
              />
            )}

            {/* DATA FINAL */}
            {showEndPicker && Platform.OS === "android" && (
              <DateTimePicker
                value={endDate || new Date()}
                mode="date"
                display="default"
                locale="pt-BR"
                onChange={(event, date) => {
                  setShowEndPicker(false);

                  if (event.type === "dismissed") return;

                  if (date) {
                    setEndDate(date);
                    AsyncStorage.setItem(
                      "@saved_end_date",
                      date.toISOString()
                    ).catch(console.log);
                  }
                }}
              />
            )}

            {Platform.OS === "ios" && (
              <Modal
                transparent
                visible={showStartPicker}
                animationType="fade"
                onRequestClose={() => setShowStartPicker(false)}
              >
                <View style={styles.centeredView}>
                  <View
                    style={[
                      styles.calendarModalBox,
                      { backgroundColor: theme.card }
                    ]}
                  >
                    <DateTimePicker
                      themeVariant={darkMode ? "dark" : "light"}
                      value={startDate || new Date()}
                      mode="date"
                      display="inline"
                      locale="pt-BR"
                      onChange={(event, date) => {
                        if (date) {
                          setStartDate(date);

                          AsyncStorage.setItem(
                            "@saved_start_date",
                            date.toISOString()
                          ).catch(console.log);
                        }
                      }}
                    />

                    <TouchableOpacity
                      style={styles.calendarCloseBtn}
                      onPress={() => setShowStartPicker(false)}
                    >
                      <Text style={styles.calendarCloseBtnText}>
                        Confirmar
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </Modal>
            )}

            {Platform.OS === "ios" && (
              <Modal
                transparent
                visible={showEndPicker}
                animationType="fade"
                onRequestClose={() => setShowEndPicker(false)}
              >
                <View style={styles.centeredView}>
                  <View
                    style={[
                      styles.calendarModalBox,
                      { backgroundColor: theme.card }
                    ]}
                  >
                    <DateTimePicker
                      themeVariant={darkMode ? "dark" : "light"}
                      value={endDate || new Date()}
                      mode="date"
                      display="inline"
                      locale="pt-BR"
                      onChange={(event, date) => {
                        if (date) {
                          setEndDate(date);

                          AsyncStorage.setItem(
                            "@saved_end_date",
                            date.toISOString()
                          ).catch(console.log);
                        }
                      }}
                    />

                    <TouchableOpacity
                      style={styles.calendarCloseBtn}
                      onPress={() => setShowEndPicker(false)}
                    >
                      <Text style={styles.calendarCloseBtnText}>
                        Confirmar
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </Modal>
            )}

          </View>
        </View>
      </Modal>

      {/* MODAL MENU HAMBÚRGUER */}
      {/* MODAL MENU HAMBÚRGUER */}
      <Modal
        transparent
        visible={menuVisible}
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <View style={styles.menuOverlay}>
          {/* Área escura externa para fechar ao clicar fora */}
          <TouchableOpacity
            style={styles.menuCloseOverlayTouch}
            activeOpacity={1}
            onPress={() => setMenuVisible(false)}
          />

          {/* Caixa do Menu Lateral */}
          <View style={[styles.menuBox, { backgroundColor: theme.card }]}>

            {/* SafeAreaView garante que o menu não fique embaixo da Dynamic Island / Notch no iPhone */}
            <SafeAreaView style={{ flex: 1 }}>

              {/* CABEÇALHO DO MENU */}
              <View style={styles.menuHeaderAdjusted}>
                <Text style={[styles.menuTitle, { color: theme.text }]}>Menu</Text>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  {/* Indicador de Status de Conexão */}
                  <View
                    style={{
                      backgroundColor: darkMode ? "#1E293B" : "#F1F5F9",
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 8,
                    }}
                  >
                    <Text
                      style={{
                        color: darkMode ? "#FFFFFF" : "#000000",
                        fontWeight: "600",
                        fontSize: 13,
                      }}
                    >
                      {online ? "🟢 Sincronizado" : "🔴 Offline"}
                    </Text>
                  </View>

                  {/* Botão Fechar */}
                  <TouchableOpacity onPress={() => setMenuVisible(false)} style={styles.menuCloseBtnClickable}>
                    <X size={24} color={theme.text} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* CONTEÚDO DO MENU (Perfil e Links) */}
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1 }}>

                <TouchableOpacity
                  style={styles.profileBox}
                  onPress={() => { setMenuVisible(false); router.push("/perfil"); }}
                >
                  <View style={styles.avatar}>
                    <User size={22} color="#fff" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.userName, { color: theme.text }]}>{nome || "Usuário"}</Text>
                    <Text style={[styles.userSub, { color: theme.subText }]}>{perfil || "Técnico"}</Text>
                  </View>
                  <ChevronRight size={16} color={theme.subText} />
                </TouchableOpacity>

                <TouchableOpacity style={styles.menuItem} onPress={() => { setMenuVisible(false); router.push("/home"); }}>
                  <LayoutDashboard size={20} color="#3b82f6" />
                  <Text style={[styles.menuText, { color: theme.text }]}>Home</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => {
                    setMenuVisible(false);
                    router.push("/mapa-chamados");
                  }}
                >
                  <MapPin size={20} color="#3b82f6" />
                  <Text style={[styles.menuText, { color: theme.text }]}>Mapa de Atendimentos</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => { setMenuVisible(false); router.push("/sincronizacao"); }}
                >
                  <RefreshCw size={20} color="#3b82f6" />
                  <Text style={[styles.menuText, { color: theme.text }]}>
                    Sincronização {pendencias > 0 ? `(${pendencias})` : ''}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.menuItem} onPress={() => { setMenuVisible(false); router.push("/configuracoes"); }}>
                  <Settings size={20} color="#3b82f6" />
                  <Text style={[styles.menuText, { color: theme.text }]}>Configurações</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.logoutBtn} onPress={fazerLogout}>
                  <LogOut size={18} color="#fff" />
                  <Text style={styles.logoutText}>Sair</Text>
                </TouchableOpacity>

              </ScrollView>
            </SafeAreaView>
          </View>
        </View>
      </Modal>
    </ScreenWrapper>
  );
}