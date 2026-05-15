import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Platform,
  TouchableOpacity,
  SafeAreaView,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { ChevronLeft, Camera, Image as ImageIcon, Trash2 } from 'lucide-react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from "@/theme/ThemeContext";

export default function FotosChamado() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [fotos, setFotos] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const { theme, darkMode } = useTheme();

  useEffect(() => {
    carregarFotosSalvas();
  }, [id]);

  async function carregarFotosSalvas() {
    try {
      const salvas = await AsyncStorage.getItem(`@fotos_chamado_${id}`);
      if (salvas) {
        setFotos(JSON.parse(salvas));
      }
    } catch (e) {
      Alert.alert("Erro", "Não foi possível carregar as fotos.");
    } finally {
      setLoading(false);
    }
  }

  async function salvarNoStorage(novasFotos: string[]) {
    await AsyncStorage.setItem(`@fotos_chamado_${id}`, JSON.stringify(novasFotos));
    setFotos(novasFotos);
  }

  const adicionarFoto = async (origem: 'camera' | 'galeria') => {
    const permissao = origem === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissao.granted) {
      Alert.alert("Atenção", "Precisamos de permissão para acessar a " + (origem === 'camera' ? "câmera" : "galeria"));
      return;
    }

    const resultado = origem === 'camera'
      ? await ImagePicker.launchCameraAsync({ quality: 0.7 })
      : await ImagePicker.launchImageLibraryAsync({ quality: 0.7, allowsMultipleSelection: true });

    if (!resultado.canceled) {
      const uris = resultado.assets.map(asset => asset.uri);
      const listaAtualizada = [...fotos, ...uris];
      await salvarNoStorage(listaAtualizada);
    }
  };

  const removerFoto = (index: number) => {
    Alert.alert("Remover", "Deseja excluir esta foto?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Excluir", style: "destructive", onPress: async () => {
          const novaLista = fotos.filter((_, i) => i !== index);
          await salvarNoStorage(novaLista);
        }
      }
    ]);
  };

  if (loading) return <View
    style={[
      styles.centered,
      {
        backgroundColor: theme.background,
      },
    ]}
  ><ActivityIndicator color="#3b82f6" /></View>;

  return (
    <SafeAreaView
      style={[
        styles.container,
        {
          backgroundColor: theme.background,
        },
      ]}
    >
      <View
        style={[
          styles.header,
          {
            backgroundColor: theme.card,
            borderBottomColor: theme.border,
          },
        ]}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft
            color={theme.text}
            size={26}
          />
        </TouchableOpacity>
        <Text
          style={[
            styles.headerTitle,
            {
              color: theme.text,
            },
          ]}
        >Fotos do Chamado #{id}</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.grid}>
          {fotos.map((uri, index) => (
            <View key={index} style={styles.imageWrapper}>
              <Image source={{ uri }} style={styles.thumbnail} />
              <TouchableOpacity style={styles.deleteBtn} onPress={() => removerFoto(index)}>
                <Trash2 size={16} color="#fff" />
              </TouchableOpacity>
            </View>
          ))}

          {fotos.length === 0 && (
            <Text
              style={[
                styles.emptyText,
                {
                  color: theme.subText,
                },
              ]}
            >Nenhuma foto adicionada ainda.</Text>
          )}
        </View>
      </ScrollView>

      <View
        style={[
          styles.footer,
          {
            backgroundColor: theme.card,
            borderTopColor: theme.border,
          },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.actionBtn,
            {
              backgroundColor: '#fff',
              borderColor: '#3b82f6',
              borderWidth: 2,
            },
          ]}
          onPress={() => adicionarFoto('galeria')}
        >
          <ImageIcon
            size={20}
            color="#3b82f6"
          />

          <Text
            style={[
              styles.btnText,
              {
                color: '#3b82f6',
              },
            ]}
          >
            Galeria
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style=
          {[
            styles.actionBtn,

            {
              backgroundColor: "#3b82f6",
              borderTopColor: theme.border,
            },

          ]

          } onPress={() => adicionarFoto('camera')}>
          <Camera size={20} color="#fff" />
          <Text style={styles.btnText}>Câmera</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    
    flex: 1,
   backgroundColor: '#0f172a' ,
  paddingTop: Platform.OS === 'android' ? 25 : 0,
  
  },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    backgroundColor: '#1e293b'
  },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  backButton: { padding: 5 },
  scroll: { padding: 15 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'flex-start' },
  imageWrapper: { width: '48%', height: 150, borderRadius: 12, overflow: 'hidden', position: 'relative' },
  thumbnail: { width: '100%', height: '100%' },
  deleteBtn: {
    position: 'absolute', top: 5, right: 5,
    backgroundColor: 'rgba(239, 68, 68, 0.8)',
    padding: 8, borderRadius: 8
  },
  emptyText: { color: '#64748b', textAlign: 'center', width: '100%', marginTop: 50 },
  footer: {
    flexDirection: 'row',
    padding: 20,
    gap: 15,
    backgroundColor: '#1e293b',
    borderTopWidth: 1,
    borderTopColor: '#334155'
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    height: 55,
    backgroundColor: '#334155',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8
  },
  primaryBtn: { backgroundColor: '#3b82f6' },
  btnText: { color: '#fff', fontWeight: 'bold' }
});