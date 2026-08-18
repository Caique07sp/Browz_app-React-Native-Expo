import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  StatusBar,
  StyleSheet,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { useTheme } from '@/theme/ThemeContext';
import { ChevronLeft, CheckCircle2, Save, FileText } from 'lucide-react-native';

interface CampoChecklist {
  id: string | number;
  label: string;
  type?: string;
  options?: string[] | string;
  required?: boolean;
}

export default function TelaChecklistExclusiva() {
  const { id } = useLocalSearchParams();
  const chamadoId = String(id);
  const router = useRouter();
  const { theme, darkMode } = useTheme();

  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [templateChecklist, setTemplateChecklist] = useState<CampoChecklist[]>([]);
  const [respostasChecklist, setRespostasChecklist] = useState<Record<string, any>>({});

  useEffect(() => {
    carregarDadosChecklist();
  }, [chamadoId]);

  // Carrega o template cacheado e as respostas salvas no rascunho do chamado
  async function carregarDadosChecklist() {
    try {
      setCarregando(true);

      // 1. Carrega o Template salvo previamente pela Home
      const cacheTemplate = await AsyncStorage.getItem(`@checklist_${chamadoId}`);
      if (cacheTemplate) {
        const dadosParsed = JSON.parse(cacheTemplate);
        setTemplateChecklist(dadosParsed.template || []);
      }

      // 2. Carrega as Respostas salvas no Rascunho Compartilhado
      const cacheRascunho = await AsyncStorage.getItem(`@rascunho_relatorio_${chamadoId}`);
      if (cacheRascunho) {
        const rascunho = JSON.parse(cacheRascunho);
        if (rascunho.checklistResponses) {
          setRespostasChecklist(rascunho.checklistResponses);
        }
      }
    } catch (erro) {
      // Alert.alert('Erro', 'Não foi possível carregar os dados do checklist.');
    } finally {
      setCarregando(false);
    }
  }

  // Mapeia os tipos de campos conforme padronizado no projeto
  function obterTipoCampo(tipoOriginal?: string) {
    if (!tipoOriginal) return 'text';
    const tipo = String(tipoOriginal).toLowerCase();
    if (tipo.includes('option') || tipo.includes('select') || tipo.includes('radio')) return 'select';
    if (tipo.includes('check') || tipo.includes('multi')) return 'checkbox';
    return 'text';
  }

  // Atualiza o estado local e persiste instantaneamente no Rascunho Compartilhado
  async function atualizarResposta(campo: CampoChecklist, valor: any) {
    const campoId = String(campo.id);
    const tipoFormatado = obterTipoCampo(campo.type);

    const novasRespostas = {
      ...respostasChecklist,
      [campoId]: {
        field_id: campoId,
        field_type: tipoFormatado,
        field_value: valor,
      },
    };

    setRespostasChecklist(novasRespostas);

    // Persistência imediata na fonte única de dados
    try {
      const cacheRascunho = await AsyncStorage.getItem(`@rascunho_relatorio_${chamadoId}`);
      const rascunho = cacheRascunho ? JSON.parse(cacheRascunho) : {};

      rascunho.checklistResponses = novasRespostas;

      await AsyncStorage.setItem(
        `@rascunho_relatorio_${chamadoId}`,
        JSON.stringify(rascunho)
      );
    } catch (erro) {
      // Falha silenciosa de salvamento local
    }
  }

  // Salva explicitamente e retorna à tela do chamado
  async function salvarEVoltar() {
    setSalvando(true);
    try {
      const cacheRascunho = await AsyncStorage.getItem(`@rascunho_relatorio_${chamadoId}`);
      const rascunho = cacheRascunho ? JSON.parse(cacheRascunho) : {};

      rascunho.checklistResponses = respostasChecklist;

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

  // Normaliza e extrai opções para campos de seleção
  function obterOpcoesCampo(campo: CampoChecklist): string[] {
    if (Array.isArray(campo.options)) return campo.options;
    if (typeof campo.options === 'string' && campo.options.trim() !== '') {
      return campo.options.split(',').map((op) => op.trim());
    }
    return ['Conforme', 'Não Conforme', 'N/A'];
  }

  if (carregando) {
    return (
      <ScreenWrapper style={[estilos.conteiner, { backgroundColor: theme.background }]}>
        <StatusBar barStyle={darkMode ? 'light-content' : 'dark-content'} />
        <View style={estilos.conteinerCarregamento}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={[estilos.textoCarregando, { color: theme.subText }]}>
            Carregando checklist...
          </Text>
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper style={[estilos.conteiner, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={darkMode ? 'light-content' : 'dark-content'} />

      {/* Cabeçalho */}
      <View
        style={[
          estilos.cabecalho,
          { backgroundColor: theme.card, borderBottomColor: theme.border },
        ]}
      >
        <TouchableOpacity style={estilos.botaoVoltar} onPress={() => router.back()}>
          <ChevronLeft color={theme.text} size={26} />
        </TouchableOpacity>

        <View style={estilos.tituloCabecalhoBox}>
          <Text style={[estilos.tituloCabecalho, { color: theme.text }]}>
            Checklist do Chamado #{chamadoId}
          </Text>
        </View>

        <TouchableOpacity onPress={salvarEVoltar} disabled={salvando}>
          {salvando ? (
            <ActivityIndicator size="small" color="#3b82f6" />
          ) : (
            <Save color="#3b82f6" size={24} />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={estilos.conteudoScroll}>
        {templateChecklist.length === 0 ? (
          <View style={[estilos.cartaoVazio, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <FileText size={40} color="#94a3b8" />
            <Text style={[estilos.textoVazio, { color: theme.subText }]}>
              Nenhum checklist configurado para este chamado.
            </Text>
          </View>
        ) : (
          templateChecklist.map((item, indice) => {
            const campoId = String(item.id);
            const tipoCampo = obterTipoCampo(item.type);
            const respostaAtual = respostasChecklist[campoId]?.field_value;
            const opcoes = obterOpcoesCampo(item);

            return (
              <View
                key={campoId || indice}
                style={[
                  estilos.cartaoItem,
                  { backgroundColor: theme.card, borderColor: theme.border },
                ]}
              >
                <Text style={[estilos.rotuloItem, { color: theme.text }]}>
                  {indice + 1}. {item.label}
                  {item.required && <Text style={{ color: '#ef4444' }}> *</Text>}
                </Text>

                {/* Renderização de opções (Select / Radio / Buttons) */}
                {tipoCampo === 'select' || tipoCampo === 'checkbox' ? (
                  <View style={estilos.grupoOpcoes}>
                    {opcoes.map((opcao) => {
                      const selecionado = respostaAtual === opcao;
                      return (
                        <TouchableOpacity
                          key={opcao}
                          style={[
                            estilos.opcaoChip,
                            { borderColor: theme.border },
                            selecionado && estilos.opcaoChipSelecionada,
                          ]}
                          onPress={() => atualizarResposta(item, opcao)}
                        >
                          <CheckCircle2
                            size={16}
                            color={selecionado ? '#ffffff' : theme.subText}
                          />
                          <Text
                            style={[
                              estilos.textoOpcaoChip,
                              { color: theme.text },
                              selecionado && estilos.textoOpcaoChipSelecionada,
                            ]}
                          >
                            {opcao}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ) : (
                  /* Renderização de entrada de texto */
                  <TextInput
                    style={[
                      estilos.campoEntradaTexto,
                      {
                        color: theme.text,
                        borderColor: theme.border,
                        backgroundColor: darkMode ? '#1e293b' : '#f8fafc',
                      },
                    ]}
                    placeholder="Digite a resposta..."
                    placeholderTextColor={theme.subText}
                    value={respostaAtual || ''}
                    onChangeText={(texto) => atualizarResposta(item, texto)}
                  />
                )}
              </View>
            );
          })
        )}

        {/* Botão Inferior de Conclusão */}
        {templateChecklist.length > 0 && (
          <TouchableOpacity
            style={estilos.botaoSalvarFlutuante}
            onPress={salvarEVoltar}
            disabled={salvando}
          >
            {salvando ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Save size={20} color="#fff" />
                <Text style={estilos.textoBotaoSalvar}>Salvar Checklist</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </ScrollView>
    </ScreenWrapper>
  );
}

const estilos = StyleSheet.create({
  conteiner: {
    flex: 1,
  },
  conteinerCarregamento: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textoCarregando: {
    marginTop: 12,
    fontSize: 14,
  },
  cabecalho: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  botaoVoltar: {
    padding: 4,
  },
  tituloCabecalhoBox: {
    flex: 1,
    alignItems: 'center',
  },
  tituloCabecalho: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  conteudoScroll: {
    padding: 16,
    paddingBottom: 40,
  },
  cartaoVazio: {
    padding: 30,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  textoVazio: {
    marginTop: 12,
    fontSize: 15,
    textAlign: 'center',
  },
  cartaoItem: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 14,
  },
  rotuloItem: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 12,
  },
  grupoOpcoes: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  opcaoChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
  },
  opcaoChipSelecionada: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  textoOpcaoChip: {
    fontSize: 14,
    fontWeight: '500',
  },
  textoOpcaoChipSelecionada: {
    color: '#ffffff',
  },
  campoEntradaTexto: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  botaoSalvarFlutuante: {
    backgroundColor: '#10b981',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 10,
    gap: 10,
    marginTop: 10,
  },
  textoBotaoSalvar: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});