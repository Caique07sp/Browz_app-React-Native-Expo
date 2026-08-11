import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Check, RotateCcw, X } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View
} from 'react-native';
import SignatureScreen, { SignatureViewRef } from 'react-native-signature-canvas';

export default function AssinaturaCliente() {
  const router = useRouter();
  const signatureRef = useRef<SignatureViewRef>(null);
  const { ticketId } = useLocalSearchParams();
  const chamadoId = String(ticketId);

  const { width: larguraTela, height: alturaTela } = useWindowDimensions();
  const [salvando, setSalvando] = useState(false);
  const [mostrarCanvas, setMostrarCanvas] = useState(false);

  // Animações nativas (0 a 1)
  const animProgresso = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Animação de Entrada: suave de 0 para 1 em 300ms
    Animated.timing(animProgresso, {
      toValue: 1,
      duration: 350,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      // SÓ monta o Canvas WebView DEPOIS que a animação visual terminou 100%
      setMostrarCanvas(true);
    });
  }, []);

  const fecharComSeguranca = (aoFinalizar?: () => void) => {
    // 1. DESMONTA O CANVAS PRIMEIRO para evitar Memory Leak / Crash no iOS
    setMostrarCanvas(false);

    // 2. Roda a animação de saída com o canvas já destruído
    Animated.timing(animProgresso, {
      toValue: 0,
      duration: 250,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      if (aoFinalizar) aoFinalizar();
      router.back();
    });
  };

  const handleOK = async (signature: string) => {
    try {
      if (!signature) return;
      setSalvando(true);

      await AsyncStorage.setItem(
        `@assinatura_cliente_${chamadoId}`,
        signature
      );

      fecharComSeguranca();
    } catch (error) {
      setSalvando(false);
    }
  };

  const handleClear = () => {
    signatureRef.current?.clearSignature();
  };

  const handleConfirm = () => {
    if (salvando) return;
    signatureRef.current?.readSignature();
  };

  // Interpolação de Rotação (0deg -> 90deg)
  const rotacao = animProgresso.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '90deg'],
  });

  // Interpolação de Escala (0.85 -> 1)
  const escala = animProgresso.interpolate({
    inputRange: [0, 1],
    outputRange: [0.85, 1],
  });

  // Opacidade do Fundo / Card
  const opacidade = animProgresso.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  return (
    <View style={styles.conteinerBase}>
      <StatusBar hidden />

      {/* Fundo escuro com opacidade animada */}
      <Animated.View style={[styles.fundoOverlay, { opacity: opacidade }]} />

      {/* Card Animado Rotacionado */}
      <Animated.View
        style={[
          styles.conteinerRotacionado,
          {
            width: alturaTela,
            height: larguraTela,
            opacity: opacidade,
            transform: [{ rotate: rotacao }, { scale: escala }],
          },
        ]}
      >
        {/* Cabeçalho */}
        <View style={styles.cabecalho}>
          <View style={styles.grupo_esquerdo}>
            <TouchableOpacity
              onPress={() => fecharComSeguranca()}
              style={styles.botao_fechar}
              disabled={salvando}
            >
              <X color="#1e3a8a" size={22} />
            </TouchableOpacity>
            <Text style={styles.titulo_cabecalho}>Assinatura do Cliente</Text>
          </View>

          <View style={styles.acoes}>
            <TouchableOpacity
              onPress={handleClear}
              style={styles.botao_limpar}
              activeOpacity={0.7}
              disabled={salvando}
            >
              <RotateCcw color="#2563eb" size={18} />
              <Text style={styles.texto_limpar}>Limpar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleConfirm}
              style={[styles.botao_confirmar, salvando && { opacity: 0.6 }]}
              activeOpacity={0.8}
              disabled={salvando}
            >
              {salvando ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Check color="#fff" size={20} />
                  <Text style={styles.texto_confirmar}>Confirmar</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Área do Canvas */}
        <View style={styles.area_canvas}>
          {salvando ? (
            <View style={styles.carregando}>
              <ActivityIndicator size="large" color="#2563eb" />
              <Text style={styles.texto_carregando}>Salvando assinatura...</Text>
            </View>
          ) : mostrarCanvas ? (
            <SignatureScreen
              ref={signatureRef}
              onOK={handleOK}
              descriptionText="Assine no espaço acima"
              clearText="Limpar"
              confirmText="Salvar"
              webStyle={webStyle}
              autoClear={false}
            />
          ) : (
            <View style={styles.carregando}>
              <ActivityIndicator size="large" color="#2563eb" />
              <Text style={styles.texto_carregando}>Carregando mesa de assinatura...</Text>
            </View>
          )}
        </View>
      </Animated.View>
    </View>
  );
}

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
    width: 92vw;
    height: 68vh;
    background-color: #ffffff;
    position: relative;
    margin: 0;
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
  conteinerBase: {
    flex: 1,
    backgroundColor: '#020617', // Fundo bem escuro profissional
    justifyContent: 'center',
    alignItems: 'center',
  },
  fundoOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
  },
  conteinerRotacionado: {
    backgroundColor: '#f0f4f8',
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  cabecalho: {
    height: 56,
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  grupo_esquerdo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  botao_fechar: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#eff6ff',
  },
  titulo_cabecalho: {
    color: '#1e3a8a',
    fontSize: 16,
    fontWeight: '700',
  },
  acoes: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  botao_limpar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#eff6ff',
    gap: 6,
  },
  texto_limpar: {
    color: '#2563eb',
    fontWeight: '600',
    fontSize: 13,
  },
  botao_confirmar: {
    backgroundColor: '#2563eb',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
    elevation: 2,
  },
  texto_confirmar: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
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