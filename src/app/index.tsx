import { useState } from "react";
import { useRouter } from "expo-router";
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  View,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import AsyncStorage from '@react-native-async-storage/async-storage';

import { Input } from "@/components/input";
import { Button } from "@/components/Button";

export default function App() {
  const [login, setLogin] = useState("");
  const [senha, setSenha] = useState("");

  const router = useRouter();

  async function fazerLogin() {
    try {
      const response = await fetch("https://browz.com.br/rest.php", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Basic 94ru30984rvnh4r2rjo",
        },
        body: JSON.stringify({
          class: "ApplicationAuthenticationRestService",
          method: "getToken",
          login: login,
          password: senha,
        }),
      });

      const data = await response.json();

      console.log("RESPOSTA LOGIN:", data);

      if (data.status === "success") {
        const token = data.data;

        const payload = JSON.parse(atob(token.split(".")[1]));

        console.log("PAYLOAD TOKEN:", payload);

        const nome = payload.username || login;
        const perfil = "Técnico";
        const representativeId = payload.userid;

        await AsyncStorage.setItem("token", token);
        await AsyncStorage.setItem("login", login);
        await AsyncStorage.setItem("nome", nome);
        await AsyncStorage.setItem("perfil", perfil);
        await AsyncStorage.setItem("representative_id", String(representativeId));

        router.push("/home");
      } else {
        Alert.alert("Erro", "Login ou senha inválidos");
      }
    } catch (error: any) {
      console.log("ERRO:", error.message);
      Alert.alert("Erro", "Não foi possível conectar ao servidor");
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.select({ ios: "padding", android: "height" })}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.fundo}>
          <View style={styles.container}>
            <Image
              source={require("@/assets/browz.png")}
              style={styles.logo}
            />

            <View style={styles.form}>
              <Input
                placeholder="Login"
                value={login}
                onChangeText={setLogin}
                placeholderTextColor="#a09e9ec7"
              />

              <Input
                placeholder="Senha"
                value={senha}
                onChangeText={setSenha}
                secureTextEntry
                placeholderTextColor="#a09e9ec7"
              />

              <Input
                placeholder="Unidade ▼"
                placeholderTextColor="#a09e9ec7"
              />

              <Button label="Entrar" onPress={fazerLogin} />
            </View>

            <View style={styles.divider} />

            <View style={styles.resetButton}>
              <Text style={styles.resetText}>Redefinir senha</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  fundo: {
    flex: 1,
    backgroundColor: "#0D0D0D",
    justifyContent: "center",
    alignItems: "center",
  },

  container: {
    width: "90%",
    backgroundColor: "#FFF",
    borderRadius: 20,
    padding: 24,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 10,
  },

  logo: {
    width: "100%",
    height: 80,
    resizeMode: "contain",
    marginBottom: 20,
  },

  form: {
    gap: 12,
    marginTop: 10,
  },

  divider: {
    height: 1,
    backgroundColor: "#DDD",
    marginVertical: 20,
  },

  resetButton: {
    borderWidth: 1,
    borderColor: "#CFCFCF",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
  },

  resetText: {
    color: "#555",
    fontSize: 16,
  },
});