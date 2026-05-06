import { StatusBar } from "expo-status-bar";
import { Button, StyleSheet, View } from "react-native";

export default function App() {
  async function testarApi() {
    try {
      // 🔐 1. LOGIN (pegar token)
      const loginResponse = await fetch("https://browz.com.br/rest.php", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Basic 94ru30984rvnh4r2rjo",
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
          id: 1326, // 👈 geralmente Adianti usa "key" e não "valor"
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