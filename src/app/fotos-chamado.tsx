/**
 * fotos-chamado.tsx
 *
 * Tela de gerenciamento de fotos de um chamado.
 *
 * Fluxo offline-first:
 * 1. Ao adicionar uma foto (câmera ou galeria), ela é copiada para
 *    documentDirectory/fotos_offline/ — diretório permanente que o SO não apaga.
 * 2. A URI permanente é salva em AsyncStorage (@fotos_chamado_<id>) para exibição local.
 * 3. A foto é enfileirada individualmente em @offline_queue como "foto_chamado",
 *    independente de estar online ou offline.
 * 4. Quando online, sincronizarPendentes() em sync.ts processa a fila e faz upload.
 *
 * Por que enfileirar sempre (mesmo online)?
 * - Garante que se a conexão cair durante o upload, a foto não se perde.
 * - O sync.ts já trata o caso de arquivo inexistente (remove da fila sem erro).
 */


import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { useTheme } from '@/theme/ThemeContext';
import { adicionarNaFila } from '@/services/offlineQueue';
import { sincronizarPendentes } from '@/services/sync';
import { isOnline } from '@/services/network';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Camera, ChevronLeft, Image as ImageIcon, Trash2 } from 'lucide-react-native';
import * as FileSystem from 'expo-file-system/legacy';

// Diretório permanente — mesmo padrão do offlinePhotos.ts
const FOTOS_OFFLINE_DIR = `${FileSystem.documentDirectory}fotos_offline/`;

async function garantirDiretorio(): Promise<void> {
  const info = await FileSystem.getInfoAsync(FOTOS_OFFLINE_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(FOTOS_OFFLINE_DIR, { intermediates: true });
  }
}

export default function FotosChamado() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const ticketId = String(id);

  const [fotos, setFotos] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [adicionando, setAdicionando] = useState(false);
  const { theme } = useTheme();

  useEffect(() => {
    carregarFotosSalvas();
  }, [id]);

  // ─── Carrega fotos do AsyncStorage (apenas URIs permanentes) ────────────────

  async function carregarFotosSalvas() {
    try {
      const salvas = await AsyncStorage.getItem(`@fotos_chamado_${ticketId}`);
      if (salvas) {
        const lista: string[] = JSON.parse(salvas);
        // Filtra URIs que ainda existem fisicamente no disco
        const existentes = await Promise.all(
          lista.map(async (uri) => {
            const info = await FileSystem.getInfoAsync(uri);
            return info.exists ? uri : null;
          })
        );
        const validas = existentes.filter(Boolean) as string[];
        // Persiste lista limpa caso algum arquivo tenha sido removido externamente
        if (validas.length !== lista.length) {
          await AsyncStorage.setItem(
            `@fotos_chamado_${ticketId}`,
            JSON.stringify(validas)
          );
        }
        setFotos(validas);
      }
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível carregar as fotos.');
    } finally {
      setLoading(false);
    }
  }

  async function salvarListaNoStorage(novasFotos: string[]) {
    await AsyncStorage.setItem(
      `@fotos_chamado_${ticketId}`,
      JSON.stringify(novasFotos)
    );
    setFotos(novasFotos);
  }

  // ─── Adiciona foto (câmera ou galeria) ──────────────────────────────────────

  const adicionarFoto = async (origem: 'camera' | 'galeria') => {
    if (adicionando) return;

    const permissao =
      origem === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissao.granted) {
      Alert.alert(
        'Atenção',
        `Precisamos de permissão para acessar a ${origem === 'camera' ? 'câmera' : 'galeria'}.`
      );
      return;
    }

    const resultado =
      origem === 'camera'
        ? await ImagePicker.launchCameraAsync({ quality: 0.2 })
        : await ImagePicker.launchImageLibraryAsync({
            quality: 0.2,
            allowsMultipleSelection: true,
          });

    if (resultado.canceled) return;

    setAdicionando(true);

    try {
      await garantirDiretorio();

      const novasURIs: string[] = [];

      for (const asset of resultado.assets) {
        // Nome único no diretório permanente
        const nomeArquivo = `ticket_${ticketId}_${Date.now()}_${Math.floor(
          Math.random() * 10000
        )}.jpg`;
        const destino = `${FOTOS_OFFLINE_DIR}${nomeArquivo}`;

        // Copia para diretório permanente
        await FileSystem.copyAsync({ from: asset.uri, to: destino });

        console.log(`📁 Foto salva permanentemente: ${destino}`);

        // Enfileira para sync (independente de estar online ou não)
        await adicionarNaFila({
          tipo: 'foto_chamado',
          ticketId,
          uri: destino,
          fileName: nomeArquivo,
          description: 'Foto do chamado',
          criadoEm: new Date().toISOString(),
          tentativas: 0,
        });

        console.log(`📋 Foto enfileirada para sync — ticket: ${ticketId}`);
        novasURIs.push(destino);
      }

      const listaAtualizada = [...fotos, ...novasURIs];
      await salvarListaNoStorage(listaAtualizada);

      // Se estiver online, tenta sincronizar imediatamente em background
      const online = await isOnline();
      if (online) {
        sincronizarPendentes().catch((e) =>
          console.warn('⚠️ Sync em background falhou:', e)
        );
        Alert.alert('Sucesso', `${novasURIs.length} foto(s) salva(s) e enviada(s).`);
      } else {
        Alert.alert(
          'Modo Offline',
          `${novasURIs.length} foto(s) salva(s) no celular.\nSerão enviadas automaticamente quando houver conexão.`
        );
      }
    } catch (e) {
      console.error('❌ Erro ao salvar foto:', e);
      Alert.alert('Erro', 'Não foi possível salvar a foto. Tente novamente.');
    } finally {
      setAdicionando(false);
    }
  };

  // ─── Remove foto local (NÃO cancela upload se já foi enfileirado) ───────────

  const removerFoto = (index: number) => {
    Alert.alert('Remover', 'Deseja excluir esta foto da lista local?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          const uri = fotos[index];
          const novaLista = fotos.filter((_, i) => i !== index);
          await salvarListaNoStorage(novaLista);

          // Tenta remover o arquivo físico (melhor esforço)
          FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {});
        },
      },
    ]);
  };

  // ─── Render ──────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background }]}>
        <ActivityIndicator color="#3b82f6" />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View
        style={[
          styles.header,
          { backgroundColor: theme.card, borderBottomColor: theme.border },
        ]}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft color={theme.text} size={26} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>
          Fotos do Chamado #{ticketId}
        </Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.grid}>
          {fotos.map((uri, index) => (
            <View key={`${uri}-${index}`} style={styles.imageWrapper}>
              <Image source={{ uri }} style={styles.thumbnail} />
              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={() => removerFoto(index)}
              >
                <Trash2 size={16} color="#fff" />
              </TouchableOpacity>
            </View>
          ))}

          {fotos.length === 0 && (
            <Text style={[styles.emptyText, { color: theme.subText }]}>
              Nenhuma foto adicionada ainda.
            </Text>
          )}
        </View>
      </ScrollView>

      <View
        style={[
          styles.footer,
          { backgroundColor: theme.card, borderTopColor: theme.border },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.actionBtn,
            { backgroundColor: '#fff', borderColor: '#3b82f6', borderWidth: 2 },
            adicionando && styles.actionBtnDisabled,
          ]}
          onPress={() => adicionarFoto('galeria')}
          disabled={adicionando}
        >
          {adicionando ? (
            
            <ActivityIndicator size="small" color="#3b82f6" />
          ) : (
            <ImageIcon size={20} color="#3b82f6" />
          )}
          <Text style={[styles.btnText, { color: '#3b82f6' }]}>Galeria</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.actionBtn,
            { backgroundColor: '#3b82f6' },
            adicionando && styles.actionBtnDisabled,
          ]}
          onPress={() => adicionarFoto('camera')}
          disabled={adicionando}
        >
          {adicionando ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Camera size={20} color="#fff" />
          )}
          <Text style={styles.btnText}>Câmera</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? 25 : 0,
  },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  backButton: { padding: 5 },
  scroll: { padding: 15 },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'flex-start',
  },
  imageWrapper: {
    width: '48%',
    height: 150,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  thumbnail: { width: '100%', height: '100%' },
  deleteBtn: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: 'rgba(239, 68, 68, 0.8)',
    padding: 8,
    borderRadius: 8,
  },
  emptyText: { textAlign: 'center', width: '100%', marginTop: 50 },
  footer: {
    flexDirection: 'row',
    padding: 20,
    gap: 15,
    borderTopWidth: 1,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    height: 55,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  actionBtnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontWeight: 'bold' },
});
