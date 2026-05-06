import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Check, Trash2, PenTool } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function FinalizacaoRelatorio() {
  const router = useRouter();

  const [description, setDescription] = useState('');
  const [signerName, setSignerName] = useState('');
  const [signerContact, setSignerContact] = useState('');
  const [signatureImg, setSignatureImg] = useState<string | null>(null);

  useEffect(() => {
    const checkSignature = async () => {
      const savedSig = await AsyncStorage.getItem('@assinatura_cliente');

      if (savedSig) {
        setSignatureImg(savedSig);
      }
    };

    checkSignature();
  }, []);

  const handleClearSignature = async () => {
    await AsyncStorage.removeItem('@assinatura_cliente');
    setSignatureImg(null);
  };

  const handleFinalize = async () => {
    if (!description.trim()) {
      return Alert.alert('Erro', 'Descreva o serviço.');
    }

    if (!signerName.trim()) {
      return Alert.alert('Erro', 'Informe o nome de quem assinou.');
    }

    if (!signerContact.trim()) {
      return Alert.alert('Erro', 'Informe o contato de quem assinou.');
    }

    if (!signatureImg) {
      return Alert.alert('Erro', 'A assinatura é obrigatória.');
    }

    await AsyncStorage.removeItem('@assinatura_cliente');

    await AsyncStorage.setItem('@ticket_10293_status', 'concluido');
    await AsyncStorage.removeItem('@checkin_time');

    Alert.alert('Sucesso', 'Atendimento finalizado!', [
      {
        text: 'OK',
        onPress: () => router.replace('/home'),
      },
    ]);
  };
  const isFormValid =
    description.trim() &&
    signerName.trim() &&
    signerContact.trim() &&
    signatureImg;



  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Relatório de Encerramento</Text>
        <Text style={styles.subtitle}>Chamado #10293</Text>

        <View style={styles.section}>
          <Text style={styles.label}>O QUE FOI REALIZADO?</Text>

          <TextInput
            style={styles.textArea}
            multiline
            numberOfLines={9}
            placeholder="Descreva com detalhes o serviço realizado..."
            placeholderTextColor="#64748b"
            value={description}
            onChangeText={setDescription}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>DADOS DE QUEM ASSINOU</Text>

          <TextInput
            style={styles.input}
            placeholder="Nome completo"
            placeholderTextColor="#64748b"
            value={signerName}
            onChangeText={setSignerName}
          />

          <TextInput
            style={styles.input}
            placeholder="E-mail"
            placeholderTextColor="#64748b"
            value={signerContact}
            onChangeText={setSignerContact}
            keyboardType="email-address"
          />
        </View>

        <View style={styles.section}>
          <View style={styles.signatureHeader}>
            <Text style={styles.label}>ASSINATURA DO CLIENTE</Text>

            {signatureImg && (
              <TouchableOpacity onPress={handleClearSignature} style={styles.clearBtn}>
                <Trash2 color="#ef4444" size={16} />
                <Text style={styles.clearBtnText}>Remover</Text>
              </TouchableOpacity>
            )}
          </View>

          {signatureImg ? (
            <View style={styles.previewContainer}>
              <Image source={{ uri: signatureImg }} style={styles.previewImage} />
            </View>
          ) : (
            <TouchableOpacity
              style={styles.signatureTrigger}
              onPress={() => router.push('/assinatura-cliente')}
            >
              <PenTool color="#3b82f6" size={28} />
              <Text style={styles.signatureTriggerText}>Coletar Assinatura</Text>
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={[
            styles.submitBtn,
            !isFormValid && styles.submitBtnDisabled
          ]}
          onPress={handleFinalize}
        >
          <Check color="#fff" size={24} />
          <Text style={styles.submitBtnText}>Finalizar Atendimento</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  scrollContent: { padding: 20 },

  title: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
  subtitle: { color: '#3b82f6', marginBottom: 20 },

  section: { marginBottom: 25 },
  label: {
    color: '#64748b',
    marginBottom: 10,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
  },

  textArea: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    color: '#fff',
    padding: 15,
    minHeight: 220,
    textAlignVertical: 'top',
  },

  input: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    color: '#fff',
    padding: 15,
    marginBottom: 12,
    fontSize: 16,
  },

  signatureHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  clearBtn: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  clearBtnText: { color: '#ef4444' },

  signatureTrigger: {
    height: 140,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#3b82f6',
    borderStyle: 'dashed',
  },

  signatureTriggerText: { color: '#3b82f6', fontWeight: '600', marginTop: 8 },

  previewContainer: {
    height: 140,
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
  },

  previewImage: { width: '100%', height: '100%' },

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
  },
});