import { Link } from "expo-router";
import React from 'react';
import {
    StyleSheet,
    Image,
    View,
    Text,
    TextInput,
    TouchableOpacity,
    SafeAreaView,
    StatusBar,
    ScrollView
} from 'react-native';
import {
    Search,
    SlidersHorizontal,
    Bell,
    Menu,
    LayoutDashboard,
    PhoneCall,
    ListTodo,
    Settings,
    Inbox
} from 'lucide-react-native';

export default function Browz() {
    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" />


            <View style={styles.header}>
                <View style={styles.logoContainer}>

                    { /* (BRUNO ESTA DE TPM) Agora decidiu que quer */
                        <View style={styles.logoIcon}>
                            <Inbox size={20} color="#fff" />
                        </View>
                    }
                    <Image
                        source={require("@/assets/browz.png")}
                        style={styles.logoImage}
                    />
                </View>
                <View style={styles.headerIcons}>
                    <TouchableOpacity style={styles.iconButton}>
                        <Bell size={24} color="#fff" />
                    </TouchableOpacity>
                    { /*
                        Menu Hamburguer(BRUNO NÃO QUIS)
                   <TouchableOpacity style={styles.iconButton}>
                        <Menu size={24} color="#fff" />
                    </TouchableOpacity>
                    */}
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.content}>

                <View style={styles.searchSection}>
                    <View style={styles.searchBar}>
                        <Search size={20} color="#94a3b8" style={{ marginLeft: 10 }} />
                        <TextInput
                            placeholder="Pesquisar chamados..."
                            placeholderTextColor="#94a3b8"
                            style={styles.input}
                        />
                    </View>
                    <TouchableOpacity style={styles.filterButton}>
                        <SlidersHorizontal size={20} color="#fff" />
                        <View style={styles.badge}>
                            <Text style={styles.badgeText}>2</Text>
                        </View>
                    </TouchableOpacity>
                </View>

                <Text style={styles.sectionTitle}>Chamados</Text>


                <View style={styles.emptyContainer}>
                    <View style={styles.illustrationContainer}>

                        <View style={styles.isometricBox}>
                            <Inbox size={60} color="#3b82f6" />
                        </View>
                    </View>
                    <Text style={styles.emptyTitle}>
                        Nenhum chamado corresponde aos filtros selecionados
                    </Text>
                    <Text style={styles.emptySubtitle}>
                        ↓ Arraste para baixo para sincronizar
                    </Text>

                    <Link href="/home-pronta" style={styles.link}>
                        <Text>Clica ai  para ver funcionando carai</Text>
                    </Link>
                </View>
            </ScrollView>

            {/* (Bruno esta indeciso)

            <View style={styles.bottomTab}>
                <TabItem IconComponent={LayoutDashboard} label="Painel" color="#94a3b8" />
                <TabItem IconComponent={PhoneCall} label="Chamados" color="#3b82f6" active />
                <TabItem IconComponent={ListTodo} label="Atividades" color="#94a3b8" />
                <TabItem IconComponent={Settings} label="Config." color="#94a3b8" />
            </View>

                    */}
        </SafeAreaView>
    );
}


type TabItemProps = {
    IconComponent: React.ElementType;
    label: string;
    color: string;
    active?: boolean;
};

const TabItem = ({ IconComponent, label, color, active = false }: TabItemProps) => {
    return (
        <TouchableOpacity style={styles.tabItem}>
            <IconComponent color={color} size={24} />
            <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>
                {label}
            </Text>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0f172a',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 15,
    },
    logoContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    logoIcon: {
        backgroundColor: '#3b82f6',
        padding: 8,
        borderRadius: 10,
        marginRight: 10,
    },
    logoText: {
        color: '#fff',
        fontSize: 20,
        fontWeight: '700',
    },
    headerIcons: {
        flexDirection: 'row',
    },
    iconButton: {
        marginLeft: 15,
    },
    content: {
        paddingHorizontal: 20,
        paddingBottom: 100,
    },
    searchSection: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 10,
        marginBottom: 25,
    },
    searchBar: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1e293b',
        borderRadius: 12,
        height: 50,
        borderWidth: 1,
        borderColor: '#334155',
    },
    input: {
        flex: 1,
        color: '#fff',
        paddingHorizontal: 10,
        fontSize: 16,
    },
    filterButton: {
        backgroundColor: '#3b82f6',
        width: 50,
        height: 50,
        borderRadius: 12,
        marginLeft: 10,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    badge: {
        position: 'absolute',
        top: -5,
        right: -5,
        backgroundColor: '#ef4444',
        borderRadius: 10,
        width: 20,
        height: 20,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#0f172a',
    },
    badgeText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: 'bold',
    },
    sectionTitle: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 20,
    },
    emptyContainer: {
        backgroundColor: '#1e293b',
        borderRadius: 24,
        padding: 40,
        alignItems: 'center',
        marginTop: 10,
        borderWidth: 1,
        borderColor: '#334155',
    },
    illustrationContainer: {
        marginBottom: 25,
    },
    isometricBox: {
        width: 100,
        height: 100,
        backgroundColor: '#0f172a',
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 15,
        elevation: 10,
    },
    emptyTitle: {
        color: '#94a3b8',
        textAlign: 'center',
        fontSize: 16,
        lineHeight: 24,
        paddingHorizontal: 10,
    },
    emptySubtitle: {
        color: '#64748b',
        marginTop: 20,
        fontSize: 14,
    },
    bottomTab: {
        position: 'absolute',
        bottom: 0,
        width: '100%',
        height: 80,
        backgroundColor: '#1e293b',
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: '#334155',
        paddingBottom: 20,
    },
    tabItem: {
        alignItems: 'center',
    },
    tabLabel: {
        color: '#94a3b8',
        fontSize: 12,
        marginTop: 4,
    },
    tabLabelActive: {
        color: '#3b82f6',
        fontWeight: '600',
    },
    logoImage: {
        width: 120,
        height: 30,
        resizeMode: "contain",
    },
    link: {
        fontSize: 15,
        color: "white",

    }
});