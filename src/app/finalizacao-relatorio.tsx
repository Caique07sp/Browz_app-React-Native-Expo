import { isOnline } from '@/services/network';
import { adicionarNaFila, buscarFinalizacaoPendente, enfileirarOuAtualizarFinalizacao } from '@/services/offlineQueue';
import { sincronizarPendentes } from '@/services/sync';
import { useTheme } from "@/theme/ThemeContext";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';
import * as Location from 'expo-location';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { getApiUrl } from "@/services/api";

import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { styles } from "../styles/finished-report.styles";

import { 
  Check, 
  CheckCircle2, // <-- Adicione este
  ChevronLeft, 
  Clock,        // <-- Adicione este
  PenTool, 
  Trash2, 
  XCircle       // <-- Adicione este
} from 'lucide-react-native';

export default function FinalizacaoRelatorio() {
  const router = useRouter();
  const { ticketId } = useLocalSearchParams();

  const chamadoId = String(ticketId);

  const [description, setDescription] = useState('');
  const [signerName, setSignerName] = useState('');
  const [signerContact, setSignerContact] = useState('');
  const [signatureImg, setSignatureImg] = useState<string | null>(null);

  const [checklistTemplate, setChecklistTemplate] = useState<any[]>([]); //Aqui guardei os campos que vai aparecer na tela
  const [checklistResponses, setChecklistResponses] = useState<any>({});
  const [loadingChecklist, setLoadingChecklist] = useState(false);
  const [calendarChecklistId, setCalendarChecklistId] = useState<number | null>(null);
  const [sending, setSending] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [loadingDetail, setLoadingDetail] = useState('');
  const { theme, darkMode } = useTheme();
  const [avisoMidiaVisible, setAvisoMidiaVisible] = useState(false);
  const [nomeTecnico, setNomeTecnico] = useState('Técnico');
  const [mediaCount, setMediaCount] = useState(0);
  // Estados do Modal de Alerta Personalizado
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertData, setAlertData] = useState({
    titulo: '',
    mensagem: '',
    tipo: 'success' as 'success' | 'warning' | 'error',
    onClose: () => {},
  });

  function mostrarAlerta(
    titulo: string,
    mensagem: string,
    tipo: 'success' | 'warning' | 'error' = 'success',
    onCloseAction: () => void = () => {}
  ) {
    setAlertData({ titulo, mensagem, tipo, onClose: onCloseAction });
    setAlertVisible(true);
  }

  ; useFocusEffect(
    React.useCallback(() => {
      let ativo = true;

      if (ativo) {
        checkSignature();
        carregarRascunhoRelatorio();
        buscarChecklist();
        carregarNomeTecnico();

 
        AsyncStorage.getItem(`@fotos_chamado_${chamadoId}`).then((fotosStr) => {
          if (fotosStr) {
            const lista = JSON.parse(fotosStr);
            if (Array.isArray(lista)) setMediaCount(lista.length);
          } else {
            setMediaCount(0);
          }
        });
      }

      return () => {
        ativo = false;
      };
    }, [chamadoId])
  );

  async function carregarNomeTecnico() {
    try {
      const nomeSalvo = await AsyncStorage.getItem('nome');
      if (nomeSalvo) {
        setNomeTecnico(nomeSalvo);
      }
    } catch (error) {

    }
  }

  async function checkSignature() {
    const savedSig = await AsyncStorage.getItem(
      `@assinatura_cliente_${chamadoId}`);

    if (savedSig) {
      setSignatureImg(savedSig);
    }
  }



  async function buscarChecklist() {
    try {
      setLoadingChecklist(true);

     
      const cache = await AsyncStorage.getItem(`@checklist_${chamadoId}`);

      if (cache) {
        const checklist = JSON.parse(cache);

        setChecklistTemplate(checklist.template || []);
        setCalendarChecklistId(checklist.calendar_checklist_id);
      } else {
        setChecklistTemplate([]);
      }

      

    } catch (error) {
      // console.log('ERRO CHECKLIST:', error);
    } finally {
      setLoadingChecklist(false);
    }
  }

  
  {/*async function enviarFotoParaApi() {
    try {
      const token = await AsyncStorage.getItem('token');
      const fotoSalva = await AsyncStorage.getItem(`foto_chamado_${chamadoId}`);

      if (!fotoSalva) return true;
      const foto = JSON.parse(fotoSalva);

      const formData = new FormData();
      formData.append('class', 'CalendarService');
      formData.append('method', 'store');
      formData.append('data[id]', String(chamadoId));

      // Monta o caminho como solicitado para salvar na coluna do MySQL
      const caminhoBanco = `files/calendar/${chamadoId}/${foto.name}`;
      formData.append('data[calendar_images]', caminhoBanco);

      // Define a pasta de destino no servidor
      formData.append('path', `files/calendar/${chamadoId}`);

      formData.append('file', {
        uri: foto.uri,
        name: foto.name,
        type: 'image/jpeg',
      } as any);

      const response = await fetch('https://browz.com.br/rest.php', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const data = await response.json();
      return data.status === 'success';
    } catch (error) {
      //console.log('❌ Erro no upload da foto:', error);
      return false;
    }
  } */}

  const comprimirImagem = async (uri: string) => {

    if (uri.toLowerCase().endsWith('.mp4')) {
      return uri;
    }

    try {
      const manipResult = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 1024 } }],
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
      );
      return manipResult.uri;
    } catch (error) {
      //console.log("Erro na compressão:", error);
      return uri; // Se der erro, retorna a original para não travar o fluxo
    }
  };

  //Aqui eu criei meio que um mapa, pq na API vem esses nome tcombo tentry essas coisa, vai ser um relacionamento e tranformar tambem nos campos

  /*Exemplo
  
select   vira tcombo
text     vira tentry

  */
  function getFieldType(type: string) {
    const map: any = {
      select: 'tcombo',
      text: 'tentry',
      textarea: 'ttext',
      radio: 'tradio',
      checkbox: 'tcheckgroup',
    };

    return map[type] || type;
  }

  //Aqui ele salva toda resposta do tecnico

  /*
  Exemplo dnv:
  Tecnico foi e escolheu a segunda opção vai retonar handleChecklistChange(field, 1);

  resultado no JSON:
  {
  "field_id": "689e9880dc81e",
  "field_type": "tcombo",
  "field_value": 1
} isso é um exemplo viu
  
  */
 function handleChecklistChange(field: any, value: any) {
    setChecklistResponses((old: any) => {
      const novasRespostas = {
        ...old,
        [field.id]: {
          field_id: field.id,
          field_type: getFieldType(field.type),
          field_value: value,
        },
      };

      AsyncStorage.getItem(`@rascunho_relatorio_${chamadoId}`).then((saved) => {
        const rascunho = saved ? JSON.parse(saved) : {};
        rascunho.checklistResponses = novasRespostas;
        AsyncStorage.setItem(`@rascunho_relatorio_${chamadoId}`, JSON.stringify(rascunho));
      });

      return novasRespostas;
    });
  }



  function validarChecklistObrigatorio() {
    const obrigatorios = checklistTemplate.filter(
      (field: any) => Number(field.required) === 1
    );

    for (const field of obrigatorios) {
      const resposta = checklistResponses[field.id];

      if (
        !resposta ||
        resposta.field_value === undefined ||
        resposta.field_value === null ||
        String(resposta.field_value).trim() === ''
      ) {
        mostrarAlerta('Checklist obrigatório', `Responda o campo: ${field.label}`, 'warning');
        return false;
      }
    }

    return true;
  }
  /**
   * Captura a geolocalização atual (com fallback para a última localização
   * conhecida, mesmo padrão já usado em salvarEventoCheckin/salvarEventoLinhaTempo)
   * para registrar no relatório de finalização, independentemente de
   * online/offline.
   */
  async function capturarLocalizacaoAtualOuUltima(): Promise<string> {
    let location;
    try {
      location = await Location.getCurrentPositionAsync({});
      await AsyncStorage.setItem("@ultima_localizacao", JSON.stringify(location));
    } catch {
      const ultima = await AsyncStorage.getItem("@ultima_localizacao");
      if (ultima) location = JSON.parse(ultima);
    }
    return location ? `${location.coords.latitude}, ${location.coords.longitude}` : '';
  }

  const handleClearSignature = async () => {
    await AsyncStorage.removeItem(`@assinatura_cliente_${chamadoId}`);
    setSignatureImg(null);
  };

  async function salvarRascunhoRelatorio() {
    const rascunho = {
      description,
      signerName,
      signerContact,
      checklistResponses,
    };

    await AsyncStorage.setItem(
      `@rascunho_relatorio_${chamadoId}`,
      JSON.stringify(rascunho)
    );
  }

  async function carregarRascunhoRelatorio() {
    const saved = await AsyncStorage.getItem(`@rascunho_relatorio_${chamadoId}`);

    if (saved) {
      const rascunho = JSON.parse(saved);

      setDescription(rascunho.description || '');
      setSignerName(rascunho.signerName || '');
      setSignerContact(rascunho.signerContact || '');
      setChecklistResponses(rascunho.checklistResponses || {});
    }
  }

  async function atualizarCacheFinalizado() {

    const cache =
      await AsyncStorage.getItem("@cache_chamados");

    if (!cache) return;

    const chamados = JSON.parse(cache);

    const atualizados = chamados.map((item: any) => {

      if (
        String(item.calendar_id) ===
        String(chamadoId)
      ) {

        return {
          ...item,
          calendar_status: 2,
          agenda_pause: 0,
        };
      }

      return item;
    });

    await AsyncStorage.setItem(
      "@cache_chamados",
      JSON.stringify(atualizados)
    );
  }

  async function salvarEventoCheckin(tipo: 1 | 2 | 3) {
    const agora = new Date();

    let location;

    try {
      location = await Location.getCurrentPositionAsync({});

      await AsyncStorage.setItem(
        "@ultima_localizacao",
        JSON.stringify(location)
      );
    } catch {
      const ultima = await AsyncStorage.getItem("@ultima_localizacao");

      if (ultima) {
        location = JSON.parse(ultima);
      }
    }

    const latitude = location?.coords?.latitude || null;
    const longitude = location?.coords?.longitude || null;

    const evento = {
      calendar_id: Number(chamadoId),
      representative_id: Number(await AsyncStorage.getItem("representative_id")),
      calendar_checkin_type: tipo,
      calendar_checkin_geo:
        latitude && longitude ? `${latitude}, ${longitude}` : '',
      calendar_checkin_latlng:
        latitude && longitude ? `{lat: ${latitude},lng: ${longitude}}` : '',
      calendar_checkin_datetime: agora
        .toLocaleString('sv-SE', {
          timeZone: 'America/Sao_Paulo',
        })
        .replace(' ', 'T'),
    };

    const online = await isOnline();

    if (!online) {
      await adicionarNaFila({
        tipo: "evento_checkin",
        data: evento,
        criadoEm: new Date().toISOString(),
        tentativas: 0,
      });
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
        class: "CalendarCheckinService",
        method: "store",
        data: evento,
      }),
    });

    const result = await response.json();

    //console.log("EVENTO CHECKOUT:", result);

    return result.status === "success";
  }

  async function salvarEventoLinhaTempo(
    titulo: string,
    descricao: string,
    icon: string
  ) {
    const agora = new Date();

    const evento = {
      calendar_id: Number(chamadoId),
      event_title: titulo,
      event_description: descricao,
      event_datetime: agora
        .toLocaleString("sv-SE", {
          timeZone: "America/Sao_Paulo",
        })
        .replace(" ", "T"),
      event_icon: icon,
    };

    const online = await isOnline();

    if (!online) {
      await adicionarNaFila({
        tipo: "evento_linha_tempo",
        data: evento,
        criadoEm: new Date().toISOString(),
        tentativas: 0,
      });
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
        class: "CalendarEventService",
        method: "store",
        data: evento,
      }),
    });

    const result = await response.json();

    //console.log("EVENTO LINHA DO TEMPO CHECKOUT:", result);

    return result.status === "success";
  }

  // 🌟 MUDOU: Esta passou a ser a execução real do envio após todas as validações e confirmações
  const executarFinalizacaoReal = async () => {
    // Controla a mensagem do catch: se a persistência local já aconteceu,
    // o relatório está seguro (na fila) mesmo que algo dê errado depois —
    // isso NUNCA deve ser reportado ao técnico como perda de dados.
    let salvoLocalmente = false;

    try {
      setSending(true);
      setLoadingMessage('Salvando relatório...');
      setLoadingDetail('Preparando fotos e assinatura');

      const checkin = await AsyncStorage.getItem(`@checkin_${chamadoId}`);
      const fotosStr = await AsyncStorage.getItem(`@fotos_chamado_${chamadoId}`);
      const notasStr = await AsyncStorage.getItem(`notas_chamado_${chamadoId}`);

      const nomeTecnico = (await AsyncStorage.getItem('nome')) || "tecnico";
      const checkoutGeo = await capturarLocalizacaoAtualOuUltima();
      const fotosOriginais: string[] = fotosStr ? JSON.parse(fotosStr) : [];

      const relatorioFinal: any = {
        calendar_id: chamadoId,
        calendar_checklist_id: calendarChecklistId,
        descricao: description.trim(),
        assinante_nome: signerName.trim(),
        assinante_contato: signerContact.trim(),
        assinatura: signatureImg,
        checklist_template: checklistTemplate,
        checklist_response: Object.values(checklistResponses),
        checkin: checkin ? JSON.parse(checkin) : null,
        fotos: fotosOriginais,
        notas: notasStr ? JSON.parse(notasStr) : [],
        finalizado_em: new Date().toISOString(),
        checkout_geo: checkoutGeo,
      };

      // ── PASSO 1 — LOCAL-FIRST ────────────────────────────────────────
      // Fotos e assinatura são copiadas para um diretório PERMANENTE antes
      // de qualquer tentativa de rede, esteja o app online ou offline. O
      // arquivo original (cache do picker / do componente de assinatura)
      // pode ser limpo pelo sistema operacional a qualquer momento; a
      // cópia permanente é o que garante que nada se perca enquanto o
      // envio não for confirmado pela API.
      setLoadingDetail('Copiando arquivos para armazenamento permanente');

      const garantirDiretorio = async (dir: string) => {
        const info = await FileSystem.getInfoAsync(dir);
        if (!info.exists) {
          await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
        }
      };

      let assinaturaPath: string | null = null;
      if (signatureImg) {
        const dirAssinatura = `${FileSystem.documentDirectory}browz/assinaturas/${chamadoId}`;
        await garantirDiretorio(dirAssinatura);
        const destAssinatura = `${dirAssinatura}/assinatura.png`;

        if (signatureImg.startsWith('data:')) {
          const base64 = signatureImg.split(',')[1];
          await FileSystem.writeAsStringAsync(destAssinatura, base64, {
            encoding: 'base64' as any,
          });
        } else {
          await FileSystem.copyAsync({ from: signatureImg, to: destAssinatura });
        }
        assinaturaPath = destAssinatura;
      }

      const fotosPermanentes: string[] = [];
      if (fotosOriginais.length > 0) {
        const dirFotos = `${FileSystem.documentDirectory}browz/fotos/${chamadoId}`;
        await garantirDiretorio(dirFotos);

        for (const [i, uri] of fotosOriginais.entries()) {
          setLoadingDetail(`Mídia ${i + 1} de ${fotosOriginais.length}`);
          const ehVideo = uri.toLowerCase().endsWith('.mp4');
          const dest = `${dirFotos}/foto_${i + 1}.${ehVideo ? 'mp4' : 'jpg'}`;

          try {
            const info = await FileSystem.getInfoAsync(uri);
            if (info.exists) {
              // Compressão (antes só aplicada no caminho online) agora
              // acontece sempre, uma única vez, aqui na persistência —
              // reduz espaço local e tempo de upload depois. comprimirImagem
              // já ignora vídeos (retorna a uri original nesse caso).
              const origemFinal = await comprimirImagem(uri);
              await FileSystem.copyAsync({ from: origemFinal, to: dest });
              fotosPermanentes.push(dest);
            }
          } catch (e) {
            console.log(`⚠️ Erro ao persistir mídia ${i + 1}:`, e);
          }
        }
      }

      relatorioFinal.assinatura = assinaturaPath;
      relatorioFinal.fotos = fotosPermanentes;

      // ── PASSO 2 — PERSISTÊNCIA GARANTIDA NA FILA (OUTBOX) ────────────
      // A partir daqui o relatório está seguro: existe uma cópia completa
      // (dados + arquivos) no armazenamento local, com status pendente de
      // sincronização. Repetir "Finalizar" no mesmo chamado atualiza esta
      // MESMA entrada em vez de criar uma segunda (evita duplicidade).
      setLoadingMessage('Registrando finalização...');
      await enfileirarOuAtualizarFinalizacao(chamadoId, relatorioFinal);
      salvoLocalmente = true;

      // Eventos de check-out / timeline seguem sua própria lógica já
      // existente (enviam direto se online, senão vão para a fila) — não
      // fazem parte do "relatório" propriamente dito.
      await salvarEventoCheckin(2);
      await salvarEventoLinhaTempo(
        "Conclusão",
        `Atendimento concluído por ${nomeTecnico}`,
        "fa:calendar-check bg-success"
      );

      // O chamado já é considerado finalizado LOCALMENTE neste ponto —
      // isso não depende de rede nem do resultado da tentativa de envio
      // a seguir.
      await AsyncStorage.setItem(`@ticket_${chamadoId}_status`, 'concluido');
      await atualizarCacheFinalizado();

    // ── PASSO 3 — TENTATIVA DE SINCRONIZAÇÃO EM SEGUNDO PLANO ────────
      setLoadingMessage('Finalizando...');
      setLoadingDetail('Enviando relatório para o servidor');
      
      // Dispara a sincronização sem usar "await", deixando-a rodar em background
      sincronizarPendentes();

      // Libera o técnico imediatamente após a persistência local (Passo 1 e 2)
      mostrarAlerta(
        'Chamado Finalizado',
        'O relatório foi salvo localmente e será sincronizado automaticamente. Você pode continuar trabalhando normalmente.',
        'success',
        () => {
          router.dismissAll();
          router.replace('/home');
        }
      );
    } catch (error) {
      console.error('ERRO CRÍTICO NO FINALIZE:', error);

      if (salvoLocalmente) {
        // A persistência local (passo 1+2) já aconteceu com sucesso antes
        // do erro — o relatório está seguro na fila e será reenviado
        // automaticamente. Nunca dizer ao técnico que algo foi perdido.
        mostrarAlerta(
          'Chamado finalizado',
          'O relatório foi salvo localmente e será sincronizado automaticamente. Você pode continuar trabalhando normalmente.',
          'warning',
          () => {
            router.dismissAll();
            router.replace('/home');
          }
        );
      } else {
        Alert.alert('Erro', 'Não foi possível salvar o relatório localmente. Tente novamente.');
      }
    } finally {
      setSending(false);
    }
  };


  const handleFinalize = async () => {
    if (sending) return;

    if (!description.trim()) {
      return mostrarAlerta('Erro', 'Descreva o serviço realizado.', 'error');
    }

    if (!validarChecklistObrigatorio()) {
      return;
    }

    if (!signerName.trim() || !signerContact.trim() || !signatureImg) {
      return mostrarAlerta('Erro', 'Preencha todos os campos obrigatórios e assine o relatório.', 'error');
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(signerContact.trim())) {
      return mostrarAlerta('Erro', 'Por favor, insira um e-mail válido.', 'error');
    }


    await executarFinalizacaoReal();
  };
  const isFormValid =
    description.trim() &&
    signerName.trim() &&
    signerContact.trim() &&
    signatureImg;

  if (sending) {
    return (
      <ScreenWrapper
        style={[
          styles.loadingContainer,
          {
            backgroundColor: theme.background,
          },
        ]}
      >
        <View
          style={[
            styles.loadingCard,
            {
              backgroundColor: theme.card,
              borderColor: theme.border,
            },
          ]}
        >
          <ActivityIndicator size="large" color="#3b82f6" />

          <Text
            style={[
              styles.loadingTitle,
              {
                color: theme.text,
              },
            ]}
          >
            {loadingMessage}
          </Text>

          <Text
            style={[
              styles.loadingSubtitle,
              {
                color: theme.subText,
              },
            ]}
          >
            {loadingDetail}
          </Text>

          <View style={styles.loadingBarBackground}>
            <View style={styles.loadingBarFill} />
          </View>
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
      <ScrollView contentContainerStyle={styles.scrollContent}>

        <View style={styles.topBar}>
          <TouchableOpacity
            style={[
              styles.backButton,
              {
                backgroundColor: theme.card,
              },
            ]}
            onPress={() => {
              router.back();
            }}
          >
            <ChevronLeft
              color={theme.text}
              size={26}
            />
          </TouchableOpacity>
        </View>

        <Text
          style={[
            styles.title,
            {
              color: theme.text,
            },
          ]}
        >Relatório de Encerramento</Text>
        <Text style={styles.subtitle}>Chamado #{chamadoId}</Text>

        <View style={styles.section}>
          <Text
            style={[
              styles.label,
              {
                color: theme.subText,
              },
            ]}
          >O QUE FOI REALIZADO?</Text>

          <TextInput
            style={[
              styles.textArea,
              {
                backgroundColor: theme.card,
                color: theme.text,
                borderColor: theme.border,
              },
            ]}
            multiline
            numberOfLines={9}
            placeholder="Descreva com detalhes o serviço realizado..."
            placeholderTextColor={theme.subText}
            value={description}
            onChangeText={setDescription}
          />
        </View>

        <View style={styles.section}>
          <Text
            style={[
              styles.label,
              {
                color: theme.subText,
              },
            ]}
          >CHECKLIST DO SERVIÇO</Text>

          {loadingChecklist ? (
            <View
              style={[
                styles.loadingChecklist,
                {
                  backgroundColor: theme.card,
                },
              ]}
            >
              <ActivityIndicator color="#3b82f6" />
              <Text style={styles.loadingText}>Carregando checklist...</Text>
            </View>
          ) : checklistTemplate.length === 0 ? (
            <Text
              style={[
                styles.emptyChecklist,
                {
                  backgroundColor: theme.card,
                  color: theme.subText,
                },
              ]}
            >
              Nenhum checklist encontrado para este serviço.
            </Text>
          ) : (

            //Aqui vai mostrar os campos na tela e como vão aparecer
            checklistTemplate.map((field: any, index: number) => (
              <View key={`${field.id}-${index}`} style={[
                styles.checklistItem,
                {
                  backgroundColor: theme.card,
                  borderColor: theme.border,
                },
              ]}>
                <Text
                  style={[
                    styles.checklistLabel,
                    {
                      color: theme.text,
                    },
                  ]}
                >
                  {field.label} {Number(field.required) === 1 ? '*' : ''}
                </Text>


                {/*Se for texto*/}
                {field.type === 'text' && (
                  <TextInput
                    style={[
                      styles.input,
                      {
                        backgroundColor: theme.card,
                        color: theme.text,
                        borderColor: theme.border,
                      },
                    ]}
                    placeholder="Digite aqui..."
                    placeholderTextColor={theme.subText}
                    value={checklistResponses[field.id]?.field_value || ''}
                    onChangeText={(text) => handleChecklistChange(field, text)}
                  />
                )}


                {/*Se for texto area*/}
                {field.type === 'textarea' && (
                  <TextInput
                    style={[
                      styles.textAreaSmall,
                      {
                        backgroundColor: theme.card,
                        color: theme.text,
                        borderColor: theme.border,
                      },
                    ]}
                    multiline
                    placeholder="Digite aqui..."
                    placeholderTextColor={theme.subText}
                    value={checklistResponses[field.id]?.field_value || ''}
                    onChangeText={(text) => handleChecklistChange(field, text)}
                  />
                )}

                {/*Se for select
                 
                 Aqui as opções vem assim : OPÇÃO 1|OPÇÃO 2|OPÇÃO 3

                 quando usa  field.options?.split('|') ele separa ai vem bonitinho
                  OPÇÃO 1
                  OPÇÃO 2
                  OPÇÃO 3

                 */}
                {field.type === 'select' &&
                  field.options?.split('|').map((option: string, index: number) => (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.optionButton,

                        {
                          backgroundColor: theme.background,
                          borderColor: theme.border,
                        },

                        checklistResponses[field.id]?.field_value === index &&
                        styles.optionButtonSelected,
                      ]}
                      onPress={() => handleChecklistChange(field, index)}
                    >
                      <Text
                        style={[
                          styles.optionText,
                          {
                            color: checklistResponses[field.id]?.field_value === index ? '#fff' : theme.text,
                          },
                        ]}
                      >{option}</Text>
                    </TouchableOpacity>
                  ))}


                {/*aqui se for Radio aqui é so uma opção*/}
                {field.type === 'radio' &&
                  field.options?.split('|').map((option: string, index: number) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.radioRow}
                      onPress={() => handleChecklistChange(field, index)}
                    >
                      <View
                        style={[
                          styles.radioCircle,
                          checklistResponses[field.id]?.field_value === index &&
                          styles.radioCircleSelected,
                        ]}
                      />

                      <Text
                        style={[
                          styles.optionText,
                          {
                            color: theme.text,

                          },
                        ]}
                      >{option}</Text>
                    </TouchableOpacity>
                  ))}


                {/*aqui se for checkbox
                
                Que pode marcar varias opções

                se o template tiver required:1 é obrigatorio
                
                */}
                {field.type === 'checkbox' &&
                  field.options?.split('|').map((option: string, index: number) => {
                    const selected =
                      checklistResponses[field.id]?.field_value
                        ?.split(',')
                        .includes(String(index)) || false;

                    return (
                      <TouchableOpacity
                        key={index}
                        style={styles.radioRow}
                        onPress={() => {
                          const current =
                            checklistResponses[field.id]?.field_value
                              ?.split(',')
                              .filter(Boolean) || [];

                          let updated;

                          if (current.includes(String(index))) {
                            updated = current.filter(
                              (i: string) => i !== String(index)
                            );
                          } else {
                            updated = [...current, String(index)];
                          }

                          handleChecklistChange(field, updated.join(','));
                        }}
                      >
                        <View
                          style={[
                            styles.checkboxBox,
                            selected && styles.checkboxBoxSelected,
                          ]}
                        />

                        <Text
                          style={[
                            styles.optionText,
                            {
                              color: theme.text,

                            },
                          ]}
                        >{option}</Text>
                      </TouchableOpacity>
                    );
                  })}
              </View>
            ))
          )}
        </View>

        <View style={styles.section}>
          <Text
            style={[
              styles.label,
              {
                color: theme.subText,
              },
            ]}
          >DADOS DE QUEM ASSINOU</Text>

          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: theme.card,
                color: theme.text,
                borderColor: theme.border,
              },
            ]}
            placeholder="Nome completo"
            placeholderTextColor={theme.subText}
            value={signerName}
            onChangeText={setSignerName}
          />

          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: theme.card,
                color: theme.text,
                borderColor: theme.border,
              },
            ]}
            placeholder="E-mail"
            placeholderTextColor={theme.subText}
            value={signerContact}
            onChangeText={setSignerContact}
            keyboardType="email-address"
          />
        </View>

        <View style={styles.section}>
          <View style={styles.signatureHeader}>
            <Text
              style={[
                styles.label,
                {
                  color: theme.subText,
                },
              ]}
            >ASSINATURA DO CLIENTE</Text>

            {signatureImg && (
              <TouchableOpacity onPress={handleClearSignature} style={styles.clearBtn}>
                <Trash2 color="#ef4444" size={16} />
                <Text style={styles.clearBtnText}>Remover</Text>
              </TouchableOpacity>
            )}
          </View>

          {signatureImg ? (
            <View style={styles.previewContainer}>
              <Image source={{ uri: signatureImg }} style={styles.previewImage} />
            </View>
          ) : (
            <TouchableOpacity
              style={[
                styles.signatureTrigger,
                {
                  backgroundColor: theme.card,
                },
              ]}
              onPress={async () => {
                await salvarRascunhoRelatorio();

                // Mudado de router.push para router.navigate
                router.push({
                  pathname: '/assinatura-cliente',
                  params: {
                    ticketId: chamadoId
                  }
                });
              }}
            >
              <PenTool color="#3b82f6" size={28} />
              <Text style={styles.signatureTriggerText}>Coletar Assinatura</Text>
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          disabled={!isFormValid || sending}
          style={[
            styles.submitBtn,
            (!isFormValid || sending) && styles.submitBtnDisabled,
          ]}
          onPress={handleFinalize}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Check color="#fff" size={24} />
            <Text style={styles.submitBtnText}>
              {sending ? 'Enviando...' : 'Finalizar Atendimento'}
            </Text>

            {/* Badge do contador de mídias anexadas */}
            <View
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.25)',
                paddingHorizontal: 8,
                paddingVertical: 2,
                borderRadius: 12,
                marginLeft: 4,
              }}
            >
              <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>
                📷 {mediaCount}
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      </ScrollView>

      {/* MODAL DE ALERTA PERSONALIZADO */}
      <Modal
        transparent
        visible={alertVisible}
        animationType="fade"
        onRequestClose={() => {
          setAlertVisible(false);
          alertData.onClose();
        }}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.75)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 24,
          }}
        >
          <View
            style={{
              width: '100%',
              maxWidth: 340,
              backgroundColor: theme.card,
              borderRadius: 24,
              padding: 24,
              alignItems: 'center',
              borderWidth: 1,
              borderColor: theme.border,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.25,
              shadowRadius: 15,
              elevation: 10,
            }}
          >
            {/* Ícone Indicador de Status */}
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: 16,
                backgroundColor:
                  alertData.tipo === 'success'
                    ? 'rgba(34, 197, 94, 0.15)'
                    : alertData.tipo === 'warning'
                    ? 'rgba(245, 158, 11, 0.15)'
                    : 'rgba(239, 68, 68, 0.15)',
              }}
            >
              {alertData.tipo === 'success' && <CheckCircle2 size={36} color="#22c55e" />}
              {alertData.tipo === 'warning' && <Clock size={36} color="#f59e0b" />}
              {alertData.tipo === 'error' && <XCircle size={36} color="#ef4444" />}
            </View>

            <Text
              style={{
                fontSize: 20,
                fontWeight: '800',
                color: theme.text,
                textAlign: 'center',
                marginBottom: 8,
              }}
            >
              {alertData.titulo}
            </Text>

            <Text
              style={{
                fontSize: 14,
                color: theme.subText,
                textAlign: 'center',
                lineHeight: 20,
                marginBottom: 24,
              }}
            >
              {alertData.mensagem}
            </Text>

            <TouchableOpacity
              style={{
                width: '100%',
                paddingVertical: 14,
                borderRadius: 14,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor:
                  alertData.tipo === 'success'
                    ? '#22c55e'
                    : alertData.tipo === 'warning'
                    ? '#f59e0b'
                    : '#ef4444',
              }}
              onPress={() => {
                setAlertVisible(false);
                alertData.onClose();
              }}
              activeOpacity={0.85}
            >
              <Text style={{ color: '#ffffff', fontWeight: '800', fontSize: 15 }}>
                OK, Entendido
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>


    </ScreenWrapper>
  );
}