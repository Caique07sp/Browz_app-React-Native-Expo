import React, { useEffect, useState } from 'react';
import {
  Platform,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Modal,
  TextInput,
  ScrollView,
} from 'react-native';
import { Camera as CameraIcon, CheckCircle, MapPin, Pause, Play, X } from 'lucide-react-native';
import { Link, useRouter } from 'expo-router';
import * as Location from 'expo-location';
import MapView, { PROVIDER_GOOGLE } from 'react-native-maps';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function CheckInScreen() {
  const router = useRouter();
  const [currentTime, setCurrentTime] = useState(new Date()); //relógio em tempo real
  const [started, setStarted] = useState(false);// se já iniciou o atendimento
  const [isActive, setIsActive] = useState(true); //se está ativo ou pausado
  const [location, setLocation] = useState<Location.LocationObject | null>(null); // localização do usuário
  const [checkInTime, setCheckInTime] = useState<string | null>(null);//hora que iniciou


  const [modalType, setModalType] = useState<'pause' | 'finish' | null>(null);
  const [reason, setReason] = useState('');

  // 1. Relógio em Tempo Real
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000); //Atualiza o horário a cada segundo
    return () => clearInterval(timer);
  }, []);

  // 2. Carregar dados
  useEffect(() => {
    const loadData = async () => {
      const savedCheckIn = await AsyncStorage.getItem('@checkin_time'); //Carregar check-in salvo
      if (savedCheckIn) {
        setCheckInTime(savedCheckIn);
        setStarted(true);
      }
    };
    loadData();
  }, []);

  // 3. Localização
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const loc = await Location.getCurrentPositionAsync({}); //Pede permissão e pega sua localização
      setLocation(loc);
    })();
  }, []);

  //Essa função aqui em baixo Pega a hora atual
  //Salva no celular (AsyncStorage)
  //Marca como iniciado
  const handleStart = async () => {
    const now = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    await AsyncStorage.setItem('@checkin_time', now);
    setCheckInTime(now);
    setStarted(true);
  };

  //Essa aqui as ações do Botao pause e finalizar
  const handleConfirmAction = async () => {
    if (!reason.trim()) return alert("Por favor, informe o motivo.");

    if (modalType === 'pause') {
      setIsActive(!isActive);
    }

    setReason('');
    setModalType(null);
  };
  const handleFinish = async () => {
    await AsyncStorage.setItem('@ticket_10293_status', 'finalizando');

    router.push({
      pathname: '/finalizacao-relatorio',
      params: { ticketId: '10293' },
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* HEADER */}
      <View style={styles.header}>
        <Link href="/home-pronta" asChild>
          <TouchableOpacity style={styles.closeButton}>
            <X color="#94a3b8" size={24} />
          </TouchableOpacity>
        </Link>
        <Text style={styles.headerTitle}>{started ? 'Atendimento em Curso' : 'Check-in'}</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.content}>
        {/* MAPA */}
        <View style={styles.mapContainer}>
          {location ? (

            //Aqui é o mapa
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

        {/* INFO */}
        <View style={styles.ticketBrief}>
          <Text style={styles.ticketId}>#10293</Text>
          <Text style={styles.ticketTitle}>O VIADO APERTOU O PLAY</Text>
        </View>

        {/* RELÓGIO / TEMPO ATUAL */}
        <View style={styles.timeCard}>
          <Text style={styles.timeLabel}>HORA ATUAL</Text>
          <Text style={styles.timeValue}>
            {currentTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </Text>
          {checkInTime && (
            <View style={styles.checkInBadge}>
              <Text style={styles.checkInText}>Check-in realizado às {checkInTime}</Text>
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
              <TouchableOpacity style={styles.secondaryBtn}>
                <CameraIcon color="#fff" size={20} />
                <Text style={styles.btnText}>Tirar Foto</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.secondaryBtn, { borderColor: isActive ? '#f59e0b' : '#10b981' }]}
                onPress={() => setModalType('pause')}
              >
                {isActive ? <Pause color="#f59e0b" size={20} fill="#f59e0b" /> : <Play color="#10b981" size={20} fill="#10b981" />}
                <Text style={[styles.btnText, { color: isActive ? '#f59e0b' : '#10b981' }]}>
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

      {/* MODAL DE JUSTIFICATIVA */}
      <Modal visible={!!modalType} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {modalType === 'pause' ? 'Motivo da Pausa' : 'Resumo da Finalização'}
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
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalType(null)}>
                <Text style={styles.btnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirmAction}>
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
    padding: 20,
  },
  headerTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  closeButton: { backgroundColor: '#1e293b', padding: 8, borderRadius: 12 },
  content: { flex: 1, padding: 20 },
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
  ticketBrief: { marginBottom: 20, alignItems: 'center' },
  ticketId: { color: '#3b82f6', fontWeight: 'bold' },
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
  timeLabel: { color: '#64748b', fontSize: 12, letterSpacing: 1 },
  timeValue: { color: '#fff', fontSize: 40, fontWeight: 'bold' },
  checkInBadge: {
    marginTop: 10,
    backgroundColor: '#0f172a',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
  },
  checkInText: { color: '#10b981', fontSize: 12, fontWeight: '600' },
  actionGrid: { flexDirection: 'row', gap: 12, marginBottom: 15 },
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
  btnText: { color: '#fff', fontWeight: '600' },
  btnMainText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
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
  modalButtons: { flexDirection: 'row', gap: 10 },
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