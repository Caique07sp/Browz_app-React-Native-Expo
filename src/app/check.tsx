import { useTheme } from "@/theme/ThemeContext";
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

  const [modalType, setModalType] = useState<'pause' | null>(null);
  const [reason, setReason] = useState('');



  const [categorias, setCategorias] = useState<any>({});

  const { service_type_id } = useLocalSearchParams();
  const serviceTypeId = String(service_type_id);
  const { theme, darkMode } = useTheme();

  

  async function atualizarCacheChamado(
    status: number,
    agendaPause = 0
  ) {

    const cache =
      await AsyncStorage.getItem("@cache_chamados");

    if (!cache) return;

    const chamados = JSON.parse(cache);

    const atualizados = chamados.map((item: any) => {

      if (
        String(item.calendar_id) ===
        String(ticketId)
      ) {

        return {
          ...item,
          calendar_status: status,
          agenda_pause: agendaPause,
        };
      }

      return item;
    });

    await AsyncStorage.setItem(
      "@cache_chamados",
      JSON.stringify(atualizados)
    );
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

    if (ticketStatus === 'concluido' || ticketStatus === 'finalizado') {
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
    }
  }


  async function buscarCategorias() {
    try {
      const cache =
        await AsyncStorage.getItem("@cache_categorias");

      // CARREGA CACHE PRIMEIRO
      if (cache) {
        setCategorias(JSON.parse(cache));
      }

      const online = await isOnline();

      if (!online) {
        console.log("📴 Offline categorias");
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

    let loc;

    try {
      loc = await Location.getCurrentPositionAsync({});
      setLocation(loc);

      await AsyncStorage.setItem(
        "@ultima_localizacao",
        JSON.stringify(loc)
      );
    } catch {
      const ultima =
        await AsyncStorage.getItem("@ultima_localizacao");

      if (ultima) {
        setLocation(JSON.parse(ultima));
      }
    }

  }



  async function atualizarStatusChamado(
    status: number,
    extraData: any = {}
  ) {
    try {
      const online = await isOnline();

      if (!online) {

        console.log("📴 Offline - salvando sync pendente");

        const pendentes =
          await AsyncStorage.getItem("@sync_pendente");

        let lista = pendentes
          ? JSON.parse(pendentes)
          : [];

        lista.push({
          tipo: "status_chamado",
          ticketId,
          status,
          extraData,
          data: new Date().toISOString(),
        });

        await AsyncStorage.setItem(
          "@sync_pendente",
          JSON.stringify(lista)
        );

        // ATUALIZA CACHE LOCAL
        await atualizarCacheChamado(
          status,
          extraData?.agenda_pause || 0
        );

        return true;
      }

      // ONLINE
      const token = await AsyncStorage.getItem("token");

      const payload = {
        class: "CalendarService",
        method: "store",
        data: {
          id: Number(ticketId),
          calendar_id: Number(ticketId),
          calendar_status: status,
          ...extraData,
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

      if (data.status === "success") {

        await atualizarCacheChamado(
          status,
          extraData?.agenda_pause || 0
        );
      }
      return data.status === "success";
    } catch (error) {
      console.log(error);
      return false;
    }
  }
  async function salvarEventoLinhaTempo(
    titulo: string,
    descricao: string,
    icon: string
  ) {
    const agora = new Date();

    const evento = {
      calendar_id: Number(ticketId),
      event_title: titulo,
      event_description: descricao,
      event_datetime: agora
        .toLocaleString('sv-SE', {
          timeZone: 'America/Sao_Paulo',
        })
        .replace(' ', 'T'),
      event_icon: icon,
    };

    const online = await isOnline();

    if (!online) {
      const pendentes = await AsyncStorage.getItem("@sync_pendente");
      const lista = pendentes ? JSON.parse(pendentes) : [];

      lista.push({
        tipo: "evento_linha_tempo",
        data: evento,
        criado_em: new Date().toISOString(),
      });

      await AsyncStorage.setItem("@sync_pendente", JSON.stringify(lista));

      return true;
    }

    const token = await AsyncStorage.getItem("token");

    const response = await fetch("https://browz.com.br/rest.php", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
    },
  body: JSON.stringify({
    class: "CalendarEventService",
    method: "store",
    data: evento,
  }),
  });

const result = await response.json();

console.log("EVENTO LINHA DO TEMPO:", result);

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
    calendar_checkin_geo:
      latitude && longitude ? `${latitude}, ${longitude}` : '',
    calendar_checkin_latlng:
      latitude && longitude ? `{lat: ${latitude},lng: ${longitude}}` : '',
    calendar_checkin_datetime:
      agora.toLocaleString('sv-SE', {
        timeZone: 'America/Sao_Paulo',
      }).replace(' ', 'T'),
  };

  const online = await isOnline();

  if (!online) {
    const pendentes = await AsyncStorage.getItem("@sync_pendente");

    const lista = pendentes ? JSON.parse(pendentes) : [];

    lista.push({
      tipo: "evento_checkin",
      data: evento,
      criado_em: new Date().toISOString(),
    });

    await AsyncStorage.setItem(
      "@sync_pendente",
      JSON.stringify(lista)
    );

    return true;
  }

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
      data: evento,
    }),
  });

  const result = await response.json();

  console.log("EVENTO CHECKIN:", result);

  return result.status === "success";
}

async function handleStart() {
  const now = new Date();

  const checkinData = {
    calendar_id: ticketId,
    horario: now.toISOString(),
    horario_formatado: now.toLocaleTimeString('PT-br', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Sao_Paulo',
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

  await salvarEventoLinhaTempo(
  "Check-In",
  "Check-In realizado.",
  "fa:arrow-right bg-primary"
);

  await salvarEventoCheckin(1); //Check-in

  await atualizarStatusChamado(1, {
    agenda_pause: 0,

    calendar_last_checkin_date:
      now.toLocaleString('sv-SE', {
        timeZone: 'America/Sao_Paulo',
      }).replace(' ', 'T'),

    calendar_last_checkin_geo: `${location?.coords.latitude},${location?.coords.longitude}`,
  });



  setCheckInTime(checkinData.horario_formatado);
  setStarted(true);
  setIsActive(true);

  Alert.alert('Check-in realizado', 'O check-in foi salvo no celular.');
}

async function handleConfirmAction() {
  if (!reason.trim()) {
    return Alert.alert(
      'Atenção',
      'Informe o motivo da pausa.'
    );
  }

  const savedCheckIn = await AsyncStorage.getItem(`@checkin_${ticketId}`);

  if (!savedCheckIn) {
    return Alert.alert(
      'Atenção',
      'Nenhum check-in encontrado.'
    );
  }

  const nomeTecnico =
    (await AsyncStorage.getItem('nome')) || "tecnico";

  const data = JSON.parse(savedCheckIn);

  const agora = getBrazilDateTime();

  const pausado = {
    ...data,

    ativo: false,

    status: 'pausado',

    pausa_motivo: reason.trim(),

    pausa_data: agora.toISOString(),
    pausa_horario_formatado: agora.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    }),
  };

  await AsyncStorage.setItem(
    `@checkin_${ticketId}`,
    JSON.stringify(pausado)
  );

  await salvarEventoLinhaTempo(
  "Pausa",
  `Atendimento colocado em modo de espera por ${nomeTecnico}. 
  <br/>Motivo: <br/>
   ${reason.trim()}`,
  "fa:arrow-right bg-calendar-pause"
);

  await salvarEventoCheckin(3); //Pausa

  await atualizarStatusChamado(1, {
    agenda_pause: 1,
  });
  await AsyncStorage.removeItem(`@checkin_${ticketId}`);

  // AQUI ENCERRA O CHECK-IN ATUAL
  setStarted(false);

  setIsActive(false);

  setCheckInTime(null);

  setReason('');
  setModalType(null);

  Alert.alert(
    'Atendimento pausado',
    'Será necessário realizar novo check-in para continuar.'
  );
}

async function handleFinish() {
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

    <View
      style={[
        styles.header,
        {
          backgroundColor: theme.card,
          borderBottomColor: theme.border,
        },
      ]}
    >
      <Link href="/home" asChild>
        <TouchableOpacity
          style={[
            styles.closeButton,
            {
              backgroundColor: theme.background,
            },
          ]}
        >
          <X
            color={theme.subText}
            size={24}
          />
        </TouchableOpacity>
      </Link>

      <Text
        style={[
          styles.headerTitle,
          {
            color: theme.text,
          },
        ]}
      >
        {started ? 'Atendimento em Curso' : 'Check-in'}
      </Text>

      <View style={{ width: 24 }} />
    </View>

    <View style={styles.content}>
      <View
        style={[
          styles.mapContainer,
          {
            borderColor: theme.border,
          },
        ]}
      >
        {location ? (
          <MapView
            style={styles.map}
            provider={PROVIDER_GOOGLE}
            userInterfaceStyle={
              darkMode ? "dark" : "light"
            }
            region={{
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
              latitudeDelta: 0.005,
              longitudeDelta: 0.005,
            }}
            showsUserLocation
          />
        ) : (
          <View
            style={[
              styles.mapLoading,
              {
                backgroundColor: theme.card,
              },
            ]}
          >
            <Text
              style={[
                styles.mapText,
                {
                  color: theme.subText,
                },
              ]}
            >Localizando...</Text>
          </View>
        )}
      </View>

      <View style={styles.ticketBrief}>
        <Text style={styles.ticketId}>#{ticketId}</Text>
        <Text
          style={[
            styles.ticketTitle,
            {
              color: theme.text,
            },
          ]}
        >
          {categorias[serviceTypeId] || 'Carregando categoria...'}
        </Text>
      </View>

      <View
        style={[
          styles.timeCard,
          {
            backgroundColor: theme.card,
            borderColor: theme.border,
          },
        ]}
      >
        <Text
          style={[
            styles.timeLabel,
            {
              color: theme.subText,
            },
          ]}
        >HORA ATUAL</Text>

        <Text
          style={[
            styles.timeValue,
            {
              color: theme.text,
            },
          ]}
        >
          {currentTime.toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          })}
        </Text>

        {checkInTime && (
          <View style={[
            styles.checkInBadge,
            {
              backgroundColor: theme.background,
            },

          ]}>
            <Text style={styles.checkInText}>
              Check-in realizado às {checkInTime}
            </Text>
          </View>
        )}

        {started && (
          <View
            style={[
              styles.statusWorkBadge,
              {
                backgroundColor: '#fff',
              },

            ]}
          >
            <Text
              style={[
                styles.statusWorkText,
                {
                  color: isActive ? '#22c55e' : '#f59e0b',

                },
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
            <TouchableOpacity
              style={[
                styles.secondaryBtn,
                {
                  flex: 1,
                  backgroundColor: theme.card,
                  borderColor: theme.border,
                },
              ]}
              onPress={() =>
                router.push({
                  pathname: '/fotos-chamado',
                  params: { id: ticketId },
                })
              }
            >
              <CameraIcon
                color={theme.text}
                size={20}
              />

              <Text
                style={[
                  styles.btnText,
                  {
                    color: theme.text,
                  },
                ]}
              >
                Tirar Foto
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.secondaryBtn,
                {
                  flex: 1,
                  backgroundColor: theme.card,
                  borderColor: '#f59e0b',
                },
              ]}
              onPress={() => setModalType('pause')}
            >
              <Pause
                color="#f59e0b"
                size={20}
                fill="#f59e0b"
              />

              <Text
                style={[
                  styles.btnText,
                  { color: '#f59e0b' },
                ]}
              >
                Pausar
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
        <View
          style={[
            styles.modalContent,
            {
              backgroundColor: theme.card,
              borderColor: theme.border,
            },
          ]}
        >
          <Text
            style={[
              styles.modalTitle,
              {
                color: theme.text,
              },
            ]}
          >
            {isActive ? 'Motivo da Pausa' : 'Motivo do Retorno'}
          </Text>

          <TextInput
            style={[
              styles.reasonInput,
              {
                backgroundColor: theme.background,
                color: theme.text,
                borderColor: theme.border,
              },
            ]}
            placeholder="Digite aqui..."
            placeholderTextColor={theme.subText}
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
              <Text
                style={[
                  styles.btnText,
                  {
                    color: theme.text,
                  },
                ]}
              >
                Cancelar
              </Text>
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
  container: { flex: 1, backgroundColor: '#0f172a', paddingTop: Platform.OS === 'android' ? 25 : 0, },

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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 60,
    borderRadius: 16,
    borderWidth: 1,
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