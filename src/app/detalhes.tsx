import { ScreenWrapper } from "@/components/ScreenWrapper";
import { isOnline } from '@/services/network';
import { useTheme } from "@/theme/ThemeContext";
import { FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Clipboard from 'expo-clipboard';
import * as ImagePicker from 'expo-image-picker';
import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import {
  CheckCircle,
  ChevronLeft,
  Clock,
  Copy,
  Inbox,
  MapPin,
  Phone,
  User,
  Wrench
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { styles } from "../styles/details.styles";
import { getApiUrl } from "@/services/api";

type DetailRowProps = {
  icon: React.ReactNode;
  label: string;
  value: string;
};

function DetailRow({ icon, label, value }: DetailRowProps) {
  const { theme, darkMode } = useTheme();
  return (
    <View style={styles.detailRow}>
      <View style={styles.detailLabelGroup}>
        {icon}
        <Text
          style={[
            styles.detailLabel,
            {
              color: theme.subText,
            },
          ]}
        >{label}:</Text>
      </View>
      <Text
        style={[
          styles.detailValue,
          {
            color: theme.text,
          },
        ]}
      >{value}</Text>
    </View>
  );
}



export default function DetalhesChamado() {
  const { id } = useLocalSearchParams();

  const [calendar, setCalendar] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [tecnicos, setTecnicos] = useState<any>({});
  const [categorias, setCategorias] = useState<any>({});
  const [clientes, setClientes] = useState<any>({});
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [notas, setNotas] = useState<string[]>([]);
  const router = useRouter();
  const { theme, darkMode } = useTheme();

  async function atualizarCacheChamado(chamadoAtualizado: any) {

    const cache =
      await AsyncStorage.getItem("@cache_chamados");

    if (!cache) return;

    const chamados = JSON.parse(cache);

    const atualizados = chamados.map((item: any) => {

      if (
        String(item.calendar_id) ===
        String(chamadoAtualizado.calendar_id)
      ) {
        return chamadoAtualizado;
      }

      return item;
    });

    await AsyncStorage.setItem(
      "@cache_chamados",
      JSON.stringify(atualizados)
    );
  }


  useEffect(() => {
    carregarCachesOffline();

    buscarDetalhesChamado();
    buscarTecnicos();
    buscarCategorias();
    buscarClientes();
  }, [id]);

  useEffect(() => {
    if (calendar?.calendar_id) {
      carregarFotoLocal();
    }
  }, [calendar]);

  async function carregarCachesOffline() {
    const tecnicosCache =
      await AsyncStorage.getItem("@cache_tecnicos");

    const categoriasCache =
      await AsyncStorage.getItem("@cache_categorias");

    const clientesCache =
      await AsyncStorage.getItem("@cache_clientes");

    if (tecnicosCache) {
      setTecnicos(JSON.parse(tecnicosCache));
    }

    if (categoriasCache) {
      setCategorias(JSON.parse(categoriasCache));
    }

    if (clientesCache) {
      setClientes(JSON.parse(clientesCache));
    }
  }

  async function buscarDetalhesChamado() {
    try {
      setLoading(true);

      const online = await isOnline();

      // OFFLINE
      if (!online) {
        //console.log("📴 Offline - carregando cache");

        const cache = await AsyncStorage.getItem("@cache_chamados");

        if (cache) {
          const chamados = JSON.parse(cache);

          const encontrado = chamados.find(
            (item: any) =>
              String(item.calendar_id) === String(id)
          );

          if (encontrado) {
            await atualizarCacheChamado(encontrado);
            setCalendar(encontrado);
          } else {
            setCalendar(null);
          }
        }

        return;
      }

      // ONLINE
      const token = await AsyncStorage.getItem('token');

      const response = await fetch(
        await getApiUrl(),
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            class: 'CalendarService',
            method: 'loadAll',
          }),
        }
      );

      const result = await response.json();

      if (
        result.status === 'success' &&
        Array.isArray(result.data)
      ) {
        const encontrado = result.data.find(
          (item: any) =>
            String(item.calendar_id) === String(id)
        );

        if (encontrado) {
          setCalendar(encontrado);
        } else {
          setCalendar(null);
        }
      }
    } catch (error) {
      //console.log("ERRO DETALHES:", error);

      // FALLBACK CACHE
      const cache = await AsyncStorage.getItem("@cache_chamados");

      if (cache) {
        const chamados = JSON.parse(cache);

        const encontrado = chamados.find(
          (item: any) =>
            String(item.calendar_id) === String(id)
        );

        if (encontrado) {
          setCalendar(encontrado);
        }
      }
    } finally {
      setLoading(false);
    }
  }


  async function buscarTecnicos() {
    try {
      const token = await AsyncStorage.getItem("token");

      const response = await fetch(await getApiUrl(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          class: "RepresentativeService",
          method: "loadAll",
        }),
      });

      const data = await response.json();

      ////console.log(" TECNICOS:", data);

      if (data.status === "success") {
        const mapa: any = {};

        //console.log("TEC INDIVIDUAL:", data.data[0]);

        data.data.forEach((usuario: any) => {
          mapa[usuario.id] = usuario.name;
        });

        setTecnicos(mapa);

        await AsyncStorage.setItem(
          "@cache_tecnicos",
          JSON.stringify(mapa)
        )
      }
    } catch (error) {
      //console.log("ERRO TECNICOS:", error);
    }
  }

  async function buscarCategorias() {
    try {
      const token = await AsyncStorage.getItem("token");

      const response = await fetch(await getApiUrl(), {
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

      ////console.log("CATEGORIAS:", data);

      if (data.status === "success") {
        const mapa: any = {};

        data.data.forEach((categoria: any) => {
          mapa[categoria.service_type_id] =
            categoria.service_type_name;
        });

        ////console.log(" MAPA CATEGORIAS:", mapa);

        setCategorias(mapa);

        await AsyncStorage.setItem(
          "@cache_categorias",
          JSON.stringify(mapa)
        )
      }
    } catch (error) {
      // //console.log(" ERRO CATEGORIAS:", error);
    }
  }

  async function buscarClientes() {
    try {
      const token = await AsyncStorage.getItem("token");

      const response = await fetch(await getApiUrl(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          class: "CustomerService",
          method: "loadAll",
        }),
      });

      const data = await response.json();

      ////console.log("🏢 CLIENTES:", data);

      if (data.status === "success") {
        const mapa: any = {};

        data.data.forEach((cliente: any) => {
          mapa[cliente.customer_id] = cliente.customer_name;
        });

        ////console.log("🗺️ MAPA CLIENTES:", mapa);

        setClientes(mapa);

        await AsyncStorage.setItem(
          "@cache_clientes",
          JSON.stringify(mapa)
        )
      }
    } catch (error) {
      ////console.log("🔥 ERRO CLIENTES:", error);
    }
  }

  async function escolherFoto() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();

    if (!permission.granted) {
      Alert.alert('Permissão necessária', 'Permita o acesso à câmera para tirar foto.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.2,
    });

    if (!result.canceled) {
      const uri = result.assets[0].uri;

      const nomeArquivo = `foto_${Date.now()}.jpg`;

      const fotoLocal = {
        uri,
        name: nomeArquivo,
        type: 'image/jpeg',
        path: `files/calendar/${calendar.calendar_id}/${nomeArquivo}`,
        calendar_id: calendar.calendar_id,
      };

      await AsyncStorage.setItem(
        `foto_chamado_${calendar.calendar_id}`,
        JSON.stringify(fotoLocal)
      );

      setPhotoUri(uri);

      Alert.alert('Foto salva', 'A foto foi salva localmente no chamado.');
    }
  }
  async function carregarFotoLocal() {
    const fotoSalva = await AsyncStorage.getItem(
      `foto_chamado_${calendar.calendar_id}`
    );

    if (fotoSalva) {
      const foto = JSON.parse(fotoSalva);
      setPhotoUri(foto.uri);
    }
  }

  async function enviarFotoApi(uri: string) {
    try {
      const token = await AsyncStorage.getItem('token');

      const formData = new FormData();

      const nomeArquivo = `foto_${Date.now()}.jpg`;

      formData.append('class', 'CalendarService');
      formData.append('method', 'enviarFoto');
      formData.append('calendar_id', String(calendar.calendar_id));

      formData.append('path', `files/calendar/${calendar.calendar_id}/`);

      formData.append('foto', {
        uri,
        name: nomeArquivo,
        type: 'image/jpeg',
      } as any);

      const response = await fetch(await getApiUrl(), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();

      //console.log(data);

      if (data.status === 'success') {
        Alert.alert('Sucesso', 'Foto enviada!');
      }

    } catch (error) {
      //console.log(error);
    }
  }
  const nomeCliente =

    calendar?.calendar_contact_name ||
    '';

  //console.log(nomeCliente);


  const ticketId = calendar ? `#${calendar.calendar_id}` : '#---';

  const telefoneCliente =
    calendar?.calendar_contact_landline_phone ||
    '';


  const mobileCliente =
    calendar?.calendar_contact_mobile_phone ||
    '';

  const endereco = calendar?.calendar_address || 'Endereço não informado';

  const copyTicketId = async () => {
    await Clipboard.setStringAsync(ticketId);
    Alert.alert('Copiado', 'Número do chamado copiado!');
  };

  const openMaps = () => {
    const address = encodeURIComponent(endereco);
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${address}`);
  };

  const openWaze = () => {
    const addres = encodeURIComponent(endereco);
    Linking.openURL(`https://waze.com/ul?q=${addres}`);
  };

  const callClient = () => {
    if (!telefoneCliente) {
      return Alert.alert('Atenção', 'Telefone do cliente não informado.');
    }


    Linking.openURL(`tel: +55${telefoneCliente}`);
  };
  const callMobile = () => {
    if (!mobileCliente) {
      return Alert.alert('Atenção', 'Celular do cliente não informado.');
    }


    Linking.openURL(`tel: +55${mobileCliente}`);
  };

  const sendMessage = async () => {
    if (!message.trim()) {
      return Alert.alert('Atenção', 'Digite uma nota antes de enviar.');
    }

    const novaNota = message.trim();

    const novasNotas = [...notas, novaNota];
    setNotas(novasNotas);

    await AsyncStorage.setItem(
      `notas_chamado_${calendar.calendar_id}`,
      JSON.stringify(novasNotas)
    );

    Alert.alert('Sucesso', 'Nota adicionada com sucesso!');
    setMessage('');
  };

  function getClienteText(customerId: any) {
    return (
      clientes[customerId] ||
      `Cliente ID: ${customerId}`
    );
  }
  function getCategoriaText(serviceTypeId: any) {
    return (
      categorias[serviceTypeId] ||
      `Categoria ID: ${serviceTypeId}`
    );
  }

  function getStatusText(status: any) {
    const s = Number(status ?? 0);
    if (s === 0) return 'ABERTO';
    if (s === 1) return 'EM ANDAMENTO';
    if (s === 2) return 'FINALIZADO';

    return 'DESCONHECIDO';
  }

  function getStatusColor(status: any) {
    const s = Number(status ?? 0);

    if (s === 0) return '#f59e0b';
    if (s === 1) return '#3b82f6';
    if (s === 2) return '#22c55e';

    return '#64748b';
  }

  const statusChamado = Number(calendar?.calendar_status ?? 0);
  const estaPausado = Boolean(calendar?.pausado || calendar?.calendar_paused);

  const podePreencherChecklist = statusChamado === 1;



  if (loading) {
    return (
      <ScreenWrapper
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
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text
            style={[
              styles.loadingText,
              {
                color: theme.subText,
              },
            ]}
          >Carregando chamado...</Text>
        </View>
      </ScreenWrapper>
    );
  }

  if (!calendar) {
    return (
      <ScreenWrapper
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

        <View style={styles.loadingContainer}>
          <Inbox size={50} color="#64748b" />
          <Text style={styles.loadingText}>Chamado não encontrado.</Text>

          <TouchableOpacity
            style={styles.backHomeButton}
            onPress={() => router.back()}
          >
            <Text style={styles.buttonText}>Voltar</Text>
          </TouchableOpacity>
        </View>
      </ScreenWrapper>
    );
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
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ChevronLeft
            color={theme.text}
            size={26}
          />
        </TouchableOpacity>

        <View style={styles.headerTitleContainer}>
          <TouchableOpacity onPress={copyTicketId} style={styles.ticketCopyBox}>
            <Text
              style={[
                styles.headerId,
                {
                  color: theme.text,
                },
              ]}
            >Chamado: {ticketId}</Text>
            <Copy
              size={15}
              color={theme.subText}
            />
          </TouchableOpacity>

          <View
            style={[
              styles.statusBadge,
              {
                borderColor: getStatusColor(
                  calendar.calendar_status,
                )
              },
            ]}
          >
            <Text
              style={[
                styles.statusText,
                { color: getStatusColor(calendar.calendar_status) },
              ]}
            >
              {getStatusText(calendar.calendar_status)}


            </Text>
          </View>
        </View>

        <View style={{ width: 26 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View
          style={[
            styles.sectionCard,
            {
              backgroundColor: theme.card,
              borderColor: theme.border,
            },
          ]}
        >
          <Text
            style={[
              styles.sectionTitleText,
              {
                color: theme.text,
              },
            ]}
          >INFORMAÇÕES DO CHAMADO</Text>

          <DetailRow
            icon={<User size={18} color="#3b82f6" />}
            label="Cliente"
            value={getClienteText(calendar.customer_id)}
          />

          <DetailRow
            icon={<User size={18} color="#10b981" />}
            label="Técnico"
            value={String(tecnicos[calendar.representative_id] || 'Não informado')}
          />

          <DetailRow
            icon={<Wrench size={18} color="#22c55e" />}
            label="Tipo de Serviço"
            value={String(categorias[calendar.service_type_id] || 'Não informado')}
          />

          <DetailRow
            icon={<Clock size={18} color="#3b82f6" />}
            label="Início"
            value={
              calendar.calendar_start
                ? new Date(calendar.calendar_start).toLocaleString('pt-BR')
                : 'Não informado'
            }
          />


        </View>

        <View
          style={[
            styles.sectionCard,
            {
              backgroundColor: theme.card,
              borderColor: theme.border,
            },
          ]}
        >
          <View style={styles.rowTitle}>
            {/* não gostou
            
            <HardDrive size={18} color="#94a3b8" />
            
            */}
            <Text
              style={[
                styles.sectionTitleText,
                {
                  color: theme.text,
                },
              ]}
            >DESCRIÇÃO DO PROBLEMA</Text>
          </View>

          <Text
            style={[
              styles.problemText,
              {
                color: theme.text,
              },
            ]}
          >
            {calendar.calendar_observation || 'Sem descrição'}
          </Text>
        </View>

        <View
          style={[
            styles.sectionCard,
            {
              backgroundColor: theme.card,
              borderColor: theme.border,
            },
          ]}
        >
          <Text
            style={[
              styles.sectionTitleText,
              {
                color: theme.text,
              },
            ]}
          >ENDEREÇO E LOCALIZAÇÃO</Text>

          <View style={styles.addressBox}>
            <MapPin size={20} color="#ef4444" />
            <Text
              style={[
                styles.addressText,
                {
                  color: theme.text,
                },
              ]}
            >
              {calendar.calendar_address || 'Endereço não informado'}
            </Text>
          </View>

          <View style={styles.actionContainer}>
            <View style={styles.mapRow}>
              <TouchableOpacity style={styles.mapButton} onPress={openMaps}>
                <FontAwesome5 name="google" size={20} color="#28bb0bff" />
                <Text style={styles.buttonTextSmall}>Maps</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.wazeButton} onPress={openWaze}>
                <MaterialCommunityIcons name="waze" size={29} color="#3b82f6" />
                <Text style={styles.buttonSmall}>Waze</Text>
              </TouchableOpacity>
            </View>
            {statusChamado === 2 ? (
              <TouchableOpacity
                style={styles.finishedButton}
                onPress={() =>
                  router.push({
                    pathname: '/visualizar-relatorio',
                    params: {
                      ticketId: calendar.calendar_id,
                    },
                  })
                }
              >
                <CheckCircle size={20} color="#fff" />
                <Text style={styles.buttonText}>Ver relatório finalizado</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.grupoBotoesAcao}>
                {/* Botão de Check-in */}
                <Link
                  href={{
                    pathname: '/check',
                    params: {
                      id: calendar.calendar_id,
                      service_type_id: calendar.service_type_id,
                    },
                  }}
                  asChild
                >
                  <TouchableOpacity style={styles.checkInButton}>
                    <FontAwesome5 name="check" size={20} color="#fff" />
                    <Text style={styles.buttonText}>Check-in</Text>
                  </TouchableOpacity>
                </Link>


                {/*
                {podePreencherChecklist && (
                  <Link
                    href={{
                      pathname: '/checklist', 
                      params: {
                        id: calendar.calendar_id,
                        service_type_id: calendar.service_type_id,
                      },
                    }}
                    asChild
                  >
                    <TouchableOpacity style={styles.botaoFinalizar}>
                      <FontAwesome5 name="clipboard-check" size={20} color="#fff" />
                      <Text style={styles.textoBotao}>Preencher Checklist</Text>
                    </TouchableOpacity>
                  </Link>
                )}
                  */}
              </View>
            )}


          </View>
        </View>

        <View
          style={[
            styles.sectionCard,
            {
              backgroundColor: theme.card,
              borderColor: theme.border,
            },
          ]}
        >
          <Text
            style={[
              styles.sectionTitleText,
              {
                color: theme.text,
              },
            ]}
          >
            CONTATO DO CLIENTE
          </Text>

          <DetailRow
            icon={<User size={18} color="#f59e0b" />}
            label="Cliente"
            value={nomeCliente || "Não informado"}
          />


          <DetailRow
            icon={<Phone size={15} color="#22c55e" />}
            label="Telefone"
            value={telefoneCliente || 'Não informado'}
          />

          <DetailRow
            icon={<Phone size={15} color="#3b82f6" />}
            label="Celular"
            value={mobileCliente || 'Não informado'}
          />

          <View style={styles.mapRow}>
            <TouchableOpacity style={styles.callButton} onPress={callClient}>
              <Phone size={20} color="#22c55e" />
              <Text style={styles.buttonTextTel}>Telefone</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.callButton2} onPress={callMobile}>
              <FontAwesome5 name="mobile-alt" size={20} color="#3b82f6" />
              <Text style={styles.buttonTextCel}>Celular</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/*
       <View
  style={[
    styles.sectionCard,
    {
      backgroundColor: theme.card,
      borderColor: theme.border,
    },
  ]}
>
        <Text
  style={[
    styles.sectionTitleText,
    {
      color: theme.text,
    },
  ]}
>AÇÕES DO CHAMADO</Text>

          <View style={styles.photoArea}>
            <TouchableOpacity style={styles.photoButton} onPress={escolherFoto}>
              <Camera size={18} color="#fff" />
              <Text style={styles.buttonText}>Foto</Text>
            </TouchableOpacity>

            {photoUri && (
              <View style={styles.imageContainer}>

                <TouchableOpacity
                  style={styles.removePhotoButton}
                  onPress={async () => {
                    setPhotoUri(null);

                    await AsyncStorage.removeItem(
                      `foto_chamado_${calendar.calendar_id}`
                    );
                  }}
                >
                  <Text style={styles.removePhotoText}>×</Text>
                </TouchableOpacity>

                <Image
                  source={{ uri: photoUri }}
                  style={styles.previewImage}
                />
              </View>
            )}

            {notas.map((nota, index) => (
              <View key={index} style={styles.noteBox}>
                <Text style={styles.noteText}>{nota}</Text>
              </View>
            ))}
          </View>
        </View>
        */}


      </ScrollView>


    </ScreenWrapper>
  );
}

