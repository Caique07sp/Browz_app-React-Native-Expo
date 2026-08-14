import { StatusBar } from "expo-status-bar";
import { Button, StyleSheet, View } from "react-native";
import React from "react";

import { ThemeProvider } from "./src/theme/ThemeContext";

import Configuracoes from "./src/app/configuracoes";

export default function App() {
  return (
    <ThemeProvider>
      <Configuracoes />
    </ThemeProvider>
  );

  async function testarApi() {
    try {
      
      const loginResponse = await fetch("https://browz.com.br/rest.php", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: process.env.EXPO_PUBLIC_API_BASIC_AUTH,
        },
        body: JSON.stringify({
          class: "ApplicationAuthenticationRestService",
          method: "getToken",
          login: "admin",
          password: "bio190210",
        }),
      });

      const loginData = await loginResponse.json();
      const token = loginData.data;

      console.log("TOKEN:", token);

      // 🚀 2. CHAMADA REAL
      const response = await fetch("https://browz.com.br/rest.php", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          class: "CustomerService",
          method: "load",
          id: 1326,
        }),
      });

      const data = await response.json();

      console.log("DADOS:", data);
    } catch (error: any) {
      console.log("ERRO:", error.message);
    }
  }

  return (
    <View style={styles.container}>
      <Button title="Testar API" onPress={testarApi} />
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});