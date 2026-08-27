import { obterStatusNotificacaoSalva, requisitarEPersistirPermissao } from "@/services/notifications";
import { contarPendencias } from "@/services/syncStatus";
import { useTheme } from "@/theme/ThemeContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from "@react-native-community/datetimepicker";
import NetInfo from "@react-native-community/netinfo";
import * as Notifications from "expo-notifications";
import { useFocusEffect, router } from "expo-router";
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
  X,
  CheckCircle2,
  Play,
  Pause,
  ClipboardCheck,
  FileCheck,
  Calendar
} from "lucide-react-native";
import React, { useEffect, useState, useRef, useCallback, memo } from "react";
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
  View,
  FlatList
} from "react-native";
import { Swipeable, GestureHandlerRootView } from "react-native-gesture-handler";

// O import do arquivo de estilos agora utiliza a nomenclatura "estilos"
import { estilos } from "../styles/home.styles";

import { ScreenWrapper } from "@/components/ScreenWrapper";
import { estaSincronizando, sincronizarPendentes } from "@/services/sync";
import { isOnline } from '@/services/network';
import { logout } from "@/services/session";
import { getApiUrl } from "@/services/api";

let alertaDeslogarVisivel = false;

/// ==========================================
// COMPONENTE ISOLADO DE CARD (OTIMIZADO)
// ==========================================
const saoIguais = (propsAnteriores: any, proximasProps: any) => {
  return (
    propsAnteriores.chamado.calendar_status === proximasProps.chamado.calendar_status &&
    propsAnteriores.chamado.agenda_pause === proximasProps.chamado.agenda_pause &&
    propsAnteriores.chamado.calendar_id === proximasProps.chamado.calendar_id &&
    propsAnteriores.tema.card === proximasProps.tema.card &&
    propsAnteriores.tema.background === proximasProps.tema.background &&
    propsAnteriores.tema.text === proximasProps.tema.text
  );
};

const CartaoChamado = memo(({
  chamado,
  tema,
  textoCliente,
  textoCategoria,
  textoStatus,
  corStatus,
  corPontoStatus,
  aoAbrirDeslize,
  aoRegistrarRef,
  aoNavegarDetalhes,
  aoNavegarEditarRelatorio,
  aoNavegarDetalhesChamados,
  aoNavegarChecklist
}: any) => {
  const status = Number(chamado.calendar_status);
  const pausado = Number(chamado.agenda_pause) === 1;

  const renderizarAcoesDireita = () => {
    return (
      <View style={estilos.recipienteAcoesDeslize}>
        {status === 0 && (
          <TouchableOpacity
            style={[estilos.botaoAcaoDeslize, { backgroundColor: "rgba(255, 162, 0, 0.58)" }]}
            onPress={() => aoNavegarDetalhes(chamado.calendar_id, chamado.service_type_id)}
          >
            <CheckCircle2 size={20} color="#fff" />
            <Text style={estilos.textoAcaoDeslize}>Ações</Text>
          </TouchableOpacity>
        )}

        {status === 1 && !pausado && (
          <TouchableOpacity
            style={[estilos.botaoAcaoDeslize, { backgroundColor: "#3b83f6a8" }]}
            onPress={() => aoNavegarDetalhes(chamado.calendar_id, chamado.service_type_id)}
          >
            <Play size={20} color="#fff" />
            <Text style={estilos.textoAcaoDeslize}>Ações</Text>
          </TouchableOpacity>
        )} 

        {status === 1 && pausado && (
          <TouchableOpacity
            style={[estilos.botaoAcaoDeslize, { backgroundColor: "#e67399c9" }]}
            onPress={() => aoNavegarDetalhes(chamado.calendar_id, chamado.service_type_id)}
          >
            <Pause size={20} color="#fff" />
            <Text style={estilos.textoAcaoDeslize}>Retomar</Text>
          </TouchableOpacity>
        )}

        {status === 2 && (
          <TouchableOpacity
            style={[estilos.botaoAcaoDeslize, { backgroundColor: "#22c55eb2" }]}
            onPress={() => aoNavegarEditarRelatorio(chamado.calendar_id, chamado.service_type_id)}
          >
            <FileCheck size={20} color="#fff" />
            <Text style={estilos.textoAcaoDeslize}>Detalhes</Text>
          </TouchableOpacity>
        )}

        {status === 1 && (
          <TouchableOpacity
            style={[estilos.botaoAcaoDeslize, { backgroundColor: "#8a5cf6bd" }]}
            onPress={() => aoNavegarChecklist(chamado.calendar_id)}
          >
            <ClipboardCheck size={20} color="#fff" />
            <Text style={estilos.textoAcaoDeslize}>Checklist</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <Swipeable
      ref={(ref) => aoRegistrarRef(chamado.calendar_id, ref)}
      friction={2}
      overshootRight={false}
      onSwipeableWillOpen={() => aoAbrirDeslize(chamado.calendar_id)}
      renderRightActions={renderizarAcoesDireita}
    >
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => aoNavegarDetalhesChamados(chamado.calendar_id, chamado.service_type_id)}
      >
        <View
          style={{
            marginBottom: 15,
            borderRadius: 16,
            backgroundColor: corStatus,
            paddingRight: 3,
          }}
        >
          <View style={{ backgroundColor: tema.card, borderRadius: 16, padding: 16 }}>
            <View style={estilos.cabecalhoCartao}>
              <View style={[estilos.crachaId, { backgroundColor: tema.background, borderColor: tema.border }]}>
                <Text style={[estilos.textoId, { color: tema.subText }]}>
                  #{chamado.calendar_id}
                </Text>
              </View>

              <View style={[estilos.crachaStatus, { backgroundColor: corStatus }]}>
                <View style={[estilos.pontoStatus, { backgroundColor: corPontoStatus }]} />
                <Text style={estilos.textoStatus}>
                  {textoStatus}
                </Text>
              </View>
            </View>

            <Text style={[estilos.dataRodape, { color: tema.subText }]}>
              {new Date(chamado.calendar_start).toLocaleDateString("pt-BR", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Text>

            <Text style={[estilos.tituloCartao, { color: tema.text }]}>
              {textoCliente}
            </Text>

            <Text style={[estilos.descricaoCartao, { color: tema.subText }]}>
              {chamado.calendar_address || "Sem descrição"}
            </Text>

            <View style={estilos.rodapeCartao}>
              <View style={estilos.informacaoRodape}>
                <Inbox size={14} color={tema.subText} />
                <Text style={[estilos.textoRodape, { color: tema.subText }]}>
                  {textoCategoria}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Swipeable>
  );
}, saoIguais);

// ==========================================
// COMPONENTE PRINCIPAL
// ==========================================
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

  // Map para guardar referências dos Swipes
  const refsDeslize = useRef(new Map());
  const idAbertoAtualmente = useRef<string | null>(null);

  const logoLight = require("../assets/browz.png");
  const logoDark = require("../assets/logo-white.png");

  // ==========================================
  // FUNÇÕES DE CALLBACK PARA OS CARDS
  // ==========================================
  const registrarRefDeslize = useCallback((id: string, ref: any) => {
    if (ref) {
      refsDeslize.current.set(id, ref);
    } else {
      refsDeslize.current.delete(id);
    }
  }, []);

  const lidarComAberturaDeslize = useCallback((id: string) => {
    if (idAbertoAtualmente.current && idAbertoAtualmente.current !== id) {
      const refAnterior = refsDeslize.current.get(idAbertoAtualmente.current);
      if (refAnterior) refAnterior.close();
    }
    idAbertoAtualmente.current = id;
  }, []);

  const navegarEditarRelatorio= useCallback((id: string, service_type_id?: any) => {
  if (idAbertoAtualmente.current) {
    const ref = refsDeslize.current.get(idAbertoAtualmente.current);
    if (ref) ref.close();
  }
  router.navigate({
    pathname: "/visualizar-relatorio",
    params: { id, service_type_id, ticketId: id },
  });
}, []);


 const navegarDetalhes = useCallback((id: string, service_type_id?: any) => {
  if (idAbertoAtualmente.current) {
    const ref = refsDeslize.current.get(idAbertoAtualmente.current);
    if (ref) ref.close();
  }
  router.navigate({
    pathname: "/check",
    params: { id, service_type_id },
  });
}, []);
  const aoNavegarDetalhesChamados = useCallback((id: string) => {
    if (idAbertoAtualmente.current) {
      const ref = refsDeslize.current.get(idAbertoAtualmente.current);
      if (ref) ref.close();
    }
    router.navigate({ pathname: "/detalhes", params: { id } });
  }, []);


  const navegarChecklist = useCallback((id: string) => {
    if (idAbertoAtualmente.current) {
      const ref = refsDeslize.current.get(idAbertoAtualmente.current);
      if (ref) ref.close();
    }
    router.push({ pathname: "/checklist", params: { id } });
  }, []);

  // ==========================================
  // LÓGICAS DE SESSÃO E DADOS
  // ==========================================
  async function verificarSessaoValida() {
    const token = await AsyncStorage.getItem("token");
    const representativeId = await AsyncStorage.getItem("representative_id");

    if (!token || !representativeId) {
      await logout();
      router.replace("/");
      return false;
    }
    return true;
  }

  async function carregarDadosDeApoio() {
    await Promise.all([
      buscarTecnicos(),
      buscarCategorias(),
      buscarClientes()
    ]);
  }

  async function sincronizarEBuscarChamados() {
    if (estaSincronizando()) return;

    await sincronizarPendentes();
    const qtd = await contarPendencias();
    setPendencias(qtd);

    if (qtd === 0) {
      await buscarChamados();
    } else {
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

          await carregarQuantidadeNotificacoes();

          const sessaoOk = await verificarSessaoValida();
          if (!sessaoOk) return;

          const filtrosSalvos = await AsyncStorage.getItem("@saved_selected_status");
          if (filtrosSalvos) setSelectedStatus(JSON.parse(filtrosSalvos));

          const dataInicioSalva = await AsyncStorage.getItem("@saved_start_date");
          if (dataInicioSalva) setStartDate(new Date(dataInicioSalva));

          const dataFimSalva = await AsyncStorage.getItem("@saved_end_date");
          if (dataFimSalva) setEndDate(new Date(dataFimSalva));

          await carregarUsuario();
          await carregarDadosDeApoio();
          await sincronizarEBuscarChamados();
        } catch (error) {
          // Tratar erro
        } finally {
          setLoading(false);
        }
      }
      carregarTudo();
    }, [])
  );

  useEffect(() => {
    const subscription = Notifications.addNotificationReceivedListener(() => {
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
      setOnline(state.isConnected === true && state.isInternetReachable !== false);
      const qtd = await contarPendencias();
      setPendencias(qtd);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    async function iniciarNotificacoes() {
      const ativadaPeloUsuario = await obterStatusNotificacaoSalva();
      if (ativadaPeloUsuario) {
        await requisitarEPersistirPermissao(true);
      }
    }
    iniciarNotificacoes();
  }, []);

  useEffect(() => {
    const subRecebida = Notifications.addNotificationReceivedListener(() => {
      buscarChamados();
    });
    const subToque = Notifications.addNotificationResponseReceivedListener((response) => {
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
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const isOnlineStatus = await isOnline();

      if (!isOnlineStatus) {
        const cacheChamados = await AsyncStorage.getItem("@cache_chamados");
        if (cacheChamados) {
          const chamadosSalvos = JSON.parse(cacheChamados);
          setTodosChamados(chamadosSalvos);
          aplicarFiltros(chamadosSalvos);
        }
        return;
      }

      const token = await AsyncStorage.getItem("token");
      const response = await fetch(await getApiUrl(), {
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

      if (response.status === 401 || data.data?.code === "SESSION_TERMINATED") {
        setLoading(false);
        setRefreshing(false);
        await logout();

        if (alertaDeslogarVisivel) {
          router.replace("/");
          return;
        }

        alertaDeslogarVisivel = true;
        Alert.alert(
          "Sessão Encerrada",
          "Sua conexão caiu ou este usuário foi conectado em outro dispositivo.",
          [
            {
              text: "OK",
              onPress: () => {
                alertaDeslogarVisivel = false;
                router.replace("/");
              },
            },
          ],
          { cancelable: false }
        );
        return;
      }

      if (data.status === "error") {
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
          (calendar: any) => Number(calendar.representative_id) === Number(representativeId)
        );

        const chamadosComEstadoLocal = await Promise.all(
          chamadosDoTecnico.map(async (item: any) => {
            const pausadoLocal = await AsyncStorage.getItem(`@ticket_${item.calendar_id}_pausado`);
            if (pausadoLocal === "1") {
              return { ...item, calendar_status: 1, agenda_pause: 1 };
            }
            return item;
          })
        );

        await AsyncStorage.setItem("@cache_chamados", JSON.stringify(chamadosComEstadoLocal));
        await verificarAlteracoes(chamadosComEstadoLocal);

        if (token) cachearChecklistsNovos(token, chamadosComEstadoLocal).catch(() => {});

        setUltimosChamados(chamadosComEstadoLocal);
        setTodosChamados(chamadosComEstadoLocal);
        aplicarFiltros(chamadosComEstadoLocal);
      }
    } catch (error) {
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
      const response = await fetch(await getApiUrl(), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ class: "RepresentativeService", method: "loadAll" }),
      });
      const data = await response.json();
      if (data.status === "success") {
        const mapa: any = {};
        data.data.forEach((usuario: any) => { mapa[usuario.id] = usuario.name; });
        setTecnicos(mapa);
        await AsyncStorage.setItem("@cache_tecnicos", JSON.stringify(mapa));
      }
    } catch (error) {
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
      const response = await fetch(await getApiUrl(), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ class: "ServiceTypeService", method: "loadAll" }),
      });
      const data = await response.json();
      if (data.status === "success") {
        const mapa: any = {};
        data.data.forEach((categoria: any) => { mapa[categoria.service_type_id] = categoria.service_type_name; });
        setCategorias(mapa);
        await AsyncStorage.setItem("@cache_categorias", JSON.stringify(mapa));
      }
    } catch (error) {
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
      const response = await fetch(await getApiUrl(), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ class: "CustomerService", method: "loadAll" }),
      });
      const data = await response.json();
      if (data.status === "success") {
        const mapa: any = {};
        data.data.forEach((cliente: any) => { mapa[cliente.customer_id] = cliente.customer_name; });
        setClientes(mapa);
        await AsyncStorage.setItem("@cache_clientes", JSON.stringify(mapa));
      }
    } catch (error) {
      const cache = await AsyncStorage.getItem("@cache_clientes");
      if (cache) setClientes(JSON.parse(cache));
    }
  }

  const toggleStatus = async (status: string) => {
    try {
      setSelectedStatus((prev) => {
        const novoStatus = prev.includes(status) ? prev.filter((item) => item !== status) : [...prev, status];
        AsyncStorage.setItem("@saved_selected_status", JSON.stringify(novoStatus)).catch();
        return novoStatus;
      });
    } catch (error) {}
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
    } catch (error) {}
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

  async function salvarNotificacao(titulo: string, mensagem: string, tipo: string, uniqueId: string, calendarId: any) {
    const saved = await AsyncStorage.getItem("@notificacoes");
    const savedIds = await AsyncStorage.getItem("@notificacoes_ids");
    const jaCarregados = await AsyncStorage.getItem("@chamados_ja_carregados");

    let lista = saved ? JSON.parse(saved) : [];
    let ids = savedIds ? JSON.parse(savedIds) : [];
    let chamadosCarregados = jaCarregados ? JSON.parse(jaCarregados) : [];

    if (ids.includes(uniqueId) || lista.some((item: any) => item.uniqueId === uniqueId)) return;

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
      lida: false,
      data: new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }),
      timestamp: new Date().toISOString(),
    });

    await AsyncStorage.setItem("@notificacoes", JSON.stringify(lista));
    await AsyncStorage.setItem("@notificacoes_ids", JSON.stringify(ids));

    const naoLidas = lista.filter((item: any) => !item.lida);
    setQuantidadeNotificacoes(naoLidas.length);
  }

  async function verificarAlteracoes(novosChamados: any[]) {
    const chamadosSalvosStr = await AsyncStorage.getItem("@ultimos_chamados_sync");
    const ultimosSalvos = chamadosSalvosStr ? JSON.parse(chamadosSalvosStr) : [];

    if (ultimosSalvos.length === 0 && novosChamados.length > 0) {
      await AsyncStorage.setItem("@ultimos_chamados_sync", JSON.stringify(novosChamados));
      return;
    }

    for (const novo of novosChamados) {
      const antigo = ultimosSalvos.find((item: any) => String(item.calendar_id) === String(novo.calendar_id));
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
    await AsyncStorage.setItem("@ultimos_chamados_sync", JSON.stringify(novosChamados));
  }

  async function cachearChecklistsNovos(token: string, chamados: any[]) {
    try {
      if (chamados.length === 0) return;
      const response = await fetch(await getApiUrl(), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ class: "CalendarChecklistService", method: "loadAll" }),
      });
      const data = await response.json();

      if (data.status !== "success" || !Array.isArray(data.data)) return;

      for (const chamado of chamados) {
        const id = chamado.calendar_id;
        const item = data.data.find((c: any) => String(c.calendar_id) === String(id));
        if (!item || !item.calendar_checklist_template) continue;

        try {
          const template = JSON.parse(item.calendar_checklist_template);
          const ordenado = template.sort((a: any, b: any) => Number(a.order) - Number(b.order));
          await AsyncStorage.setItem(
            `@checklist_${id}`,
            JSON.stringify({ calendar_checklist_id: item.calendar_checklist_id, template: ordenado })
          );
        } catch (e) {}
      }
    } catch (error) {}
  }

  async function carregarQuantidadeNotificacoes() {
    const saved = await AsyncStorage.getItem("@notificacoes");
    if (saved) {
      const lista: any[] = JSON.parse(saved);
      const naoLidas = lista.filter((item) => !item.lida);
      setQuantidadeNotificacoes(naoLidas.length);
    } else {
      setQuantidadeNotificacoes(0);
    }
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ScreenWrapper style={[estilos.recipientePrincipal, { backgroundColor: theme.background }]}>
        <StatusBar style={darkMode ? "light" : "dark"} />

        {/* HEADER */}
        <View style={[estilos.cabecalho, { backgroundColor: theme.background }]}>
          <View style={estilos.recipienteLogo}>
            <Image source={darkMode ? logoDark : logoLight} style={estilos.imagemLogo} />
          </View>
          <View style={estilos.iconesCabecalho}>
            <TouchableOpacity
              style={[estilos.botaoIcone, { marginRight: 4, position: 'relative' }]}
              onPress={() => router.push("/notificacoes")}
            >
              <Bell size={24} color={theme.text} />
              {quantidadeNotificacoes > 0 && (
                <View
                  style={{
                    position: 'absolute', right: -2, top: -2,
                    backgroundColor: '#ef4444', borderRadius: 10,
                    minWidth: 18, height: 18,
                    justifyContent: 'center', alignItems: 'center',
                    paddingHorizontal: 4, borderWidth: 1.5, borderColor: theme.card
                  }}
                >
                  <Text style={{ color: '#fff', fontSize: 10, fontWeight: 'bold' }}>
                    {quantidadeNotificacoes}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={estilos.botaoIcone} onPress={() => setMenuVisible(true)}>
              <Menu size={24} color={theme.text} />
            </TouchableOpacity>
          </View>
        </View>

        {/* PESQUISA */}
        <View style={estilos.secaoPesquisa}>
          <View style={[estilos.barraPesquisa, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Search size={20} color="#94a3b8" style={{ marginLeft: 10 }} />
            <TextInput
              placeholder="Pesquisar chamados..."
              placeholderTextColor={theme.subText}
              style={[estilos.entradaTexto, { color: theme.text }]}
              value={searchText}
              onChangeText={setSearchText}
            />
          </View>
          <TouchableOpacity style={estilos.botaoFiltro} onPress={() => setFilterVisible(true)}>
            <SlidersHorizontal size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* LISTA DE CHAMADOS OTMIZADA */}
        <FlatList
          data={filteredChamados}
          extraData={theme}
          keyExtractor={(item) => String(item.calendar_id)}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={7}
          removeClippedSubviews={true}
          contentContainerStyle={estilos.conteudo}
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
                } finally {
                  setRefreshing(false);
                }
              }}
              tintColor="#3b82f6"
              colors={["#3b82f6"]}
            />
          }
          ListEmptyComponent={
            loading ? (
              <View style={estilos.recipienteCarregamento}>
                <ActivityIndicator size="large" color="#3b82f6" />
                <Text style={[estilos.textoCarregamento, { color: theme.subText }]}>Carregando chamados...</Text>
              </View>
            ) : (
              <View style={estilos.recipienteVazio}>
                <View style={estilos.recipienteIlustracao}>
                  <View style={[estilos.caixaIsometrica, { backgroundColor: theme.card, borderColor: theme.border }]}>
                    <Inbox size={60} color="#3b82f6" />
                  </View>
                </View>
                <Text style={[estilos.tituloVazio, { color: theme.text }]}>Nenhum chamado corresponde aos filtros</Text>
                <Text style={[estilos.subtituloVazio, { color: theme.subText }]}>↓ Arraste para baixo para sincronizar</Text>
              </View>
            )
          }
          renderItem={({ item }) => (
            <CartaoChamado
              chamado={item}
              tema={theme}
              textoCliente={getClienteText(item.customer_id)}
              textoCategoria={getCategoriaText(item.service_type_id)}
              textoStatus={getStatusText(item.calendar_status, item.agenda_pause)}
              corStatus={getStatusColor(item.calendar_status, item.agenda_pause)}
              corPontoStatus={getStatusDotColor(item.calendar_status, item.agenda_pause)}
              aoAbrirDeslize={lidarComAberturaDeslize}
              aoRegistrarRef={registrarRefDeslize}
              aoNavegarDetalhes={navegarDetalhes}
              aoNavegarEditarRelatorio={navegarEditarRelatorio}
              aoNavegarChecklist={navegarChecklist}
              aoNavegarDetalhesChamados={aoNavegarDetalhesChamados}
            />
          )}
        />

        {/* MODAL FILTRO */}
        <Modal transparent animationType="fade" visible={filterVisible} onRequestClose={() => setFilterVisible(false)}>
          <View style={estilos.sobreposicao}>
            <View style={[estilos.caixaModal, { backgroundColor: theme.card }]}>
              <View style={estilos.indicadorArrastoModal} />
              <View style={estilos.cabecalhoModal}>
                <View>
                  <Text style={[estilos.tituloModal, { color: theme.text }]}>Filtrar Chamados</Text>
                  <Text style={{ color: theme.subText, fontSize: 13, marginTop: 2 }}>Refine a sua listagem de ordens de serviço</Text>
                </View>
                <TouchableOpacity style={estilos.botaoFecharModal} onPress={() => setFilterVisible(false)}>
                  <X size={20} color={theme.text} />
                </TouchableOpacity>
              </View>

              <Text style={[estilos.rotuloModal, { color: theme.text, fontWeight: "600" }]}>Status do Chamado</Text>
              <View style={estilos.gradeStatus}>
                <TouchableOpacity
                  style={[estilos.botaoOpcaoFiltro, { backgroundColor: selectedStatus.includes("aberto") ? "#ffaa0088" : theme.background, borderColor: "#ffa200", justifyContent: 'center', alignItems: 'center' }]}
                  onPress={() => toggleStatus("aberto")}
                >
                  <Text style={[estilos.textoOpcao, { color: selectedStatus.includes("aberto") ? "#ffffff" : theme.text, fontWeight: selectedStatus.includes("aberto") ? "700" : "400", textAlign: 'center' }]}>Aberto</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[estilos.botaoOpcaoFiltro, { backgroundColor: selectedStatus.includes("em_atendimento") ? "#4b9dd880" : theme.background, borderColor: "#3b82f6", justifyContent: 'center', alignItems: 'center' }]}
                  onPress={() => toggleStatus("em_atendimento")}
                >
                  <Text style={[estilos.textoOpcao, { color: selectedStatus.includes("em_atendimento") ? "#ffffff" : theme.text, fontWeight: selectedStatus.includes("em_atendimento") ? "700" : "400", textAlign: 'center' }]}>Em atendimento</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[estilos.botaoOpcaoFiltro, { backgroundColor: selectedStatus.includes("aguardando") ? "#e673997e" : theme.background, borderColor: "#ff0077", justifyContent: 'center', alignItems: 'center' }]}
                  onPress={() => toggleStatus("aguardando")}
                >
                  <Text style={[estilos.textoOpcao, { color: selectedStatus.includes("aguardando") ? "#ffffff" : theme.text, fontWeight: selectedStatus.includes("aguardando") ? "700" : "400", textAlign: 'center' }]}>Pausado</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[estilos.botaoOpcaoFiltro, { backgroundColor: selectedStatus.includes("finalizado") ? "#0d9e4788" : theme.background, borderColor: "#22c55e", justifyContent: 'center', alignItems: 'center' }]}
                  onPress={() => toggleStatus("finalizado")}
                >
                  <Text style={[estilos.textoOpcao, { color: selectedStatus.includes("finalizado") ? "#ffffff" : theme.text, fontWeight: selectedStatus.includes("finalizado") ? "700" : "400", textAlign: 'center' }]}>Finalizado</Text>
                </TouchableOpacity>
              </View>

              <Text style={[estilos.rotuloModal, { color: theme.text, fontWeight: "600", marginTop: 20 }]}>Período de Data</Text>
              <View style={{ flexDirection: "row", gap: 10 }}>
                <TouchableOpacity style={[estilos.entradaData, { flex: 1, backgroundColor: theme.background, borderColor: theme.border }]} onPress={() => { setShowEndPicker(false); setShowStartPicker(true); }}>
                  <Text style={{ fontSize: 12, color: theme.subText, marginBottom: 2 }}>De:</Text>
                  <Text style={{ color: startDate ? theme.text : theme.subText, fontWeight: startDate ? "600" : "400" }}>{startDate ? startDate.toLocaleDateString("pt-BR") : "--/--/----"}</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[estilos.entradaData, { flex: 1, backgroundColor: theme.background, borderColor: theme.border }]} onPress={() => { setShowStartPicker(false); setShowEndPicker(true); }}>
                  <Text style={{ fontSize: 12, color: theme.subText, marginBottom: 2 }}>Até:</Text>
                  <Text style={{ color: endDate ? theme.text : theme.subText, fontWeight: endDate ? "600" : "400" }}>{endDate ? endDate.toLocaleDateString("pt-BR") : "--/--/----"}</Text>
                </TouchableOpacity>
              </View>

              {(startDate || endDate) && (
                <TouchableOpacity
                  style={estilos.botaoLimparData}
                  onPress={async () => {
                    setStartDate(null);
                    setEndDate(null);
                    await AsyncStorage.removeItem("@saved_start_date");
                    await AsyncStorage.removeItem("@saved_end_date");
                  }}
                >
                  <Text style={estilos.textoLimparData}>Limpar período de data</Text>
                </TouchableOpacity>
              )}

              <View style={estilos.acoesRodapeFiltro}>
                <TouchableOpacity style={[estilos.botaoSecundarioModal, { borderColor: theme.border }]} onPress={() => { limparFiltros(); setFilterVisible(false); }}>
                  <Text style={[estilos.textoBotaoSecundarioModal, { color: theme.text }]}>Limpar Tudo</Text>
                </TouchableOpacity>
                <TouchableOpacity style={estilos.botaoPrimarioModal} onPress={() => { aplicarFiltros(); setFilterVisible(false); }}>
                  <Text style={estilos.textoBotaoPrimarioModal}>Aplicar Filtros</Text>
                </TouchableOpacity>
              </View>

              {showStartPicker && Platform.OS === "android" && (
                <DateTimePicker value={startDate || new Date()} mode="date" display="default" locale="pt-BR" onChange={(event, date) => { setShowStartPicker(false); if (date) { setStartDate(date); AsyncStorage.setItem("@saved_start_date", date.toISOString()).catch(); } }} />
              )}

              {showEndPicker && Platform.OS === "android" && (
                <DateTimePicker value={endDate || new Date()} mode="date" display="default" locale="pt-BR" onChange={(event, date) => { setShowEndPicker(false); if (date) { setEndDate(date); AsyncStorage.setItem("@saved_end_date", date.toISOString()).catch(); } }} />
              )}

              {Platform.OS === "ios" && (
                <Modal transparent visible={showStartPicker} animationType="fade" onRequestClose={() => setShowStartPicker(false)}>
                  <View style={estilos.visaoCentralizada}>
                    <View style={[estilos.caixaModalCalendario, { backgroundColor: theme.card }]}>
                      <DateTimePicker themeVariant={darkMode ? "dark" : "light"} value={startDate || new Date()} mode="date" display="inline" locale="pt-BR" onChange={(event, date) => { if (date) { setStartDate(date); AsyncStorage.setItem("@saved_start_date", date.toISOString()).catch(); } }} />
                      <TouchableOpacity style={estilos.botaoFecharCalendario} onPress={() => setShowStartPicker(false)}>
                        <Text style={estilos.textoBotaoFecharCalendario}>Confirmar</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </Modal>
              )}

              {Platform.OS === "ios" && (
                <Modal transparent visible={showEndPicker} animationType="fade" onRequestClose={() => setShowEndPicker(false)}>
                  <View style={estilos.visaoCentralizada}>
                    <View style={[estilos.caixaModalCalendario, { backgroundColor: theme.card }]}>
                      <DateTimePicker themeVariant={darkMode ? "dark" : "light"} value={endDate || new Date()} mode="date" display="inline" locale="pt-BR" onChange={(event, date) => { if (date) { setEndDate(date); AsyncStorage.setItem("@saved_end_date", date.toISOString()).catch(); } }} />
                      <TouchableOpacity style={estilos.botaoFecharCalendario} onPress={() => setShowEndPicker(false)}>
                        <Text style={estilos.textoBotaoFecharCalendario}>Confirmar</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </Modal>
              )}
            </View>
          </View>
        </Modal>

        {/* MODAL MENU HAMBÚRGUER */}
        <Modal transparent visible={menuVisible} animationType="fade" onRequestClose={() => setMenuVisible(false)}>
          <View style={estilos.sobreposicaoMenu}>
            <TouchableOpacity style={estilos.toqueFecharSobreposicaoMenu} activeOpacity={1} onPress={() => setMenuVisible(false)} />
            <View style={[estilos.caixaMenu, { backgroundColor: theme.card }]}>
              <SafeAreaView style={{ flex: 1 }}>
                <View style={estilos.cabecalhoMenuAjustado}>
                  <Text style={[estilos.tituloMenu, { color: theme.text }]}>Menu</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <View style={{ backgroundColor: darkMode ? "#1E293B" : "#F1F5F9", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }}>
                      <Text style={{ color: darkMode ? "#FFFFFF" : "#000000", fontWeight: "600", fontSize: 13 }}>{online ? "🟢 Sincronizado" : "🔴 Offline"}</Text>
                    </View>
                    <TouchableOpacity onPress={() => setMenuVisible(false)} style={estilos.botaoFecharMenuClicavel}>
                      <X size={24} color={theme.text} />
                    </TouchableOpacity>
                  </View>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1 }}>
                  <TouchableOpacity style={estilos.caixaPerfil} onPress={() => { setMenuVisible(false); router.push("/perfil"); }}>
                    <View style={estilos.avatar}><User size={22} color="#fff" /></View>
                    <View style={{ flex: 1 }}>
                      <Text style={[estilos.nomeUsuario, { color: theme.text }]}>{nome || "Usuário"}</Text>
                      <Text style={[estilos.subtituloUsuario, { color: theme.subText }]}>{perfil || "Técnico"}</Text>
                    </View>
                    <ChevronRight size={16} color={theme.subText} />
                  </TouchableOpacity>

                

                  <TouchableOpacity style={estilos.itemMenu} onPress={() => { setMenuVisible(false); router.push("/mapa-chamados"); }}>
                    <MapPin size={20} color="#3b82f6" />
                    <Text style={[estilos.textoMenu, { color: theme.text }]}>Mapa de Atendimentos</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={estilos.itemMenu} onPress={() => { setMenuVisible(false); router.push("/sincronizacao"); }}>
                    <RefreshCw size={20} color="#3b82f6" />
                    <Text style={[estilos.textoMenu, { color: theme.text }]}>Sincronização {pendencias > 0 ? `(${pendencias})` : ''}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={estilos.itemMenu} onPress={() => { setMenuVisible(false); router.push("/configuracoes"); }}>
                    <Settings size={20} color="#3b82f6" />
                    <Text style={[estilos.textoMenu, { color: theme.text }]}>Configurações</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={estilos.botaoSair} onPress={fazerLogout}>
                    <LogOut size={18} color="#fff" />
                    <Text style={estilos.textoSair}>Sair</Text>
                  </TouchableOpacity>
                </ScrollView>
              </SafeAreaView>
            </View>
          </View>
        </Modal>
      </ScreenWrapper>
    </GestureHandlerRootView>
  );
}