import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowLeft,
  CheckCircle2,
  DollarSign,
  PackageOpen,
  Plus,
  Save,
  Search,
  Trash2,
  X,
  Clock,
  XCircle
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

import { getApiUrl } from '@/services/api';
import { isOnline } from '@/services/network';
import { adicionarNaFila } from '@/services/offlineQueue';
import { useTheme } from '@/theme/ThemeContext';


interface ProdutoAPI {
  product_id: number;
  product_name: string;
  product_price: number;
  product_active: string | boolean | number;
}

interface ItemOrcamento {
  proposal_item_id?: number;
  proposal_id?: number;
  product_id: number;
  proposal_item_product_name: string;
  proposal_item_product_price: number;
  proposal_item_product_quantity: number;
  proposal_item_total: number;
  is_local_only?: boolean;
}

export default function OrcamentoChamado() {
  const { id } = useLocalSearchParams();
  const chamadoId = String(id);
  const { theme, darkMode } = useTheme();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  
  const [proposalId, setProposalId] = useState<number | null>(null);
  const [proposalNumber, setProposalNumber] = useState<number | null>(null);
  const [customerId, setCustomerId] = useState<number | null>(null);
  const [itens, setItens] = useState<ItemOrcamento[]>([]);
  const [valorMaoDeObra, setValorMaoDeObra] = useState<number>(0);
  const [status, setStatus] = useState<'pendente' | 'aprovado' | 'recusado'>('pendente');

  const [catalogoProdutos, setCatalogoProdutos] = useState<ProdutoAPI[]>([]);
  const [produtosFiltrados, setProdutosFiltrados] = useState<ProdutoAPI[]>([]);
  const [buscaProduto, setBuscaProduto] = useState('');

  const [modalVisivel, setModalVisivel] = useState(false);
  const [produtoSelecionado, setProdutoSelecionado] = useState<ProdutoAPI | null>(null);
  const [qtdAdicionar, setQtdAdicionar] = useState('1');

  const subtotalPecas = itens.reduce((acc, item) => acc + (Number(item.proposal_item_total) || 0), 0);
  const valorTotal = subtotalPecas + (Number(valorMaoDeObra) || 0);

  const [alertaModalVisible, setAlertaModalVisible] = useState(false);
  const [alertaModalData, setAlertaModalData] = useState({
    titulo: '',
    mensagem: '',
    tipo: 'success' as 'success' | 'warning' | 'error',
  });

  useEffect(() => {
    carregarDados();
  }, [chamadoId]);

  useEffect(() => {
    if (buscaProduto.trim() === '') {
      setProdutosFiltrados(catalogoProdutos);
    } else {
      const termo = buscaProduto.toLowerCase();
      setProdutosFiltrados(
        catalogoProdutos.filter(p => p.product_name.toLowerCase().includes(termo))
      );
    }
  }, [buscaProduto, catalogoProdutos]);

  function exibirAlerta(titulo: string, mensagem: string, tipo: 'success' | 'warning' | 'error' = 'success') {
    setAlertaModalData({ titulo, mensagem, tipo });
    setAlertaModalVisible(true);
  }

  async function carregarDados() {
    setLoading(true);
    await Promise.all([carregarCatalogoProdutos(), carregarOrcamento()]);
    setLoading(false);
  }

  async function carregarCatalogoProdutos() {
    try {
      const cacheProds = await AsyncStorage.getItem('@cache_catalogo_produtos');
      if (cacheProds) {
        const dados = JSON.parse(cacheProds);
        setCatalogoProdutos(dados);
        setProdutosFiltrados(dados);
      }

      const online = await isOnline();
      if (!online) return;

      const token = await AsyncStorage.getItem('token');
      const payloadProdutos = { class: 'ProductService', method: 'loadAll' };

      const response = await fetch(await getApiUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payloadProdutos),
      });

      const res = await response.json();
      if (res.status === 'success' && Array.isArray(res.data)) {
        const ativos = res.data.filter((p: any) =>
          p.product_active === 'Y' ||
          p.product_active === true ||
          p.product_active === '1' ||
          p.product_active === 1
        );

        const formatados: ProdutoAPI[] = ativos.map((p: any) => ({
          product_id: Number(p.product_id),
          product_name: p.product_name,
          product_price: parseFloat(p.product_price) || 0,
          product_active: p.product_active,
        }));

        setCatalogoProdutos(formatados);
        setProdutosFiltrados(formatados);
        await AsyncStorage.setItem('@cache_catalogo_produtos', JSON.stringify(formatados));
      }
    } catch (err) {
      console.log('Erro ao buscar produtos:', err);
    }
  }

  async function carregarOrcamento() {
    const cacheChave = `@orcamento_chamado_${chamadoId}`;
    let cId = customerId;

    try {
      const cacheChamados = await AsyncStorage.getItem("@cache_chamados");
      if (cacheChamados) {
        const chamados = JSON.parse(cacheChamados);
        const chamadoAtual = chamados.find((item: any) => String(item.calendar_id) === String(chamadoId));
        if (chamadoAtual && chamadoAtual.customer_id) {
          cId = Number(chamadoAtual.customer_id);
          setCustomerId(cId);
        }
      }

      const cached = await AsyncStorage.getItem(cacheChave);
      if (cached) {
        const data = JSON.parse(cached);
        setProposalId(data.proposal_id || null);
        setProposalNumber(data.proposal_number || null);
        if (data.customer_id) setCustomerId(Number(data.customer_id));
        setValorMaoDeObra(parseFloat(data.proposal_labor_value) || 0);
        setStatus(data.proposal_status || 'pendente');
        setItens(data.itens || []);
      }

      const online = await isOnline();
      if (!online) return;

      const token = await AsyncStorage.getItem('token');
      const payloadProp = {
        class: 'ProposalService',
        method: 'loadAll',
        filters: [["calendar_id", "=", Number(chamadoId)]]
      };

      const responseProp = await fetch(await getApiUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payloadProp),
      });

      const resProp = await responseProp.json();

      if (resProp.status === 'success' && resProp.data && resProp.data.length > 0) {
        const prop = resProp.data[0];
        const pId = Number(prop.proposal_id);
        
        setProposalId(pId);
        setProposalNumber(Number(prop.proposal_number) || null);
        
        if (prop.customer_id) {
            setCustomerId(Number(prop.customer_id));
            cId = Number(prop.customer_id);
        }
        setValorMaoDeObra(parseFloat(prop.proposal_price) || 0);
        setStatus(prop.proposal_status || 'pendente');

        const payloadItens = {
          class: 'ProposalItemService',
          method: 'loadAll',
          filters: [["proposal_id", "=", pId]]
        };

        const responseItems = await fetch(await getApiUrl(), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(payloadItens),
        });

        const resItems = await responseItems.json();
        let itensCarregados: ItemOrcamento[] = [];
        if (resItems.status === 'success' && Array.isArray(resItems.data)) {
          itensCarregados = resItems.data.map((it: any) => ({
            proposal_item_id: Number(it.proposal_item_id),
            proposal_id: Number(it.proposal_id),
            product_id: Number(it.product_id),
            proposal_item_product_name: it.proposal_item_product_name,
            proposal_item_product_price: parseFloat(it.proposal_item_product_price) || 0,
            proposal_item_product_quantity: parseInt(it.proposal_item_product_quantity) || 1,
            proposal_item_total: parseFloat(it.proposal_item_total) || 0,
            is_local_only: false,
          }));
        }

        const itensLocaisPendentes = itens.filter(i => i.is_local_only);
        const listaFinal = [...itensCarregados, ...itensLocaisPendentes];

        setItens(listaFinal);

        await AsyncStorage.setItem(cacheChave, JSON.stringify({
          proposal_id: pId,
          proposal_number: prop.proposal_number,
          customer_id: cId,
          proposal_labor_value: prop.proposal_price,
          proposal_status: prop.proposal_status,
          itens: listaFinal,
        }));
      }
    } catch (err) {
      console.log('Erro ao carregar orçamento:', err);
    }
  }

  async function obterProximoNumeroOrcamento(): Promise<number | null> {
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await fetch(await getApiUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          class: 'ProposalService',
          method: 'loadAll',
          limit: 1,
          order: 'proposal_number',
          direction: 'desc'
        })
      });
      const result = await response.json();
      if (result.status === 'success' && result.data && result.data.length > 0) {
        return (Number(result.data[0].proposal_number) || 0) + 1;
      }
      return 1;
    } catch (e) {
      console.log('Erro ao buscar o próximo número de orçamento:', e);
      return null;
    }
  }

  async function salvarLocalmente(novoItens: ItemOrcamento[], novoMaoDeObra: number, novoStatus: string, idAtual = proposalId, numAtual = proposalNumber) {
    const cacheChave = `@orcamento_chamado_${chamadoId}`;
    const payload = {
      proposal_id: idAtual, 
      proposal_number: numAtual,
      customer_id: customerId,
      proposal_labor_value: novoMaoDeObra,
      proposal_status: novoStatus,
      itens: novoItens,
    };
    await AsyncStorage.setItem(cacheChave, JSON.stringify(payload));
  }

  async function handleConfirmarAdicionarProduto() {
    if (!produtoSelecionado) {
      Alert.alert('Atenção', 'Selecione um produto da lista.');
      return;
    }

    const qtd = parseInt(qtdAdicionar) || 1;
    const preco = produtoSelecionado.product_price;
    const total = preco * qtd;

    const novoItem: ItemOrcamento = {
      proposal_id: proposalId || undefined,
      product_id: produtoSelecionado.product_id,
      proposal_item_product_name: produtoSelecionado.product_name,
      proposal_item_product_price: preco,
      proposal_item_product_quantity: qtd,
      proposal_item_total: total,
      is_local_only: true, 
    };

    const novaLista = [...itens, novoItem];
    setItens(novaLista);
    await salvarLocalmente(novaLista, valorMaoDeObra, status, proposalId, proposalNumber);

    setModalVisivel(false);
    setProdutoSelecionado(null);
    setQtdAdicionar('1');
    setBuscaProduto('');
  }

  async function handleSalvarOrcamentoNoSistema() {
    setSalvando(true);
    const online = await isOnline();
    const itensPendentes = itens.filter(item => item.is_local_only);
    const representativeId = await AsyncStorage.getItem("representative_id");
    const dataAtual = new Date().toISOString().split('T')[0]; 

    let numOrc = proposalNumber;
    if (!numOrc && online) {
      numOrc = await obterProximoNumeroOrcamento();
      if (numOrc) setProposalNumber(numOrc);
    }

    const payloadCabecalho: any = {
      id: proposalId || undefined,
      proposal_id: proposalId,
      calendar_id: Number(chamadoId),
      proposal_date: dataAtual,
      proposal_price: valorMaoDeObra, 
      proposal_total_general: valorTotal, 
      proposal_status: status 
    };

    if (numOrc) payloadCabecalho.proposal_number = numOrc;
    if (representativeId) payloadCabecalho.user_id = Number(representativeId);
    if (customerId) payloadCabecalho.customer_id = Number(customerId);

    if (!online) {
      await adicionarNaFila({
        tipo: 'atualizar_status_orcamento' as any,
        ticketId: String(chamadoId),
        data: payloadCabecalho,
        criadoEm: new Date().toISOString(),
        tentativas: 0,
      } as any);

      for (const item of itensPendentes) {
        await adicionarNaFila({
          tipo: 'salvar_item_orcamento' as any,
          ticketId: String(chamadoId),
          data: {
            proposal_id: proposalId || 0,
            product_id: item.product_id,
            proposal_item_product_name: item.proposal_item_product_name,
            proposal_item_product_price: item.proposal_item_product_price,
            proposal_item_product_quantity: item.proposal_item_product_quantity,
            proposal_item_total: item.proposal_item_total,
          },
          criadoEm: new Date().toISOString(),
          tentativas: 0,
        } as any);
      }
      exibirAlerta('Modo Offline', 'As alterações foram salvas localmente e estão na fila de sincronização.', 'warning');
      setSalvando(false);
      return;
    }

    try {
      const token = await AsyncStorage.getItem('token');
      
      const responseCabecalho = await fetch(await getApiUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          class: 'ProposalService',
          method: 'store',
          data: payloadCabecalho,
        }),
      });

      const resultCabecalho = await responseCabecalho.json();

      let idDoOrcamento = proposalId;
      if (resultCabecalho.status === 'success' && resultCabecalho.data) {
        idDoOrcamento = resultCabecalho.data.proposal_id || resultCabecalho.data.id || proposalId;
        setProposalId(Number(idDoOrcamento)); 
        
        if (resultCabecalho.data.proposal_number) {
            setProposalNumber(Number(resultCabecalho.data.proposal_number));
            numOrc = Number(resultCabecalho.data.proposal_number);
        }
      }

      if (!idDoOrcamento) {
       exibirAlerta('Erro', 'Não foi possível gerar um número de orçamento válido no sistema.', 'error');
         setSalvando(false);
         return;
      }

      let falhouAlgumItem = false;
      for (const item of itensPendentes) {
        const payloadItem = {
          class: 'ProposalItemService',
          method: 'store',
          data: {
            proposal_id: Number(idDoOrcamento),
            product_id: item.product_id,
            proposal_item_product_name: item.proposal_item_product_name,
            proposal_item_product_price: item.proposal_item_product_price,
            proposal_item_product_quantity: item.proposal_item_product_quantity,
            proposal_item_total: item.proposal_item_total,
          },
        };

        const response = await fetch(await getApiUrl(), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(payloadItem),
        });

        const result = await response.json();
        if (result.status !== 'success') {
          falhouAlgumItem = true;
        }
      }

      if (falhouAlgumItem) {
       exibirAlerta('Atenção', 'O cabeçalho foi salvo, mas alguns itens falharam ao enviar.', 'warning');
      } else {
       const listaAtualizada = itens.map(i => ({ ...i, is_local_only: false }));
        setItens(listaAtualizada);
        await salvarLocalmente(listaAtualizada, valorMaoDeObra, status, idDoOrcamento, numOrc);
        
        // MENSAGEM DE SUCESSO PRINCIPAL
        exibirAlerta('Orçamento Salvo!', 'O orçamento foi registrado com sucesso no sistema.', 'success');
      }

   } catch (e) {
      exibirAlerta('Erro de Conexão', 'Falha na comunicação com o servidor. Tente novamente.', 'error');
    } finally {
      setSalvando(false);
    }
  }

  async function handleRemoverItem(index: number) {
    const itemRemovido = itens[index];
    const novaLista = itens.filter((_, i) => i !== index);
    setItens(novaLista);
    await salvarLocalmente(novaLista, valorMaoDeObra, status, proposalId, proposalNumber);

    if (itemRemovido.proposal_item_id && !itemRemovido.is_local_only) {
      const online = await isOnline();
      if (online) {
        try {
          const token = await AsyncStorage.getItem('token');
          await fetch(await getApiUrl(), {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              class: 'ProposalItemService',
              method: 'delete',
              id: itemRemovido.proposal_item_id, 
              data: { 
                 id: itemRemovido.proposal_item_id, 
                 proposal_item_id: itemRemovido.proposal_item_id 
              },
            }),
          });
        } catch (e) {
          exibirAlerta('Erro', 'Falha ao tentar remover o item do orçamento.', 'error');
          enfileirarDelete(itemRemovido.proposal_item_id);
        }
      } else {
        exibirAlerta('Modo Offline', 'O item foi removido localmente e está na fila de sincronização.', 'warning');
        enfileirarDelete(itemRemovido.proposal_item_id);
      }
    }
  }

  async function enfileirarDelete(idItem: number) {
    await adicionarNaFila({
      tipo: 'deletar_item_orcamento' as any,
      ticketId: String(chamadoId),
      data: { id: idItem, proposal_item_id: idItem }, 
      criadoEm: new Date().toISOString(),
      tentativas: 0,
    } as any);
  }

  async function handleAlterarStatus(novoStatus: 'aprovado' | 'recusado') {
    setStatus(novoStatus);
    await salvarLocalmente(itens, valorMaoDeObra, novoStatus, proposalId, proposalNumber);

    const online = await isOnline();
    let numOrc = proposalNumber;
    
    if (!numOrc && online) {
      numOrc = await obterProximoNumeroOrcamento();
      if (numOrc) setProposalNumber(numOrc);
    }

    const representativeId = await AsyncStorage.getItem("representative_id");
    const dataAtual = new Date().toISOString().split('T')[0];

    const payloadStatus: any = {
      id: proposalId || undefined, 
      proposal_id: proposalId,
      calendar_id: Number(chamadoId),
      proposal_date: dataAtual,
      proposal_price: valorMaoDeObra,
      proposal_total_general: valorTotal,
      proposal_status: novoStatus
    };

    if (numOrc) payloadStatus.proposal_number = numOrc;
    if (representativeId) payloadStatus.user_id = Number(representativeId);
    if (customerId) payloadStatus.customer_id = Number(customerId);

    if (online) {
      try {
        const token = await AsyncStorage.getItem('token');
        const res = await fetch(await getApiUrl(), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            class: 'ProposalService',
            method: 'store',
            data: payloadStatus,
          }),
        });
        
        const resultCab = await res.json();
        if (resultCab.status === 'success' && resultCab.data) {
           const idAtualizado = resultCab.data.proposal_id || resultCab.data.id || proposalId;
           if (idAtualizado) setProposalId(Number(idAtualizado));
        }

      } catch (e) {
        await adicionarNaFila({
            tipo: 'atualizar_status_orcamento' as any,
            ticketId: String(chamadoId),
            data: payloadStatus,
            criadoEm: new Date().toISOString(),
            tentativas: 0,
        } as any);
      }
    } else {
       await adicionarNaFila({
            tipo: 'atualizar_status_orcamento' as any,
            ticketId: String(chamadoId),
            data: payloadStatus,
            criadoEm: new Date().toISOString(),
            tentativas: 0,
       } as any);
    }
  }

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#0284c7" />
        <Text style={[styles.textoCarregando, { color: theme.subText }]}>Carregando orçamento...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]} contentContainerStyle={styles.conteudoContainer} showsVerticalScrollIndicator={false}>
      <StatusBar barStyle={darkMode ? "light-content" : "dark-content"} />

     {/* CABEÇALHO DO ORÇAMENTO */}
      <View style={[styles.cartaoCabecalho, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={styles.linhaSuperiorCabecalho}>

          <TouchableOpacity 
            onPress={() => router.back()} 
            style={styles.botaoVoltar}
            activeOpacity={0.7}
          >
            <ArrowLeft size={22} color={theme.text} />
          </TouchableOpacity>

          <View style={styles.grupoTituloCabecalho}>
            <View style={styles.envolvedorIcone}>
              <DollarSign size={22} color="#0284c7" />
            </View>
            <View style={{ flexShrink: 1 }}>
              <Text style={[styles.subtituloCabecalho, { color: theme.subText }]}>ORÇAMENTO DE SERVIÇO</Text>
              <Text style={[styles.tituloCabecalho, { color: theme.text }]} numberOfLines={1} adjustsFontSizeToFit>
                {proposalNumber ? `#${proposalNumber}` : 'Novo Orçamento'}
              </Text>
            </View>
          </View>
        </View>

        <View style={[styles.containerVinculoChamado, { backgroundColor: darkMode ? 'rgba(2, 132, 199, 0.1)' : '#f0f9ff', borderColor: darkMode ? 'rgba(2, 132, 199, 0.3)' : '#bae6fd' }]}>
          <Text style={[styles.textoVinculoChamado, { color: '#0284c7' }]} numberOfLines={1}>
            Vinculado ao Chamado <Text style={{ fontWeight: 'bold' }}>#{chamadoId}</Text>
          </Text>
        </View>
      </View>

      {/* LISTA DE PEÇAS E MATERIAIS */}
      <View style={[styles.cartaoSessao, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={styles.cabecalhoSessao}>
          <Text style={[styles.tituloSessao, { color: theme.text }]}>Produtos e Serviços</Text>
          <Text style={[styles.textoContagemItem, { color: theme.subText }]}>{itens.length} {itens.length === 1 ? 'item' : 'itens'}</Text>
        </View>

        {itens.length === 0 ? (
          <View style={styles.containerVazio}>
            <PackageOpen size={48} color={theme.subText} style={{ opacity: 0.3, marginBottom: 12 }} />
            <Text style={[styles.textoVazio, { color: theme.subText }]}>Nenhum material adicionado até o momento.</Text>
          </View>
        ) : (
          itens.map((item, index) => (
            <View key={item.proposal_item_id ? `item_${item.proposal_item_id}` : `local_${index}`} style={[styles.linhaItem, { backgroundColor: darkMode ? 'rgba(255,255,255,0.02)' : '#f8fafc', borderColor: theme.border }]}>
              <View style={{ flex: 1, marginRight: 12 }}>
                <Text style={[styles.itemDescricao, { color: theme.text }]} numberOfLines={2}>
                  {item.proposal_item_product_name}
                </Text>
                <Text style={[styles.itemDetalhes, { color: theme.subText }]} numberOfLines={1} adjustsFontSizeToFit>
                  {item.proposal_item_product_quantity}x R$ {Number(item.proposal_item_product_price).toFixed(2).replace('.', ',')}
                  {item.is_local_only && <Text style={{ color: '#f59e0b', fontWeight: 'bold' }}> • Não sincronizado</Text>}
                </Text>
              </View>
              <Text style={[styles.itemTotal, { color: theme.text }]} numberOfLines={1} adjustsFontSizeToFit>
                R$ {Number(item.proposal_item_total).toFixed(2).replace('.', ',')}
              </Text>
              <TouchableOpacity onPress={() => handleRemoverItem(index)} style={styles.botaoDeletar} activeOpacity={0.7}>
                <Trash2 size={18} color="#ef4444" />
              </TouchableOpacity>
            </View>
          ))
        )}

        <TouchableOpacity style={styles.botaoAdicionarItem} onPress={() => setModalVisivel(true)} activeOpacity={0.7}>
          <Plus size={20} color="#0284c7" />
          <Text style={styles.textoBotaoAdicionarItem}>Adicionar</Text>
        </TouchableOpacity>
      </View>

      {/* RESUMO FINANCEIRO */}
      <View style={[styles.cartaoResumo, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Text style={[styles.tituloSessao, { color: theme.text, marginBottom: 12 }]}>Resumo Financeiro</Text>
        
        <View style={[styles.divisor, { backgroundColor: theme.border }]} />

        <View style={styles.linhaResumoTotal}>
          <Text style={[styles.rotuloTotal, { color: theme.text }]}>VALOR TOTAL</Text>
          <Text style={styles.valorTotal} numberOfLines={1} adjustsFontSizeToFit>
            R$ {valorTotal.toFixed(2).replace('.', ',')}
          </Text>
        </View>
      </View>

      {/* AÇÕES DE STATUS */}

      {/* BOTÃO PRINCIPAL DE SALVAR */}
      <TouchableOpacity 
        style={[styles.botaoSalvarSistema, salvando && { opacity: 0.7 }]} 
        onPress={handleSalvarOrcamentoNoSistema}
        disabled={salvando}
        activeOpacity={0.85}
      >
        {salvando ? (
           <ActivityIndicator size="small" color="#fff" style={{ marginRight: 8 }} />
        ) : (
           <Save size={22} color="#ffffff" style={{ marginRight: 8 }} />
        )}
        <Text style={styles.textoBotaoSalvarSistema}>
          {salvando ? 'Salvando...' : 'Salvar'}
        </Text>
      </TouchableOpacity>

      {/* MODAL DE SELEÇÃO DE PRODUTOS */}
      <Modal visible={modalVisivel} transparent animationType="fade" onRequestClose={() => setModalVisivel(false)}>
        <View style={styles.sobreposicaoModal}>
          <View style={[styles.conteudoModal, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.cabecalhoModal}>
              <Text style={[styles.tituloModal, { color: theme.text }]}>Adicionar</Text>
              <TouchableOpacity onPress={() => setModalVisivel(false)} style={styles.botaoFecharModal} activeOpacity={0.7}>
                <X size={24} color={theme.subText} />
              </TouchableOpacity>
            </View>

            <View style={[styles.caixaPesquisa, { backgroundColor: theme.background, borderColor: theme.border }]}>
              <Search size={18} color={theme.subText} style={{ marginRight: 8 }} />
              <TextInput
                style={{ flex: 1, fontSize: 15, color: theme.text }}
                placeholder="Buscar produto no catálogo..."
                placeholderTextColor={theme.subText}
                value={buscaProduto}
                onChangeText={setBuscaProduto}
              />
            </View>

            <View style={{ height: 260, marginBottom: 16 }}>
              <FlatList
                data={produtosFiltrados}
                keyExtractor={(item) => String(item.product_id)}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => {
                  const selecionado = produtoSelecionado?.product_id === item.product_id;
                  return (
                    <TouchableOpacity
                      style={[styles.opcaoProduto, selecionado && { backgroundColor: darkMode ? 'rgba(2, 132, 199, 0.15)' : '#e0f2fe', borderColor: '#0284c7' }, { borderColor: theme.border }]}
                      onPress={() => setProdutoSelecionado(item)}
                      activeOpacity={0.7}
                    >
                      <View style={{ flex: 1, marginRight: 12 }}>
                        <Text style={[styles.textoOpcaoProduto, { color: theme.text }, selecionado && { fontWeight: '700', color: '#0284c7' }]} numberOfLines={2}>
                          {item.product_name}
                        </Text>
                        <Text style={[styles.precoOpcaoProduto, { color: theme.subText }]} numberOfLines={1}>
                          R$ {item.product_price.toFixed(2).replace('.', ',')}
                        </Text>
                      </View>
                      {selecionado && <CheckCircle2 size={20} color="#0284c7" />}
                    </TouchableOpacity>
                  );
                }}
                ListEmptyComponent={
                  <View style={{ padding: 30, alignItems: 'center' }}>
                    <Text style={{ color: theme.subText, fontSize: 14 }}>Nenhum produto encontrado.</Text>
                  </View>
                }
              />
            </View>

            <Text style={[styles.rotuloEntrada, { color: theme.text }]}>Quantidade</Text>
            <TextInput
              style={[styles.entradaTexto, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
              keyboardType="numeric"
              value={qtdAdicionar}
              onChangeText={setQtdAdicionar}
            />

            <TouchableOpacity style={styles.botaoSalvarItem} onPress={handleConfirmarAdicionarProduto} activeOpacity={0.85}>
              <Text style={styles.textoBotaoSalvarItem}>Confirmar e Adicionar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL DE ALERTA PERSONALIZADO DA TELA DE ORÇAMENTO */}
      <Modal transparent visible={alertaModalVisible} animationType="fade" onRequestClose={() => setAlertaModalVisible(false)}>
        <View style={styles.sobreposicaoModal}>
          <View style={[styles.conteudoModalAlerta, { backgroundColor: theme.card, borderColor: theme.border }]}>
            
            {/* Ícone Indicador de Status */}
            <View style={[
              styles.envolvedorIconeAlerta, 
              { backgroundColor: alertaModalData.tipo === 'success' ? 'rgba(34, 197, 94, 0.15)' : alertaModalData.tipo === 'warning' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(239, 68, 68, 0.15)' }
            ]}>
              {alertaModalData.tipo === 'success' && <CheckCircle2 size={36} color="#22c55e" />}
              {alertaModalData.tipo === 'warning' && <Clock size={36} color="#f59e0b" />}
              {alertaModalData.tipo === 'error' && <XCircle size={36} color="#ef4444" />}
            </View>

            <Text style={[styles.tituloModalAlerta, { color: theme.text }]}>
              {alertaModalData.titulo}
            </Text>

            <Text style={[styles.mensagemModalAlerta, { color: theme.subText }]}>
              {alertaModalData.mensagem}
            </Text>

            <TouchableOpacity 
              style={[
                styles.botaoConfirmarAlerta, 
                { backgroundColor: alertaModalData.tipo === 'success' ? '#22c55e' : alertaModalData.tipo === 'warning' ? '#f59e0b' : '#3b82f6' }
              ]} 
              onPress={() => setAlertaModalVisible(false)}
              activeOpacity={0.85}
            >
              <Text style={styles.textoBotaoConfirmarAlerta}>OK, Entendido</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1 
  },
  conteudoContainer: { 
    padding: 20, 
    paddingBottom: 50, 
    marginTop: 40 
  },
  textoCarregando: { 
    marginTop: 16, 
    fontSize: 15, 
    fontWeight: '500' 
  },
  
  cartaoCabecalho: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  linhaSuperiorCabecalho: {
    flexDirection: 'row',
    alignItems: 'center', 
    marginBottom: 16,
    gap: 10,
  },
  botaoVoltar: {
    padding: 10,
    backgroundColor: 'rgba(148, 163, 184, 0.1)',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  grupoTituloCabecalho: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 12, 
    flex: 1 
  },
 
  envolvedorIcone: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(2, 132, 199, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  subtituloCabecalho: { 
    fontSize: 12, 
    fontWeight: '700', 
    letterSpacing: 0.8, 
    marginBottom: 4, 
    textTransform: 'uppercase' 
  },
  tituloCabecalho: { 
    fontSize: 22, 
    fontWeight: '800' 
  },
  containerVinculoChamado: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,

  },
  textoVinculoChamado: { 
    fontSize: 13, 
  textAlign: 'center',
    fontWeight: '500' 
  },

  cartaoSessao: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  cabecalhoSessao: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 16 
  },
  tituloSessao: { 
    fontSize: 16, 
    fontWeight: 'bold' 
  },
  textoContagemItem: { 
    fontSize: 13, 
    fontWeight: '600' 
  },
  containerVazio: { 
    alignItems: 'center', 
    paddingVertical: 30 
  },
  textoVazio: { 
    fontSize: 14, 
    fontStyle: 'italic', 
    textAlign: 'center' 
  },

  linhaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: 1,
  },
  itemDescricao: { 
    fontSize: 15, 
    fontWeight: '700', 
    marginBottom: 4 
  },
  itemDetalhes: { 
    fontSize: 13, 
    fontWeight: '500' 
  },
  itemTotal: { 
    fontSize: 15, 
    fontWeight: '800', 
    marginRight: 12, 
    flexShrink: 1 
  },
  botaoDeletar: { 
    padding: 8, 
    borderRadius: 10, 
    backgroundColor: 'rgba(239, 68, 68, 0.1)' 
  },

  botaoAdicionarItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#0284c7',
    borderStyle: 'dashed',
    borderRadius: 14,
    marginTop: 10,
    gap: 10,
    backgroundColor: 'rgba(2, 132, 199, 0.04)',
  },
  textoBotaoAdicionarItem: { 
    color: '#0284c7', 
    fontWeight: '700', 
    fontSize: 15 
  },

  cartaoResumo: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  linhaResumo: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    marginBottom: 12 
  },
  rotuloResumo: { 
    fontSize: 14 
  },
  valorResumo: { 
    fontSize: 14, 
    fontWeight: '600' 
  },
  divisor: { 
    height: 1, 
    marginVertical: 12 
  },
  linhaResumoTotal: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginTop: 8 
  },
  rotuloTotal: { 
    fontSize: 15, 
    fontWeight: '800', 
    letterSpacing: 0.5 
  },
  valorTotal: { 
    fontSize: 26, 
    fontWeight: '900', 
    color: '#22c55e', 
    flexShrink: 1 
  },

  botaoSalvarSistema: {
    backgroundColor: '#0284c7',
    flexDirection: 'row',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0284c7',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
    marginBottom: 20,
  },
  textoBotaoSalvarSistema: { 
    color: '#ffffff', 
    fontWeight: '800', 
    fontSize: 16, 
    letterSpacing: 0.5 
  },

  sobreposicaoModal: { 
    flex: 1, 
    backgroundColor: 'rgba(0, 0, 0, 0.75)', 
    justifyContent: 'center', 
    padding: 24 
  },
  conteudoModal: { 
    borderRadius: 24, 
    padding: 24, 
    borderWidth: 1, 
    shadowColor: '#000', 
    shadowOpacity: 0.3, 
    shadowRadius: 15, 
    elevation: 15 
  },
  cabecalhoModal: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 20 
  },
  tituloModal: { 
    fontSize: 20, 
    fontWeight: '800' 
  },
  botaoFecharModal: { 
    padding: 6, 
    borderRadius: 12 
  },
  caixaPesquisa: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    borderWidth: 1, 
    borderRadius: 14, 
    paddingHorizontal: 16, 
    paddingVertical: 12, 
    marginBottom: 16 
  },
  opcaoProduto: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingVertical: 14, 
    paddingHorizontal: 14, 
    borderBottomWidth: 1, 
    borderRadius: 12, 
    marginBottom: 8 
  },
  textoOpcaoProduto: { 
    fontSize: 15, 
    fontWeight: '600', 
    marginBottom: 4 
  },
  precoOpcaoProduto: { 
    fontSize: 13, 
    fontWeight: '500' 
  },
  rotuloEntrada: { 
    fontSize: 14, 
    fontWeight: '700', 
    marginBottom: 8, 
    marginTop: 8 
  },
  entradaTexto: { 
    borderWidth: 1, 
    borderRadius: 14, 
    padding: 16, 
    fontSize: 16, 
    fontWeight: '600' 
  },
  botaoSalvarItem: { 
    backgroundColor: '#0284c7', 
    padding: 18, 
    borderRadius: 14, 
    alignItems: 'center', 
    marginTop: 24 
  },
  textoBotaoSalvarItem: { 
    color: '#ffffff', 
    fontWeight: '800', 
    fontSize: 16 
  },

  conteudoModalAlerta: {
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 15,
    elevation: 10,
    maxWidth: 340,
    width: '100%',
    alignSelf: 'center',
  },
  envolvedorIconeAlerta: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  tituloModalAlerta: {
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  mensagemModalAlerta: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  botaoConfirmarAlerta: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textoBotaoConfirmarAlerta: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 15,
  },
});