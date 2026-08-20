import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { useTheme } from '@/theme/ThemeContext';
import { Check, ChevronLeft } from 'lucide-react-native';

export default function TelaChecklistExclusiva() {
  const router = useRouter();
  const { id, ticketId } = useLocalSearchParams();
  const chamadoId = String(id || ticketId);

  const [checklistTemplate, setChecklistTemplate] = useState<any[]>([]);
  const [checklistResponses, setChecklistResponses] = useState<any>({});
  const [loadingChecklist, setLoadingChecklist] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const { theme, darkMode } = useTheme();

  useEffect(() => {
    carregarDadosChecklist();
  }, [chamadoId]);

  async function carregarDadosChecklist() {
    try {
      setLoadingChecklist(true);

      // 1. Carrega o Template salvo pela Home
      const cacheTemplate = await AsyncStorage.getItem(`@checklist_${chamadoId}`);
      if (cacheTemplate) {
        const checklist = JSON.parse(cacheTemplate);
        setChecklistTemplate(checklist.template || []);
      }

      // 2. Carrega as Respostas salvas no Rascunho Compartilhado
      const cacheRascunho = await AsyncStorage.getItem(`@rascunho_relatorio_${chamadoId}`);
      if (cacheRascunho) {
        const rascunho = JSON.parse(cacheRascunho);
        if (rascunho.checklistResponses) {
          setChecklistResponses(rascunho.checklistResponses);
        }
      }
    } catch (erro) {
      // Trata erro silenciosamente
    } finally {
      setLoadingChecklist(false);
    }
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

  async function salvarEVoltar() {
    setSalvando(true);
    try {
      const cacheRascunho = await AsyncStorage.getItem(`@rascunho_relatorio_${chamadoId}`);
      const rascunho = cacheRascunho ? JSON.parse(cacheRascunho) : {};
      rascunho.checklistResponses = checklistResponses;

      await AsyncStorage.setItem(
        `@rascunho_relatorio_${chamadoId}`,
        JSON.stringify(rascunho)
      );

      Alert.alert('Sucesso', 'Checklist salvo localmente!', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (erro) {
      Alert.alert('Erro', 'Ocorreu um erro ao salvar o checklist.');
    } finally {
      setSalvando(false);
    }
  }

  if (loadingChecklist) {
    return (
      <ScreenWrapper style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <StatusBar barStyle={darkMode ? 'light-content' : 'dark-content'} />
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={[styles.loadingText, { color: theme.subText }]}>Carregando checklist...</Text>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={darkMode ? 'light-content' : 'dark-content'} />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Barra Superior */}
        <View style={styles.topBar}>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: theme.card }]}
            onPress={() => router.back()}
          >
            <ChevronLeft color={theme.text} size={26} />
          </TouchableOpacity>
        </View>

        <Text style={[styles.title, { color: theme.text }]}>Preencher Checklist</Text>
        <Text style={styles.subtitle}>Chamado #{chamadoId}</Text>

        <View style={styles.section}>
          {checklistTemplate.length === 0 ? (
            <Text style={[styles.emptyChecklist, { backgroundColor: theme.card, color: theme.subText }]}>
              Nenhum checklist encontrado para este serviço.
            </Text>
          ) : (
            checklistTemplate.map((field: any, index: number) => (
              <View
                key={`${field.id}-${index}`}
                style={[
                  styles.checklistItem,
                  {
                    backgroundColor: theme.card,
                    borderColor: theme.border,
                  },
                ]}
              >
                <Text style={[styles.checklistLabel, { color: theme.text }]}>
                  {index + 1}. {field.label} {Number(field.required) === 1 ? '*' : ''}
                </Text>

                {/* Se for texto simples */}
                {field.type === 'text' && (
                  <TextInput
                    style={[
                      styles.input,
                      {
                        backgroundColor: theme.background,
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

                {/* Se for caixa de texto multilinha */}
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

                {/* Se for Select (Botões em Lista Vertical) */}
                {field.type === 'select' &&
                  field.options?.split('|').map((option: string, opIndex: number) => (
                    <TouchableOpacity
                      key={opIndex}
                      style={[
                        styles.optionButton,
                        {
                          backgroundColor: theme.background,
                          borderColor: theme.border,
                        },
                        checklistResponses[field.id]?.field_value === opIndex &&
                          styles.optionButtonSelected,
                      ]}
                      onPress={() => handleChecklistChange(field, opIndex)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.optionText,
                          {
                            color:
                              checklistResponses[field.id]?.field_value === opIndex
                                ? '#fff'
                                : theme.text,
                          },
                        ]}
                      >
                        {option}
                      </Text>
                    </TouchableOpacity>
                  ))}

                {/* Se for Radio (Uma Única Escolha) */}
                {field.type === 'radio' &&
                  field.options?.split('|').map((option: string, opIndex: number) => (
                    <TouchableOpacity
                      key={opIndex}
                      style={styles.radioRow}
                      onPress={() => handleChecklistChange(field, opIndex)}
                      activeOpacity={0.7}
                    >
                      <View
                        style={[
                          styles.radioCircle,
                          checklistResponses[field.id]?.field_value === opIndex &&
                            styles.radioCircleSelected,
                        ]}
                      />
                      <Text style={[styles.optionText, { color: theme.text }]}>
                        {option}
                      </Text>
                    </TouchableOpacity>
                  ))}

                {/* Se for Checkbox (Múltiplas Escolhas) */}
                {field.type === 'checkbox' &&
                  field.options?.split('|').map((option: string, opIndex: number) => {
                    const selected =
                      checklistResponses[field.id]?.field_value
                        ?.split(',')
                        .includes(String(opIndex)) || false;

                    return (
                      <TouchableOpacity
                        key={opIndex}
                        style={styles.radioRow}
                        onPress={() => {
                          const current =
                            checklistResponses[field.id]?.field_value
                              ?.split(',')
                              .filter(Boolean) || [];

                          let updated;
                          if (current.includes(String(opIndex))) {
                            updated = current.filter(
                              (i: string) => i !== String(opIndex)
                            );
                          } else {
                            updated = [...current, String(opIndex)];
                          }

                          handleChecklistChange(field, updated.join(','));
                        }}
                        activeOpacity={0.7}
                      >
                        <View
                          style={[
                            styles.checkboxBox,
                            selected && styles.checkboxBoxSelected,
                          ]}
                        />
                        <Text style={[styles.optionText, { color: theme.text }]}>
                          {option}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
              </View>
            ))
          )}
        </View>

        {checklistTemplate.length > 0 && (
          <TouchableOpacity
            disabled={salvando}
            style={[styles.submitBtn, salvando && styles.submitBtnDisabled]}
            onPress={salvarEVoltar}
          >
            {salvando ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Check color="#fff" size={24} />
                <Text style={styles.submitBtnText}>Salvar Checklist</Text>
              </View>
            )}
          </TouchableOpacity>
        )}
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  topBar: {
    marginBottom: 15,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  subtitle: {
    color: '#3b82f6',
    marginBottom: 20,
    fontSize: 15,
  },
  section: {
    marginBottom: 25,
  },
  checklistItem: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
  },
  checklistLabel: {
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  input: {
    borderRadius: 12,
    padding: 15,
    marginBottom: 8,
    fontSize: 16,
    borderWidth: 1,
  },
  textAreaSmall: {
    borderRadius: 12,
    padding: 15,
    minHeight: 100,
    textAlignVertical: 'top',
    borderWidth: 1,
    fontSize: 15,
  },
  optionButton: {
    padding: 13,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
  },
  optionButtonSelected: {
    borderColor: '#3b82f6',
    backgroundColor: '#1d4ed8',
  },
  optionText: {
    fontSize: 14,
  },
  radioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
    paddingVertical: 4,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#64748b',
  },
  radioCircleSelected: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  checkboxBox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#64748b',
  },
  checkboxBoxSelected: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 25,
  },
  loadingText: {
    marginTop: 8,
    fontSize: 14,
  },
  emptyChecklist: {
    padding: 15,
    borderRadius: 12,
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
    fontSize: 16,
  },
});