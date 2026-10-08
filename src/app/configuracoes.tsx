import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  ScrollView,
  StatusBar,
  Switch,
  Text,
  TouchableOpacity,
  View,
  Animated
} from "react-native";

import { Image } from "react-native";
import { formatInTimeZone } from 'date-fns-tz';

import { useFocusEffect } from 'expo-router';
import { ScreenWrapper } from "@/components/ScreenWrapper";
import { obterStatusNotificacaoSalva, requisitarEPersistirPermissao } from "@/services/notifications";
import { logout } from "@/services/session";
import { useTheme } from "@/theme/ThemeContext";
import { TimezoneService } from "@/services/TimezoneService";
import { useRouter } from "expo-router";
import {
  ArrowLeft,
  Bell,
  ChevronRight,
  Clock,
  Globe,
  Info,
  LogOut,
  Moon,
  Shield,
  Terminal,
  User
} from "lucide-react-native";
import { styles } from "../styles/settings.styles";


import { Picker } from '@react-native-picker/picker';

// Componente auxiliar para fazer os itens surgirem suavemente de baixo para cima
function FadeInItem({ children, delay }: { children: React.ReactNode; delay: number }) {
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: 1,
      duration: 1000,
      delay: delay,
      useNativeDriver: true,
    }).start();
  }, []);

  const translateY = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [15, 0],
  });

  return (
    <Animated.View style={{ opacity: animatedValue, transform: [{ translateY }] }}>
      {children}
    </Animated.View>
  );
}

// COMPONENTE: Relógio em Tempo Real para o card de Configurações
const RealTimeClock = React.memo(({ tz, color }: { tz: string, color: string }) => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <Text style={{ fontSize: 18, fontWeight: '600', fontVariant: ['tabular-nums'], color }}>
      {formatInTimeZone(time, tz, 'HH:mm:ss')}
    </Text>
  );
});

export default function Configuracoes() {
  const router = useRouter();
  const { theme, darkMode, toggleTheme } = useTheme();

  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  const [timezone, setTimezone] = useState("");
  const [timezoneList, setTimezoneList] = useState<any[]>([]);

  // Valor animado para controlar o fade na troca de tema
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useFocusEffect(
    useCallback(() => {
      async function loadTz() {
        const currentTz = await TimezoneService.getCurrentTimezone();
        setTimezone(currentTz);

        // Carrega a lista formatada dinamicamente (já calcula horário de verão)
        const fullList = TimezoneService.getFullTimezoneData();
        setTimezoneList(fullList);
      }
      loadTz();
      async function carregarPreferencia() {
        const ativado = await obterStatusNotificacaoSalva();
        setNotificationsEnabled(ativado);
      }
      carregarPreferencia();
    }, [])
  );

  async function handleToggleNotifications(valor: boolean) {
    const resultado = await requisitarEPersistirPermissao(valor);
    setNotificationsEnabled(resultado);
  }

  // Função que faz o fade out, troca o tema e depois faz o fade in suave
  function handleToggleTheme(valor: boolean) {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 10,
      useNativeDriver: true,
    }).start(() => {
      toggleTheme(valor);

      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 901,
        useNativeDriver: true,
      }).start();
    });
  }

  async function handleChangeTimezone(itemValue: string) {
    setTimezone(itemValue);
    await TimezoneService.setCurrentTimezone(itemValue);

  }

  async function fazerLogout() {
    await logout();
    router.replace("/");
  }

  const currentTzData = timezoneList.find(t => t.id === timezone) || {
    id: timezone || 'America/Sao_Paulo',
    city: 'São Paulo',
    country: 'Brasil',
    code: 'br',
    dynamicOffset: 'UTC-3'
  };

  return (
    <ScreenWrapper
      style={[
        styles.container,
        {
          backgroundColor: theme.background,
        },
      ]}
    >
      <StatusBar barStyle={darkMode ? "light-content" : "dark-content"} />

      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>

        {/* HEADER */}
        <View
          style={[
            styles.header,
            {
              backgroundColor: theme.background,
            },
          ]}
        >
          <TouchableOpacity
            style={[
              styles.backBtn,
              {
                backgroundColor: theme.card,
                borderColor: theme.border,
              },
            ]}
            onPress={() => router.back()}
          >
            <ArrowLeft color={theme.text} size={24} />
          </TouchableOpacity>

          <Text style={[styles.title, { color: theme.text }]}>
            Configurações
          </Text>

          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content}>

          {/* SEÇÃO: CONTA */}
          <FadeInItem delay={100}>
            <Text style={[styles.sectionTitle, { color: theme.subText }]}>
              Conta
            </Text>

            <TouchableOpacity
              style={[
                styles.item,
                {
                  backgroundColor: theme.card,
                  borderColor: theme.border,
                },
              ]}
              onPress={() => router.navigate("/perfil")}
            >
              <View style={styles.itemLeft}>
                <User color={theme.primary} size={22} />
                <View>
                  <Text style={[styles.itemTitle, { color: theme.text }]}>
                    Perfil
                  </Text>
                  <Text style={[styles.itemSubtitle, { color: theme.subText }]}>
                    Editar dados do usuário
                  </Text>
                </View>
              </View>

              <ChevronRight color={theme.subText} size={22} />
            </TouchableOpacity>
          </FadeInItem>

          {/* SEÇÃO: PREFERÊNCIAS */}
          <FadeInItem delay={200}>
            <Text style={[styles.sectionTitle, { color: theme.subText }]}>
              Preferências
            </Text>

            <View
              style={[
                styles.item,
                {
                  backgroundColor: theme.card,
                  borderColor: theme.border,
                },
              ]}
            >
              <View style={styles.itemLeft}>
                <Bell color={theme.primary} size={22} />
                <View>
                  <Text style={[styles.itemTitle, { color: theme.text }]}>
                    Notificações
                  </Text>
                  <Text
                    style={[
                      styles.itemSubtitle,
                      {
                        color: notificationsEnabled ? "#22c55e" : "#ef4444",
                        fontWeight: "600",
                      },
                    ]}
                  >
                    {notificationsEnabled ? "● Notificações ativadas" : "○ Notificações desativadas"}
                  </Text>
                </View>
              </View>

              <Switch
                value={notificationsEnabled}
                onValueChange={handleToggleNotifications}
                trackColor={{
                  false: theme.border,
                  true: theme.primary,
                }}
                thumbColor="#fff"
              />
            </View>

            <View
              style={[
                styles.item,
                {
                  backgroundColor: theme.card,
                  borderColor: theme.border,
                },
              ]}
            >
              <View style={styles.itemLeft}>
                <Moon color={theme.primary} size={22} />
                <View>
                  <Text style={[styles.itemTitle, { color: theme.text }]}>
                    Modo escuro
                  </Text>
                  <Text style={[styles.itemSubtitle, { color: theme.subText }]}>
                    Tema escuro ativado
                  </Text>
                </View>
              </View>

              <Switch
                value={darkMode}
                onValueChange={handleToggleTheme}
                trackColor={{
                  false: theme.border,
                  true: theme.primary,
                }}
                thumbColor="#fff"
              />
            </View>

            <View style={[styles.item, { backgroundColor: theme.card, borderColor: theme.border, flexDirection: 'column', alignItems: 'flex-start' }]}>
              <View style={[styles.itemLeft, { marginBottom: 10 }]}>
                <Clock color={theme.primary} size={22} />
                <View>
                  <Text style={[styles.itemTitle, { color: theme.text }]}>Fuso Horário Global</Text>
                  <Text style={[styles.itemSubtitle, { color: theme.subText }]}>Define os horários de todo o sistema</Text>
                </View>
              </View>
              <View style={{ width: '100%', borderColor: theme.border, borderRadius: 8 }}>


                {/* SEÇÃO DO RELÓGIO MUNDIAL */}
                <TouchableOpacity
                  style={[
                    styles.item,
                    {
                      backgroundColor: theme.card,
                      borderColor: theme.border,
                      alignItems: 'center',
                      padding: 16,
                    },
                  ]}
                  onPress={() => router.push("/relogio-mundial" as any)}
                  activeOpacity={0.7}
                >
                  {/* Lado Esquerdo: Bandeira e Local */}
                  <View
                    style={{
                      flex: 1,
                      flexDirection: 'row',
                      alignItems: 'center',
                    }}
                  >
                    <Image
                      source={{
                        uri: `https://flagcdn.com/w40/${currentTzData.code}.png`,
                      }}
                      style={{
                        width: 32,
                        height: 24,
                        borderRadius: 4,
                        marginRight: 12,
                      }}
                    />

                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          color: theme.text,
                          fontSize: 17,
                          fontWeight: '700',
                          marginBottom: 2,
                        }}
                      >
                        {currentTzData.city}
                      </Text>

                      <Text
                        style={{
                          color: theme.subText,
                          fontSize: 13,
                          fontWeight: '500',
                        }}
                      >
                        {currentTzData.country}
                      </Text>
                    </View>
                  </View>

                  {/* Lado Direito: Hora ao vivo e UTC */}
                  <View
                    style={{
                      alignItems: 'flex-end',
                      marginRight: 16,
                    }}
                  >
                    <RealTimeClock
                      color={theme.text}
                      tz={currentTzData.id}
                    />

                    <Text
                      style={{
                        color: theme.subText,
                        fontSize: 12,
                        fontWeight: '600',
                        marginTop: 2,
                      }}
                    >
                      {currentTzData.dynamicOffset ||
                        TimezoneService.getDynamicOffset(currentTzData.id)}
                    </Text>
                  </View>

                  {/* Seta divisória */}
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      borderLeftWidth: 1,
                      borderLeftColor: 'rgba(150,150,150,0.2)',
                      paddingLeft: 12,
                    }}
                  >
                    <ChevronRight
                      color={theme.subText}
                      size={22}
                    />
                  </View>
                </TouchableOpacity>




              </View>
            </View>
          </FadeInItem>

          {/* SEÇÃO: SISTEMA */}
          <FadeInItem delay={300}>
            <Text style={[styles.sectionTitle, { color: theme.subText }]}>
              Sistema
            </Text>

            <TouchableOpacity
              style={[
                styles.item,
                {
                  backgroundColor: theme.card,
                  borderColor: theme.border,
                },
              ]}
              onPress={() => router.navigate("/seguranca")}
            >
              <View style={styles.itemLeft}>
                <Shield color={theme.primary} size={22} />
                <View>
                  <Text style={[styles.itemTitle, { color: theme.text }]}>
                    Segurança
                  </Text>
                  <Text style={[styles.itemSubtitle, { color: theme.subText }]}>
                    Senha e privacidade
                  </Text>
                </View>
              </View>

              <ChevronRight color={theme.subText} size={22} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.item,
                {
                  backgroundColor: theme.card,
                  borderColor: theme.border,
                },
              ]}
              onPress={() => router.navigate("/logs")}
            >
              <View style={styles.itemLeft}>
                <Terminal color={theme.primary} size={22} />
                <View>
                  <Text style={[styles.itemTitle, { color: theme.text }]}>
                    Logs do Sistema (DEV)
                  </Text>
                  <Text style={[styles.itemSubtitle, { color: theme.subText }]}>
                    Histórico de erros e requisições
                  </Text>
                </View>
              </View>

              <ChevronRight color={theme.subText} size={22} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.item,
                {
                  backgroundColor: theme.card,
                  borderColor: theme.border,
                },
              ]}
              onPress={() => router.navigate("/about")}
            >
              <View style={styles.itemLeft}>
                <Info color={theme.primary} size={22} />
                <View>
                  <Text style={[styles.itemTitle, { color: theme.text }]}>
                    Sobre o aplicativo
                  </Text>
                  <Text style={[styles.itemSubtitle, { color: theme.subText }]}>
                    Versão 1.4.0
                  </Text>
                </View>
              </View>

              <ChevronRight color={theme.subText} size={22} />
            </TouchableOpacity>
          </FadeInItem>

          {/* BOTÃO DE SAIR */}
          <FadeInItem delay={400}>
            <TouchableOpacity style={styles.logoutBtn} onPress={fazerLogout}>
              <LogOut color="#fff" size={20} />
              <Text style={styles.logoutText}>Sair</Text>
            </TouchableOpacity>
          </FadeInItem>

        </ScrollView>
      </Animated.View>
    </ScreenWrapper>
  );
}