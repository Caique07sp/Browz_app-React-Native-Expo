import { Platform, StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? 5 : 0,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 15,
    paddingTop: Platform.OS === 'android' ? 45 : 10,
    borderBottomWidth: 1,
  },

  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },

  closeButton: {
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
  },

  map: { flex: 1 },

  mapLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  mapText: { fontSize: 13 },

  ticketBrief: {
    marginBottom: 20,
    alignItems: 'center',
    paddingHorizontal: 10,
  },

  ticketId: {
    color: '#3b82f6',
    fontWeight: 'bold',
    fontSize: 14,
    marginBottom: 2,
  },

  ticketTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },

  timeCard: {
    padding: 20,
    borderRadius: 24,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
  },

  timeLabel: {
    fontSize: 12,
    letterSpacing: 1,
  },

  timeValue: {
    fontSize: 36,
    fontWeight: 'bold',
    marginVertical: 4,
  },

  checkInBadge: {
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },

  checkInText: {
    color: '#10b981',
    fontSize: 12,
    fontWeight: '600',
  },

  statusWorkBadge: {
    marginTop: 8,
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
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 15,
    width: '100%',
  },

  secondaryBtn: {
    flex: 1,
    minWidth: 100,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 12,
    height: 52,
    borderRadius: 16,
    borderWidth: 1,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },

  btnText: {
    fontWeight: '600',
    fontSize: 13,
    flexShrink: 1,
  },

  btnMainText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
    flexShrink: 1,
    textAlign: 'center',
  },

  startBtn: {
    backgroundColor: '#3b82f6',
    minHeight: 56,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },

  finishBtn: {
    backgroundColor: '#10b981',
    minHeight: 56,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },

  btnDesabilitado: {
    backgroundColor: '#64748b',
    borderColor: '#475569',
    opacity: 0.6,
    shadowOpacity: 0,
    elevation: 0,
  },

  infoCardPreCheckin: {
    borderWidth: 1,
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
  },

  infoCardTitle: {
    fontSize: 13,
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

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    padding: 20,
  },

  modalContent: {
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
  },

  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },

  reasonInput: {
    borderRadius: 12,
    padding: 15,
    height: 100,
    textAlignVertical: 'top',
    marginBottom: 20,
    borderWidth: 1,
  },

  modalButtons: {
    flexDirection: 'row',
    gap: 10,
  },

  cancelBtn: {
    flex: 1,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
  },

  confirmBtn: {
    flex: 2,
    backgroundColor: '#3b82f6',
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
});