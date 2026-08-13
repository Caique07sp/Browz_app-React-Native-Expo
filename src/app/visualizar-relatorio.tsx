import AsyncStorage from '@react-native-async-storage/async-storage';

import { useLocalSearchParams, useRouter } from 'expo-router';

import { ChevronLeft, ClipboardList, Eye, FileText, ImageIcon, PenTool, Play, User, Video as VideoIcon, X } from 'lucide-react-native';

import { ScreenWrapper } from "@/components/ScreenWrapper";
import { useTheme } from "@/theme/ThemeContext";
import React, { useEffect, useState } from 'react';
import { getApiUrl } from "@/services/api";

import { isOnline } from '@/services/network';
import {
    ActivityIndicator,

    Image,
    Modal,
    Platform,
    ScrollView,
    Text,

    TouchableOpacity,

    View
} from 'react-native';
import { styles } from "../styles/view-report.styles";

import { ResizeMode, Video as VideoPlayer } from 'expo-av';


export default function VisualizarRelatorio() {

    const router = useRouter();

    const { ticketId } = useLocalSearchParams();


    const chamadoId = String(ticketId);


    const [loading, setLoading] = useState(true);

    const [calendar, setCalendar] = useState<any>(null);

    const [checklistTemplate, setChecklistTemplate] = useState<any[]>([]);

    const [checklistResponses, setChecklistResponses] = useState<any[]>([]);

    const [fotoModalVisible, setFotoModalVisible] = useState(false);
    const [fotoUriSelecionada, setFotoUriSelecionada] = useState<string | null>(null);

    const [videoModalVisible, setVideoModalVisible] = useState(false);
    const [videoUriSelecionado, setVideoUriSelecionado] = useState<string | null>(null);

    const { theme, darkMode } = useTheme();


    useEffect(() => {

        carregarDados();

    }, []);


    async function carregarDados() {

        try {

            setLoading(true);


            await buscarChamado();

            await buscarChecklist();

        } finally {

            setLoading(false);

        }

    }


    async function buscarChamado() {
    try {
        const online = await isOnline();

        if (online) {
            const token = await AsyncStorage.getItem('token');

            const response = await fetch(
               await getApiUrl(),
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        class: 'CalendarService',
                        method: 'loadAll',
                    }),
                }
            );

            const data = await response.json();

            if (data.status === 'success') {
                const encontrado = data.data.find(
                    (item: any) =>
                        String(item.calendar_id) === String(chamadoId)
                );

                if (encontrado) {
                    setCalendar(encontrado);

                    await AsyncStorage.setItem(
                        `@relatorio_final_${chamadoId}`,
                        JSON.stringify(encontrado)
                    );

                    return;
                }
            }
        }

        // Se estiver offline ou der erro, usa o cache
        const cache = await AsyncStorage.getItem(
            `@relatorio_final_${chamadoId}`
        );

        if (cache) {
            setCalendar(JSON.parse(cache));
        }

    } catch (error) {
        //console.log(error);
    }
}

    async function buscarChecklist() {

        try {

            // CACHE PRIMEIRO
            const cache =
                await AsyncStorage.getItem(
                    `@checklist_${chamadoId}`
                );

            if (cache) {

                const checklist = JSON.parse(cache);

                setChecklistTemplate(
                    checklist.template || []
                );

                setChecklistResponses(
                    checklist.responses || []
                );
            }

            const online = await isOnline();

            // OFFLINE
            if (!online) {
                //console.log("📴 Offline checklist");
                return;
            }

            // ONLINE
            const token = await AsyncStorage.getItem('token');

            const response = await fetch(
                await getApiUrl(),
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        class: 'CalendarChecklistService',
                        method: 'loadAll',
                    }),
                }
            );

            const data = await response.json();

            if (
                data.status === 'success' &&
                Array.isArray(data.data)
            ) {

                const itemChecklist = data.data.find(
                    (item: any) =>
                        String(item.calendar_id) ===
                        String(chamadoId)
                );

                if (itemChecklist) {

                    const template =
                        itemChecklist.calendar_checklist_template
                            ? JSON.parse(
                                itemChecklist.calendar_checklist_template
                            )
                            : [];

                    const responses =
                        itemChecklist.calendar_checklist_response
                            ? JSON.parse(
                                itemChecklist.calendar_checklist_response
                            )
                            : [];

                    const ordenado =
                        template.sort(
                            (a: any, b: any) =>
                                Number(a.order) -
                                Number(b.order)
                        );

                    setChecklistTemplate(ordenado);

                    setChecklistResponses(responses);

                    // SALVA CACHE
                    await AsyncStorage.setItem(
                        `@checklist_${chamadoId}`,
                        JSON.stringify({
                            template: ordenado,
                            responses,
                        })
                    );
                }
            }

        } catch (error) {

            //console.log(error);
        }
    }


    function getResposta(fieldId: string) {

        return checklistResponses.find((item: any) => item.field_id === fieldId);

    }


    function formatarResposta(field: any) {

        const resposta = getResposta(field.id);


        if (!resposta) return 'Não respondido';


        if (field.type === 'checkbox') {

            const options = field.options?.split('|') || [];

            const selected = String(resposta.field_value)

                .split(',')

                .map((i: string) => options[Number(i)])

                .filter(Boolean);


            return selected.length ? selected.join(', ') : 'Não respondido';

        }


        if (field.type === 'select' || field.type === 'radio') {

            const options = field.options?.split('|') || [];

            return options[Number(resposta.field_value)] || 'Não respondido';

        }


        return String(resposta.field_value || 'Não respondido');

    }


    function getMidias(): { uri: string; isVideo: boolean }[] {
        const remotas: { uri: string; isVideo: boolean }[] = [];

        if (calendar?.calendar_images) {
            String(calendar.calendar_images)
                .split(',')
                .map((item: string) => item.trim())
                .filter(Boolean)
                .forEach((item: string) => {
                    const uri = item.startsWith('http')
                        ? item
                        : `https://browz.com.br/${item.replace(/^\/+/, '')}`;
                    const isVideo =
                        uri.toLowerCase().endsWith('.mp4') ||
                        uri.toLowerCase().endsWith('.mov');
                    remotas.push({ uri, isVideo });
                });
        }

        return remotas;
    }


    if (loading) {

        return (

            <ScreenWrapper
                style={[
                    styles.container,
                    {
                        backgroundColor: theme.background,
                    },
                ]}
            >

                <View style={styles.loadingBox}>

                    <ActivityIndicator size="large" color="#3b82f6" />

                    <Text
                        style={[
                            styles.loadingText,
                            {
                                color: theme.subText,
                            },
                        ]}
                    >Carregando relatório...</Text>

                </View>

            </ScreenWrapper>

        );

    }


    if (!calendar) {

        return (

            <ScreenWrapper
                style={[
                    styles.container,
                    {
                        backgroundColor: theme.background,
                    },
                ]}
            >

                <View style={styles.loadingBox}>

                    <Text
                        style={[
                            styles.loadingText,
                            {
                                color: theme.subText,
                            },
                        ]}
                    >Relatório não encontrado.</Text>

                </View>

            </ScreenWrapper>

        );

    }


    const midias = getMidias();


    return (

        <ScreenWrapper
            style={[
                styles.container,
                {
                    backgroundColor: theme.background,
                },
            ]}
        >

            <ScrollView contentContainerStyle={styles.scrollContent}>

                <TouchableOpacity
                    style={[
                        styles.backButton,
                        {
                            backgroundColor: theme.card,
                        },
                    ]}
                    onPress={() => router.back()}>

                    <ChevronLeft
                        color={theme.text}
                        size={26}
                    />

                </TouchableOpacity>


                <Text
                    style={[
                        styles.title,
                        {
                            color: theme.text,
                        },
                    ]}
                >Relatório Finalizado</Text>

                <Text style={styles.subtitle}>Chamado #{chamadoId}</Text>


                <View
                    style={[
                        styles.card,
                        {
                            backgroundColor: theme.card,
                            borderColor: theme.border,
                        },
                    ]}
                >

                    <View style={styles.cardHeader}>

                        <FileText size={20} color="#3b82f6" />

                        <Text
                            style={[
                                styles.cardTitle,
                                {
                                    color: theme.text,
                                },
                            ]}
                        >Descrição do serviço</Text>

                    </View>


                    <Text
                        style={[
                            styles.text,
                            {
                                color: theme.subText,
                            },
                        ]}
                    >
                        {calendar.calendar_report || 'Nenhuma descrição informada.'}

                    </Text>

                </View>


                <View
                    style={[
                        styles.card,
                        {
                            backgroundColor: theme.card,
                            borderColor: theme.border,
                        },
                    ]}
                >

                    <View style={styles.cardHeader}>

                        <User size={20} color="#22c55e" />

                        <Text
                            style={[
                                styles.cardTitle,
                                {
                                    color: theme.text,
                                },
                            ]}
                        >Dados de quem assinou</Text>

                    </View>


                    <Text
                        style={[
                            styles.infoText,
                            {
                                color: theme.text,
                            },
                        ]}
                    >

                        Nome: {calendar.calendar_signatory_name || 'Não informado'}

                    </Text>


                    <Text
                        style={[
                            styles.infoText,
                            {
                                color: theme.text,
                            },
                        ]}
                    >

                        E-mail: {calendar.calendar_signatory_email || 'Não informado'}

                    </Text>

                </View>


                <View
                    style={[
                        styles.card,
                        {
                            backgroundColor: theme.card,
                            borderColor: theme.border,
                        },
                    ]}
                >

                    <View style={styles.cardHeader}>

                        <ClipboardList size={20} color="#f59e0b" />

                        <Text
                            style={[
                                styles.cardTitle,
                                {
                                    color: theme.text,
                                },
                            ]}
                        >Checklist respondido</Text>

                    </View>


                    {checklistTemplate.length === 0 ? (

                        <Text
                            style={[
                                styles.text,
                                {
                                    color: theme.subText,
                                },
                            ]}
                        >Nenhum checklist encontrado.</Text>

                    ) : (

                        checklistTemplate.map((field: any, index: number) => (

                            <View key={`${field.id}-${index}`} style={[
                                styles.answerBox,
                                {
                                    backgroundColor: theme.background,
                                },
                            ]}
                            >

                                <Text
                                    style={[
                                        styles.question,
                                        {
                                            color: theme.subText,
                                        },
                                    ]}
                                >{field.label}</Text>

                                <Text
                                    style={[
                                        styles.answer,
                                        {
                                            color: theme.text,
                                        },
                                    ]}
                                >{formatarResposta(field)}</Text>

                            </View>

                        ))

                    )}

                </View>


                <View
                    style={[
                        styles.card,
                        {
                            backgroundColor: theme.card,
                            borderColor: theme.border,
                        },
                    ]}
                >
                    <View style={styles.cardHeader}>
                        <ImageIcon size={20} color="#38bdf8" />
                        <Text style={[styles.cardTitle, { color: theme.text }]}>
                            Fotos e Vídeos
                        </Text>
                    </View>

                    {midias.length === 0 ? (
                        <Text style={[styles.text, { color: theme.subText }]}>
                            Nenhuma foto ou vídeo enviado.
                        </Text>
                    ) : (
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                            {midias.map(({ uri, isVideo }, index) => (
                                <TouchableOpacity
                                    key={index}
                                    activeOpacity={0.85}
                                    onPress={() => {
                                        if (isVideo) {
                                            setVideoUriSelecionado(uri);
                                            setVideoModalVisible(true);
                                        } else {
                                            setFotoUriSelecionada(uri);
                                            setFotoModalVisible(true);
                                        }
                                    }}
                                    style={{
                                        width: '47%',
                                        aspectRatio: 1,
                                        borderRadius: 12,
                                        overflow: 'hidden',
                                        backgroundColor: theme.background,
                                        position: 'relative',
                                    }}
                                >
                                    <Image
                                        source={{ uri }}
                                        resizeMode="cover"
                                        style={{ width: '100%', height: '100%' }}
                                    />
                                    {/* Badge de vídeo */}
                                    {isVideo && (
                                        <View style={{
                                            position: 'absolute',
                                            top: 6,
                                            left: 6,
                                            backgroundColor: 'rgba(0,0,0,0.6)',
                                            padding: 4,
                                            borderRadius: 4,
                                        }}>
                                            <VideoIcon size={12} color="#fff" />
                                        </View>
                                    )}
                                    {/* Botão central */}
                                    <View style={{
                                        position: 'absolute',
                                        bottom: 0, left: 0, right: 0, top: 0,
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                    }}>
                                        <View style={{
                                            backgroundColor: isVideo
                                                ? 'rgba(59,130,246,0.80)'
                                                : 'rgba(15,23,42,0.55)',
                                            padding: 10,
                                            borderRadius: 99,
                                        }}>
                                            {isVideo
                                                ? <Play size={18} color="#fff" fill="#fff" />
                                                : <Eye size={18} color="#fff" />
                                            }
                                        </View>
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}

                </View>

                {/* Modal visualizador de foto */}
                <Modal
                    visible={fotoModalVisible}
                    animationType="fade"
                    transparent={false}
                    onRequestClose={() => setFotoModalVisible(false)}
                >
                    <View style={{ flex: 1, backgroundColor: '#0b0f19', justifyContent: 'center', alignItems: 'center' }}>
                        <TouchableOpacity
                            style={{
                                position: 'absolute',
                                top: Platform.OS === 'ios' ? 60 : 40,
                                right: 20,
                                zIndex: 10,
                                backgroundColor: 'rgba(255,255,255,0.15)',
                                padding: 12,
                                borderRadius: 99,
                            }}
                            onPress={() => setFotoModalVisible(false)}
                        >
                            <X size={24} color="#fff" />
                        </TouchableOpacity>
                        {fotoUriSelecionada && (
                            <Image
                                source={{ uri: fotoUriSelecionada }}
                                style={{ width: '100%', height: '85%' }}
                                resizeMode="contain"
                            />
                        )}
                    </View>
                </Modal>

                {/* Modal player de vídeo */}
                <Modal
                    visible={videoModalVisible}
                    animationType="slide"
                    transparent={false}
                    onRequestClose={() => setVideoModalVisible(false)}
                >
                    <View style={{ flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }}>
                        <TouchableOpacity
                            style={{
                                position: 'absolute',
                                top: Platform.OS === 'ios' ? 60 : 40,
                                right: 20,
                                zIndex: 10,
                                backgroundColor: 'rgba(0,0,0,0.5)',
                                padding: 10,
                                borderRadius: 99,
                            }}
                            onPress={() => setVideoModalVisible(false)}
                        >
                            <X size={24} color="#fff" />
                        </TouchableOpacity>
                        {videoUriSelecionado && (
                            <VideoPlayer
                                source={{ uri: videoUriSelecionado }}
                                rate={1.0}
                                volume={1.0}
                                isMuted={false}
                                resizeMode={ResizeMode.CONTAIN}
                                shouldPlay
                                useNativeControls
                                style={{ width: '100%', height: '80%' }}
                            />
                        )}
                    </View>
                </Modal>


                <View
                    style={[
                        styles.card,
                        {
                            backgroundColor: theme.card,
                            borderColor: theme.border,
                        },
                    ]}
                >

                    <View style={styles.cardHeader}>

                        <PenTool size={20} color="#a855f7" />

                        <Text
                            style={[
                                styles.cardTitle,
                                {
                                    color: theme.text,
                                },
                            ]}
                        >Assinatura</Text>

                    </View>


                    {calendar.calendar_signature ? (
                        <View style={styles.signatureBox}>
                            <Image
                                source={{
                                    uri: String(calendar.calendar_signature).startsWith("http")
                                        ? calendar.calendar_signature
                                        : `https://browz.com.br/${String(
                                            calendar.calendar_signature
                                        ).replace(/^\/+/, "")}`,
                                }}
                                resizeMode="contain"
                                style={styles.signatureImage}
                            />
                        </View>
                    ) : (
                        <Text
                            style={[
                                styles.text,
                                {
                                    color: theme.subText,
                                },
                            ]}
                        >
                            Nenhuma assinatura encontrada.
                        </Text>
                    )}

                </View>


                <TouchableOpacity

                    style={styles.editButton}

                    onPress={() =>

                       router.replace({

                            pathname: '/editar-relatorio',

                            params: {
                                ticketId: chamadoId,
                            },

                        })

                    }

                >

                    <Text style={styles.editButtonText}>Editar relatório</Text>

                </TouchableOpacity>

            </ScrollView>

        </ScreenWrapper>

    );

}