import AsyncStorage from '@react-native-async-storage/async-storage';

import { useLocalSearchParams, useRouter } from 'expo-router';

import { ChevronLeft, ClipboardList, FileText, ImageIcon, PenTool, User } from 'lucide-react-native';

import React, { useEffect, useState } from 'react';
import { useTheme } from "@/theme/ThemeContext";

import {

    ActivityIndicator,

    Image,

    SafeAreaView,

    Platform,

    ScrollView,

    StyleSheet,

    Text,

    TouchableOpacity,

    View,

} from 'react-native';


export default function VisualizarRelatorio() {

    const router = useRouter();

    const { ticketId } = useLocalSearchParams();


    const chamadoId = String(ticketId);


    const [loading, setLoading] = useState(true);

    const [calendar, setCalendar] = useState<any>(null);

    const [checklistTemplate, setChecklistTemplate] = useState<any[]>([]);

    const [checklistResponses, setChecklistResponses] = useState<any[]>([]);

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

        const token = await AsyncStorage.getItem('token');


        const response = await fetch('https://browz.com.br/rest.php', {

            method: 'POST',

            headers: {

                'Content-Type': 'application/json',

                Authorization: `Bearer ${token}`,

            },

            body: JSON.stringify({

                class: 'CalendarService',

                method: 'loadAll',

            }),

        });


        const data = await response.json();


        if (data.status === 'success' && Array.isArray(data.data)) {

            const encontrado = data.data.find(

                (item: any) => String(item.calendar_id) === String(chamadoId)

            );


            setCalendar(encontrado || null);

        }

    }


    async function buscarChecklist() {

        const token = await AsyncStorage.getItem('token');


        const response = await fetch('https://browz.com.br/rest.php', {

            method: 'POST',

            headers: {

                'Content-Type': 'application/json',

                Authorization: `Bearer ${token}`,

            },

            body: JSON.stringify({

                class: 'CalendarChecklistService',

                method: 'loadAll',

            }),

        });


        const data = await response.json();


        if (data.status === 'success' && Array.isArray(data.data)) {

            const itemChecklist = data.data.find(

                (item: any) => String(item.calendar_id) === String(chamadoId)

            );


            if (itemChecklist) {

                const template = itemChecklist.calendar_checklist_template

                    ? JSON.parse(itemChecklist.calendar_checklist_template)

                    : [];


                const responses = itemChecklist.calendar_checklist_response

                    ? JSON.parse(itemChecklist.calendar_checklist_response)

                    : [];


                setChecklistTemplate(

                    template.sort((a: any, b: any) => Number(a.order) - Number(b.order))

                );


                setChecklistResponses(responses);

            }

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


    function getFotos() {

        if (!calendar?.calendar_images) return [];


        return String(calendar.calendar_images)

            .split(',')

            .map((item: string) => item.trim())

            .filter(Boolean);

    }


    if (loading) {

        return (

            <SafeAreaView
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

            </SafeAreaView>

        );

    }


    if (!calendar) {

        return (

            <SafeAreaView
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

            </SafeAreaView>

        );

    }


    const fotos = getFotos();


    return (

        <SafeAreaView
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

                        <Text
                            style={[
                                styles.cardTitle,
                                {
                                    color: theme.text,
                                },
                            ]}
                        >Fotos</Text>

                    </View>


                    {fotos.length === 0 ? (

                        <Text
                            style={[
                                styles.text,
                                {
                                    color: theme.subText,
                                },
                            ]}
                        >Nenhuma foto enviada.</Text>

                    ) : (

                        fotos.map((foto: string, index: number) => (

                            <Image

                                key={index}

                                source={{ uri: `https://browz.com.br/${foto}` }}

                                style={styles.image}

                            />

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

                                    uri: `https://browz.com.br/${calendar.calendar_signature}`,

                                }}

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
                        >Nenhuma assinatura encontrada.</Text>

                    )}

                </View>


                <TouchableOpacity

                    style={styles.editButton}

                    onPress={() =>

                        router.push({

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

        </SafeAreaView>

    );

}


const styles = StyleSheet.create({

    container: {

        flex: 1,

        backgroundColor: '#0f172a',

        paddingTop: Platform.OS === 'android' ? 25 : 0,
        

    },


    scrollContent: {

        padding: 20,

        paddingBottom: 40,

    },


    loadingBox: {

        flex: 1,

        justifyContent: 'center',

        alignItems: 'center',

    },


    loadingText: {

        color: '#94a3b8',

        marginTop: 12,

    },


    backButton: {

        width: 44,

        height: 44,

        borderRadius: 12,

        backgroundColor: '#1e293b',

        justifyContent: 'center',

        alignItems: 'center',

        marginBottom: 18,

    },


    title: {

        color: '#fff',

        fontSize: 24,

        fontWeight: 'bold',

    },


    subtitle: {

        color: '#3b82f6',

        marginBottom: 20,

    },


    card: {

        backgroundColor: '#1e293b',

        borderRadius: 18,

        padding: 16,

        marginBottom: 16,

        borderWidth: 1,

        borderColor: '#334155',

    },


    cardHeader: {

        flexDirection: 'row',

        alignItems: 'center',

        gap: 8,

        marginBottom: 14,

    },


    cardTitle: {

        color: '#fff',

        fontWeight: 'bold',

        fontSize: 15,

    },


    text: {

        color: '#cbd5e1',

        lineHeight: 22,

    },


    infoText: {

        color: '#e2e8f0',

        marginBottom: 8,

    },


    answerBox: {

        backgroundColor: '#0f172a',

        borderRadius: 12,

        padding: 12,

        marginBottom: 10,

    },


    question: {

        color: '#94a3b8',

        fontSize: 13,

        marginBottom: 5,

    },


    answer: {

        color: '#fff',

        fontWeight: '600',

    },


    image: {

        width: '100%',

        height: 190,

        borderRadius: 14,

        marginBottom: 12,

        backgroundColor: '#020617',

    },


    signatureBox: {

        backgroundColor: '#fff',

        borderRadius: 14,

        overflow: 'hidden',

        height: 160,

    },


    signatureImage: {

        width: '100%',

        height: '100%',

        resizeMode: 'contain',

    },


    editButton: {

        backgroundColor: '#3b82f6',

        height: 56,

        borderRadius: 16,

        justifyContent: 'center',

        alignItems: 'center',

        marginTop: 10,

    },


    editButtonText: {

        color: '#fff',

        fontWeight: 'bold',

        fontSize: 16,

    },

}); 