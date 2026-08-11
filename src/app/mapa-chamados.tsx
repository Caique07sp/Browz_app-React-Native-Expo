import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from "@react-native-community/datetimepicker";
import Constants from "expo-constants";
import * as Linking from "expo-linking";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import {
    AlertTriangle,
    ArrowLeft,
    Calendar as CalendarIcon,
    MapPin,
    MapPinOff,
    Navigation,
    Route,
    Sparkles,
    X,
} from "lucide-react-native";
import React, { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    FlatList,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import MapView, { Callout, Marker, Polyline, PROVIDER_GOOGLE } from "react-native-maps";

import { ScreenWrapper } from "@/components/ScreenWrapper";
import { useTheme } from "@/theme/ThemeContext";

const { width: LARGURA_TELA } = Dimensions.get("window");
const LARGURA_CARD = LARGURA_TELA * 0.8;

// 🔑 Obtém a API Key do Google Maps configurada no app.json (Android e iOS)
const GOOGLE_DIRECTIONS_API_KEY =
    Constants.expoConfig?.android?.config?.googleMaps?.apiKey ||
    Constants.expoConfig?.ios?.config?.googleMapsApiKey ||
    "";

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
    ordemRota?: number;
}

export default function MapaChamadosScreen() {
    const router = useRouter();
    const { theme, darkMode } = useTheme();
    const mapRef = useRef<MapView | null>(null);
    const flatListRef = useRef<FlatList | null>(null);

    const [dataSelecionada, setDataSelecionada] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [loading, setLoading] = useState(true);
    const [otimizando, setOtimizando] = useState(false);

    const [todosChamados, setTodosChamados] = useState<ChamadoMapa[]>([]);
    const [chamadosFiltrados, setChamadosFiltrados] = useState<ChamadoMapa[]>([]);
    const [chamadoAtivoId, setChamadoAtivoId] = useState<string | null>(null);
    const [qtdSemEndereco, setQtdSemEndereco] = useState<number>(0);
    const [distanciaTotalKm, setDistanciaTotalKm] = useState<number | null>(null);
    const [coordenadasRotaReal, setCoordenadasRotaReal] = useState<{ latitude: number; longitude: number }[]>([]);

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
                protocolo: `OS-${c.calendar_id}`,
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
            //console.log("Erro ao carregar dados pro mapa:", error);
            setLoading(false);
        }
    }

    async function obterCoordenadasComCache(endereco: string) {
        if (!endereco || endereco.trim().length === 0) return null;

        const chaveCache = `@geocode_${endereco.toLowerCase().trim()}`;
        try {
            const local = await AsyncStorage.getItem(chaveCache);
            if (local) return JSON.parse(local);

            // Timeout de segurança para evitar travamentos infinitos do CLGeocoder no iOS (3 segundos max)
            const promessaTimeout = new Promise<null>((resolve) =>
                setTimeout(() => resolve(null), 3000)
            );

            const promessaGeocode = Location.geocodeAsync(endereco);

            const geocode = await Promise.race([promessaGeocode, promessaTimeout]);

            if (geocode && geocode.length > 0) {
                const coordenadas = { latitude: geocode[0].latitude, longitude: geocode[0].longitude };
                await AsyncStorage.setItem(chaveCache, JSON.stringify(coordenadas));
                return coordenadas;
            }
        } catch (e) {
            //console.log(`Erro geocode no endereço: ${endereco}`, e);
        }
        return null;
    }

    async function aplicarFiltroPorData(listaGeral: ChamadoMapa[], dataFiltro: Date) {
        setLoading(true);
        setDistanciaTotalKm(null);
        setCoordenadasRotaReal([]);

        const dataFiltroStr = dataFiltro.toLocaleDateString("pt-BR");
        const chamadosDoDia = listaGeral.filter((item) => item.dataStr === dataFiltroStr);

        // Geocoding sequencial para evitar enfileiramento e rate-limit do CLGeocoder (iOS)
        const chamadosComCoordenadas: ChamadoMapa[] = [];
        for (const item of chamadosDoDia) {
            const coordenadas = await obterCoordenadasComCache(item.endereco);
            if (coordenadas) {
                chamadosComCoordenadas.push({
                    ...item,
                    latitude: coordenadas.latitude,
                    longitude: coordenadas.longitude,
                });
            } else {
                chamadosComCoordenadas.push(item);
            }
        }

        const validos = chamadosComCoordenadas.filter((c) => c.latitude && c.longitude) as ChamadoMapa[];
        const invalidosCount = chamadosDoDia.length - validos.length;

        setChamadosFiltrados(validos);
        setQtdSemEndereco(invalidosCount);

        if (validos.length > 0) {
            setChamadoAtivoId(validos[0].id);
        }

        setLoading(false);
        enquadrarChamadosNoMapa(validos);

        // 🛣️ Desenha o trajeto pelas ruas se houver múltiplos pontos válidos
        if (validos.length > 1) {
            buscarRotaPorPontos(validos.map((c) => ({ latitude: c.latitude!, longitude: c.longitude! })));
        } else {
            setCoordenadasRotaReal([]);
        }
    }

    function enquadrarChamadosNoMapa(chamados: ChamadoMapa[]) {
        if (chamados.length === 0 || !mapRef.current) return;

        const coordenadas = chamados.map((item) => ({
            latitude: item.latitude!,
            longitude: item.longitude!,
        }));

        setTimeout(() => {
            mapRef.current?.fitToCoordinates(coordenadas, {
                edgePadding: { top: 120, right: 60, bottom: 260, left: 60 },
                animated: true,
            });
        }, 400);
    }

    function focarNoChamado(latitude: number, longitude: number) {
        mapRef.current?.animateToRegion(
            {
                latitude,
                longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
            },
            600
        );
    }

    function selecionarChamadoPeloCarrossel(item: ChamadoMapa) {
        setChamadoAtivoId(item.id);
        if (item.latitude && item.longitude) {
            focarNoChamado(item.latitude, item.longitude);
        }

        const index = chamadosFiltrados.findIndex((c) => c.id === item.id);
        if (index !== -1 && flatListRef.current) {
            flatListRef.current.scrollToIndex({ index, animated: true });
        }
    }

    const MAX_WAYPOINTS_POR_REQUISICAO = 23;

    async function buscarRotaPorPontos(pontos: { latitude: number; longitude: number }[]) {
        if (pontos.length < 2 || !GOOGLE_DIRECTIONS_API_KEY) {
            setCoordenadasRotaReal([]);
            return;
        }

        try {
            const blocos: { latitude: number; longitude: number }[][] = [];
            let inicioBloco = 0;
            while (inicioBloco < pontos.length - 1) {
                const fimBloco = Math.min(inicioBloco + MAX_WAYPOINTS_POR_REQUISICAO + 1, pontos.length - 1);
                blocos.push(pontos.slice(inicioBloco, fimBloco + 1));
                inicioBloco = fimBloco;
            }

            let trajetoCompleto: { latitude: number; longitude: number }[] = [];

            for (const bloco of blocos) {
                const origem = `${bloco[0].latitude},${bloco[0].longitude}`;
                const destino = `${bloco[bloco.length - 1].latitude},${bloco[bloco.length - 1].longitude}`;
                const intermediarios = bloco
                    .slice(1, -1)
                    .map((p) => `${p.latitude},${p.longitude}`)
                    .join("|");

                // 🛠️ MUDANÇA AQUI: Formata a URL escapando caracteres especiais como "|"
                let url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origem}&destination=${destino}&mode=driving&key=${GOOGLE_DIRECTIONS_API_KEY}`;

                if (intermediarios) {
                    const waypointsFormatted = encodeURIComponent(`optimize:false|${intermediarios}`);
                    url += `&waypoints=${waypointsFormatted}`;
                }

                const resposta = await fetch(url);
                const json = await resposta.json();

                if (json.status === "OK" && json.routes?.length > 0) {
                    const pontosPolyline = decodificarPolyline(json.routes[0].overview_polyline.points);
                    trajetoCompleto = trajetoCompleto.concat(pontosPolyline);
                }
            }

            setCoordenadasRotaReal(trajetoCompleto);
        } catch (error) {
            setCoordenadasRotaReal([]);
        }
    }

    function decodificarPolyline(encoded: string) {
        let points = [];
        let index = 0, len = encoded.length;
        let lat = 0, lng = 0;

        while (index < len) {
            let b, shift = 0, result = 0;
            do {
                b = encoded.charCodeAt(index++) - 63;
                result |= (b & 0x1f) << shift;
                shift += 5;
            } while (b >= 0x20);
            let dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
            lat += dlat;

            shift = 0;
            result = 0;
            do {
                b = encoded.charCodeAt(index++) - 63;
                result |= (b & 0x1f) << shift;
                shift += 5;
            } while (b >= 0x20);
            let dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
            lng += dlng;

            points.push({
                latitude: lat / 1e5,
                longitude: lng / 1e5,
            });
        }
        return points;
    }

    function calcularDistancia(lat1: number, lon1: number, lat2: number, lon2: number) {
        const R = 6371;
        const dLat = (lat2 - lat1) * (Math.PI / 180);
        const dLon = (lon2 - lon1) * (Math.PI / 180);
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * (Math.PI / 180)) *
            Math.cos(lat2 * (Math.PI / 180)) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    async function otimizarRota() {
        if (chamadosFiltrados.length === 0) return;
        setOtimizando(true);

        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== "granted") {
                Alert.alert("Permissão negada", "Precisamos do GPS para calcular a rota.");
                setOtimizando(false);
                return;
            }

            const localizacaoAtual = await Location.getCurrentPositionAsync({});
            let pontoAtual = {
                latitude: localizacaoAtual.coords.latitude,
                longitude: localizacaoAtual.coords.longitude,
            };

            let naoVisitados = [...chamadosFiltrados];
            let rotaOrdenada: ChamadoMapa[] = [];
            let contadorOrdem = 1;
            let kmTotal = 0;

            while (naoVisitados.length > 0) {
                let indiceMaisProximo = 0;
                let menorDistancia = Infinity;

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

                kmTotal += menorDistancia;

                let proximoChamado = {
                    ...naoVisitados[indiceMaisProximo],
                    ordemRota: contadorOrdem,
                };
                rotaOrdenada.push(proximoChamado);
                contadorOrdem++;

                pontoAtual = {
                    latitude: proximoChamado.latitude!,
                    longitude: proximoChamado.longitude!,
                };

                naoVisitados.splice(indiceMaisProximo, 1);
            }

            setChamadosFiltrados(rotaOrdenada);
            setDistanciaTotalKm(parseFloat(kmTotal.toFixed(1)));
            setChamadoAtivoId(rotaOrdenada[0].id);

            const pontosDaRota = [
                { latitude: localizacaoAtual.coords.latitude, longitude: localizacaoAtual.coords.longitude },
                ...rotaOrdenada.map((c) => ({ latitude: c.latitude!, longitude: c.longitude! })),
            ];
            await buscarRotaPorPontos(pontosDaRota);

            enquadrarChamadosNoMapa(rotaOrdenada);

            Alert.alert("Rota Otimizada! 🚀", `Calculamos o melhor trajeto. Distância est.: ${kmTotal.toFixed(1)} km`);
        } catch (error) {
            //console.log("Erro ao otimizar trajeto:", error);
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

    async function abrirNavegadorGPS(lat: number, lng: number, label: string) {
        const labelEncoded = encodeURIComponent(label);
        const latLng = `${lat},${lng}`;

        // URLs para apps nativos e fallback web
        const urlIos = `maps:0,0?q=${labelEncoded}@${latLng}`;
        const urlAndroid = `geo:0,0?q=${latLng}(${labelEncoded})`;
        const urlWeb = `https://www.google.com/maps/search/?api=1&query=${latLng}`;

        try {
            if (Platform.OS === "ios") {
                const podeAbrirAppleMaps = await Linking.canOpenURL(urlIos);
                if (podeAbrirAppleMaps) {
                    await Linking.openURL(urlIos);
                    return;
                }
            } else if (Platform.OS === "android") {
                const podeAbrirGeo = await Linking.canOpenURL(urlAndroid);
                if (podeAbrirGeo) {
                    await Linking.openURL(urlAndroid);
                    return;
                }
            }

            // Fallback: Se não conseguir abrir o app nativo (ex: no emulador), abre no navegador/Google Maps
            await Linking.openURL(urlWeb);
        } catch (error) {
            // Se tudo falhar, abre direto a URL do Google Maps web sem quebrar o app
            Linking.openURL(urlWeb);
        }
    }

    const coordenadasLinhaReta = chamadosFiltrados.map((c) => ({
        latitude: c.latitude!,
        longitude: c.longitude!,
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
                        {chamadosFiltrados.length} atendimento(s) com endereço válido
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
            {/* MODAL CALENDÁRIO */}
            {showDatePicker && (
                Platform.OS === "ios" ? (
                    <View
                        style={{
                            backgroundColor: theme.card,
                            borderRadius: 16,
                            padding: 12,
                            marginHorizontal: 16,
                            marginBottom: 12,
                            borderWidth: 1,
                            borderColor: theme.border,
                        }}
                    >
                        <DateTimePicker
                            value={dataSelecionada}
                            mode="date"
                            display="inline"
                            locale="pt-BR"
                            themeVariant={darkMode ? "dark" : "light"}
                            onChange={(event, selectedDate) => {
                                setShowDatePicker(false);
                                if (selectedDate) setDataSelecionada(selectedDate);
                            }}
                        />
                    </View>
                ) : (
                    <DateTimePicker
                        value={dataSelecionada}
                        mode="date"
                        display="default"
                        onChange={(event, selectedDate) => {
                            setShowDatePicker(false);
                            if (selectedDate) setDataSelecionada(selectedDate);
                        }}
                    />
                )
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
                            // ✅ MÁGICA AQUI: Usa Google no Android e o nativo (Apple Maps) no iOS
                            provider={Platform.OS === "android" ? PROVIDER_GOOGLE : undefined}
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
                            {/* 🛣️ DESENHA A ROTA REAL (OU LINHA RETA DE FALLBACK) */}
                            {coordenadasRotaReal.length > 0 ? (
                                <Polyline
                                    coordinates={coordenadasRotaReal}
                                    strokeColor={theme.primary}
                                    strokeWidth={5}
                                />
                            ) : (
                                coordenadasLinhaReta.length > 1 && (
                                    <Polyline
                                        coordinates={coordenadasLinhaReta}
                                        strokeColor={theme.primary}
                                        strokeWidth={4}
                                        lineDashPattern={[5, 5]}
                                    />
                                )
                            )}

                            {chamadosFiltrados.map((item) => (
                                <Marker
                                    key={item.id}
                                    coordinate={{
                                        latitude: item.latitude!,
                                        longitude: item.longitude!,
                                    }}
                                    pinColor={getStatusCor(item.calendar_status, item.agenda_pause)}
                                    tracksViewChanges={false}
                                    onPress={() => selecionarChamadoPeloCarrossel(item)}
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
                                                        { backgroundColor: getStatusCor(item.calendar_status, item.agenda_pause) },
                                                    ]}
                                                />
                                                <Text style={styles.textoStatusPino}>
                                                    {item.statusTexto}{" "}
                                                    {item.ordemRota ? `• ${item.ordemRota}ª Parada` : ""}
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

                        {/* ⚠️ AVISO DE CHAMADOS SEM ENDEREÇO */}
                        {qtdSemEndereco > 0 && (
                            <View style={styles.bannerAlertaSemEndereco}>
                                <AlertTriangle size={16} color="#b45309" />
                                <Text style={styles.textoAlertaSemEndereco}>
                                    {qtdSemEndereco} chamado(s) sem endereço/localização válida.
                                </Text>
                            </View>
                        )}

                        {/* 📍 CARD DE ROTA ATIVA */}
                        {distanciaTotalKm !== null && (
                            <View style={[styles.cardRotaAtiva, { backgroundColor: theme.card }]}>
                                <Route size={20} color={theme.primary} />
                                <View>
                                    <Text style={[styles.tituloRotaAtiva, { color: theme.text }]}>
                                        Rota Otimizada
                                    </Text>
                                    <Text style={[styles.subtituloRotaAtiva, { color: theme.subText }]}>
                                        {chamadosFiltrados.length} paradas • ~{distanciaTotalKm} km de percurso
                                    </Text>
                                </View>
                            </View>
                        )}

                        {/* 📱 CARROSSEL BOTTOM SHEET DE CARDS */}
                        <View style={styles.containerCarrosselInferior}>
                            <FlatList
                                ref={flatListRef}
                                data={chamadosFiltrados}
                                horizontal
                                pagingEnabled
                                snapToInterval={LARGURA_CARD + 12}
                                decelerationRate="fast"
                                showsHorizontalScrollIndicator={false}
                                keyExtractor={(item) => item.id}
                                onScrollToIndexFailed={() => { }}
                                contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
                                onMomentumScrollEnd={(e) => {
                                    const index = Math.round(
                                        e.nativeEvent.contentOffset.x / (LARGURA_CARD + 12)
                                    );
                                    if (chamadosFiltrados[index]) {
                                        setChamadoAtivoId(chamadosFiltrados[index].id);
                                        if (chamadosFiltrados[index].latitude && chamadosFiltrados[index].longitude) {
                                            focarNoChamado(
                                                chamadosFiltrados[index].latitude!,
                                                chamadosFiltrados[index].longitude!
                                            );
                                        }
                                    }
                                }}
                                renderItem={({ item }) => {
                                    const isSelecionado = item.id === chamadoAtivoId;
                                    return (
                                        <TouchableOpacity
                                            activeOpacity={0.9}
                                            style={[
                                                styles.cardCarrossel,
                                                { backgroundColor: theme.card, borderColor: isSelecionado ? theme.primary : theme.border },
                                                isSelecionado && styles.cardCarrosselAtivo,
                                            ]}
                                            onPress={() => selecionarChamadoPeloCarrossel(item)}
                                        >
                                            <View style={styles.headerCardCarrossel}>
                                                <View style={styles.linhaStatus}>
                                                    <View
                                                        style={[
                                                            styles.bolinhaStatus,
                                                            { backgroundColor: getStatusCor(item.calendar_status, item.agenda_pause) },
                                                        ]}
                                                    />
                                                    <Text style={[styles.textoStatusPino, { color: theme.subText }]}>
                                                        {item.statusTexto} {item.ordemRota ? `• ${item.ordemRota}ª Parada` : ""}
                                                    </Text>
                                                </View>
                                                <Text style={[styles.protocoloCard, { color: theme.subText }]}>
                                                    {item.protocolo}
                                                </Text>
                                            </View>

                                            <Text style={[styles.clienteCard, { color: theme.text }]} numberOfLines={1}>
                                                {item.cliente}
                                            </Text>

                                            <View style={styles.linhaEndereco}>
                                                <MapPin size={14} color={theme.subText} />
                                                <Text style={[styles.enderecoCard, { color: theme.subText }]} numberOfLines={1}>
                                                    {item.endereco}
                                                </Text>
                                            </View>

                                            <TouchableOpacity
                                                style={[styles.botaoNavegarCard, { backgroundColor: theme.primary }]}
                                                onPress={() => abrirNavegadorGPS(item.latitude!, item.longitude!, item.cliente)}
                                            >
                                                <Navigation size={14} color="#fff" />
                                                <Text style={styles.textoBotaoNavegarCard}>Iniciar Rota no GPS</Text>
                                            </TouchableOpacity>
                                        </TouchableOpacity>
                                    );
                                }}
                            />

                            {/* 🌟 BOTÃO FLUTUANTE DE OTIMIZAÇÃO */}
                            <TouchableOpacity
                                style={[styles.botaoOtimizar, { backgroundColor: theme.primary }]}
                                onPress={otimizarRota}
                                disabled={otimizando}
                            >
                                {otimizando ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <>
                                        <Sparkles size={18} color="#fff" />
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
    },
    bolinhaStatus: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    textoStatusPino: {
        fontSize: 11,
        fontWeight: "bold",
    },
    tituloPino: { fontSize: 15, fontWeight: "bold", color: "#1e293b", marginTop: 4 },
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
    bannerAlertaSemEndereco: {
        position: "absolute",
        top: 12,
        left: 16,
        right: 16,
        backgroundColor: "#fef3c7",
        borderColor: "#f59e0b",
        borderWidth: 1,
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 8,
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        elevation: 3,
    },
    textoAlertaSemEndereco: {
        fontSize: 12,
        fontWeight: "600",
        color: "#92400e",
    },
    cardRotaAtiva: {
        position: "absolute",
        top: 56,
        left: 16,
        right: 16,
        padding: 12,
        borderRadius: 12,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        elevation: 4,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 3.84,
    },
    tituloRotaAtiva: { fontSize: 13, fontWeight: "bold" },
    subtituloRotaAtiva: { fontSize: 11, marginTop: 1 },
    containerCarrosselInferior: {
        position: "absolute",
        bottom: 20,
        left: 0,
        right: 0,
        gap: 12,
    },
    cardCarrossel: {
        width: LARGURA_CARD,
        padding: 14,
        borderRadius: 16,
        borderWidth: 1.5,
        elevation: 5,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
    },
    cardCarrosselAtivo: {
        borderWidth: 2,
    },
    headerCardCarrossel: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 6,
    },
    protocoloCard: {
        fontSize: 11,
        fontWeight: "600",
    },
    clienteCard: {
        fontSize: 15,
        fontWeight: "bold",
        marginBottom: 6,
    },
    linhaEndereco: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        marginBottom: 12,
    },
    enderecoCard: {
        fontSize: 12,
        flex: 1,
    },
    botaoNavegarCard: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        paddingVertical: 10,
        borderRadius: 10,
    },
    textoBotaoNavegarCard: {
        color: "#fff",
        fontSize: 13,
        fontWeight: "bold",
    },
    botaoOtimizar: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        paddingVertical: 12,
        marginHorizontal: 16,
        borderRadius: 100,
        elevation: 6,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
    },
    textoBotaoOtimizar: {
        color: "#fff",
        fontSize: 14,
        fontWeight: "bold",
    },
});
