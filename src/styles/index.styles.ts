import { Platform, StyleSheet } from "react-native";

export const styles = StyleSheet.create({
    fundo: { flex: 1, backgroundColor: "#0D0D0D", justifyContent: "center", alignItems: "center" },
    container: { width: "90%", backgroundColor: "#FFF", borderRadius: 20, padding: 24, shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 10, elevation: 10 },
    logo: { width: "100%", height: 80, resizeMode: "contain", marginBottom: 20 },
    form: { gap: 12, marginTop: 10 },
    divider: { height: 1, backgroundColor: "#DDD", marginVertical: 20 }
});