import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ScreenOrientation from 'expo-screen-orientation';
import { Check, RotateCcw, X } from 'lucide-react-native';
import React, { useEffect, useRef } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import SignatureScreen, { SignatureViewRef } from 'react-native-signature-canvas';

export default function AssinaturaCliente() {
  const router = useRouter();
  const signatureRef = useRef<SignatureViewRef>(null);
  const { ticketId } = useLocalSearchParams();
  const chamadoId = String(ticketId);


  useEffect(() => {
    async function changeOrientation() {
      await ScreenOrientation.lockAsync(
        ScreenOrientation.OrientationLock.LANDSCAPE_RIGHT
      );
    }

    changeOrientation();

    return () => {
      ScreenOrientation.lockAsync(
        ScreenOrientation.OrientationLock.PORTRAIT_UP
      );
    };
  }, []);

  

  const handleOK = async (signature: string) => {
    await AsyncStorage.setItem(
     ` @assinatura_cliente_${ chamadoId }`,
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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <X color="#fff" size={28} />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Assinatura do Cliente</Text>

        <View style={styles.actions}>
          <TouchableOpacity
            onPress={handleClear}
            style={[styles.iconBtn, { marginRight: 15 }]}
          >
            <RotateCcw color="#fff" size={24} />
          </TouchableOpacity>

          <TouchableOpacity onPress={handleConfirm} style={styles.confirmBtn}>
            <Check color="#fff" size={24} />
            <Text style={styles.confirmText}>Confirmar</Text>
          </TouchableOpacity>
        </View>
      </View>

      <SignatureScreen
        ref={signatureRef}
        onOK={handleOK}
        descriptionText="Assine no espaço acima"
        clearText="Limpar"
        confirmText="Salvar"
        webStyle={webStyle}
      />
    </View>
  );
}

const webStyle = `
  .m-signature-pad {
    border: none;
    box-shadow: none;
    margin: 0;
  }

  .m-signature-pad--footer {
    display: none;
  }

  body, html {
    width: 100%;
    height: 100%;
  }
`;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    height: 60,
    backgroundColor: '#0f172a',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  iconBtn: {
    padding: 5,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  confirmBtn: {
    backgroundColor: '#10b981',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 5,
  },
  confirmText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});