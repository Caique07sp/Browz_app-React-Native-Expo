import { Platform, StyleSheet } from "react-native";
export const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },

  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },

  title: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
  },

  subtitle: {
    color: '#3b82f6',
    marginBottom: 20,
  },

  section: {
    marginBottom: 25,
  },

  label: {
    color: '#64748b',
    marginBottom: 10,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
  },

  textArea: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    color: '#fff',
    padding: 15,
    minHeight: 220,
    textAlignVertical: 'top',
  },

  input: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    color: '#fff',
    padding: 15,
    marginBottom: 12,
    fontSize: 16,
  },

  checklistItem: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },

  checklistLabel: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 10,
  },

  textAreaSmall: {
    borderRadius: 12,
    padding: 15,
    minHeight: 100,
    textAlignVertical: 'top',
    borderWidth: 1,
  },

  optionButton: {
    backgroundColor: '#0f172a',
    padding: 13,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },

  optionButtonSelected: {
    borderColor: '#3b82f6',
    backgroundColor: '#1d4ed8',
  },

  optionText: {
    color: '#fff',
    fontSize: 14,
  },

  radioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },

  radioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#64748b',
  },

  radioCircleSelected: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },

  checkboxBox: {
    width: 18,
    height: 18,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#64748b',
  },

  checkboxBoxSelected: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },

  loadingChecklist: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    gap: 8,
  },

  loadingText: {
    color: '#94a3b8',
    marginTop: 8,
  },

  emptyChecklist: {
    color: '#94a3b8',
    backgroundColor: '#1e293b',
    padding: 15,
    borderRadius: 12,
  },

  signatureHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },

  clearBtnText: {
    color: '#ef4444',
  },

  signatureTrigger: {
    height: 140,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#3b82f6',
    borderStyle: 'dashed',
  },

  signatureTriggerText: {
    color: '#3b82f6',
    fontWeight: '600',
    marginTop: 8,
  },

  previewContainer: {
    height: 140,
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
  },

  previewImage: {
    width: '100%',
    height: '100%',
  },

  submitBtn: {
    backgroundColor: '#10b981',
    height: 60,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    marginBottom: 30,
  },

  submitBtnDisabled: {
    backgroundColor: '#334155',
  },

  submitBtnText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  topBar: {
    marginBottom: 15,
  },

  backButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#1e293b',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 25,
  },

  loadingCard: {
    width: '100%',
    backgroundColor: '#1e293b',
    borderRadius: 30,
    padding: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },

  loadingTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 25,
    textAlign: 'center',
  },

  loadingSubtitle: {
    color: '#94a3b8',
    fontSize: 15,
    marginTop: 10,
    textAlign: 'center',
  },

  loadingBarBackground: {
    width: '100%',
    height: 10,
    backgroundColor: '#0f172a',
    borderRadius: 999,
    marginTop: 30,
    overflow: 'hidden',
  },

  loadingBarFill: {
    width: '70%',
    height: '100%',
    backgroundColor: '#3b82f6',
    borderRadius: 999,
  },
});