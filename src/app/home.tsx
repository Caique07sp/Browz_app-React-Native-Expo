import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from "@react-native-community/datetimepicker";

import { useTheme } from "@/theme/ThemeContext";
import { Link, useFocusEffect } from "expo-router";
import {
  Inbox,
  Info,
  LayoutDashboard,
  LogOut,
  Menu,
  Search,
  Settings,
  SlidersHorizontal,
  User,
  X
} from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Platform,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { sincronizarPendentes } from "@/services/sync";

import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { isOnline } from '@/services/network';


export default function Browz() {
  const [filterVisible, setFilterVisible] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);

  const [selectedStatus, setSelectedStatus] = useState<string[]>([]);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [nome, setNome] = useState("");
  const [perfil, setPerfil] = useState("");
  const [tecnicos, setTecnicos] = useState<any>({});
  const [categorias, setCategorias] = useState<any>({});
  const [clientes, setClientes] = useState<any>({});
  const [chamados, setChamados] = useState<any[]>([]);
  const [searchText, setSearchText] = useState("");

  const [todosChamados, setTodosChamados] = useState<any[]>([]);
  const [filteredChamados, setFilteredChamados] = useState<any[]>([]);

  const [ultimosChamados, setUltimosChamados] = useState<any[]>([]);
  const [quantidadeNotificacoes, setQuantidadeNotificacoes] = useState(0);
  const { theme, darkMode } = useTheme();



  useFocusEffect(
    React.useCallback(() => {

      async function carregarTudo() {

        await sincronizarPendentes();

        await carregarUsuario();

        await buscarChamados();

        await buscarTecnicos();

        await buscarCategorias();

        await buscarClientes();

        await carregarQuantidadeNotificacoes();
      }

      carregarTudo();

    }, [])
  );

  useEffect(() => {
    aplicarFiltros();
  }, [searchText, selectedStatus, startDate, endDate, todosChamados, clientes]);


  //Testando aqui o modo offline |
  //                             v

  async function buscarChamados(isRefresh = false) {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      // VERIFICA INTERNET
      const online = await isOnline();

      // OFFLINE
      if (!online) {
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

      if (data.status === "success") {
        const representativeId =
          await AsyncStorage.getItem("representative_id");

        const chamadosDoTecnico = data.data.filter(
          (calendar: any) =>
            Number(calendar.representative_id) ===
            Number(representativeId)
        );

        // SALVA CACHE
        await AsyncStorage.setItem(
          "@cache_chamados",
          JSON.stringify(chamadosDoTecnico)
        );

        await verificarAlteracoes(chamadosDoTecnico);

        setUltimosChamados(chamadosDoTecnico);

        setTodosChamados(chamadosDoTecnico);

        aplicarFiltros(chamadosDoTecnico);
      }
    } catch (error) {
      console.log("ERRO:", error);

      // FALLBACK CACHE
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

    // Por padrão não mostra finalizados
    if (!selectedStatus.includes("finalizado")) {
      lista = lista.filter((item) => Number(item.calendar_status) !== 2);
    }

    // Status
    if (selectedStatus.length > 0) {
      lista = lista.filter((item) => {
        const status = Number(item.calendar_status);
        const pausado = Number(item.agenda_pause) === 1;

        if (selectedStatus.includes("aberto") && status === 0) return true;

        if (
          selectedStatus.includes("em_atendimento") &&
          status === 1 &&
          !pausado
        ) return true;

        if (
          selectedStatus.includes("aguardando") &&
          status === 1 &&
          pausado
        ) return true;

        if (selectedStatus.includes("finalizado") && status === 2) return true;

        return false;
      });
    }

    // Pesquisa
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

    // Data selecionada
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

      
      return dataB - dataA;
    });


    setFilteredChamados(lista);
  }


  //Offline

  //    |
  //    v

  async function buscarTecnicos() {
    try {
      const online = await isOnline();

      if (!online) {
        const cache = await AsyncStorage.getItem("@cache_tecnicos");

        if (cache) {
          setTecnicos(JSON.parse(cache));
        }

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

        await AsyncStorage.setItem(
          "@cache_tecnicos",
          JSON.stringify(mapa)
        );
      }
    } catch (error) {
      console.log("ERRO TECNICOS:", error);

      const cache = await AsyncStorage.getItem("@cache_tecnicos");

      if (cache) {
        setTecnicos(JSON.parse(cache));
      }
    }
  }



  async function buscarCategorias() {
    try {
      const online = await isOnline();

      if (!online) {
        const cache = await AsyncStorage.getItem("@cache_categorias");

        if (cache) {
          setCategorias(JSON.parse(cache));
        }

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
          mapa[categoria.service_type_id] =
            categoria.service_type_name;
        });

        setCategorias(mapa);

        await AsyncStorage.setItem(
          "@cache_categorias",
          JSON.stringify(mapa)
        );
      }
    } catch (error) {
      console.log("ERRO CATEGORIAS:", error);

      const cache = await AsyncStorage.getItem("@cache_categorias");

      if (cache) {
        setCategorias(JSON.parse(cache));
      }
    }
  }

  //Testando aqui o modo offline |
  //                              v

  async function buscarClientes() {
    try {
      const online = await isOnline();

      // OFFLINE
      if (!online) {
        const cache = await AsyncStorage.getItem("@cache_clientes");

        if (cache) {
          setClientes(JSON.parse(cache));
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
            class: "CustomerService",
            method: "loadAll",
          }),
        }
      );

      const data = await response.json();

      if (data.status === "success") {
        const mapa: any = {};

        data.data.forEach((cliente: any) => {
          mapa[cliente.customer_id] =
            cliente.customer_name;
        });

        setClientes(mapa);

        // SALVA CACHE
        await AsyncStorage.setItem(
          "@cache_clientes",
          JSON.stringify(mapa)
        );
      }
    } catch (error) {
      console.log("ERRO CLIENTES:", error);

      // FALLBACK
      const cache = await AsyncStorage.getItem("@cache_clientes");

      if (cache) {
        setClientes(JSON.parse(cache));
      }
    }
  }



  const toggleStatus = (status: string) => {
    setSelectedStatus((prev) =>
      prev.includes(status)
        ? prev.filter((item) => item !== status)
        : [...prev, status]
    );
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
    return (
      categorias[serviceTypeId] ||
      `Categoria ID: ${serviceTypeId}`
    );
  }

  function getTecnicoText(representativeId: any) {
    return tecnicos[representativeId] || `Técnico ID: ${representativeId}`;
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

    const jaCarregados =
      await AsyncStorage.getItem("@chamados_ja_carregados");

    let lista = saved ? JSON.parse(saved) : [];

    let ids = savedIds ? JSON.parse(savedIds) : [];

    let chamadosCarregados = jaCarregados
      ? JSON.parse(jaCarregados)
      : [];



    // NÃO DEIXA REPETIR
    if (ids.includes(uniqueId)) {
      return;
    }

    if (!chamadosCarregados.includes(calendarId)) {
      chamadosCarregados.push(calendarId);

      await AsyncStorage.setItem(
        "@chamados_ja_carregados",
        JSON.stringify(chamadosCarregados)
      );
    }


    ids.push(uniqueId);

    lista.unshift({
      titulo,
      mensagem,
      tipo,
      uniqueId,

      data: new Date().toLocaleString("pt-BR", {
        timeZone: "America/Sao_Paulo",
      }),

      timestamp: new Date().toISOString(),

    });

    await AsyncStorage.setItem(
      "@notificacoes",
      JSON.stringify(lista)
    );

    await AsyncStorage.setItem(
      "@notificacoes_ids",
      JSON.stringify(ids)
    );

    setQuantidadeNotificacoes(lista.length);
  }

  async function verificarAlteracoes(novosChamados: any[]) {
    // 1. Pegar o que tínhamos salvo na última vez
    const chamadosSalvosStr = await AsyncStorage.getItem("@ultimos_chamados_sync");
    const ultimosSalvos = chamadosSalvosStr ? JSON.parse(chamadosSalvosStr) : [];

    const jaCarregadosStr = await AsyncStorage.getItem("@chamados_ja_carregados");
    const chamadosCarregados = jaCarregadosStr ? JSON.parse(jaCarregadosStr) : [];

    for (const novo of novosChamados) {
      const antigo = ultimosSalvos.find(
        (item: any) => String(item.calendar_id) === String(novo.calendar_id)
      );

      // LÓGICA: NOVO CHAMADO
      // Se não existia na lista anterior e não está na lista de "já notificados"
      if (!antigo && !chamadosCarregados.includes(novo.calendar_id)) {
        await salvarNotificacao(
          "Novo chamado",
          `Chamado #${novo.calendar_id} atribuído para você`,
          "novo",
          `novo_${novo.calendar_id}`,
          novo.calendar_id
        );
      }
      // LÓGICA: MUDANÇA DE STATUS
      else if (antigo && Number(antigo.calendar_status) !== Number(novo.calendar_status)) {
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

    // 2. ATUALIZAR O SNAPSHOT: Salva a lista atual para a próxima comparação
    await AsyncStorage.setItem("@ultimos_chamados_sync", JSON.stringify(novosChamados));
  }

  async function carregarQuantidadeNotificacoes() {
    const saved = await AsyncStorage.getItem("@notificacoes");

    if (saved) {
      const lista = JSON.parse(saved);

      setQuantidadeNotificacoes(lista.length);
    } else {
      setQuantidadeNotificacoes(0);
    }
  }

  async function registerForPushNotificationsAsync() {
    let token;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    if (Device.isDevice) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== 'granted') {
        alert('Falha ao obter permissão para notificações!');
        return;
      }

      // Pega o ID do projeto do seu app.json
      const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;

      token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
      console.log("Token do Dispositivo:", token);
    } else {
      alert('Push Notifications só funcionam em dispositivos físicos');
    }

    return token;
  }



  return (
    <SafeAreaView
      style={[
        styles.container,
        {
          backgroundColor: theme.background,
        },
      ]}
    >
      <StatusBar
        barStyle={
          darkMode
            ? "light-content"
            : "dark-content"
        }
      />

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
          <Image
            source={
              darkMode
                ? require("../assets/logo-white.png")
                : require("../assets/browz.png")
            }
            style={styles.logoImage}
          />
        </View>

        <View style={styles.headerIcons}>
          <Link href="/notificacoes" asChild>

            <TouchableOpacity style={styles.iconButton}>
              {/*<View>
                <Bell size={24} color="#fff" />

                {quantidadeNotificacoes > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>
                      {quantidadeNotificacoes}
                    </Text>
                  </View>
                )}
              </View>*/}
            </TouchableOpacity>
          </Link>

          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => setMenuVisible(true)}
          >
            <Menu
              size={24}
              color={theme.text}
            />
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

              await sincronizarPendentes();

              await buscarChamados(true);
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

          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => setFilterVisible(true)}
          >
            <SlidersHorizontal size={20} color="#fff" />

          </TouchableOpacity>
        </View>

        <View style={styles.sectionHeader}>
          <Text
            style={[
              styles.sectionTitle,
              {
                color: theme.text,
              },
            ]}
          >Chamados Recentes</Text>
          <TouchableOpacity>
            <Text style={{ color: "#3b82f6" }}>Ver todos</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3b82f6" />
            <Text
              style={[
                styles.loadingText,
                {
                  color: theme.subText,
                },
              ]}
            >Carregando chamados...</Text>
          </View>
        ) : filteredChamados.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.illustrationContainer}>
              <View
                style={[
                  styles.isometricBox,
                  {
                    backgroundColor: theme.card,
                    borderColor: theme.border,
                  },
                ]}
              >
                <Inbox size={60} color="#3b82f6" />
              </View>
            </View>

            <Text
              style={[
                styles.emptyTitle,
                {
                  color: theme.text,
                },
              ]}
            >
              Nenhum chamado corresponde aos filtros selecionados
            </Text>

            <Text
              style={[
                styles.emptySubtitle,
                {
                  color: theme.subText,
                },
              ]}
            >
              ↓ Arraste para baixo para sincronizar
            </Text>
          </View>
        ) : (

          filteredChamados.map((calendar, index) => (
            <Link
              key={String(calendar.calendar_id || index)}
              href={{
                pathname: "/detalhes",
                params: {
                  id: calendar.calendar_id,
                },
              }}
              asChild
            >
              <TouchableOpacity
                activeOpacity={0.8}
                style={{
                  backgroundColor: theme.card,
                  borderRadius: 16,
                  padding: 16,
                  marginBottom: 15,
                  borderWidth: 3,
                  borderLeftColor: theme.card,
                  borderRightColor: getStatusColor(
                    calendar.calendar_status,
                    calendar.agenda_pause

                  ),
                  borderTopColor: theme.card,
                  borderBottomColor: theme.card,
                }}
              >


                <View style={styles.cardHeader}>
                  <View
                    style={[
                      styles.idBadge,
                      {
                        backgroundColor: theme.background,
                        borderColor: theme.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.idText,
                        {
                          color: theme.subText,
                        },
                      ]}
                    >
                      #{calendar.calendar_id}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.statusBadge,
                      {

                        backgroundColor: getStatusColor(
                          calendar.calendar_status,
                          calendar.agenda_pause

                        ),
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.statusDot,
                        {
                          backgroundColor: getStatusDotColor(
                            calendar.calendar_status,
                            calendar.agenda_pause
                          ),
                        },
                      ]}
                    />

                    <Text style={styles.statusText}>


                      {getStatusText(calendar.calendar_status, calendar.agenda_pause)}




                    </Text>
                  </View>
                </View>

                <Text
                  style={[
                    styles.footerDate,
                    {
                      color: theme.subText,
                    },
                  ]}
                >
                  {new Date(calendar.calendar_start).toLocaleDateString("pt-BR", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Text>

                <Text
                  style={[
                    styles.cardTitle,
                    {
                      color: theme.text,
                    },
                  ]}
                >
                  {getClienteText(calendar.customer_id)}
                </Text>

                <Text
                  style={[
                    styles.cardDescription,
                    {
                      color: theme.subText,
                    },
                  ]}
                >
                  {calendar.calendar_observation || "Sem descrição"}
                </Text>



                <View style={styles.cardFooter}>
                  <View style={styles.footerInfo}>
                    <Inbox size={14} color="#64748b" />
                    <Text
                      style={[
                        styles.footerText,
                        {
                          color: theme.subText,
                        },
                      ]}
                    >
                      {getCategoriaText(calendar.service_type_id)}
                    </Text>
                  </View>




                </View>
              </TouchableOpacity>
            </Link>
          ))

        )}
      </ScrollView>

      {/* MODAL FILTRO */}
      <Modal
        transparent
        animationType="slide"
        visible={filterVisible}
        onRequestClose={() => setFilterVisible(false)}

      >
        <View style={styles.overlay}>
          <View
            style={[
              styles.modalBox,
              {
                backgroundColor: theme.card,
              },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text
                style={[
                  styles.modalTitle,
                  {
                    color: theme.text,
                  },
                ]}
              >Filtros</Text>

              <TouchableOpacity onPress={() => setFilterVisible(false)}>
                <X
                  size={24}
                  color={theme.text}
                />
              </TouchableOpacity>
            </View>

            <Text
              style={[
                styles.modalLabel,
                {
                  color: theme.subText,
                },
              ]}
            >Status</Text>

            <View style={styles.optionColumn}>


              <TouchableOpacity
                style={[
                  styles.optionBtn,
                  {
                    backgroundColor: theme.background,
                    borderColor: theme.border,
                  },
                  selectedStatus.includes("aberto") && styles.optionBtnActive,
                ]}
                onPress={() => toggleStatus("aberto")}
              >
                <Text
                  style={[
                    styles.optionText,
                    {
                      color: theme.text,
                    },
                  ]}
                >Aberto</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.optionBtn,
                  {
                    backgroundColor: theme.background,
                    borderColor: theme.border,
                  },
                  selectedStatus.includes("em_atendimento") && styles.optionBtnActive,
                ]}
                onPress={() => toggleStatus("em_atendimento")}
              >
                <Text
                  style={[
                    styles.optionText,
                    {
                      color: theme.text,
                    },
                  ]}
                >Em atendimento</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.optionBtn,
                  {
                    backgroundColor: theme.background,
                    borderColor: theme.border,
                  },
                  selectedStatus.includes("aguardando") && styles.optionBtnActive,
                ]}
                onPress={() => toggleStatus("aguardando")}
              >
                <Text
                  style={[
                    styles.optionText,
                    {
                      color: theme.text,
                    },
                  ]}
                >Aguardando</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.optionBtn,
                  {
                    backgroundColor: theme.background,
                    borderColor: theme.border,
                  },
                  selectedStatus.includes("finalizado") && styles.optionBtnActive,
                ]}
                onPress={() => toggleStatus("finalizado")}
              >
                <Text
                  style={[
                    styles.optionText,
                    {
                      color: theme.text,
                    },
                  ]}
                >Finalizado</Text>
              </TouchableOpacity>


            </View>

            <Text style={[styles.modalLabel, { marginTop: 20 }]}>Período</Text>

            <TouchableOpacity
              style={[
                styles.dateInput,
                {
                  backgroundColor: theme.background,
                  borderColor: theme.border,
                },
              ]}
              onPress={() => {
                setShowEndPicker(false);
                setShowStartPicker(true);
              }}
            >
              <Text style={{
                color: startDate
                  ? theme.text
                  : theme.subText
              }}>
                {startDate
                  ? `Início : ${startDate.toLocaleDateString("pt-BR")}`
                  : "Selecionar data inicial"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.dateInput,

              {
                backgroundColor: theme.background,
                borderColor: theme.border,
              },
              { marginTop: 10 }]}
              onPress={() => {
                setShowStartPicker(false);
                setShowEndPicker(true);
              }}
            >
              <Text style={{
                color: endDate
                  ? theme.text
                  : theme.subText
              }}>
                {endDate
                  ? `Fim : ${endDate.toLocaleDateString("pt-BR")}`
                  : "Selecionar data final"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.clearDateBtn}
              onPress={() => {
                setStartDate(null);
                setEndDate(null);
              }}
            >
              <Text style={styles.clearDateText}>Limpar período</Text>
            </TouchableOpacity>

            {showStartPicker && (
              <DateTimePicker
                themeVariant={
                  darkMode ? "dark" : "light"
                }
                value={startDate || new Date()}
                mode="date"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                locale="pt-BR"
                onChange={(event, date) => {
                  setShowStartPicker(false);

                  if (event.type === "dismissed") return;

                  if (date) {
                    setStartDate(date);
                  }
                }}
              />
            )}

            {showEndPicker && (
              <DateTimePicker
                themeVariant={
                  darkMode ? "dark" : "light"
                }
                value={endDate || new Date()}
                mode="date"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                locale="pt-BR"
                onChange={(event, date) => {
                  setShowEndPicker(false);

                  if (event.type === "dismissed") return;

                  if (date) {
                    setEndDate(date);
                  }
                }}
              />
            )}

            <TouchableOpacity
              style={styles.applyBtn}
              onPress={() => {
                aplicarFiltros();

                setFilterVisible(false);
              }}
            >
              <Text style={styles.applyText}>Aplicar Filtros</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL MENU HAMBÚRGUER */}
      <Modal
        transparent
        animationType="fade"
        visible={menuVisible}
        onRequestClose={() => setMenuVisible(false)}
      >
        <TouchableOpacity
          style={styles.menuOverlay}
          activeOpacity={1}
          onPress={() => setMenuVisible(false)}
        >
          <View
            style={[
              styles.menuBox,
              {
                backgroundColor: theme.card,
              },
            ]}
          >
            <View style={styles.menuHeader}>
              <Text
                style={[
                  styles.menuTitle,
                  {
                    color: theme.text,
                  },
                ]}
              >Menu</Text>
              <TouchableOpacity onPress={() => setMenuVisible(false)}>
                <X
                  size={24}
                  color={theme.text}
                />
              </TouchableOpacity>
            </View>

            <View style={styles.profileBox}>
              <View style={styles.avatar}>
                <User size={22} color="#fff" />
              </View>
              <View>
                <Text
                  style={[
                    styles.userName,
                    {
                      color: theme.text,
                    },
                  ]}
                >
                  {nome || "Usuário"}
                </Text>
                <Text
                  style={[
                    styles.userSub,
                    {
                      color: theme.subText,
                    },
                  ]}
                >
                  {perfil || "Técnico"}
                </Text>
              </View>
            </View>

            <Link href="/home" asChild>
              <TouchableOpacity style={styles.menuItem}>
                <LayoutDashboard size={20} color="#3b82f6" />
                <Text
                  style={[
                    styles.menuText,
                    {
                      color: theme.text,
                    },
                  ]}
                >Home</Text>
              </TouchableOpacity>
            </Link>

            <Link href="/configuracoes" asChild>
              <TouchableOpacity style={styles.menuItem}>
                <Settings size={20} color="#3b82f6" />
                <Text
                  style={[
                    styles.menuText,
                    {
                      color: theme.text,
                    },
                  ]}
                >Configurações</Text>
              </TouchableOpacity>
            </Link>

            <TouchableOpacity style={styles.menuItem}>
              <Info size={20} color="#3b82f6" />
              <Text
                style={[
                  styles.menuText,
                  {
                    color: theme.text,
                  },
                ]}
              >Sobre</Text>
            </TouchableOpacity>

            <Link href="/" asChild>
              <TouchableOpacity style={styles.logoutBtn}>
                <LogOut size={18} color="#fff" />
                <Text style={styles.logoutText}>Sair</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f172a",
    paddingTop: Platform.OS === 'android' ? 35 : 0,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  logoContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  logoImage: {
    width: 120,
    height: 30,
    resizeMode: "contain",
  },
  headerIcons: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconButton: {
    marginLeft: 15,
  },
  badge: {
    position: "absolute",
    top: -5,
    right: -5,
    backgroundColor: "#ef4444",
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#0f172a",
  },
  badgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "bold",
  },
  searchSection: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    marginBottom: 25,
  },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1e293b",
    borderRadius: 12,
    height: 50,
    borderWidth: 1,
    borderColor: "#334155",
    paddingHorizontal: 12,
  },
  input: {
    flex: 1,
    color: "#fff",
    paddingHorizontal: 10,
    fontSize: 16,
  },
  filterButton: {
    backgroundColor: "#3b82f6",
    width: 50,
    height: 50,
    borderRadius: 12,
    marginLeft: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  sectionTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  card: {
    backgroundColor: "#1e293b",
    borderRadius: 16,
    padding: 16,
    marginBottom: 15,
    borderWidth: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  idBadge: {
    backgroundColor: "#334155",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  idText: {
    color: "#94a3b8",
    fontSize: 12,
    fontWeight: "700",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  statusText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "600",
  },
  cardTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 6,
  },
  cardDescription: {
    color: "#94a3b8",
    fontSize: 14,
    marginBottom: 15,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#334155",
    paddingTop: 12,
  },
  footerInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  footerText: {
    color: "#64748b",
    fontSize: 12,
    marginLeft: 6,
  },
  footerDate: {
    color: "#64748b",
    fontSize: 14,
    marginBottom: 10,
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  modalBox: {
    backgroundColor: "#1e293b",
    padding: 25,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "bold",
  },
  modalLabel: {
    color: "#94a3b8",
    marginBottom: 10,
  },
  optionColumn: {
    gap: 10,
  },
  optionBtn: {
    backgroundColor: "#0f172a",
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#334155",
  },
  optionBtnActive: {
    backgroundColor: "#3b82f6",
    borderColor: "#60a5fa",
  },
  optionText: {
    color: "#fff",
  },
  applyBtn: {
    backgroundColor: "#3b82f6",
    padding: 16,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 20,
  },
  applyText: {
    color: "#fff",
    fontWeight: "bold",
  },
  dateInput: {
    backgroundColor: "#0f172a",
    borderRadius: 12,
    color: "#fff",
    padding: 14,
    borderWidth: 1,
    borderColor: "#334155",
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "flex-end",
  },
  menuBox: {
    width: "75%",
    height: "100%",
    backgroundColor: "#1e293b",
    padding: 25,
  },
  menuHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 40,
    marginBottom: 30,
  },
  menuTitle: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "bold",
  },
  profileBox: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 30,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#334155",
  },
  avatar: {
    width: 45,
    height: 45,
    borderRadius: 25,
    backgroundColor: "#3b82f6",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  userName: {
    color: "#fff",
    fontWeight: "bold",
  },
  userSub: {
    color: "#94a3b8",
    fontSize: 12,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    gap: 12,
  },
  menuText: {
    color: "#fff",
    fontSize: 16,
  },
  logoutBtn: {
    marginTop: "auto",
    marginBottom: 40,
    backgroundColor: "#ef4444",
    padding: 14,
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
  },
  logoutText: {
    color: "#fff",
    fontWeight: "bold",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 60,
  },

  illustrationContainer: {
    marginBottom: 20,
  },

  isometricBox: {
    width: 100,
    height: 100,
    backgroundColor: "#1e293b",
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#334155",
  },

  emptyTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 5,
  },

  emptySubtitle: {
    color: "#94a3b8",
    textAlign: "center",
  },
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 60,
  },

  loadingText: {
    color: "#94a3b8",
    marginTop: 12,
    fontSize: 14,
  },
  clearDateBtn: {
    marginTop: 12,
    alignItems: "center",
  },

  clearDateText: {
    color: "#ef4444",
    fontWeight: "600",
  },

});