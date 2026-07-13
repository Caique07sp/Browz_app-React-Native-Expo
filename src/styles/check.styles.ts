import { Platform, StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', paddingTop: Platform.OS === 'android' ? 5 : 0, },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 15,
    paddingTop: Platform.OS === 'android' ? 45 : 10,
    backgroundColor: '#1e293b',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },

  headerTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },

  closeButton: {
    backgroundColor: '#0f172a',
    padding: 8,
    borderRadius: 12,
  },

  content: {
    flex: 1,
    padding: 20,
  },

  mapContainer: {
    width: '100%',
    height: 180,
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },

  map: { flex: 1 },

  mapLoading: {
    flex: 1,
    backgroundColor: '#1e293b',
    justifyContent: 'center',
    alignItems: 'center',
  },

  mapText: { color: '#94a3b8' },

  ticketBrief: {
    marginBottom: 20,
    alignItems: 'center',
  },

  ticketId: {
    color: '#3b82f6',
    fontWeight: 'bold',
  },

  ticketTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },

  timeCard: {
    backgroundColor: '#1e293b',
    padding: 25,
    borderRadius: 24,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },

  timeLabel: {
    color: '#64748b',
    fontSize: 12,
    letterSpacing: 1,
  },

  timeValue: {
    color: '#fff',
    fontSize: 40,
    fontWeight: 'bold',
  },

  checkInBadge: {
    marginTop: 10,
    backgroundColor: '#0f172a',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
  },

  checkInText: {
    color: '#10b981',
    fontSize: 12,
    fontWeight: '600',
  },

  statusWorkBadge: {
    marginTop: 10,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
  },

  statusWorkText: {
    fontSize: 12,
    fontWeight: 'bold',
  },

  actionGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 15,
  },

  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 60,
    borderRadius: 16,
    borderWidth: 1,
  },

  btnText: {
    color: '#fff',
    fontWeight: '600',
  },

  btnMainText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },

  startBtn: {
    backgroundColor: '#3b82f6',
    height: 65,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },

  finishBtn: {
    backgroundColor: '#10b981',
    height: 65,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    padding: 20,
  },

  modalContent: {
    backgroundColor: '#1e293b',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },

  modalTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },

  reasonInput: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    color: '#fff',
    padding: 15,
    height: 100,
    textAlignVertical: 'top',
    marginBottom: 20,
  },

  modalButtons: {
    flexDirection: 'row',
    gap: 10,
  },

  cancelBtn: {
    flex: 1,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },

  confirmBtn: {
    flex: 2,
    backgroundColor: '#3b82f6',
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Adicione estes novos estilos no final do seu arquivo de estilização:
  btnDesabilitado: {
    backgroundColor: '#334155', // Cor de fundo cinza escuro opaco indicando bloqueio
    borderColor: '#475569',
    opacity: 0.7,
  },
  infoCardPreCheckin: {
    borderWidth: 1,
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
  },
  infoCardTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 14,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    opacity: 0.9,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  infoRowText: {
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
  },
});