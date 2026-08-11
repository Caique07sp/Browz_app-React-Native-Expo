import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    Modal,
    Platform,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { styles } from "../styles/photo.styles";

import { adicionarNaFila } from '@/services/offlineQueue';
import { useTheme } from '@/theme/ThemeContext';

import { ScreenWrapper } from "@/components/ScreenWrapper";
import { isOnline } from '@/services/network';
import { sincronizarPendentes } from '@/services/sync';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Camera, ChevronLeft, Eye, Image as ImageIcon, Play, Trash2, Video, X } from 'lucide-react-native';

import { ResizeMode, Video as VideoPlayer } from 'expo-av';

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
  const [menuCameraVisible, setMenuCameraVisible] = useState(false);

  const [videoModalVisible, setVideoModalVisible] = useState(false);
  const [videoUriSelecionado, setVideoUriSelecionado] = useState<string | null>(null);

  const [fotoModalVisible, setFotoModalVisible] = useState(false);
  const [fotoUriSelecionada, setFotoUriSelecionada] = useState<string | null>(null);

  const { theme } = useTheme();

  useEffect(() => {
    carregarFotosSalvas();
  }, [id]);

  async function carregarFotosSalvas() {
    try {
      const salvas = await AsyncStorage.getItem(`@fotos_chamado_${ticketId}`);
      if (salvas) {
        const lista: string[] = JSON.parse(salvas);
        const existentes = await Promise.all(
          lista.map(async (uri) => {
            const info = await FileSystem.getInfoAsync(uri);
            return info.exists ? uri : null;
          })
        );
        const validas = existentes.filter(Boolean) as string[];
        if (validas.length !== lista.length) {
          await AsyncStorage.setItem(
            `@fotos_chamado_${ticketId}`,
            JSON.stringify(validas)
          );
        }
        setFotos(validas);
      }
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível carregar as mídias.');
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

  const adicionarMidia = async (origem: 'camera_foto' | 'camera_video' | 'galeria') => {
    if (adicionando) return;

    const precisaCamera = origem === 'camera_foto' || origem === 'camera_video';

    const permissao = precisaCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissao.granted) {
      Alert.alert(
        'Atenção',
        `Precisamos de permissão para acessar a ${precisaCamera ? 'câmera' : 'galeria'}.`
      );
      return;
    }

    try {
      // Configuração separada por tipo para garantir compatibilidade
      let resultado: ImagePicker.ImagePickerResult;

      if (origem === 'camera_foto') {
        resultado = await ImagePicker.launchCameraAsync({
          mediaTypes: ['images'],
          quality: 0.4,
        });
      } else if (origem === 'camera_video') {
        resultado = await ImagePicker.launchCameraAsync({
          mediaTypes: ['videos'],
          videoMaxDuration: 120, // máximo de 2 minutos
          quality: 0.4,
        });
      } else {
        resultado = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images', 'videos'],
          quality: 0.4,
          allowsMultipleSelection: true,
        });
      }

      if (resultado.canceled) return;

      setAdicionando(true);

      await garantirDiretorio();
      const novasURIs: string[] = [];

      for (const asset of resultado.assets) {
        const ehVideo = asset.type === 'video' || asset.uri.toLowerCase().endsWith('.mp4');
        const extensao = ehVideo ? 'mp4' : 'jpg';
        const tipoFila = ehVideo ? 'video_chamado' : 'foto_chamado';

        const nomeArquivo = `ticket_${ticketId}_${Date.now()}_${Math.floor(
          Math.random() * 10000
        )}.${extensao}`;
        const destino = `${FOTOS_OFFLINE_DIR}${nomeArquivo}`;

        await FileSystem.copyAsync({ from: asset.uri, to: destino });

        await adicionarNaFila({
          tipo: tipoFila,
          ticketId,
          uri: destino,
          fileName: nomeArquivo,
          description: ehVideo ? 'Vídeo do chamado' : 'Foto do chamado',
          criadoEm: new Date().toISOString(),
          tentativas: 0,
        } as any);

        novasURIs.push(destino);
      }

      const listaAtualizada = [...fotos, ...novasURIs];
      await salvarListaNoStorage(listaAtualizada);

      const online = await isOnline();
      if (online) {
        sincronizarPendentes().catch((e) =>
          console.warn('⚠️ Sync em background falhou:', e)
        );
        Alert.alert('Sucesso', `${novasURIs.length} arquivo(s) salvo(s) e enviado(s).`);
      } else {
        Alert.alert(
          'Modo Offline',
          `${novasURIs.length} arquivo(s) salvo(s) no celular.\nSerão enviados automaticamente quando houver conexão.`
        );
      }
    } catch (e) {
      //console.log("ERRO COMPLETO:");
      //console.log(JSON.stringify(e, null, 2));
      console.error(e);

      Alert.alert(
        "Erro",
        e instanceof Error ? e.stack ?? e.message : JSON.stringify(e)
      );
    } finally {
      setAdicionando(false);
    }
  };

  const handleBotaoCamera = () => {
    setMenuCameraVisible(true);
  };

  const removerFoto = (index: number) => {
    Alert.alert('Remover', 'Deseja excluir este arquivo da lista local?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          const uri = fotos[index];
          const novaLista = fotos.filter((_, i) => i !== index);
          await salvarListaNoStorage(novaLista);
          FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => { });
        },
      },
    ]);
  };

  const abrirPlayerVideo = (uri: string) => {
    setVideoUriSelecionado(uri);
    setVideoModalVisible(true);
  };

  const abrirVisualizadorFoto = (uri: string) => {
    setFotoUriSelecionada(uri);
    setFotoModalVisible(true);
  };

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background }]}>
        <ActivityIndicator color="#3b82f6" />
      </View>
    );
  }

  return (
    <ScreenWrapper style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft color={theme.text} size={26} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>
          Mídias do Chamado #{ticketId}
        </Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.grid}>
          {fotos.map((uri, index) => {
            const ehVideo = uri.toLowerCase().endsWith('.mp4');

            return (
              <View key={`${uri}-${index}`} style={styles.imageWrapper}>
                <TouchableOpacity
                  activeOpacity={0.9}
                  onPress={() => !ehVideo && abrirVisualizadorFoto(uri)}
                  style={{ width: '100%', height: '100%' }}
                >
                  <Image source={{ uri }} style={styles.thumbnail} />
                </TouchableOpacity>

                {ehVideo ? (
                  <>
                    <View style={{
                      position: 'absolute',
                      top: 8,
                      left: 8,
                      backgroundColor: 'rgba(0,0,0,0.6)',
                      padding: 4,
                      borderRadius: 4
                    }}>
                      <Video size={14} color="#fff" />
                    </View>

                    <TouchableOpacity
                      style={{
                        position: 'absolute',
                        top: '30%',
                        left: '35%',
                        backgroundColor: 'rgba(59, 130, 246, 0.85)',
                        padding: 10,
                        borderRadius: 99,
                      }}
                      onPress={() => abrirPlayerVideo(uri)}
                    >
                      <Play size={18} color="#fff" fill="#fff" />
                    </TouchableOpacity>
                  </>
                ) : (
                  <TouchableOpacity
                    style={{
                      position: 'absolute',
                      top: '30%',
                      left: '35%',
                      backgroundColor: 'rgba(15, 23, 42, 0.75)',
                      padding: 10,
                      borderRadius: 99,
                    }}
                    onPress={() => abrirVisualizadorFoto(uri)}
                  >
                    <Eye size={18} color="#fff" />
                  </TouchableOpacity>
                )}

                <TouchableOpacity style={styles.deleteBtn} onPress={() => removerFoto(index)}>
                  <Trash2 size={16} color="#fff" />
                </TouchableOpacity>
              </View>
            );
          })}

          {fotos.length === 0 && (
            <Text style={[styles.emptyText, { color: theme.subText }]}>
              Nenhuma foto ou vídeo adicionado ainda.
            </Text>
          )}
        </View>
      </ScrollView>

      <Modal
        visible={videoModalVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setVideoModalVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }}>
          <TouchableOpacity
            style={{ position: 'absolute', top: 50, right: 20, zIndex: 10, backgroundColor: 'rgba(0,0,0,0.5)', padding: 10, borderRadius: 99 }}
            onPress={() => setVideoModalVisible(false)}
          >
            <X size={24} color="#fff" />
          </TouchableOpacity>

          {videoUriSelecionado && (
            <VideoPlayer
              source={{ uri: videoUriSelecionado }}
              rate={1.0}
              volume={1.0}
              isMuted={false}
              resizeMode={ResizeMode.CONTAIN}
              shouldPlay
              useNativeControls
              style={{ width: '100%', height: '80%' }}
            />
          )}
        </View>
      </Modal>

      <Modal
        visible={fotoModalVisible}
        animationType="fade"
        transparent={false}
        onRequestClose={() => setFotoModalVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: '#0b0f19', justifyContent: 'center', alignItems: 'center' }}>
          <TouchableOpacity
            style={{
              position: 'absolute',
              top: Platform.OS === 'ios' ? 60 : 40,
              right: 20,
              zIndex: 10,
              backgroundColor: 'rgba(255,255,255,0.15)',
              padding: 12,
              borderRadius: 99
            }}
            onPress={() => setFotoModalVisible(false)}
          >
            <X size={24} color="#fff" />
          </TouchableOpacity>

          {fotoUriSelecionada && (
            <Image
              source={{ uri: fotoUriSelecionada }}
              style={{ width: '100%', height: '85%' }}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>

      <View style={[styles.footer, { backgroundColor: theme.card, borderTopColor: theme.border }, Platform.OS === 'android' && { marginBottom: 0 }]}>
        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#fff', borderColor: '#3b82f6', borderWidth: 2 }, adicionando && styles.actionBtnDisabled]} onPress={() => adicionarMidia('galeria')} disabled={adicionando}>
          {adicionando ? <ActivityIndicator size="small" color="#3b82f6" /> : <ImageIcon size={20} color="#3b82f6" />}
          <Text style={[styles.btnText, { color: '#3b82f6' }]}>Galeria</Text>

        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: '#3b82f6' }, adicionando && styles.actionBtnDisabled]}
          onPress={handleBotaoCamera}
          disabled={adicionando}
        >
          {adicionando ? <ActivityIndicator size="small" color="#fff" /> : <Camera size={20} color="#fff" />}
          <Text style={styles.btnText}>Câmera</Text>
        </TouchableOpacity>
      </View>

      <Modal
        visible={menuCameraVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setMenuCameraVisible(false)}
      >
        <TouchableOpacity
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.5)',
            justifyContent: 'center',
            alignItems: 'center',
          }}
          activeOpacity={1}
          onPress={() => setMenuCameraVisible(false)}
        >
          <View
            style={{
              backgroundColor: theme.card,
              width: '90%',
              maxWidth: 400,
              borderRadius: 24,
              padding: 24,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.15,
              shadowRadius: 12,
              elevation: 20,
            }}
          >
            <View style={{
              width: 40,
              height: 4,
              backgroundColor: theme.border,
              borderRadius: 2,
              alignSelf: 'center',
              marginBottom: 20
            }} />

            <Text style={{
              fontSize: 18,
              fontWeight: 'bold',
              color: theme.text,
              marginBottom: 20,
              textAlign: 'center'
            }}>
              Capturar Mídia
            </Text>

            <TouchableOpacity
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: theme.background,
                padding: 16,
                borderRadius: 12,
                marginBottom: 12
              }}
              onPress={() => {
                setMenuCameraVisible(false);
                setTimeout(() => adicionarMidia('camera_foto'), 300);
              }}
            >
              <View style={{ backgroundColor: '#e0f2fe', padding: 8, borderRadius: 8, marginRight: 12 }}>
                <Camera size={20} color="#0284c7" />
              </View>
              <Text style={{ fontSize: 16, fontWeight: '600', color: theme.text }}>Tirar Foto</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: theme.background,
                padding: 16,
                borderRadius: 12,
                marginBottom: 16
              }}
              onPress={() => {
                setMenuCameraVisible(false);
                setTimeout(() => adicionarMidia('camera_video'), 300);
              }}
            >
              <View style={{ backgroundColor: '#fef2f2', padding: 8, borderRadius: 8, marginRight: 12 }}>
                <Video size={20} color="#dc2626" />
              </View>
              <Text style={{ fontSize: 16, fontWeight: '600', color: theme.text }}>Gravar Vídeo</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                backgroundColor: theme.border,
                padding: 14,
                borderRadius: 12,
                alignItems: 'center'
              }}
              onPress={() => setMenuCameraVisible(false)}
            >
              <Text style={{ fontSize: 16, fontWeight: 'bold', color: theme.subText }}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </ScreenWrapper>
  );
}