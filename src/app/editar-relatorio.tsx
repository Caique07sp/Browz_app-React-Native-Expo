import { isOnline } from '@/services/network';
import { useTheme } from "@/theme/ThemeContext";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Check, ChevronLeft, PenTool, Trash2 } from 'lucide-react-native';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { ScreenWrapper } from "@/components/ScreenWrapper";
import { styles } from "../styles/edit-report.styles";



export default function EditarRelatorio() {
  const router = useRouter();

  const { ticketId } = useLocalSearchParams();
  const chamadoId = String(ticketId);

  const [description, setDescription] = useState('');
  const [signerName, setSignerName] = useState('');
  const [signerContact, setSignerContact] = useState('');
  const [signatureImg, setSignatureImg] = useState<string | null>(null);
  const [checklistTemplate, setChecklistTemplate] = useState<any[]>([]);
  const [checklistResponses, setChecklistResponses] = useState<any>({});
  const [calendarChecklistId, setCalendarChecklistId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [loadingDetail, setLoadingDetail] = useState('');
  const { theme, darkMode } = useTheme();

  const [carregouUmaVez, setCarregouUmaVez] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      let ativo = true;

      async function iniciarTela() {
        if (!carregouUmaVez) {
          await carregarDados();
          if (ativo) setCarregouUmaVez(true);
        } else {
          await checkSignature();
        }
      }

      iniciarTela();

      return () => {
        ativo = false;
      };
    }, [carregouUmaVez])
  );


  async function carregarDados() {
    try {
      setLoading(true);

      await buscarDadosRelatorio();
      await buscarChecklist();
      await aplicarRascunhoSalvo();
      await checkSignature();

    } finally {
      setLoading(false);
    }
  }

  async function aplicarRascunhoSalvo() {
    try {
      const rascunhoStr = await AsyncStorage.getItem(
        `@rascunho_relatorio_${chamadoId}`
      );

      if (!rascunhoStr) return;

      const rascunho = JSON.parse(rascunhoStr);

      if (rascunho.description !== undefined) setDescription(rascunho.description);
      if (rascunho.signerName !== undefined) setSignerName(rascunho.signerName);
      if (rascunho.signerContact !== undefined) setSignerContact(rascunho.signerContact);
      if (rascunho.checklistResponses !== undefined) {
        setChecklistResponses(rascunho.checklistResponses);
      }

      // Existe rascunho pendente, então havia alteração não finalizada
      setHasChanges(true);
    } catch (e) {
      console.log('Erro ao aplicar rascunho salvo:', e);
    }
  }

  async function checkSignature() {
  const savedSig = await AsyncStorage.getItem(
    `@assinatura_cliente_${chamadoId}`
  );

  if (savedSig) {
    setSignatureImg(savedSig);
  }
}

  async function buscarDadosRelatorio() {
    try {

      // CACHE PRIMEIRO
      const cache = await AsyncStorage.getItem(
        `@relatorio_final_${chamadoId}`
      );

      if (cache) {

        const chamado = JSON.parse(cache);

        setDescription(chamado.calendar_report || '');

        setSignerName(
          chamado.calendar_signatory_name || ''
        );

        setSignerContact(
          chamado.calendar_signatory_email || ''
        );

        if (chamado.calendar_signature) {
          const assinaturaLocal = await AsyncStorage.getItem(
            `@assinatura_cliente_${chamadoId}`
          );
          if (!assinaturaLocal) {
            const uriSig = String(chamado.calendar_signature).startsWith('http')
              ? chamado.calendar_signature
              : `https://browz.com.br/${String(chamado.calendar_signature).replace(/^\/+/, '')}`;
            setSignatureImg(uriSig);
          }
        }
      }

      const online = await isOnline();

      // OFFLINE
      if (!online) {
        console.log("📴 Offline relatório");
        return;
      }

      // ONLINE
      const token = await AsyncStorage.getItem('token');

      const response = await fetch(
        'https://browz.com.br/rest.php',
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

      const data = await response.json();

      if (
        data.status === 'success' &&
        Array.isArray(data.data)
      ) {

        const chamado = data.data.find(
          (item: any) =>
            String(item.calendar_id) ===
            String(chamadoId)
        );

        if (chamado) {

          setDescription(
            chamado.calendar_report || ''
          );

          setSignerName(
            chamado.calendar_signatory_name || ''
          );

          setSignerContact(
            chamado.calendar_signatory_email || ''
          );

          // Carrega assinatura existente do servidor (se não houver uma local já salva)
          if (chamado.calendar_signature) {
            const assinaturaLocal = await AsyncStorage.getItem(
              `@assinatura_cliente_${chamadoId}`
            );
            if (!assinaturaLocal) {
              const uriAssinatura = String(chamado.calendar_signature).startsWith('http')
                ? chamado.calendar_signature
                : `https://browz.com.br/${String(chamado.calendar_signature).replace(/^\/+/, '')}`;
              setSignatureImg(uriAssinatura);
            }
          }

          // SALVA CACHE
          await AsyncStorage.setItem(
            `@relatorio_final_${chamadoId}`,
            JSON.stringify(chamado)
          );
        }
      }

    } catch (error) {

      console.log(
        'ERRO RELATÓRIO:',
        error
      );
    }
  }

  async function buscarChecklist() {
    try {

      // CACHE PRIMEIRO
      const cache = await AsyncStorage.getItem(
        `@checklist_${chamadoId}`
      );

      if (cache) {

        const checklist = JSON.parse(cache);

        setChecklistTemplate(
          checklist.template || []
        );

        const responsesObject: any = {};

        (checklist.responses || []).forEach(
          (resp: any) => {
            responsesObject[resp.field_id] = resp;
          }
        );

        setChecklistResponses(
          responsesObject
        );
      }
      const token = await AsyncStorage.getItem('token');

      const online = await isOnline();

      if (!online) {
        console.log("📴 Offline checklist");
        return;
      }

      const response = await fetch('https://browz.com.br/rest.php', {

        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          class: 'CalendarChecklistService',
          method: 'loadAll',
        }),
      });

      const data = await response.json();

      if (data.status === 'success' && Array.isArray(data.data)) {
        const itemChecklist = data.data.find(
          (item: any) => String(item.calendar_id) === String(chamadoId)
        );


        if (!itemChecklist) {
          setChecklistTemplate([]);
          return;
        }

        setCalendarChecklistId(itemChecklist.calendar_checklist_id);

        let ordenado: any[] = [];

        if (itemChecklist.calendar_checklist_template) {

          const template = JSON.parse(
            itemChecklist.calendar_checklist_template
          );

          ordenado = template.sort(
            (a: any, b: any) =>
              Number(a.order) - Number(b.order)
          );

          setChecklistTemplate(ordenado);
        }

        if (itemChecklist.calendar_checklist_response) {

          const responsesArray = JSON.parse(
            itemChecklist.calendar_checklist_response
          );

          const responsesObject: any = {};

          responsesArray.forEach((resp: any) => {
            responsesObject[resp.field_id] = resp;
          });

          setChecklistResponses(responsesObject);

          await AsyncStorage.setItem(
            `@checklist_${chamadoId}`,
            JSON.stringify({
              template: ordenado,
              responses: responsesArray,
            })
          );
        }
      }
    } catch (error) {
      console.log('ERRO CHECKLIST:', error);
      Alert.alert('Erro', 'Não foi possível carregar o checklist.');
    }
  }

  async function marcarAlteracao() {
    setHasChanges(true);
    setSignatureImg(null);
    await AsyncStorage.removeItem(`@assinatura_cliente_${chamadoId}`);
  }

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

  function handleChecklistChange(field: any, value: any) {
    marcarAlteracao();

    setChecklistResponses((old: any) => ({
      ...old,
      [field.id]: {
        field_id: field.id,
        field_type: getFieldType(field.type),
        field_value: value,
      },
    }));
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
        Alert.alert('Checklist obrigatório', `Responda o campo: ${field.label}`);
        return false;
      }
    }
    return true;
  }

  async function enviarChecklistParaApi(relatorioFinal: any) {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!calendarChecklistId) {
        console.log('Nenhum calendar_checklist_id encontrado');
        return false;
      }

      const payload = {
        class: 'CalendarChecklistService',
        method: 'store',
        data: {
          id: Number(calendarChecklistId),
          calendar_id: chamadoId,
          calendar_checklist_template: JSON.stringify(checklistTemplate),
          calendar_checklist_response: JSON.stringify(
            relatorioFinal.checklist_response
          ),
        },
      };
      const response = await fetch('https://browz.com.br/rest.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      console.log("RETORNO CHECKLIST:", JSON.stringify(data, null, 2));
      return data.status === 'success';

    } catch (error) {
      console.log('ERRO AO ENVIAR CHECKLIST:', error);
      return false;
    }
  }

  async function enviarRelatorioCalendarParaApi(relatorioFinal: any, caminhoAssinatura: string) {

    try {
      const token = await AsyncStorage.getItem('token');

      const payload = {
        class: 'CalendarService',
        method: 'store',
        data: {
          id: Number(chamadoId),
          calendar_report: relatorioFinal.descricao,
          calendar_signatory_name: relatorioFinal.assinante_nome,
          calendar_signatory_email: relatorioFinal.assinante_contato,
          calendar_signature: caminhoAssinatura,
          calendar_status: 2,
        },
      };

      const response = await fetch('https://browz.com.br/rest.php', {

        method: 'POST',

        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      console.log("RETORNO CALENDAR:", JSON.stringify(data, null, 2));
      return data.status === 'success';


    } catch (error) {
      console.log('ERRO AO ENVIAR RELATÓRIO:', error);
      return false;
    }
  }

  async function enviarAssinaturaParaApi() {
    try {
      if (!signatureImg) {
        return {
          success: true,
          caminhoBanco: null,
        };
      }

      const token = await AsyncStorage.getItem('token');

      // AGORA GERA NOME ÚNICO
      const nomeArquivo = `assinatura_${Date.now()}.png`;

      const caminhoBanco = `files/signatures/${chamadoId}/${nomeArquivo}`;

      const formData = new FormData();

      formData.append('class', 'CalendarService');
      formData.append('method', 'store');
      formData.append('data[id]', chamadoId);

      formData.append(
        'data[calendar_signature]',
        caminhoBanco
      );

      formData.append(
        'path',
        `files/signatures/${chamadoId}`
      );

      formData.append('file', {
        uri: signatureImg,
        name: nomeArquivo,
        type: 'image/png',
      } as any);

      const res = await fetch(
        'https://browz.com.br/rest.php',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        }
      );

      const resultado = await res.json();

      console.log('UPLOAD ASSINATURA:', resultado);

      return {
        success: resultado.status === 'success',
        caminhoBanco,
      };
    } catch (e) {
      console.log(e);

      return {
        success: false,
        caminhoBanco: null,
      };
    }
  }

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


  const handleClearSignature = async () => {

    await AsyncStorage.removeItem(`@assinatura_cliente_${chamadoId}`);

    setSignatureImg(null);
    setHasChanges(true);
  };

  async function handleSaveChanges() {
    if (sending) return;
    if (!description.trim()) {
      return Alert.alert('Erro', 'Descreva o serviço.');
    }
    if (!validarChecklistObrigatorio()) {
      return;
    }
    if (!signerName.trim()) {
      return Alert.alert('Erro', 'Informe o nome de quem assinou.');
    }
    if (!signerContact.trim()) {
      return Alert.alert('Erro', 'Informe o e-mail de quem assinou.');
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(signerContact.trim())) {
      return Alert.alert('Erro', 'Por favor, insira um e-mail válido.');
    }
    if (hasChanges && !signatureImg) {
      return Alert.alert(
        'Nova assinatura necessária',
        'Como houve alteração no relatório, é necessário coletar uma nova assinatura.'
      );
    }
    try {
      setSending(true);
      const relatorioFinal = {
        calendar_id: chamadoId,
        descricao: description.trim(),
        assinante_nome: signerName.trim(),
        assinante_contato: signerContact.trim(),
        assinatura: signatureImg,
        checklist_response: Object.values(checklistResponses),
        finalizado_em: new Date().toISOString(),
      };
      setLoadingMessage('Atualizando checklist...');
      setLoadingDetail('Salvando respostas atualizadas');
      const enviadoChecklist = await enviarChecklistParaApi(relatorioFinal);
      console.log("Checklist enviado:", enviadoChecklist);
      setLoadingMessage('Atualizando relatório...');
      setLoadingDetail('Salvando dados do atendimento');
      setLoadingMessage('Enviando nova assinatura...');
      setLoadingDetail('Validando assinatura do cliente');

      const assinaturaResult = await enviarAssinaturaParaApi();

      setLoadingMessage('Atualizando relatório...');
      setLoadingDetail('Salvando dados do atendimento');

      const caminhoAssinatura =
        assinaturaResult.caminhoBanco ||
        `files/signatures/${chamadoId}/assinatura.png`;

      const enviadoRelatorio =
        await enviarRelatorioCalendarParaApi(
          relatorioFinal,
          caminhoAssinatura
        );

      console.log("Relatório enviado:", enviadoRelatorio);
      console.log(relatorioFinal);

      await AsyncStorage.setItem(
        `@relatorio_final_${chamadoId}`,
        JSON.stringify({
          calendar_id: chamadoId,
          calendar_report: relatorioFinal.descricao,
          calendar_signatory_name: relatorioFinal.assinante_nome,
          calendar_signatory_email: relatorioFinal.assinante_contato,
          calendar_signature: caminhoAssinatura,
          calendar_status: 2,
          calendar: {
            calendar_id: chamadoId,
            calendar_report: relatorioFinal.descricao,
            calendar_signatory_name: relatorioFinal.assinante_nome,
            calendar_signatory_email: relatorioFinal.assinante_contato,
            calendar_signature: caminhoAssinatura,
            calendar_status: 2,
          },
        })
      );

      const enviadoAssinatura = assinaturaResult.success;


      if (enviadoChecklist && enviadoRelatorio && enviadoAssinatura) {

        await AsyncStorage.removeItem(
          `@assinatura_cliente_${chamadoId}`
        );

        await AsyncStorage.removeItem(
          `@rascunho_relatorio_${chamadoId}`
        );

        Alert.alert('Sucesso', 'Relatório atualizado com sucesso!', [
          {
            text: 'OK',
            onPress: () =>
              router.replace({
                pathname: '/visualizar-relatorio',
                params: { ticketId: chamadoId },
              }),
          },
        ]);
      } else {
        Alert.alert(
          'Atenção',
          'Alguns dados podem não ter sido atualizados. Verifique a conexão.'
        );
      }
    } catch (error) {
      console.log('ERRO AO SALVAR ALTERAÇÕES:', error);
      Alert.alert('Erro', 'Não foi possível salvar as alterações.');
    } finally {
      setSending(false);
    }
  }

  const isFormValid =
    !!description.trim() &&
    !!signerName.trim() &&
    !!signerContact.trim() &&
    (!hasChanges || signatureImg);

  if (loading) {
    return (
      <ScreenWrapper
        style={[
          styles.loadingContainer,
          {
            backgroundColor: theme.background,
          },
        ]}
      >
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text
          style={[
            styles.loadingText,
            {
              color: theme.subText,
            },
          ]}
        >Carregando dados do relatório...</Text>
      </ScreenWrapper>
    );
  }

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
          >{loadingMessage}</Text>
          <Text
            style={[
              styles.loadingSubtitle,
              {
                color: theme.subText,
              },
            ]}
          >{loadingDetail}</Text>
          <View style={[
            styles.loadingBarBackground,
            {
              backgroundColor: theme.background,
            },
          ]}>
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
        <TouchableOpacity
          style={[
            styles.backButton,
            {
              backgroundColor: theme.card,
            },
          ]}
          onPress={() => router.back()}
        >
          <ChevronLeft
            color={theme.text}
            size={26}
          />
        </TouchableOpacity>
        <Text
          style={[
            styles.title,
            {
              color: theme.text,
            },
          ]}
        >Editar Relatório</Text>
        <Text style={styles.subtitle}>Chamado #{chamadoId}</Text>
        {hasChanges && (
          <View style={styles.warningBox}>
            <Text style={styles.warningText}>
              Houve alteração no relatório. Será necessário coletar uma nova assinatura.
            </Text>
          </View>
        )}
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
            onChangeText={(text) => {
              setDescription(text);
              marcarAlteracao();
            }}
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
          {checklistTemplate.length === 0 ? (
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



                {field.type === 'textarea' && (

                  <TextInput
                    style={[
                      styles.textAreaSmall,
                      {
                        backgroundColor: theme.background,
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

                {field.type === 'select' &&

                  field.options?.split('|').map((option: string, optionIndex: number) => (

                    <TouchableOpacity
                      key={optionIndex}
                      style={[
                        styles.optionButton,
                        {
                          backgroundColor: theme.background,
                          borderColor: theme.border,
                        },
                        checklistResponses[field.id]?.field_value === optionIndex &&
                        styles.optionButtonSelected,
                      ]}
                      onPress={() => handleChecklistChange(field, optionIndex)}
                    >
                      <Text
                        style={[
                          styles.optionText,
                          {
                            color: checklistResponses[field.id]?.field_value === optionIndex ? '#fff' : theme.text,
                          },
                        ]}
                      >{option}</Text>
                    </TouchableOpacity>
                  ))}



                {field.type === 'radio' &&
                  field.options?.split('|').map((option: string, optionIndex: number) => (
                    <TouchableOpacity
                      key={optionIndex}
                      style={styles.radioRow}
                      onPress={() => handleChecklistChange(field, optionIndex)}
                    >
                      <View
                        style={[
                          styles.radioCircle,
                          checklistResponses[field.id]?.field_value === optionIndex &&
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


                {field.type === 'checkbox' &&
                  field.options?.split('|').map((option: string, optionIndex: number) => {
                    const selected =

                      checklistResponses[field.id]?.field_value
                        ?.split(',')
                        .includes(String(optionIndex)) || false;
                    return (

                      <TouchableOpacity
                        key={optionIndex}
                        style={styles.radioRow}
                        onPress={() => {
                          const current =

                            checklistResponses[field.id]?.field_value
                              ?.split(',')
                              .filter(Boolean) || [];

                          let updated;

                          if (current.includes(String(optionIndex))) {
                            updated = current.filter(
                              (i: string) => i !== String(optionIndex)
                            );
                          } else {
                            updated = [...current, String(optionIndex)];
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
            onChangeText={(text) => {
              setSignerName(text);
              marcarAlteracao();
            }}
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
            onChangeText={(text) => {
              setSignerContact(text);
              marcarAlteracao();
            }}
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
            >{hasChanges ? 'NOVA ASSINATURA' : 'ASSINATURA ATUAL'}</Text>

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

                router.push({
                  pathname: '/assinatura-cliente',
                  params: { ticketId: chamadoId },
                });

              }}
            >
              <PenTool color="#3b82f6" size={28} />

              <Text style={styles.signatureTriggerText}>

                {hasChanges ? 'Coletar nova assinatura' : 'Coletar assinatura'}

              </Text>
            </TouchableOpacity>

          )}
        </View>


        <TouchableOpacity
          disabled={!isFormValid || sending}

          style={[
            styles.submitBtn,
            (!isFormValid || sending) && styles.submitBtnDisabled,
          ]}
          onPress={handleSaveChanges}
        >
          <Check color="#fff" size={24} />

          <Text style={styles.submitBtnText}>

            {sending ? 'Salvando...' : 'Salvar alterações'}

          </Text>
        </TouchableOpacity>
      </ScrollView>
    </ScreenWrapper>
  );
}