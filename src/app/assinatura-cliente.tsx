import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ScreenOrientation from 'expo-screen-orientation';
import { StatusBar } from 'expo-status-bar';
import { Check, RotateCcw, X } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import SignatureScreen, { SignatureViewRef } from 'react-native-signature-canvas';

const { width, height } = Dimensions.get('screen');

export default function AssinaturaCliente() {
  const router = useRouter();
  const signatureRef = useRef<SignatureViewRef>(null);
  const { ticketId } = useLocalSearchParams();
  const chamadoId = String(ticketId);
  
  const [carregado, setCarregado] = useState(false);

  useEffect(() => {
    async function iniciarTela() {
      await ScreenOrientation.lockAsync(
        ScreenOrientation.OrientationLock.LANDSCAPE_RIGHT
      );
      setTimeout(() => {
        setCarregado(true);
      }, 400);
    }

    iniciarTela();

    return () => {
      ScreenOrientation.lockAsync(
        ScreenOrientation.OrientationLock.PORTRAIT_UP
      );
    };
  }, []);

  const handleOK = async (signature: string) => {
    await AsyncStorage.setItem(
      `@assinatura_cliente_${chamadoId}`,
      signature
    );
    router.back();
  };

  const handleClear = () => {
    signatureRef.current?.clearSignature();
  };

  const handleConfirm = () => {
    signatureRef.current?.readSignature();
  };

  const larguraReal = width > height ? width : height;
  const alturaReal = width > height ? height : width;

  return (
    <View style={[styles.conteiner, { width: larguraReal, height: alturaReal }]}>
      {/* StatusBar escura para contrastar com o fundo claro */}
      <StatusBar style="dark" backgroundColor="transparent" translucent />

      {/* Cabeçalho */}
      <View style={styles.cabecalho}>
        <View style={styles.grupo_esquerdo}>
          <TouchableOpacity onPress={() => router.back()} style={styles.botao_fechar}>
            <X color="#1e3a8a" size={22} />
          </TouchableOpacity>
          <Text style={styles.titulo_cabecalho}>Assinatura do Cliente</Text>
        </View>

        <View style={styles.acoes}>
          <TouchableOpacity
            onPress={handleClear}
            style={styles.botao_limpar}
            activeOpacity={0.7}
          >
            <RotateCcw color="#2563eb" size={18} />
            <Text style={styles.texto_limpar}>Limpar</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={handleConfirm} 
            style={styles.botao_confirmar}
            activeOpacity={0.8}
          >
            <Check color="#fff" size={20} />
            <Text style={styles.texto_confirmar}>Confirmar</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Área do Canvas com Fundo Azul Suave */}
      <View style={styles.area_canvas}>
        {carregado ? (
          <SignatureScreen
            ref={signatureRef}
            onOK={handleOK}
            descriptionText="Assine com o dedo no espaço acima"
            clearText="Limpar"
            confirmText="Salvar"
            webStyle={webStyle}
            autoClear={false}
          />
        ) : (
          <View style={styles.carregando}>
            <ActivityIndicator size="large" color="#2563eb" />
            <Text style={styles.texto_carregando}>Preparando tela de pintura...</Text>
          </View>
        )}
      </View>
    </View>
  );
}

// Injeção CSS para o Modo Claro Azulado
// Injeção CSS com tamanho máximo para o Canvas em Landscape
const webStyle = `
  .m-signature-pad {
    border: none;
    box-shadow: none;
    margin: 0;
    height: 100vh;
    width: 100vw;
    background-color: #f0f4f8;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
  }
  
  .m-signature-pad--body {
    border: 2px dashed #93c5fd;
    border-radius: 16px;
    width: 96vw;    /* Aumentado de 92vw para 96vw (usa 96% da largura da tela) */
    height: 90vh;   /* Aumentado de 64vh para 74vh (usa 74% da altura da tela) */
    background-color: #ffffff;
    position: relative;
    margin: 0;
    left: 0;
    top: 0;
    right: 0;
    bottom: 0;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
  }

  .m-signature-pad--footer {
    display: none;
  }

  body, html {
    width: 100%;
    height: 100%;
    margin: 0;
    padding: 0;
    background-color: #f0f4f8;
    overflow: hidden;
  }
`;

const styles = StyleSheet.create({
  conteiner: {
    flex: 1,
    backgroundColor: '#f0f4f8', // Azul gelo suave de fundo total
  },
  cabecalho: {
    height: 70,
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  grupo_esquerdo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  botao_fechar: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: '#eff6ff', // Fundo azul bem clarinho para o X
  },
  titulo_cabecalho: {
    color: '#1e3a8a', // Azul escuro imponente
    fontSize: 18,
    fontWeight: '700',
  },
  acoes: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  botao_limpar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#eff6ff', // Botão limpar sutil em tom azulado
    gap: 6,
  },
  texto_limpar: {
    color: '#2563eb', // Texto azul royal
    fontWeight: '600',
    fontSize: 14,
  },
  botao_confirmar: {
    backgroundColor: '#2563eb', // Confirmar principal em Azul Royal ativo
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  texto_confirmar: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  area_canvas: {
    flex: 1,
    backgroundColor: '#f0f4f8',
  },
  carregando: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  texto_carregando: {
    color: '#1e3a8a',
    fontSize: 14,
    fontWeight: '500',
  },
});