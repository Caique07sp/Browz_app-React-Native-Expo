import { ScreenWrapper } from "@/components/ScreenWrapper";
import { useFocusEffect } from '@react-navigation/native';
import { adicionarNaFila } from "@/services/offlineQueue";
import { useTheme } from "@/theme/ThemeContext";
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { getApiUrl } from "@/services/api";
import {
  Camera as CameraIcon,
  CheckCircle,
  MapPin,
  Pause,
  Play,
  ShieldCheck,
  X
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import MapView, { PROVIDER_GOOGLE } from 'react-native-maps';
import { styles } from "../styles/check.styles";

import { isOnline } from '@/services/network';

export default function CheckInScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();

  const ticketId = String(id);

  const [currentTime, setCurrentTime] = useState(new Date());
  const [started, setStarted] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [checkInTime, setCheckInTime] = useState<string | null>(null);

  // NOVO ESTADO: Controle de carregamento no botão de Iniciar Atendimento
  const [isStarting, setIsStarting] = useState(false);

  const [modalType, setModalType] = useState<'pause' | null>(null);
  const [reason, setReason] = useState('');

  const [categorias, setCategorias] = useState<any>({});
  const [nomeTecnico, setNomeTecnico] = useState('Técnico');

  const { service_type_id } = useLocalSearchParams();
  const serviceTypeId = String(service_type_id);
  const { theme, darkMode } = useTheme();
  const [alertVisible, setAlertVisible] = useState(false);
  const [avisoMidiaVisible, setAvisoMidiaVisible] = useState(false);

  const [alertData, setAlertData] = useState({
    titulo: '',
    mensagem: '',
    tipo: 'info',
  });

  const [hasMedia, setHasMedia] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      async function carregarDados() {
        try {
          // Checa mídias
          const fotosStr = await AsyncStorage.getItem(`@fotos_chamado_${ticketId}`);
          const lista = fotosStr ? JSON.parse(fotosStr) : [];
          setHasMedia(Array.isArray(lista) && lista.length > 0);

          // Checa nome do técnico
          const nome = await AsyncStorage.getItem('@nome_tecnico');
          if (nome) setNomeTecnico(nome);
        } catch (error) {
          console.error('Erro ao carregar dados:', error);
        }
      }

      carregarDados();
    }, [ticketId])
  );

  async function atualizarCacheChamado(status: number, agendaPause = 0) {
    const cache = await AsyncStorage.getItem("@cache_chamados");
    if (!cache) return;
    const chamados = JSON.parse(cache);
    const atualizados = chamados.map((item: any) => {
      if (String(item.calendar_id) === String(ticketId)) {
        return { ...item, calendar_status: status, agenda_pause: agendaPause };
      }
      return item;
    });
    await AsyncStorage.setItem("@cache_chamados", JSON.stringify(atualizados));
  }

  async function carregarNomeTecnico() {
    try {
      const nomeSalvo = await AsyncStorage.getItem('nome');
      if (nomeSalvo) {
        setNomeTecnico(nomeSalvo);
      }
    } catch (error) {
      //console.log('Erro ao carregar nome do técnico:', error);
    }
  }

  function getBrazilDateTime() {
    return new Date();
  }

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    carregarCheckInSalvo();
  }, [ticketId]);

  useEffect(() => {
    buscarLocalizacao();
  }, []);

  useEffect(() => {
    buscarCategorias();
  }, [ticketId]);

  async function carregarCheckInSalvo() {
    const savedCheckIn = await AsyncStorage.getItem(`@checkin_${ticketId}`);
    const ticketStatus = await AsyncStorage.getItem(`@ticket_${ticketId}_status`);
    const ticketPausado = await AsyncStorage.getItem(`@ticket_${ticketId}_pausado`);

    if (ticketPausado === "1" || ticketStatus === 'concluido' || ticketStatus === 'finalizado') {
      setStarted(false);
      setIsActive(false);
      setCheckInTime(null);
      return;
    }

    if (savedCheckIn) {
      const data = JSON.parse(savedCheckIn);
      if (data.status === 'finalizado') {
        setStarted(false);
        setIsActive(false);
        setCheckInTime(null);
        return;
      }
      setCheckInTime(data.horario_formatado);
      setStarted(true);
      setIsActive(data.ativo ?? true);
      return;
    }

    const cacheChamados = await AsyncStorage.getItem("@cache_chamados");
    if (cacheChamados) {
      const chamados = JSON.parse(cacheChamados);
      const chamadoAtual = chamados.find((item: any) => String(item.calendar_id) === String(ticketId));

      if (chamadoAtual && Number(chamadoAtual.calendar_status) === 1 && Number(chamadoAtual.agenda_pause) !== 1) {
        const dataFormatada = chamadoAtual.calendar_last_checkin_date
          ? new Date(chamadoAtual.calendar_last_checkin_date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
          : "Realizado";

        const checkinData = {
          calendar_id: ticketId,
          horario_formatado: dataFormatada,
          status: 'checkin_realizado',
          ativo: true,
        };

        await AsyncStorage.setItem(`@checkin_${ticketId}`, JSON.stringify(checkinData));
        await AsyncStorage.setItem(`@ticket_${ticketId}_status`, "em_atendimento");

        setCheckInTime(dataFormatada);
        setStarted(true);
        setIsActive(true);
      }
    }
  }

  async function buscarCategorias() {
    try {
      const cache = await AsyncStorage.getItem("@cache_categorias");
      if (cache) setCategorias(JSON.parse(cache));

      const online = await isOnline();
      if (!online) return;

      const token = await AsyncStorage.getItem("token");
      const response = await fetch(await getApiUrl(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ class: "ServiceTypeService", method: "loadAll" }),
      });

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
      //console.log(error);
    }
  }

  function mostrarAlerta(titulo: string, mensagem: string, tipo: 'info' | 'success' | 'warning' = 'info') {
    setAlertData({ titulo, mensagem, tipo });
    setAlertVisible(true);
  }

  async function buscarLocalizacao() {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      mostrarAlerta('Permissão necessária', 'Permita o acesso à localização para realizar o check-in.');
      return;
    }

    try {
      const ultimaConhecida = await Location.getLastKnownPositionAsync({});
      if (ultimaConhecida) {
        setLocation(ultimaConhecida);
      }

      const localizacaoAtual = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      setLocation(localizacaoAtual);
      await AsyncStorage.setItem("@ultima_localizacao", JSON.stringify(localizacaoAtual));

    } catch (error) {
      const ultima = await AsyncStorage.getItem("@ultima_localizacao");
      if (ultima) {
        setLocation(JSON.parse(ultima));
      }
    }
  }

  async function atualizarStatusChamado(status: number, extraData: any = {}) {
    try {
      const online = await isOnline();
      if (!online) {
        await adicionarNaFila({
          tipo: "status_chamado",
          ticketId,
          status,
          extraData,
          criadoEm: new Date().toISOString(),
          tentativas: 0,
        });
        await atualizarCacheChamado(status, extraData?.agenda_pause || 0);
        return true;
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
          method: "store",
          data: { id: Number(ticketId), calendar_id: Number(ticketId), calendar_status: status, ...extraData },
        }),
      });
      const data = await response.json();
      if (data.status === "success") {
        await atualizarCacheChamado(status, extraData?.agenda_pause || 0);
      }
      return data.status === "success";
    } catch (error) {
      return false;
    }
  }

  async function salvarEventoLinhaTempo(titulo: string, descricao: string, icon: string) {
    const agora = new Date();
    const evento = {
      calendar_id: Number(ticketId),
      event_title: titulo,
      event_description: descricao,
      event_datetime: agora.toLocaleString('sv-SE', { timeZone: 'America/Sao_Paulo' }).replace(' ', 'T'),
      event_icon: icon,
    };

    const online = await isOnline();
    if (!online) {
      await adicionarNaFila({ tipo: "evento_linha_tempo", data: evento, criadoEm: new Date().toISOString(), tentativas: 0 });
      return true;
    }
    const token = await AsyncStorage.getItem("token");
    const response = await fetch(await getApiUrl(), {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ class: "CalendarEventService", method: "store", data: evento }),
    });
    const result = await response.json();
    return result.status === "success";
  }

  async function salvarEventoCheckin(tipo: 1 | 2 | 3) {
    const agora = new Date();
    const latitude = location?.coords.latitude || null;
    const longitude = location?.coords.longitude || null;

    const evento = {
      calendar_id: Number(ticketId),
      representative_id: Number(await AsyncStorage.getItem("representative_id")),
      calendar_checkin_type: tipo,
      calendar_checkin_geo: latitude && longitude ? `${latitude}, ${longitude}` : '',
      calendar_checkin_latlng: latitude && longitude ? `{lat: ${latitude},lng: ${longitude}}` : '',
      calendar_checkin_datetime: agora.toLocaleString('sv-SE', { timeZone: 'America/Sao_Paulo' }).replace(' ', 'T'),
    };

    const online = await isOnline();
    if (!online) {
      await adicionarNaFila({ tipo: "evento_checkin", data: evento, criadoEm: new Date().toISOString(), tentativas: 0 });
      return true;
    }

    const token = await AsyncStorage.getItem("token");
    const response = await fetch(await getApiUrl(), {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ class: "CalendarCheckinService", method: "store", data: evento }),
    });
    const result = await response.json();
    return result.status === "success";
  }

  async function handleStart() {
    if (!location || isStarting) return;

    // Ativa o estado de carregamento
    setIsStarting(true);

    try {
      const now = new Date();
      const checkinData = {
        calendar_id: ticketId,
        horario: now.toISOString(),
        horario_formatado: now.toLocaleTimeString('PT-br', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' }),
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        status: 'checkin_realizado',
        ativo: true,
        pausas: [],
        enviado_api: false,
      };

      await AsyncStorage.setItem(`@checkin_${ticketId}`, JSON.stringify(checkinData));

      await AsyncStorage.setItem(`@ticket_${ticketId}_status`, "em_atendimento");
      await salvarEventoLinhaTempo("Check-In", "Check-In realizado.", "fa:arrow-right bg-primary");
      await salvarEventoCheckin(1);

      await atualizarStatusChamado(1, {
        agenda_pause: 0,
        calendar_last_checkin_date: now.toLocaleString('sv-SE', { timeZone: 'America/Sao_Paulo' }).replace(' ', 'T'),
        calendar_last_checkin_geo: `${location.coords.latitude},${location.coords.longitude}`,
      });

      await AsyncStorage.removeItem(`@ticket_${ticketId}_pausado`);

      setCheckInTime(checkinData.horario_formatado);
      setStarted(true);
      setIsActive(true);

      mostrarAlerta('Sucesso!', 'O check-in foi realizado.', 'success');
    } catch (error) {
      mostrarAlerta('Erro', 'Não foi possível registrar o check-in. Tente novamente.');
    } finally {
      // Finaliza o carregamento após todo o fluxo
      setIsStarting(false);
    }
  }

  async function handleConfirmAction() {
    if (!reason.trim()) return mostrarAlerta('Atenção', 'Informe o motivo da pausa.');
    const savedCheckIn = await AsyncStorage.getItem(`@checkin_${ticketId}`);
    if (!savedCheckIn) return mostrarAlerta('Atenção', 'Nenhum check-in encontrado.');

    const nomeTecnico = (await AsyncStorage.getItem('nome')) || "tecnico";
    const data = JSON.parse(savedCheckIn);
    const agora = getBrazilDateTime();

    const pausado = {
      ...data,
      ativo: false,
      status: 'pausado',
      pausa_motivo: reason.trim(),
      pausa_data: agora.toISOString(),
      pausa_horario_formatado: agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    };

    await AsyncStorage.setItem(`@checkin_${ticketId}`, JSON.stringify(pausado));
    await salvarEventoLinhaTempo("Pausa", `Atendimento colocado em modo de espera por ${nomeTecnico}. <br/>Motivo: <br/> ${reason.trim()}`, "fa:arrow-right bg-calendar-pause");
    await salvarEventoCheckin(3);

    const online = await isOnline();
    if (!online) {
      await adicionarNaFila({
        tipo: "pausar_chamado",
        ticketId,
        data: { pausa_motivo: reason.trim(), pausa_data: agora.toISOString() },
        criadoEm: new Date().toISOString(),
        tentativas: 0,
      });
      await atualizarCacheChamado(1, 1);
    } else {
      await atualizarStatusChamado(1, {
        agenda_pause: 1,
        calendar_status: 1,
        pausa_motivo: reason.trim(),
        pausa_data: agora.toISOString(),
      });
    }

    await AsyncStorage.setItem(`@ticket_${ticketId}_pausado`, "1");
    await AsyncStorage.removeItem(`@checkin_${ticketId}`);

    setStarted(false);
    setIsActive(false);
    setCheckInTime(null);
    setReason('');
    setModalType(null);

    router.replace('/home');
    mostrarAlerta('Atendimento pausado', 'Será necessário realizar novo check-in para continuar.');
  }

  async function handleFinish() {
    if (!hasMedia) {
      setAvisoMidiaVisible(true);
      return;
    }

    router.replace({ pathname: '/finalizacao-relatorio', params: { ticketId } });
  }

  return (
    <ScreenWrapper style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={darkMode ? "light-content" : "dark-content"} />

      <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <TouchableOpacity style={[styles.closeButton, { backgroundColor: theme.background }]} onPress={() => router.back()}>
          <X color={theme.subText} size={24} />
        </TouchableOpacity>

        <Text style={[styles.headerTitle, { color: theme.text }]}>
          {started ? 'Atendimento em Curso' : 'Check-in'}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 30 }} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>

          <View style={[styles.mapContainer, { borderColor: theme.border }]}>
            {location ? (
              <MapView
                style={styles.map}
                provider={PROVIDER_GOOGLE}
                userInterfaceStyle={darkMode ? "dark" : "light"}
                region={{
                  latitude: location.coords.latitude,
                  longitude: location.coords.longitude,
                  latitudeDelta: 0.005,
                  longitudeDelta: 0.005,
                }}
                showsUserLocation
              />
            ) : (
              <View style={[styles.mapLoading, { backgroundColor: theme.card }]}>
                <ActivityIndicator size="small" color="#3b82f6" style={{ marginBottom: 8 }} />
                <Text style={[styles.mapText, { color: theme.subText }]}>Buscando GPS preciso...</Text>
              </View>
            )}
          </View>

          <View style={styles.ticketBrief}>
            <Text style={styles.ticketId}>#{ticketId}</Text>
            <Text style={[styles.ticketTitle, { color: theme.text }]}>
              {categorias[serviceTypeId] || 'Carregando categoria...'}
            </Text>
          </View>

          {!started && (
            <View style={[styles.infoCardPreCheckin, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Text style={[styles.infoCardTitle, { color: theme.text }]}>Requisitos de Atendimento</Text>

              <View style={styles.infoRow}>
                <MapPin size={18} color={location ? "#22c55e" : "#ef4444"} />
                <Text style={[styles.infoRowText, { color: theme.subText }]}>
                  {location ? "Localização GPS capturada com sucesso." : "Aguardando sinal válido de GPS do aparelho."}
                </Text>
              </View>

              <View style={styles.infoRow}>
                <ShieldCheck size={18} color="#3b82f6" />
                <Text style={[styles.infoRowText, { color: theme.subText }]}>
                  Certifique-se de estar usando os EPIs adequados no local.
                </Text>
              </View>
            </View>
          )}

          <View style={[styles.timeCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.timeLabel, { color: theme.subText }]}>HORA ATUAL</Text>
            <Text style={[styles.timeValue, { color: theme.text }]}>
              {currentTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </Text>

            {checkInTime && (
              <View style={[styles.checkInBadge, { backgroundColor: theme.background }]}>
                <Text style={styles.checkInText}>Check-in realizado às {checkInTime}</Text>
              </View>
            )}

            {started && (
              <View style={[styles.statusWorkBadge, { backgroundColor: '#fff' }]}>
                <Text style={[styles.statusWorkText, { color: isActive ? '#22c55e' : '#f59e0b' }]}>
                  {isActive ? 'Em atendimento' : 'Pausado'}
                </Text>
              </View>
            )}
          </View>

          {/* ÁREA DE BOTÕES INTERATIVOS */}
          {!started ? (
            <TouchableOpacity
              style={[
                styles.startBtn, 
                (!location || isStarting) && styles.btnDesabilitado
              ]}
              onPress={handleStart}
              disabled={!location || isStarting}
            >
              {isStarting ? (
                <>
                  <ActivityIndicator size="small" color="#fff" />
                  <Text style={styles.btnMainText}>Processando...</Text>
                </>
              ) : location ? (
                <>
                  <Play color="#fff" size={24} fill="#fff" />
                  <Text style={styles.btnMainText}>Confirmar e Iniciar Atendimento</Text>
                </>
              ) : (
                <>
                  <ActivityIndicator size="small" color="#94a3b8" />
                  <Text style={[styles.btnMainText, { color: '#94a3b8' }]}>Aguardando Localização...</Text>
                </>
              )}
            </TouchableOpacity>
          ) : (
            <>
              <View style={styles.actionGrid}>
                <TouchableOpacity
                  style={[styles.secondaryBtn, { flex: 1, backgroundColor: theme.card, borderColor: theme.border }]}
                  onPress={() => router.replace({ pathname: '/fotos-chamado', params: { id: ticketId } })}
                >
                  <CameraIcon color={theme.text} size={20} />
                  <Text style={[styles.btnText, { color: theme.text }]}>Enviar Imagens</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.secondaryBtn, { flex: 1, backgroundColor: theme.card, borderColor: '#f59e0b' }]}
                  onPress={() => setModalType('pause')}
                >
                  <Pause color="#f59e0b" size={20} fill="#f59e0b" />
                  <Text style={[styles.btnText, { color: '#f59e0b' }]}>Pausar</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={styles.finishBtn} onPress={handleFinish}>
                <CheckCircle color="#fff" size={24} />
                <Text style={styles.btnMainText}>Finalizar Chamado</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>

      {/* MODAL DE PAUSA */}
      <Modal visible={!!modalType} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>
              {isActive ? 'Motivo da Pausa' : 'Motivo do Retorno'}
            </Text>

            <TextInput
              style={[styles.reasonInput, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
              placeholder="Digite aqui..."
              placeholderTextColor={theme.subText}
              multiline
              value={reason}
              onChangeText={setReason}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => { setReason(''); setModalType(null); }}>
                <Text style={[styles.btnText, { color: theme.text }]}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirmAction}>
                <Text style={styles.btnMainText}>Confirmar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL AVISO DE MÍDIAS */}
      <Modal
        visible={avisoMidiaVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setAvisoMidiaVisible(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(15, 23, 42, 0.75)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 24,
          }}
        >
          <View
            style={{
              backgroundColor: theme.card,
              borderRadius: 24,
              padding: 24,
              width: '100%',
              maxWidth: 340,
              alignItems: 'center',
              borderWidth: 1,
              borderColor: theme.border,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.25,
              shadowRadius: 10,
              elevation: 10,
            }}
          >
            <View
              style={{
                backgroundColor: '#fef2f2',
                padding: 16,
                borderRadius: 99,
                marginBottom: 16,
              }}
            >
              <View
                style={{
                  backgroundColor: '#fee2e2',
                  padding: 12,
                  borderRadius: 99,
                }}
              >
                <Text style={{ fontSize: 28 }}>📸</Text>
              </View>
            </View>

            <Text
              style={{
                fontSize: 20,
                fontWeight: 'bold',
                color: theme.text,
                marginBottom: 12,
                textAlign: 'center',
              }}
            >
              Aviso de Mídias
            </Text>

            <Text
              style={{
                fontSize: 15,
                color: theme.subText || '#94a3b8',
                textAlign: 'center',
                lineHeight: 22,
                marginBottom: 24,
              }}
            >
              Olá,{' '}
              <Text style={{ fontWeight: 'bold', color: theme.text }}>
                {nomeTecnico || 'Técnico'}
              </Text>
              ! Notamos que você não anexou nenhuma{' '}
              <Text style={{ fontWeight: '600', color: '#ef4444' }}>FOTO</Text> ou{' '}
              <Text style={{ fontWeight: '600', color: '#ef4444' }}>VÍDEO</Text> para
              este chamado. Deseja encerrar mesmo assim?
            </Text>

            <TouchableOpacity
              style={{
                width: '100%',
                padding: 14,
                borderRadius: 12,
                borderColor: theme.border,
                borderWidth: 1,
                alignItems: 'center',
                marginBottom: 10,
              }}
              onPress={() => {
                setAvisoMidiaVisible(false);
                router.replace(`/fotos-chamado?id=${ticketId}`);
              }}
            >
              <Text
                style={{
                  color: '#ef4444',
                  fontSize: 16,
                  fontWeight: 'bold',
                }}
              >
                Voltar e Anexar
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                width: '100%',
                padding: 14,
                borderRadius: 12,
                alignItems: 'center',
                backgroundColor: '#3b82f6',
                borderWidth: 1,
                borderColor: theme.border,
              }}
              onPress={async () => {
                setAvisoMidiaVisible(false);
                router.replace({
                  pathname: '/finalizacao-relatorio',
                  params: { ticketId },
                });
              }}
            >
              <Text
                style={{
                  color: '#fff',
                  fontSize: 15,
                  fontWeight: '600',
                }}
              >
                Sim, Finalizar Sem Imagens
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL DE ALERTA PERSONALIZADO */}
      <Modal transparent visible={alertVisible} animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <View style={{ width: '90%', maxWidth: 400, backgroundColor: theme.card, borderRadius: 24, padding: 24, alignItems: 'center' }}>
            <Text style={{ fontSize: 22, fontWeight: '700', color: alertData.tipo === 'success' ? '#22c55e' : alertData.tipo === 'warning' ? '#f59e0b' : '#3b82f6', marginBottom: 12 }}>
              {alertData.titulo}
            </Text>
            <Text style={{ color: theme.text, textAlign: 'center', fontSize: 15, lineHeight: 22, marginBottom: 24 }}>
              {alertData.mensagem}
            </Text>
            <TouchableOpacity style={{ backgroundColor: '#3b82f6', paddingVertical: 14, borderRadius: 14, width: '100%', alignItems: 'center' }} onPress={() => setAlertVisible(false)}>
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScreenWrapper>
  );
}