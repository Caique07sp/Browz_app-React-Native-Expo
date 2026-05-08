import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import {
  Camera as CameraIcon,
  CheckCircle,
  Pause,
  Play,
  X,
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Modal,
  Platform,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import MapView, { PROVIDER_GOOGLE } from 'react-native-maps';

export default function CheckInScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();

  const ticketId = String(id);

  const [currentTime, setCurrentTime] = useState(new Date());
  const [started, setStarted] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [checkInTime, setCheckInTime] = useState<string | null>(null);

  const [modalType, setModalType] = useState<'pause' | null>(null);
  const [reason, setReason] = useState('');



  const [categorias, setCategorias] = useState<any>({});

  const { service_type_id } = useLocalSearchParams();
  const serviceTypeId = String(service_type_id);

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

    if (savedCheckIn) {
      const data = JSON.parse(savedCheckIn);

      setCheckInTime(data.horario_formatado);
      setStarted(true);
      setIsActive(data.ativo ?? true);
    }
  }
  async function buscarCategorias() {
    try {
      const token = await AsyncStorage.getItem("token");

      const response = await fetch("https://browz.com.br/rest.php", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          class: "ServiceTypeService",
          method: "loadAll",
        }),
      });

      const data = await response.json();

      if (data.status === "success") {
        const mapa: any = {};

        data.data.forEach((categoria: any) => {
          mapa[categoria.service_type_id] =
            categoria.service_type_name;
        });

        setCategorias(mapa);
      }
    } catch (error) {
      console.log(error);
    }
  }

  async function buscarLocalizacao() {
    const { status } = await Location.requestForegroundPermissionsAsync();

    if (status !== 'granted') {
      Alert.alert(
        'Permissão necessária',
        'Permita o acesso à localização para realizar o check-in.'
      );
      return;
    }

    const loc = await Location.getCurrentPositionAsync({});
    setLocation(loc);
  }
  async function atualizarStatusChamado(status: number, extraData: any = {}) {
    try {
      const token = await AsyncStorage.getItem('token');

      const payload = {
        class: 'CalendarService',
        method: 'store',

        data: {
          id: Number(ticketId),
          calendar_id: Number(ticketId),
          calendar_status: status,
          ...extraData,
        },
      };

      console.log('ENVIANDO STATUS:', payload);

      const response = await fetch('https://browz.com.br/rest.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      console.log('RETORNO STATUS:', data);

      return data.status === 'success';
    } catch (error) {
      console.log('ERRO AO ATUALIZAR STATUS:', error);
      return false;
    }
  }

  async function handleStart() {
    const now = new Date();

    const checkinData = {
      calendar_id: ticketId,
      horario: now.toISOString(),
      horario_formatado: now.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
      }),
      latitude: location?.coords.latitude || null,
      longitude: location?.coords.longitude || null,
      status: 'checkin_realizado',
      ativo: true,
      pausas: [],
      enviado_api: false,
    };

    await AsyncStorage.setItem(
      `@checkin_${ticketId}`,
      JSON.stringify(checkinData)
    );




    await atualizarStatusChamado(1, {
      agenda_pause: 0,

      calendar_last_checkin_date: now.toISOString(),

      calendar_last_checkin_geo: JSON.stringify({
        latitude: location?.coords.latitude || null,
        longitude: location?.coords.longitude || null,
      }),
    });

    setCheckInTime(checkinData.horario_formatado);
    setStarted(true);
    setIsActive(true);

    Alert.alert('Check-in realizado', 'O check-in foi salvo no celular.');
  }

  async function handleConfirmAction() {
    if (!reason.trim()) {
      return Alert.alert('Atenção', 'Por favor, informe o motivo.');
    }

    const savedCheckIn = await AsyncStorage.getItem(`@checkin_${ticketId}`);

    if (!savedCheckIn) {
      return Alert.alert('Atenção', 'Nenhum check-in encontrado.');
    }

    const data = JSON.parse(savedCheckIn);

    const novaPausa = {
      tipo: isActive ? 'pausa' : 'retorno',
      motivo: reason.trim(),
      horario: new Date().toISOString(),
      horario_formatado: new Date().toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
      }),
    };

    const atualizado = {
      ...data,
      ativo: !isActive,
      status: isActive ? 'pausado' : 'em_atendimento',
      pausas: [...(data.pausas || []), novaPausa],
      enviado_api: false,
    };

    await AsyncStorage.setItem(
      `@checkin_${ticketId}`,
      JSON.stringify(atualizado)
    );

    await atualizarStatusChamado(1, {
      agenda_pause: isActive ? 1 : 0,
    });

    setIsActive(!isActive);
    setReason('');
    setModalType(null);

    Alert.alert(
      isActive ? 'Atendimento pausado' : 'Atendimento retomado',
      'Informação salva no celular.'
    );
  }

  async function handleFinish() {
    await AsyncStorage.setItem(`@ticket_${ticketId}_status`, 'finalizando');

    router.push({
      pathname: '/finalizacao-relatorio',
      params: { ticketId },
    });
  }

  function getCategoriaText(serviceTypeId: any) {
    return (
      categorias[serviceTypeId] ||
      'Categoria não encontrada'
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      <View style={styles.header}>
        <Link href="/home-pronta" asChild>
          <TouchableOpacity style={styles.closeButton}>
            <X color="#94a3b8" size={24} />
          </TouchableOpacity>
        </Link>

        <Text style={styles.headerTitle}>
          {started ? 'Atendimento em Curso' : 'Check-in'}
        </Text>

        <View style={{ width: 24 }} />
      </View>

      <View style={styles.content}>
        <View style={styles.mapContainer}>
          {location ? (
            <MapView
              style={styles.map}
              provider={PROVIDER_GOOGLE}
              userInterfaceStyle="dark"
              region={{
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
                latitudeDelta: 0.005,
                longitudeDelta: 0.005,
              }}
              showsUserLocation
            />
          ) : (
            <View style={styles.mapLoading}>
              <Text style={styles.mapText}>Localizando...</Text>
            </View>
          )}
        </View>

        <View style={styles.ticketBrief}>
          <Text style={styles.ticketId}>#{ticketId}</Text>
          <Text style={styles.ticketTitle}>
            {categorias[serviceTypeId] || 'Carregando categoria...'}
          </Text>
        </View>

        <View style={styles.timeCard}>
          <Text style={styles.timeLabel}>HORA ATUAL</Text>

          <Text style={styles.timeValue}>
            {currentTime.toLocaleTimeString('pt-BR', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            })}
          </Text>

          {checkInTime && (
            <View style={styles.checkInBadge}>
              <Text style={styles.checkInText}>
                Check-in realizado às {checkInTime}
              </Text>
            </View>
          )}

          {started && (
            <View
              style={[
                styles.statusWorkBadge,
                { backgroundColor: isActive ? '#052e16' : '#451a03' },
              ]}
            >
              <Text
                style={[
                  styles.statusWorkText,
                  { color: isActive ? '#22c55e' : '#f59e0b' },
                ]}
              >
                {isActive ? 'Em atendimento' : 'Pausado'}
              </Text>
            </View>
          )}
        </View>

        {!started ? (
          <TouchableOpacity style={styles.startBtn} onPress={handleStart}>
            <Play color="#fff" size={24} fill="#fff" />
            <Text style={styles.btnMainText}>Realizar Check-in</Text>
          </TouchableOpacity>
        ) : (
          <>
            <View style={styles.actionGrid}>
              {/* Substitua o botão antigo por este bloco */}
              <Link
                href={{
                  pathname: '/fotos-chamado',
                  params: { id: ticketId },
                }}
                asChild
              >
                <TouchableOpacity style={styles.secondaryBtn}>
                  <CameraIcon color="#fff" size={20} />
                  <Text style={styles.btnText}>Tirar Foto</Text>
                </TouchableOpacity>
              </Link>

              <TouchableOpacity
                style={[
                  styles.secondaryBtn,
                  { borderColor: isActive ? '#f59e0b' : '#10b981' },
                ]}
                onPress={() => setModalType('pause')}
              >
                {isActive ? (
                  <Pause color="#f59e0b" size={20} fill="#f59e0b" />
                ) : (
                  <Play color="#10b981" size={20} fill="#10b981" />
                )}

                <Text
                  style={[
                    styles.btnText,
                    { color: isActive ? '#f59e0b' : '#10b981' },
                  ]}
                >
                  {isActive ? 'Pausar' : 'Retomar'}
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.finishBtn} onPress={handleFinish}>
              <CheckCircle color="#fff" size={24} />
              <Text style={styles.btnMainText}>Finalizar Chamado</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      <Modal visible={!!modalType} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {isActive ? 'Motivo da Pausa' : 'Motivo do Retorno'}
            </Text>

            <TextInput
              style={styles.reasonInput}
              placeholder="Digite aqui..."
              placeholderTextColor="#64748b"
              multiline
              value={reason}
              onChangeText={setReason}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => {
                  setReason('');
                  setModalType(null);
                }}
              >
                <Text style={styles.btnText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.confirmBtn}
                onPress={handleConfirmAction}
              >
                <Text style={styles.btnMainText}>Confirmar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 15,
    paddingTop: Platform.OS === 'android' ? 45 : 10,
    backgroundColor: '#1e293b',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },

  headerTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },

  closeButton: {
    backgroundColor: '#0f172a',
    padding: 8,
    borderRadius: 12,
  },

  content: {
    flex: 1,
    padding: 20,
  },

  mapContainer: {
    width: '100%',
    height: 180,
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },

  map: { flex: 1 },

  mapLoading: {
    flex: 1,
    backgroundColor: '#1e293b',
    justifyContent: 'center',
    alignItems: 'center',
  },

  mapText: { color: '#94a3b8' },

  ticketBrief: {
    marginBottom: 20,
    alignItems: 'center',
  },

  ticketId: {
    color: '#3b82f6',
    fontWeight: 'bold',
  },

  ticketTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },

  timeCard: {
    backgroundColor: '#1e293b',
    padding: 25,
    borderRadius: 24,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },

  timeLabel: {
    color: '#64748b',
    fontSize: 12,
    letterSpacing: 1,
  },

  timeValue: {
    color: '#fff',
    fontSize: 40,
    fontWeight: 'bold',
  },

  checkInBadge: {
    marginTop: 10,
    backgroundColor: '#0f172a',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
  },

  checkInText: {
    color: '#10b981',
    fontSize: 12,
    fontWeight: '600',
  },

  statusWorkBadge: {
    marginTop: 10,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
  },

  statusWorkText: {
    fontSize: 12,
    fontWeight: 'bold',
  },

  actionGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 15,
  },

  secondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 60,
    borderRadius: 16,
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
  },

  btnText: {
    color: '#fff',
    fontWeight: '600',
  },

  btnMainText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },

  startBtn: {
    backgroundColor: '#3b82f6',
    height: 65,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },

  finishBtn: {
    backgroundColor: '#10b981',
    height: 65,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    padding: 20,
  },

  modalContent: {
    backgroundColor: '#1e293b',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },

  modalTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },

  reasonInput: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    color: '#fff',
    padding: 15,
    height: 100,
    textAlignVertical: 'top',
    marginBottom: 20,
  },

  modalButtons: {
    flexDirection: 'row',
    gap: 10,
  },

  cancelBtn: {
    flex: 1,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },

  confirmBtn: {
    flex: 2,
    backgroundColor: '#3b82f6',
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
});