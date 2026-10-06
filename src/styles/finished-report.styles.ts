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
    backgroundColor: '#020617', // Dark tech base
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingOverlay: {
    flex: 1,
    width: '100%',
    padding: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // --- TELA PROCESSING (ETAPAS) ---
  processingWrapper: {
    width: '100%',
    maxWidth: 400,
  },
  processingTitle: {
    color: '#fff',
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: 2,
    textAlign: 'center',
  },
  processingSubtitle: {
    color: '#94a3b8',
    fontSize: 15,
    marginTop: 6,
    marginBottom: 40,
    textAlign: 'center',
  },
  stepsContainer: {
    gap: 20,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  stepWaiting: {
    opacity: 0.3,
  },
  stepIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)'
  },
  stepText: {
    color: '#94a3b8',
    fontSize: 16,
    fontWeight: '500',
  },
  stepTextActive: {
    color: '#3b82f6',
    fontWeight: '700',
  },
  stepTextDone: {
    color: '#f8fafc',
    fontWeight: '600',
  },
  stepTextPending: {
    color: '#f59e0b',
    fontWeight: '600',
  },

  // --- TELA CONCLUSAO (GRANDE MOMENTO) ---
  conclusionWrapper: {
    width: '100%',
    alignItems: 'center',
  },
  checkCircleLarge: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(16, 185, 129, 0.4)',
    marginBottom: 24,
  },
  conclusionTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 1,
    textAlign: 'center',
  },
  conclusionSubtitle: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 8,
    marginBottom: 40,
    textAlign: 'center',
  },

  // --- GLASSMORPHISM CARD ---
  glassCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: 'rgba(30, 41, 59, 0.7)',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.5,
    shadowRadius: 30,
    elevation: 10,
  },
  glassHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    paddingBottom: 16,
    marginBottom: 16,
  },
  glassHeaderTitle: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
  },
  glassHeaderDate: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '700',
  },
  glassContent: {
    gap: 8,
  },
  glassLabel: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  glassValue: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 16,
  },
  glassRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  glassCol: {
    flex: 1,
  }
});