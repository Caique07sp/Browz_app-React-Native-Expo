import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Modal,
  TextInput,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  StatusBar
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams } from 'expo-router';
import {
  Plus,
  Trash2,
  DollarSign,
  Wrench,
  CheckCircle2,
  Clock,
  XCircle,
  X,
  Search,
  Save,
  PackageOpen
} from 'lucide-react-native';

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
      Alert.alert('Modo Offline', 'As alterações foram salvas localmente e estão na fila de sincronização.');
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
         Alert.alert('Erro', 'Não foi possível gerar um número de orçamento válido no sistema.');
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
        Alert.alert('Atenção', 'O cabeçalho foi salvo, mas alguns itens falharam ao enviar.');
      } else {
        const listaAtualizada = itens.map(i => ({ ...i, is_local_only: false }));
        setItens(listaAtualizada);
        await salvarLocalmente(listaAtualizada, valorMaoDeObra, status, idDoOrcamento, numOrc);
        Alert.alert('Sucesso', 'Orçamento salvo no sistema com sucesso!');
      }

    } catch (e) {
      Alert.alert('Erro', 'Falha na comunicação com o servidor.');
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
          enfileirarDelete(itemRemovido.proposal_item_id);
        }
      } else {
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

  const renderStatusBadge = () => {
    switch (status) {
      case 'aprovado':
        return (
          <View style={[styles.badgeContainer, { backgroundColor: darkMode ? 'rgba(22, 163, 74, 0.2)' : '#dcfce7', borderColor: '#22c55e' }]}>
            <CheckCircle2 size={14} color="#22c55e" />
            <Text style={[styles.badgeText, { color: '#22c55e' }]}>Aprovado</Text>
          </View>
        );
      case 'recusado':
        return (
          <View style={[styles.badgeContainer, { backgroundColor: darkMode ? 'rgba(239, 68, 68, 0.2)' : '#fee2e2', borderColor: '#ef4444' }]}>
            <XCircle size={14} color="#ef4444" />
            <Text style={[styles.badgeText, { color: '#ef4444' }]}>Recusado</Text>
          </View>
        );
      default:
        return (
          <View style={[styles.badgeContainer, { backgroundColor: darkMode ? 'rgba(245, 158, 11, 0.2)' : '#fef3c7', borderColor: '#f59e0b' }]}>
            <Clock size={14} color="#f59e0b" />
            <Text style={[styles.badgeText, { color: '#f59e0b' }]}>Pendente</Text>
          </View>
        );
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#0284c7" />
        <Text style={[styles.loadingText, { color: theme.subText }]}>Carregando orçamento...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]} contentContainerStyle={styles.contentContainer}>
      <StatusBar barStyle={darkMode ? "light-content" : "dark-content"} />

      {/* CABEÇALHO DO ORÇAMENTO */}
      <View style={[styles.headerCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={styles.headerTopRow}>
          <View style={styles.headerTitleGroup}>
            <View style={styles.iconWrapper}>
              <DollarSign size={22} color="#0284c7" />
            </View>
            <View>
              <Text style={[styles.headerSubtitle, { color: theme.subText }]}>ORÇAMENTO DE SERVIÇO</Text>
              <Text style={[styles.headerTitle, { color: theme.text }]}>
                {proposalNumber ? `#${proposalNumber}` : 'Novo Orçamento'}
              </Text>
            </View>
          </View>
          {renderStatusBadge()}
        </View>

        <View style={[styles.ticketVincContainer, { backgroundColor: darkMode ? 'rgba(2, 132, 199, 0.1)' : '#f0f9ff', borderColor: darkMode ? 'rgba(2, 132, 199, 0.3)' : '#bae6fd' }]}>
          <Text style={[styles.ticketVincText, { color: '#0284c7' }]}>
            Vinculado ao Chamado <Text style={{ fontWeight: 'bold' }}>#{chamadoId}</Text>
          </Text>
        </View>
      </View>

      {/* LISTA DE PEÇAS E MATERIAIS */}
      <View style={[styles.sectionCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Peças e Materiais</Text>
          <Text style={[styles.itemCountText, { color: theme.subText }]}>{itens.length} {itens.length === 1 ? 'item' : 'itens'}</Text>
        </View>

        {itens.length === 0 ? (
          <View style={styles.emptyContainer}>
            <PackageOpen size={40} color={theme.subText} style={{ opacity: 0.5, marginBottom: 8 }} />
            <Text style={[styles.emptyText, { color: theme.subText }]}>Nenhum material adicionado até o momento.</Text>
          </View>
        ) : (
          itens.map((item, index) => (
            <View key={item.proposal_item_id ? `item_${item.proposal_item_id}` : `local_${index}`} style={[styles.itemRow, { backgroundColor: darkMode ? 'rgba(255,255,255,0.03)' : '#f8fafc', borderColor: theme.border }]}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={[styles.itemDescricao, { color: theme.text }]}>{item.proposal_item_product_name}</Text>
                <Text style={[styles.itemDetalhes, { color: theme.subText }]}>
                  {item.proposal_item_product_quantity}x R$ {Number(item.proposal_item_product_price).toFixed(2).replace('.', ',')}
                  {item.is_local_only && <Text style={{ color: '#f59e0b', fontWeight: 'bold' }}> • Não sincronizado</Text>}
                </Text>
              </View>
              <Text style={[styles.itemTotal, { color: theme.text }]}>
                R$ {Number(item.proposal_item_total).toFixed(2).replace('.', ',')}
              </Text>
              <TouchableOpacity onPress={() => handleRemoverItem(index)} style={styles.botaoDeletar} activeOpacity={0.7}>
                <Trash2 size={18} color="#ef4444" />
              </TouchableOpacity>
            </View>
          ))
        )}

        <TouchableOpacity style={styles.botaoAdicionarItem} onPress={() => setModalVisivel(true)} activeOpacity={0.8}>
          <Plus size={18} color="#0284c7" />
          <Text style={styles.textoBotaoAdicionarItem}>Adicionar Item / Peça</Text>
        </TouchableOpacity>
      </View>

      {/* RESUMO FINANCEIRO */}
      <View style={[styles.summaryCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Text style={[styles.sectionTitle, { color: theme.text, marginBottom: 12 }]}>Resumo Financeiro</Text>
        
        <View style={styles.summaryRow}>
          <Text style={[styles.summaryLabel, { color: theme.subText }]}>Subtotal de Peças</Text>
          <Text style={[styles.summaryValue, { color: theme.text }]}>R$ {subtotalPecas.toFixed(2).replace('.', ',')}</Text>
        </View>

        <View style={styles.summaryRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Wrench size={14} color={theme.subText} style={{ marginRight: 6 }} />
            <Text style={[styles.summaryLabel, { color: theme.subText }]}>Mão de Obra</Text>
          </View>
          <Text style={[styles.summaryValue, { color: theme.text }]}>R$ {Number(valorMaoDeObra).toFixed(2).replace('.', ',')}</Text>
        </View>

        <View style={[styles.divider, { backgroundColor: theme.border }]} />

        <View style={styles.summaryRowTotal}>
          <Text style={[styles.totalLabel, { color: theme.text }]}>VALOR TOTAL</Text>
          <Text style={styles.totalValue}>R$ {valorTotal.toFixed(2).replace('.', ',')}</Text>
        </View>
      </View>

      {/* AÇÕES DE STATUS */}
      <View style={[styles.sectionCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Text style={[styles.sectionTitle, { color: theme.text, marginBottom: 12 }]}>Status do Orçamento</Text>
        <View style={styles.grupoBotaoStatus}>
          <TouchableOpacity
            style={[styles.botaoStatus, status === 'aprovado' && styles.botaoStatusAprovado, { borderColor: status === 'aprovado' ? '#22c55e' : theme.border, backgroundColor: status === 'aprovado' ? '#22c55e' : theme.background }]}
            onPress={() => handleAlterarStatus('aprovado')}
            activeOpacity={0.8}
          >
            <CheckCircle2 size={16} color={status === 'aprovado' ? '#fff' : '#22c55e'} style={{ marginRight: 6 }} />
            <Text style={[styles.textoBotaoStatus, { color: status === 'aprovado' ? '#fff' : theme.text }]}>Aprovar</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.botaoStatus, status === 'recusado' && styles.botaoStatusRecusado, { borderColor: status === 'recusado' ? '#ef4444' : theme.border, backgroundColor: status === 'recusado' ? '#ef4444' : theme.background }]}
            onPress={() => handleAlterarStatus('recusado')}
            activeOpacity={0.8}
          >
            <XCircle size={16} color={status === 'recusado' ? '#fff' : '#ef4444'} style={{ marginRight: 6 }} />
            <Text style={[styles.textoBotaoStatus, { color: status === 'recusado' ? '#fff' : theme.text }]}>Recusar</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* BOTÃO PRINCIPAL DE SALVAR */}
      <TouchableOpacity 
        style={[styles.botaoSalvarSistema, salvando && { opacity: 0.7 }]} 
        onPress={handleSalvarOrcamentoNoSistema}
        disabled={salvando}
        activeOpacity={0.85}
      >
        {salvando ? (
           <ActivityIndicator size="small" color="#fff" />
        ) : (
           <Save size={20} color="#ffffff" style={{ marginRight: 8 }} />
        )}
        <Text style={styles.textoBotaoSalvarSistema}>
          {salvando ? 'Enviando...' : 'Salvar Orçamento no Sistema'}
        </Text>
      </TouchableOpacity>

      {/* MODAL DE SELEÇÃO DE PRODUTOS */}
      <Modal visible={modalVisivel} transparent animationType="fade" onRequestClose={() => setModalVisivel(false)}>
        <View style={styles.sobreposicaoModal}>
          <View style={[styles.conteudoModal, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.cabecalhoModal}>
              <Text style={[styles.tituloModal, { color: theme.text }]}>Adicionar Produto</Text>
              <TouchableOpacity onPress={() => setModalVisivel(false)} style={styles.modalCloseBtn}>
                <X size={20} color={theme.subText} />
              </TouchableOpacity>
            </View>

            <View style={[styles.caixaPesquisa, { backgroundColor: theme.background, borderColor: theme.border }]}>
              <Search size={16} color={theme.subText} style={{ marginRight: 8 }} />
              <TextInput
                style={{ flex: 1, fontSize: 14, color: theme.text }}
                placeholder="Buscar produto no catálogo..."
                placeholderTextColor={theme.subText}
                value={buscaProduto}
                onChangeText={setBuscaProduto}
              />
            </View>

            <View style={{ height: 220, marginBottom: 16 }}>
              <FlatList
                data={produtosFiltrados}
                keyExtractor={(item) => String(item.product_id)}
                renderItem={({ item }) => {
                  const selecionado = produtoSelecionado?.product_id === item.product_id;
                  return (
                    <TouchableOpacity
                      style={[styles.opcaoProduto, selecionado && { backgroundColor: darkMode ? 'rgba(2, 132, 199, 0.2)' : '#e0f2fe', borderColor: '#0284c7' }, { borderColor: theme.border }]}
                      onPress={() => setProdutoSelecionado(item)}
                      activeOpacity={0.8}
                    >
                      <View style={{ flex: 1, marginRight: 8 }}>
                        <Text style={[styles.textoOpcaoProduto, { color: theme.text }, selecionado && { fontWeight: 'bold', color: '#0284c7' }]}>
                          {item.product_name}
                        </Text>
                        <Text style={[styles.precoOpcaoProduto, { color: theme.subText }]}>
                          R$ {item.product_price.toFixed(2).replace('.', ',')}
                        </Text>
                      </View>
                      {selecionado && <CheckCircle2 size={18} color="#0284c7" />}
                    </TouchableOpacity>
                  );
                }}
                ListEmptyComponent={
                  <View style={{ padding: 20, alignItems: 'center' }}>
                    <Text style={{ color: theme.subText, fontSize: 13 }}>Nenhum produto encontrado.</Text>
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  contentContainer: { padding: 16, paddingBottom: 40 },
  loadingText: { marginTop: 12, fontSize: 14, fontWeight: '500' },
  
  headerCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  headerTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  headerTitleGroup: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(2, 132, 199, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerSubtitle: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5, marginBottom: 2 },
  headerTitle: { fontSize: 20, fontWeight: 'bold' },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  badgeText: { fontSize: 12, fontWeight: '700', marginLeft: 4 },
  ticketVincContainer: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  ticketVincText: { fontSize: 12, fontWeight: '500' },

  sectionCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 15, fontWeight: 'bold' },
  itemCountText: { fontSize: 12, fontWeight: '500' },
  emptyContainer: { alignItems: 'center', paddingVertical: 20 },
  emptyText: { fontSize: 13, fontStyle: 'italic', textAlign: 'center' },

  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
  },
  itemDescricao: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  itemDetalhes: { fontSize: 12 },
  itemTotal: { fontSize: 14, fontWeight: 'bold', marginRight: 12 },
  botaoDeletar: { padding: 6, borderRadius: 8, backgroundColor: 'rgba(239, 68, 68, 0.1)' },

  botaoAdicionarItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderWidth: 1.5,
    borderColor: '#0284c7',
    borderStyle: 'dashed',
    borderRadius: 12,
    marginTop: 8,
    gap: 8,
    backgroundColor: 'rgba(2, 132, 199, 0.02)',
  },
  textoBotaoAdicionarItem: { color: '#0284c7', fontWeight: '600', fontSize: 14 },

  summaryCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  summaryLabel: { fontSize: 13 },
  summaryValue: { fontSize: 13, fontWeight: '600' },
  divider: { height: 1, marginVertical: 8 },
  summaryRowTotal: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  totalLabel: { fontSize: 14, fontWeight: 'bold' },
  totalValue: { fontSize: 20, fontWeight: 'bold', color: '#22c55e' },

  recipienteAcoes: { marginTop: 4, marginBottom: 20 },
  tituloAcoes: { fontSize: 12, marginBottom: 8 },
  grupoBotaoStatus: { flexDirection: 'row', gap: 10 },
  botaoStatus: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botaoStatusAprovado: { backgroundColor: '#22c55e', borderColor: '#22c55e' },
  botaoStatusRecusado: { backgroundColor: '#ef4444', borderColor: '#ef4444' },
  textoBotaoStatus: { fontSize: 14, fontWeight: '600' },

  botaoSalvarSistema: {
    backgroundColor: '#0284c7',
    flexDirection: 'row',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0284c7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 10,
  },
  textoBotaoSalvarSistema: { color: '#ffffff', fontWeight: 'bold', fontSize: 16 },

  sobreposicaoModal: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.6)', justifyContent: 'center', padding: 20 },
  conteudoModal: { borderRadius: 20, padding: 20, borderWidth: 1, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 10, elevation: 10 },
  cabecalhoModal: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  tituloModal: { fontSize: 18, fontWeight: 'bold' },
  modalCloseBtn: { padding: 4, borderRadius: 8 },
  caixaPesquisa: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 12 },
  opcaoProduto: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 12, borderBottomWidth: 1, borderRadius: 10, marginBottom: 4 },
  textoOpcaoProduto: { fontSize: 14, fontWeight: '500' },
  precoOpcaoProduto: { fontSize: 12, marginTop: 2 },
  rotuloEntrada: { fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 4 },
  entradaTexto: { borderWidth: 1, borderRadius: 12, padding: 12, fontSize: 15 },
  botaoSalvarItem: { backgroundColor: '#0284c7', padding: 14, borderRadius: 12, alignItems: 'center', marginTop: 20 },
  textoBotaoSalvarItem: { color: '#ffffff', fontWeight: 'bold', fontSize: 15 },
});