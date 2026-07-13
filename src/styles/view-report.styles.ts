import { Platform, StyleSheet } from "react-native";
export 
const styles = StyleSheet.create({

    container: {
        flex: 1,
        backgroundColor: '#0f172a',
        paddingTop: Platform.OS === 'android' ? 45 : 0,
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
        marginBottom: Platform.OS === 'android' ? 50 : 0,
    },


    editButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
        
    },

}); 