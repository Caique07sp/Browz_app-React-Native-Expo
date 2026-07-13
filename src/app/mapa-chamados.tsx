import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as Linking from "expo-linking";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import { ArrowLeft, Calendar as CalendarIcon, MapPinOff, Navigation, Sparkles } from "lucide-react-native";
import React, { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    Alert
} from "react-native";
import MapView, { Callout, Marker, Polyline, PROVIDER_GOOGLE } from "react-native-maps";

import { ScreenWrapper } from "@/components/ScreenWrapper";
import { useTheme } from "@/theme/ThemeContext";

interface ChamadoMapa {
    id: string;
    protocolo: string;
    cliente: string;
    endereco: string;
    dataOriginal: string;
    dataStr: string;
    latitude?: number;
    longitude?: number;
    statusTexto: string;
    calendar_status: number;
    agenda_pause: number;
    ordemRota?: number; // Para mostrar visualmente a ordem (1º, 2º, 3º...)
}

export default function MapaChamadosScreen() {
    const router = useRouter();
    const { theme, darkMode } = useTheme();
    const mapRef = useRef<MapView | null>(null);

    const [dataSelecionada, setDataSelecionada] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [loading, setLoading] = useState(true);
    const [otimizando, setOtimizando] = useState(false);

    const [todosChamados, setTodosChamados] = useState<ChamadoMapa[]>([]);
    const [chamadosFiltrados, setChamadosFiltrados] = useState<ChamadoMapa[]>([]);

    useEffect(() => {
        carregarDadosIniciais();
    }, []);

    useEffect(() => {
        if (todosChamados.length > 0) {
            aplicarFiltroPorData(todosChamados, dataSelecionada);
        }
    }, [dataSelecionada]);

    async function carregarDadosIniciais() {
        setLoading(true);
        try {
            const [cacheChamados, cacheClientes] = await Promise.all([
                AsyncStorage.getItem("@cache_chamados"),
                AsyncStorage.getItem("@cache_clientes"),
            ]);

            const chamadosBrutos = cacheChamados ? JSON.parse(cacheChamados) : [];
            const clientesDict = cacheClientes ? JSON.parse(cacheClientes) : {};

            const mapeados: ChamadoMapa[] = chamadosBrutos.map((c: any) => ({
                id: String(c.calendar_id),
                protocolo: `CH-${c.calendar_id}`,
                cliente: clientesDict[c.customer_id] || `Cliente #${c.customer_id}`,
                endereco: c.calendar_address || "",
                dataOriginal: c.calendar_start,
                dataStr: c.calendar_start
                    ? new Date(c.calendar_start).toLocaleDateString("pt-BR")
                    : "",
                statusTexto: getStatusText(c.calendar_status, c.agenda_pause),
                calendar_status: Number(c.calendar_status),
                agenda_pause: Number(c.agenda_pause),
            }));

            setTodosChamados(mapeados);
            await aplicarFiltroPorData(mapeados, dataSelecionada);
        } catch (error) {
            console.log("Erro ao carregar dados pro mapa:", error);
            setLoading(false);
        }
    }

    async function aplicarFiltroPorData(listaGeral: ChamadoMapa[], dataFiltro: Date) {
        setLoading(true);
        const dataFiltroStr = dataFiltro.toLocaleDateString("pt-BR");

        const chamadosDoDia = listaGeral.filter((item) => item.dataStr === dataFiltroStr);

        const chamadosComCoordenadas = await Promise.all(
            chamadosDoDia.map(async (item) => {
                if (!item.endereco || item.endereco.trim().length === 0) return item;

                try {
                    const geocode = await Location.geocodeAsync(item.endereco);
                    if (geocode.length > 0) {
                        return {
                            ...item,
                            latitude: geocode[0].latitude,
                            longitude: geocode[0].longitude,
                        };
                    }
                } catch (e) {
                    console.log(`Erro ao buscar coordenada do chamado #${item.id}`);
                }
                return item;
            })
        );

        const validos = chamadosComCoordenadas.filter((c) => c.latitude && c.longitude) as ChamadoMapa[];
        setChamadosFiltrados(validos);
        setLoading(false);

        enquadrarChamadosNoMapa(validos);
    }

    function enquadrarChamadosNoMapa(chamados: ChamadoMapa[]) {
        if (chamados.length === 0 || !mapRef.current) return;

        const coordenadas = chamados.map((item) => ({
            latitude: item.latitude!,
            longitude: item.longitude!,
        }));

        setTimeout(() => {
            mapRef.current?.fitToCoordinates(coordenadas, {
                edgePadding: { top: 80, right: 80, bottom: 220, left: 80 }, // Aumentado o bottom para não sumir atrás do botão de otimizar
                animated: true,
            });
        }, 400);
    }

    // 📐 Fórmula matemática para calcular distância entre duas coordenadas (Haversine)
    function calcularDistancia(lat1: number, lon1: number, lat2: number, lon2: number) {
        const R = 6371; // Raio da Terra em KM
        const dLat = (lat2 - lat1) * (Math.PI / 180);
        const dLon = (lon2 - lon1) * (Math.PI / 180);
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    // ⚡ ALGORITMO DE OTIMIZAÇÃO DE ROTA
    async function otimizarRota() {
        if (chamadosFiltrados.length === 0) return;
        setOtimizando(true);

        try {
            // 1. Pede permissão e pega a localização exata atual do técnico
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== "granted") {
                Alert.alert("Permissão negada", "Precisamos do GPS para calcular a rota a partir de onde você está.");
                setOtimizando(false);
                return;
            }

            const localizacaoAtual = await Location.getCurrentPositionAsync({});
            let pontoAtual = {
                latitude: localizacaoAtual.coords.latitude,
                longitude: localizacaoAtual.coords.longitude,
            };

            // 2. Clona a lista de chamados para começar a triagem do mais próximo
            let naoVisitados = [...chamadosFiltrados];
            let rotaOrdenada: ChamadoMapa[] = [];
            let contadorOrdem = 1;

            while (naoVisitados.length > 0) {
                let indiceMaisProximo = 0;
                let menorDistancia = Infinity;

                // Varre a lista procurando quem está mais perto do pontoAtual
                for (let i = 0; i < naoVisitados.length; i++) {
                    const dist = calcularDistancia(
                        pontoAtual.latitude,
                        pontoAtual.longitude,
                        naoVisitados[i].latitude!,
                        naoVisitados[i].longitude!
                    );

                    if (dist < menorDistancia) {
                        menorDistancia = dist;
                        indiceMaisProximo = i;
                    }
                }

                // Remove o mais próximo da lista antiga, seta a ordem de parada e joga na rota final
                let proximoChamado = { ...naoVisitados[indiceMaisProximo], ordemRota: contadorOrdem };
                rotaOrdenada.push(proximoChamado);
                contadorOrdem++;

                // O ponto atual passa a ser esse chamado encontrado para o próximo cálculo da fila
                pontoAtual = {
                    latitude: proximoChamado.latitude!,
                    longitude: proximoChamado.longitude!,
                };

                naoVisitados.splice(indiceMaisProximo, 1);
            }

            // 3. Atualiza o estado com a sequência perfeita
            setChamadosFiltrados(rotaOrdenada);
            enquadrarChamadosNoMapa(rotaOrdenada);

            Alert.alert("Rota Otimizada! 🚀", "Calculamos o melhor trajeto saindo da sua localização atual.");

        } catch (error) {
            console.log("Erro ao otimizar trajeto:", error);
        } finally {
            setOtimizando(false);
        }
    }

    function getStatusCor(status: number, agendaPause: number) {
        if (status === 0) return "#ffa200";
        if (status === 1 && agendaPause === 1) return "#ff0077";
        if (status === 1) return "#3b82f6";
        if (status === 2) return "#22c55e";
        return "#94a3b8";
    }

    function getStatusText(status: number, agendaPause: number) {
        if (status === 0) return "Aberto";
        if (status === 1 && agendaPause === 1) return "Pausado";
        if (status === 1) return "Em atendimento";
        if (status === 2) return "Finalizado";
        return "Desconhecido";
    }

    function abrirNavegadorGPS(lat: number, lng: number, label: string) {
        const scheme = Platform.OS === "ios" ? "maps:0,0?q=" : "geo:0,0?q=";
        const latLng = `${lat},${lng}`;
        const url = Platform.select({
            ios: `${scheme}${label}@${latLng}`,
            android: `${scheme}${latLng}(${label})`,
        });

        if (url) Linking.openURL(url);
    }

    // Cria os pontos geométricos ordenados para desenhar a linha do trajeto
    const coordenadasLinha = chamadosFiltrados.map(c => ({
        latitude: c.latitude!,
        longitude: c.longitude!
    }));

    return (
        <ScreenWrapper style={{ flex: 1, backgroundColor: theme.background }}>
            {/* CABEÇALHO */}
            <View
                style={[
                    styles.cabecalhoMapa,
                    { backgroundColor: theme.card, borderColor: theme.border },
                ]}
            >
                <TouchableOpacity
                    style={[styles.botaoVoltar, { borderColor: theme.border }]}
                    onPress={() => router.back()}
                >
                    <ArrowLeft color={theme.text} size={22} />
                </TouchableOpacity>

                <View style={{ flex: 1 }}>
                    <Text style={[styles.tituloMapa, { color: theme.text }]}>
                        Mapa de Atendimentos
                    </Text>
                    <Text style={[styles.subtituloMapa, { color: theme.subText }]}>
                        {chamadosFiltrados.length} local(is) roteirizável(is)
                    </Text>
                </View>

                {/* SELETOR DE DATA */}
                <TouchableOpacity
                    style={[
                        styles.botaoData,
                        { backgroundColor: theme.primary + "15", borderColor: theme.primary },
                    ]}
                    onPress={() => setShowDatePicker(true)}
                >
                    <CalendarIcon size={18} color={theme.primary} />
                    <Text style={[styles.textoData, { color: theme.primary }]}>
                        {dataSelecionada.toLocaleDateString("pt-BR", {
                            day: "2-digit",
                            month: "2-digit",
                        })}
                    </Text>
                </TouchableOpacity>
            </View>

            {/* MODAL CALENDÁRIO */}
            {showDatePicker && (
                <DateTimePicker
                    value={dataSelecionada}
                    mode="date"
                    display={Platform.OS === "ios" ? "inline" : "default"}
                    onChange={(event, selectedDate) => {
                        setShowDatePicker(false);
                        if (selectedDate) setDataSelecionada(selectedDate);
                    }}
                />
            )}

            {/* ÁREA DO MAPA */}
            <View style={styles.containerMapa}>
                {loading ? (
                    <View style={styles.caixaCarregamento}>
                        <ActivityIndicator size="large" color={theme.primary} />
                        <Text style={{ color: theme.subText, marginTop: 12, fontWeight: "500" }}>
                            Buscando endereços e coordenadas...
                        </Text>
                    </View>
                ) : chamadosFiltrados.length === 0 ? (
                    <View style={styles.caixaCarregamento}>
                        <MapPinOff size={48} color={theme.border} />
                        <Text style={{ color: theme.subText, marginTop: 12, fontWeight: "500" }}>
                            Nenhum chamado com endereço válido para este dia.
                        </Text>
                    </View>
                ) : (
                    <View style={{ flex: 1 }}>
                        <MapView
                            ref={mapRef}
                            provider={PROVIDER_GOOGLE}
                            style={StyleSheet.absoluteFillObject}
                            initialRegion={{
                                latitude: chamadosFiltrados[0].latitude!,
                                longitude: chamadosFiltrados[0].longitude!,
                                latitudeDelta: 0.1,
                                longitudeDelta: 0.1,
                            }}
                            userInterfaceStyle={darkMode ? "dark" : "light"}
                            showsUserLocation={true}
                            showsMyLocationButton={true}
                        >
                            {/* 🗺️ DESENHA A LINHA DA ROTA CONECTANDO OS PONTOS */}
                            {coordenadasLinha.length > 1 && (
                                <Polyline
                                    coordinates={coordenadasLinha}
                                    strokeColor={theme.primary}
                                    strokeWidth={4}
                                    lineDashPattern={[5, 5]} // Deixa a linha tracejada estilosa
                                />
                            )}

                            {chamadosFiltrados.map((item) => (
                                <Marker
                                    key={item.id}
                                    coordinate={{
                                        latitude: item.latitude!,
                                        longitude: item.longitude!,
                                    }}
                                    pinColor={getStatusCor(item.calendar_status, item.agenda_pause)}
                                >
                                    <Callout
                                        tooltip
                                        onPress={() =>
                                            abrirNavegadorGPS(item.latitude!, item.longitude!, item.cliente)
                                        }
                                    >
                                        <View style={styles.cartaoPino}>
                                            <View style={styles.linhaStatus}>
                                                <View
                                                    style={[
                                                        styles.bolinhaStatus,
                                                        { backgroundColor: getStatusCor(item.calendar_status, item.agenda_pause) }
                                                    ]}
                                                />
                                                <Text style={styles.textoStatusPino}>
                                                    {item.statusTexto} {item.ordemRota ? `• ${item.ordemRota}ª Parada` : ""}
                                                </Text>
                                            </View>

                                            <Text style={styles.tituloPino}>{item.cliente}</Text>
                                            <Text style={styles.protocoloPino}>{item.protocolo}</Text>
                                            <Text style={styles.enderecoPino}>{item.endereco}</Text>

                                            <View style={styles.botaoRota}>
                                                <Navigation size={14} color="#fff" />
                                                <Text style={styles.textoBotaoRota}>Iniciar Rota</Text>
                                            </View>
                                        </View>
                                    </Callout>
                                </Marker>
                            ))}
                        </MapView>

                        {/* 🌟 BOTÃO FLUTUANTE DE OTIMIZAÇÃO */}
                        <View style={styles.caixaBotaoFlutuante}>
                            <TouchableOpacity
                                style={[styles.botaoOtimizar, { backgroundColor: theme.primary }]}
                                onPress={otimizarRota}
                                disabled={otimizando}
                            >
                                {otimizando ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <>
                                        <Sparkles size={20} color="#fff" />
                                        <Text style={styles.textoBotaoOtimizar}>Otimizar Rota do Dia</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
            </View>
        </ScreenWrapper>
    );
}

const styles = StyleSheet.create({
    cabecalhoMapa: {
        height: 70,
        paddingHorizontal: 16,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        borderBottomWidth: 1,
    },
    botaoVoltar: {
        width: 40,
        height: 40,
        borderRadius: 12,
        borderWidth: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    tituloMapa: { fontSize: 16, fontWeight: "bold" },
    subtituloMapa: { fontSize: 12, marginTop: 2 },
    botaoData: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 8,
        borderWidth: 1,
    },
    textoData: { fontSize: 13, fontWeight: "bold" },
    containerMapa: { flex: 1 },
    caixaCarregamento: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
    },
    cartaoPino: {
        backgroundColor: "#ffffff",
        padding: 14,
        borderRadius: 16,
        width: 240,
        elevation: 5,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 5,
    },
    linhaStatus: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        marginBottom: 6,
    },
    bolinhaStatus: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    textoStatusPino: {
        fontSize: 11,
        fontWeight: "bold",
        color: "#64748b",
    },
    tituloPino: { fontSize: 15, fontWeight: "bold", color: "#1e293b" },
    protocoloPino: { fontSize: 12, color: "#64748b", marginVertical: 4, fontWeight: "500" },
    enderecoPino: { fontSize: 12, color: "#475569", marginBottom: 12, lineHeight: 16 },
    botaoRota: {
        backgroundColor: "#3b82f6",
        paddingVertical: 8,
        borderRadius: 8,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
    },
    textoBotaoRota: { color: "#ffffff", fontSize: 13, fontWeight: "bold" },
    caixaBotaoFlutuante: {
        position: "absolute",
        bottom: 30,
        left: 20,
        right: 20,
        alignItems: "center",
    },
    botaoOtimizar: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        paddingVertical: 16,
        paddingHorizontal: 24,
        borderRadius: 100,
        elevation: 6,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 4.65,
        width: "100%",
    },
    textoBotaoOtimizar: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "bold",
    },
});