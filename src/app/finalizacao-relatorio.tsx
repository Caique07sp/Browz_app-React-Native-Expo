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
import { formatInTimeZone } from 'date-fns-tz';


import React, { useState, useRef, useEffect } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Animated,
  Easing,
} from 'react-native';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { styles } from "../styles/finished-report.styles";
import { TimezoneService } from "@/services/TimezoneService";

import {
  Check,
  CheckCircle2, // <-- Adicione este
  ChevronLeft,
  Clock,        // <-- Adicione este
  PenTool,
  Trash2,
  XCircle,
  Server,
  Save,
  Camera,
  ClipboardCheck,      // <-- Adicione este
} from 'lucide-react-native';

export default function FinalizacaoRelatorio() {
  const router = useRouter();
  const { ticketId } = useLocalSearchParams();

  const chamadoId = String(ticketId);

  const [description, setDescription] = useState('');
  const [signerName, setSignerName] = useState('');
  const [signerContact, setSignerContact] = useState('');
  const [signatureImg, setSignatureImg] = useState<string | null>(null);

  const [userTz, setUserTz] = useState('America/Sao_Paulo');

  useEffect(() => {
    TimezoneService.getCurrentTimezone().then((tz) => setUserTz(tz));
  }, []);

  const [checklistTemplate, setChecklistTemplate] = useState<any[]>([]); //Aqui guardei os campos que vai aparecer na tela
  const [checklistResponses, setChecklistResponses] = useState<any>({});
  const [loadingChecklist, setLoadingChecklist] = useState(false);
  const [calendarChecklistId, setCalendarChecklistId] = useState<number | null>(null);
  const [sending, setSending] = useState(false);
  // ESTADOS DA NOVA ANIMAÇÃO DE FINALIZAÇÃO
  type StepStatus = 'waiting' | 'active' | 'done' | 'pending';
  const [stepChecklist, setStepChecklist] = useState<StepStatus>('waiting');
  const [stepFiles, setStepFiles] = useState<StepStatus>('waiting');
  const [stepLocal, setStepLocal] = useState<StepStatus>('waiting');
  const [stepSync, setStepSync] = useState<StepStatus>('waiting');

  const [showConclusion, setShowConclusion] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState(false);
  const [conclusionData, setConclusionData] = useState<any>(null);

  // Referências de Animação
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const checkScale = useRef(new Animated.Value(0)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const cardTranslateY = useRef(new Animated.Value(50)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Inicia o efeito de pulso contínuo para itens processando
  useEffect(() => {
    if (sending && !showConclusion) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.2, duration: 500, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 500, useNativeDriver: true })
        ])
      ).start();
    }
  }, [sending, showConclusion]);
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
    onClose: () => { },
  });



  function mostrarAlerta(
    titulo: string,
    mensagem: string,
    tipo: 'success' | 'warning' | 'error' = 'success',
    onCloseAction: () => void = () => { }
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
      calendar_checkin_datetime: formatInTimeZone(agora, userTz, "yyyy-MM-dd'T'HH:mm:ss"),
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
      event_datetime: formatInTimeZone(agora, userTz, "yyyy-MM-dd'T'HH:mm:ss"),
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
    let salvoLocalmente = false;

    try {
      setSending(true);
      Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();

      // ── PASSO 1: Preparando Dados e Checklist
      setStepChecklist('active');
      const checkinStr = await AsyncStorage.getItem(`@checkin_${chamadoId}`);
      const checkin = checkinStr ? JSON.parse(checkinStr) : null;
      const fotosStr = await AsyncStorage.getItem(`@fotos_chamado_${chamadoId}`);
      const notasStr = await AsyncStorage.getItem(`notas_chamado_${chamadoId}`);
      const checkoutGeo = await capturarLocalizacaoAtualOuUltima();
      const fotosOriginais: string[] = fotosStr ? JSON.parse(fotosStr) : [];

      const relatorioFinal: any = {
        calendar_id: chamadoId, calendar_checklist_id: calendarChecklistId, descricao: description.trim(),
        assinante_nome: signerName.trim(), assinante_contato: signerContact.trim(), assinatura: signatureImg,
        checklist_template: checklistTemplate, checklist_response: Object.values(checklistResponses), checkin: checkin,
        fotos: fotosOriginais, notas: notasStr ? JSON.parse(notasStr) : [], finalizado_em: formatInTimeZone(new Date(), userTz, "yyyy-MM-dd'T'HH:mm:ss"), checkout_geo: checkoutGeo,
      };

      await new Promise(r => setTimeout(r, 300));
      setStepChecklist('done');

      // ── PASSO 2: Mídias (Fotos e Assinatura)
      setStepFiles('active');
      const garantirDiretorio = async (dir: string) => {
        const info = await FileSystem.getInfoAsync(dir);
        if (!info.exists) await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
      };

      let assinaturaPath: string | null = null;
      if (signatureImg) {
        const dirAssinatura = `${FileSystem.documentDirectory}browz/assinaturas/${chamadoId}`;
        await garantirDiretorio(dirAssinatura);
        const destAssinatura = `${dirAssinatura}/assinatura.png`;
        if (signatureImg.startsWith('data:')) {
          const base64 = signatureImg.split(',')[1];
          await FileSystem.writeAsStringAsync(destAssinatura, base64, { encoding: 'base64' as any });
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
          const ehVideo = uri.toLowerCase().endsWith('.mp4');
          const dest = `${dirFotos}/foto_${i + 1}.${ehVideo ? 'mp4' : 'jpg'}`;
          try {
            const info = await FileSystem.getInfoAsync(uri);
            if (info.exists) {
              const origemFinal = await comprimirImagem(uri);
              await FileSystem.copyAsync({ from: origemFinal, to: dest });
              fotosPermanentes.push(dest);
            }
          } catch (e) { }
        }
      }
      relatorioFinal.assinatura = assinaturaPath;
      relatorioFinal.fotos = fotosPermanentes;
      setStepFiles('done');

      // ── PASSO 3: Fila Local Segura
      setStepLocal('active');
      await enfileirarOuAtualizarFinalizacao(chamadoId, relatorioFinal);
      salvoLocalmente = true;
      await salvarEventoCheckin(2);
      await salvarEventoLinhaTempo("Conclusão", `Atendimento concluído por ${nomeTecnico}`, "fa:calendar-check bg-success");
      await AsyncStorage.setItem(`@ticket_${chamadoId}_status`, 'concluido');
      await atualizarCacheFinalizado();
      setStepLocal('done');

      // ── PASSO 4: Sincronização Inteligente
      setStepSync('active');
      const connection = await isOnline();
      let syncResult = false;

      if (connection) {
        sincronizarPendentes(); // Roda em background
        await new Promise(r => setTimeout(r, 1500)); // Aguarda tentativa rápida da API
        const pendente = await buscarFinalizacaoPendente(chamadoId);
        if (!pendente) syncResult = true; // API respondeu rápido e removeu da fila
      } else {
        await new Promise(r => setTimeout(r, 800)); // Pausa visual para offline
      }

      setStepSync(syncResult ? 'done' : 'pending');
      setSyncSuccess(syncResult);

      // Prepara os dados para o Cartão de Conclusão Glassmorphism
      let duracaoStr = '--h--';
      if (checkin && checkin.horario) {
        const diff = new Date().getTime() - new Date(checkin.horario).getTime();
        const hrs = Math.floor(diff / (1000 * 60 * 60));
        const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        duracaoStr = `${hrs.toString().padStart(2, '0')}h${mins.toString().padStart(2, '0')}`;
      }

      setConclusionData({
        cliente: signerName.trim() || 'Cliente',
        dataStr: formatInTimeZone(new Date(), userTz, "dd MMM yyyy").toUpperCase(),
        duracao: duracaoStr,
        fotosCount: fotosPermanentes.length,
        checklistCount: `${Object.keys(checklistResponses).length}/${checklistTemplate.length}`
      });

      // ── PASSO 5: Transição para a Grande Conclusão
      setShowConclusion(true);
      Animated.sequence([
        Animated.spring(checkScale, { toValue: 1, tension: 40, friction: 5, useNativeDriver: true }),
        Animated.delay(300),
        Animated.parallel([
          Animated.timing(cardOpacity, { toValue: 1, duration: 400, easing: Easing.out(Easing.ease), useNativeDriver: true }),
          Animated.spring(cardTranslateY, { toValue: 0, tension: 30, friction: 6, useNativeDriver: true })
        ])
      ]).start(() => {
        setTimeout(() => {
          router.dismissAll();
          router.replace('/home');
        }, 2800);
      });

    } catch (error) {
      if (salvoLocalmente) {
        setStepSync('pending');
        setSyncSuccess(false);
        setShowConclusion(true);
        Animated.sequence([
          Animated.spring(checkScale, { toValue: 1, tension: 40, friction: 5, useNativeDriver: true }),
          Animated.parallel([
            Animated.timing(cardOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
            Animated.spring(cardTranslateY, { toValue: 0, tension: 30, friction: 6, useNativeDriver: true })
          ])
        ]).start(() => {
          setTimeout(() => { router.dismissAll(); router.replace('/home'); }, 2500);
        });
      } else {
        setSending(false);
        mostrarAlerta('Erro', 'Não foi possível salvar o relatório localmente. Tente novamente.', 'error');
      }
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
      <ScreenWrapper style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <Animated.View style={[styles.loadingOverlay, { opacity: fadeAnim }]}>

          {!showConclusion ? (
            // TELA DE PROCESSAMENTO
            <View style={styles.processingWrapper}>
              <Text style={[styles.processingTitle, { color: theme.text }]}>FINALIZANDO</Text>
              <Text style={[styles.processingSubtitle, { color: theme.subText }]}>Preparando seu atendimento...</Text>

              <View style={styles.stepsContainer}>
                {/* Step 1: Checklist */}
                <View style={[styles.stepRow, stepChecklist === 'waiting' && styles.stepWaiting]}>
                  <View style={[styles.stepIconBox, { backgroundColor: darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', borderColor: theme.border }]}>
                    {stepChecklist === 'done' ? <CheckCircle2 color="#10b981" size={20} /> :
                      stepChecklist === 'active' ? <Animated.View style={{ transform: [{ scale: pulseAnim }] }}><ClipboardCheck color="#3b82f6" size={20} /></Animated.View> :
                        <ClipboardCheck color={theme.subText} size={20} />}
                  </View>
                  <Text style={[styles.stepText, { color: theme.subText }, stepChecklist === 'active' && styles.stepTextActive, stepChecklist === 'done' && { color: theme.text, fontWeight: '600' }]}>
                    {stepChecklist === 'done' ? 'Checklist validado' : 'Validando checklist...'}
                  </Text>
                </View>

                {/* Step 2: Mídias */}
                <View style={[styles.stepRow, stepFiles === 'waiting' && styles.stepWaiting]}>
                  <View style={[styles.stepIconBox, { backgroundColor: darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', borderColor: theme.border }]}>
                    {stepFiles === 'done' ? <CheckCircle2 color="#10b981" size={20} /> :
                      stepFiles === 'active' ? <Animated.View style={{ transform: [{ scale: pulseAnim }] }}><Camera color="#3b82f6" size={20} /></Animated.View> :
                        <Camera color={theme.subText} size={20} />}
                  </View>
                  <Text style={[styles.stepText, { color: theme.subText }, stepFiles === 'active' && styles.stepTextActive, stepFiles === 'done' && { color: theme.text, fontWeight: '600' }]}>
                    {stepFiles === 'done' ? 'Fotos e assinatura processadas' : 'Processando mídias...'}
                  </Text>
                </View>

                {/* Step 3: Local Save */}
                <View style={[styles.stepRow, stepLocal === 'waiting' && styles.stepWaiting]}>
                  <View style={[styles.stepIconBox, { backgroundColor: darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', borderColor: theme.border }]}>
                    {stepLocal === 'done' ? <CheckCircle2 color="#10b981" size={20} /> :
                      stepLocal === 'active' ? <Animated.View style={{ transform: [{ scale: pulseAnim }] }}><Save color="#3b82f6" size={20} /></Animated.View> :
                        <Save color={theme.subText} size={20} />}
                  </View>
                  <Text style={[styles.stepText, { color: theme.subText }, stepLocal === 'active' && styles.stepTextActive, stepLocal === 'done' && { color: theme.text, fontWeight: '600' }]}>
                    {stepLocal === 'done' ? 'Relatório salvo com segurança' : 'Criptografando e salvando...'}
                  </Text>
                </View>

                {/* Step 4: Sync */}
                <View style={[styles.stepRow, stepSync === 'waiting' && styles.stepWaiting]}>
                  <View style={[styles.stepIconBox, { backgroundColor: darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', borderColor: theme.border }]}>
                    {stepSync === 'done' ? <CheckCircle2 color="#10b981" size={20} /> :
                      stepSync === 'pending' ? <Clock color="#f59e0b" size={20} /> :
                        stepSync === 'active' ? <Animated.View style={{ transform: [{ scale: pulseAnim }] }}><Server color="#3b82f6" size={20} /></Animated.View> :
                          <Server color={theme.subText} size={20} />}
                  </View>
                  <Text style={[
                    styles.stepText, { color: theme.subText },
                    stepSync === 'active' && styles.stepTextActive,
                    stepSync === 'done' && { color: theme.text, fontWeight: '600' },
                    stepSync === 'pending' && styles.stepTextPending
                  ]}>
                    {stepSync === 'done' ? 'Sincronizado com o servidor' :
                      stepSync === 'pending' ? 'Sincronização pendente' : 'Sincronizando dados...'}
                  </Text>
                </View>
              </View>
            </View>

          ) : (
            // GRANDE CONCLUSÃO
            <View style={styles.conclusionWrapper}>
              <Animated.View style={[styles.checkCircleLarge, { backgroundColor: darkMode ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.1)', borderColor: 'rgba(16, 185, 129, 0.4)' }]}>
                <Check color="#10b981" size={56} strokeWidth={3} />
              </Animated.View>

              <Text style={[styles.conclusionTitle, { color: theme.text }]}>ATENDIMENTO CONCLUÍDO</Text>
              <Text style={[styles.conclusionSubtitle, syncSuccess ? { color: '#10b981' } : { color: '#f59e0b' }]}>
                {syncSuccess ? 'Sincronizado com sucesso' : 'Salvo localmente • Sincronização em background'}
              </Text>

              {/* CARTÃO GLASSMORPHISM ADAPTÁVEL AO TEMA */}
              <Animated.View style={[
                styles.glassCard,
                {
                  opacity: cardOpacity,
                  transform: [{ translateY: cardTranslateY }],
                  backgroundColor: darkMode ? 'rgba(30, 41, 59, 0.7)' : 'rgba(255, 255, 255, 0.85)',
                  borderColor: theme.border,
                  shadowOpacity: darkMode ? 0.5 : 0.08
                }
              ]}>
                <View style={[styles.glassHeader, { borderBottomColor: theme.border }]}>
                  <Text style={[styles.glassHeaderTitle, { color: theme.subText }]}>RESUMO DA OS #{chamadoId}</Text>
                  <Text style={[styles.glassHeaderDate, { color: theme.subText }]}>{conclusionData?.dataStr}</Text>
                </View>

                <View style={styles.glassContent}>
                  <Text style={[styles.glassLabel, { color: theme.subText }]}>Cliente</Text>
                  <Text style={[styles.glassValue, { color: theme.text }]} numberOfLines={1}>{conclusionData?.cliente}</Text>

                  <View style={styles.glassRow}>
                    <View style={styles.glassCol}>
                      <Text style={[styles.glassLabel, { color: theme.subText }]}>Duração</Text>
                      <Text style={[styles.glassValue, { color: theme.text }]}>{conclusionData?.duracao}</Text>
                    </View>
                    <View style={styles.glassCol}>
                      <Text style={[styles.glassLabel, { color: theme.subText }]}>Mídias</Text>
                      <Text style={[styles.glassValue, { color: theme.text }]}>{conclusionData?.fotosCount} Fotos</Text>
                    </View>
                    <View style={styles.glassCol}>
                      <Text style={[styles.glassLabel, { color: theme.subText }]}>Checklist</Text>
                      <Text style={[styles.glassValue, { color: theme.text }]}>{conclusionData?.checklistCount}</Text>
                    </View>
                  </View>
                </View>
              </Animated.View>
            </View>
          )}

        </Animated.View>
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