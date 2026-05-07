import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Check, ChevronLeft } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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

  useEffect(() => {
    //checkSignature();
    buscarChecklist();
  }, []);

  //async function checkSignature() {
    //const savedSig = await AsyncStorage.getItem('@assinatura_cliente');

    //if (savedSig) {
      //setSignatureImg(savedSig);
    //}
 // }


  //Vamos com calma que a gente consegue essa é função para comecar a pegar os dados da API
  async function buscarChecklist() {
    try {
      setLoadingChecklist(true);

      const token = await AsyncStorage.getItem('token');

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
      console.log('CHAMADO ID DA TELA:', chamadoId);
      console.log('RETORNO CHECKLIST:', data.data);

      if (data.status === 'success' && Array.isArray(data.data)) {
        const itemChecklist = data.data.find(
          (item: any) => String(item.calendar_id) === String(chamadoId)
        );

        if (!itemChecklist) {
          setChecklistTemplate([]);
          return;
        }

        if (!itemChecklist) {
          setChecklistTemplate([]);
          return;
        }

        setCalendarChecklistId(itemChecklist.calendar_checklist_id);

        if (itemChecklist?.calendar_checklist_template) {
          const template = JSON.parse(
            itemChecklist.calendar_checklist_template
          );

          const ordenado = template.sort(
            (a: any, b: any) => Number(a.order) - Number(b.order)
          );

          setChecklistTemplate(ordenado);
        }
      }
    } catch (error) {
      console.log('ERRO CHECKLIST:', error);
      Alert.alert('Erro', 'Não foi possível carregar o checklist.');
    } finally {
      setLoadingChecklist(false);
    }
  }


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
      console.log('❌ Erro: Nenhum calendar_checklist_id encontrado no estado');
      return false;
    }

    // MONTAGEM DO OBJETO DATA
    const payload = {
      class: 'CalendarChecklistService',
      method: 'store',
      
     
      data: {
        id: Number(calendarChecklistId),
        calendar_id: chamadoId,
        calendar_checklist_template: JSON.stringify(checklistTemplate),
        calendar_checklist_response: JSON.stringify(relatorioFinal.checklist_response),
      },
    };

    // LOG PARA DEBUG - Verifique se o calendar_checklist_id está correto aqui!
    console.log('🚀 ENVIANDO PARA API:', JSON.stringify(payload, null, 2));

    const response = await fetch('https://browz.com.br/rest.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    console.log('✅ RETORNO DA API:', data);

    return data.status === 'success';
  } catch (error) {
    console.log('BTU - ERRO AO ENVIAR:', error);
    return false;
  }
}

//const handleClearSignature = async () => {
  //await AsyncStorage.removeItem('@assinatura_cliente');
  //setSignatureImg(null);
//};

const handleFinalize = async () => {
  if (sending) return;

  try {
    setSending(true);

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
      return Alert.alert('Erro', 'Informe o contato de quem assinou.');
    }

    //if (!signatureImg) {
      //return Alert.alert('Erro', 'A assinatura é obrigatória.');
    //}

    const checkin = await AsyncStorage.getItem(`@checkin_${chamadoId}`);
    const foto = await AsyncStorage.getItem(`foto_chamado_${chamadoId}`);
    const notas = await AsyncStorage.getItem(`notas_chamado_${chamadoId}`);

    const relatorioFinal: any = {
      calendar_id: chamadoId,
      descricao: description.trim(),
      assinante_nome: signerName.trim(),
      assinante_contato: signerContact.trim(),
      //assinatura: signatureImg,
      checklist_response: Object.values(checklistResponses),
      checkin: checkin ? JSON.parse(checkin) : null,
      foto: foto ? JSON.parse(foto) : null,
      notas: notas ? JSON.parse(notas) : [],
      finalizado_em: new Date().toISOString(),
      enviado_api: false,
    };

    const enviadoApi = await enviarChecklistParaApi(relatorioFinal);

    relatorioFinal.enviado_api = enviadoApi;

    await AsyncStorage.setItem(
      `@relatorio_final_${chamadoId}`,
      JSON.stringify(relatorioFinal)
    );

    await AsyncStorage.setItem(`@ticket_${chamadoId}_status`, 'concluido');

    await AsyncStorage.removeItem('@assinatura_cliente');

    Alert.alert(
      enviadoApi ? 'Sucesso' : 'Salvo localmente',
      enviadoApi
        ? 'Atendimento finalizado e enviado para a API!'
        : 'Atendimento finalizado, mas ficou salvo localmente para sincronizar depois.',
      [
        {
          text: 'OK',
          onPress: () => router.replace('/home-pronta'),
        },
      ]
    );
  } finally {
    setSending(false);
  }
};

const isFormValid =
  description.trim() &&
  signerName.trim() &&
  signerContact.trim(); //&&
 // signatureImg;

return (
  <SafeAreaView style={styles.container}>
    <ScrollView contentContainerStyle={styles.scrollContent}>

      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() =>
            router.push({
              pathname: '/check',
              params: {
                id: chamadoId,
              },
            })
          }
        >
          <ChevronLeft color="#fff" size={26} />
        </TouchableOpacity>
      </View>

      <Text style={styles.title}>Relatório de Encerramento</Text>
      <Text style={styles.subtitle}>Chamado #{chamadoId}</Text>

      <View style={styles.section}>
        <Text style={styles.label}>O QUE FOI REALIZADO?</Text>

        <TextInput
          style={styles.textArea}
          multiline
          numberOfLines={9}
          placeholder="Descreva com detalhes o serviço realizado..."
          placeholderTextColor="#64748b"
          value={description}
          onChangeText={setDescription}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>CHECKLIST DO SERVIÇO</Text>

        {loadingChecklist ? (
          <View style={styles.loadingChecklist}>
            <ActivityIndicator color="#3b82f6" />
            <Text style={styles.loadingText}>Carregando checklist...</Text>
          </View>
        ) : checklistTemplate.length === 0 ? (
          <Text style={styles.emptyChecklist}>
            Nenhum checklist encontrado para este serviço.
          </Text>
        ) : (

          //Aqui vai mostrar os campos na tela e como vão aparecer
          checklistTemplate.map((field: any, index: number) => (
            <View key={`${field.id}-${index}`} style={styles.checklistItem}>
              <Text style={styles.checklistLabel}>
                {field.label} {Number(field.required) === 1 ? '*' : ''}
              </Text>


              {/*Se for texto*/}
              {field.type === 'text' && (
                <TextInput
                  style={styles.input}
                  placeholder="Digite aqui..."
                  placeholderTextColor="#64748b"
                  value={checklistResponses[field.id]?.field_value || ''}
                  onChangeText={(text) => handleChecklistChange(field, text)}
                />
              )}


              {/*Se for texto area*/}
              {field.type === 'textarea' && (
                <TextInput
                  style={styles.textAreaSmall}
                  multiline
                  placeholder="Digite aqui..."
                  placeholderTextColor="#64748b"
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
                      checklistResponses[field.id]?.field_value === index &&
                      styles.optionButtonSelected,
                    ]}
                    onPress={() => handleChecklistChange(field, index)}
                  >
                    <Text style={styles.optionText}>{option}</Text>
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

                    <Text style={styles.optionText}>{option}</Text>
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

                      <Text style={styles.optionText}>{option}</Text>
                    </TouchableOpacity>
                  );
                })}
            </View>
          ))
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>DADOS DE QUEM ASSINOU</Text>

        <TextInput
          style={styles.input}
          placeholder="Nome completo"
          placeholderTextColor="#64748b"
          value={signerName}
          onChangeText={setSignerName}
        />

        <TextInput
          style={styles.input}
          placeholder="E-mail"
          placeholderTextColor="#64748b"
          value={signerContact}
          onChangeText={setSignerContact}
          keyboardType="email-address"
        />
      </View>

      {/*<View style={styles.section}>
        <View style={styles.signatureHeader}>
          <Text style={styles.label}>ASSINATURA DO CLIENTE</Text>

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
            style={styles.signatureTrigger}
            onPress={() => router.push('/assinatura-cliente')}
          >
            <PenTool color="#3b82f6" size={28} />
            <Text style={styles.signatureTriggerText}>Coletar Assinatura</Text>
          </TouchableOpacity>
        )}
      </View> */}

      <TouchableOpacity
        disabled={!isFormValid || sending}
        style={[
          styles.submitBtn,
          (!isFormValid || sending) && styles.submitBtnDisabled,
        ]}
        onPress={handleFinalize}
      >
        <Check color="#fff" size={24} />
        <Text style={styles.submitBtnText}>
          {sending ? 'Enviando...' : 'Finalizar Atendimento'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  </SafeAreaView>
);
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },

  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },

  title: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
  },

  subtitle: {
    color: '#3b82f6',
    marginBottom: 20,
  },

  section: {
    marginBottom: 25,
  },

  label: {
    color: '#64748b',
    marginBottom: 10,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
  },

  textArea: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    color: '#fff',
    padding: 15,
    minHeight: 220,
    textAlignVertical: 'top',
  },

  input: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    color: '#fff',
    padding: 15,
    marginBottom: 12,
    fontSize: 16,
  },

  checklistItem: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },

  checklistLabel: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 10,
  },

  textAreaSmall: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    color: '#fff',
    padding: 15,
    minHeight: 100,
    textAlignVertical: 'top',
  },

  optionButton: {
    backgroundColor: '#0f172a',
    padding: 13,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },

  optionButtonSelected: {
    borderColor: '#3b82f6',
    backgroundColor: '#1d4ed8',
  },

  optionText: {
    color: '#fff',
    fontSize: 14,
  },

  radioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },

  radioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#64748b',
  },

  radioCircleSelected: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },

  checkboxBox: {
    width: 18,
    height: 18,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#64748b',
  },

  checkboxBoxSelected: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },

  loadingChecklist: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    gap: 8,
  },

  loadingText: {
    color: '#94a3b8',
    marginTop: 8,
  },

  emptyChecklist: {
    color: '#94a3b8',
    backgroundColor: '#1e293b',
    padding: 15,
    borderRadius: 12,
  },

  signatureHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },

  clearBtnText: {
    color: '#ef4444',
  },

  signatureTrigger: {
    height: 140,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#3b82f6',
    borderStyle: 'dashed',
  },

  signatureTriggerText: {
    color: '#3b82f6',
    fontWeight: '600',
    marginTop: 8,
  },

  previewContainer: {
    height: 140,
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
  },

  previewImage: {
    width: '100%',
    height: '100%',
  },

  submitBtn: {
    backgroundColor: '#10b981',
    height: 60,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    marginBottom: 30,
  },

  submitBtnDisabled: {
    backgroundColor: '#334155',
  },

  submitBtnText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  topBar: {
    marginBottom: 15,
  },

  backButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#1e293b',
    justifyContent: 'center',
    alignItems: 'center',
  },
});