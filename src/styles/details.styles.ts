import { Platform, StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
    paddingTop: Platform.OS === 'android' ? 0 : 0,
  },

  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },

  loadingText: {
    color: '#94a3b8',
    marginTop: 12,
    fontSize: 15,
    textAlign: 'center',
  },

  backHomeButton: {
    marginTop: 20,
    backgroundColor: '#3b82f6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: '#1e293b',
    paddingTop: Platform.OS === 'android' ? 45 : 10,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },

  headerTitleContainer: { alignItems: 'center' },

  ticketCopyBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  headerId: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },

  statusBadge: {
    backgroundColor: 'rgba(59,130,246,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 6,
    borderWidth: 1,
  },

  statusText: {
    fontSize: 11,
    fontWeight: 'bold',
  },

  backButton: { padding: 5 },

  scrollContent: { padding: 15, paddingBottom: 40 },

  sectionCard: {
    backgroundColor: '#1e293b',
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
    elevation: 8,
  },

  sectionTitleText: {
    color: '#e2e8f0',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 15,
    letterSpacing: 1,
  },

  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 12,
  },

  detailLabelGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  detailLabel: { color: '#64748b' },

  detailValue: {
    color: '#fff',
    fontWeight: '600',
    flexShrink: 1,
    textAlign: 'right',
  },

  rowTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },

  problemText: {
    color: '#cbd5e1',
    fontSize: 15,
    lineHeight: 22,
  },

  addressBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
  },

  addressText: {
    color: '#fff',
    flex: 1,
  },

  actionRow: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 12,
  },

  checkInButton: {
    backgroundColor: '#51a6f5',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 55,
    borderRadius: 16,
  },

  callButton: {
    flex: 1,
    borderWidth: 2,        
    borderColor: '#28bb0bff',
    borderStyle: 'solid',  
    color: "#28bb0bff",
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 45,
    borderRadius: 12,
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
  },
  buttonTextTel:{
    color: '#28bb0bff',
    fontSize: 12,
  },
  buttonTextCel:{
     fontSize: 12,
      color: "#3b82f6",
  },

  footerInput: {
    flexDirection: 'row',
    padding: 15,
    backgroundColor: '#1e293b',
    borderTopWidth: 1,
    borderTopColor: '#334155',
    alignItems: 'center',
  },

  input: {
    flex: 1,
    color: '#fff',
    height: 50,
    backgroundColor: '#020617',
    borderRadius: 14,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: '#1e293b',
  },

  sendIcon: {
    marginLeft: 12,
    backgroundColor: '#3b82f6',
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  callButton2: {
    flex: 1,
    borderWidth: 2,        
    borderColor: '#3b82f6',
    borderStyle: 'solid',  
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 45,
    borderRadius: 12,
  },
  actionContainer: {
    gap: 10,
  },

  mapRow: {
    flexDirection: 'row',
    gap: 10,
  },
  wazeButton: {
    flex: 1,
    borderWidth: 2,        
    borderColor: '#3b82f6',
    borderStyle: 'solid',  
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 45,
    borderRadius: 12,
  },


  buttonTextSmall: {
    fontSize: 12,
    color: "#28bb0bff",
    
  },
  buttonSmall:{
    fontSize: 12,
    color: "#3b82f6",
  },
  mapButton: {
    flex: 1,
    borderWidth: 2,        
    borderColor: '#28bb0bff',
    borderStyle: 'solid',  
    color: "#28bb0bff",
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 45,
    borderRadius: 12,
  },

  photoArea: {
    width: '100%',
    gap: 12,
  },

  photoButton: {
    width: '100%',
    backgroundColor: '#3b82f6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    borderRadius: 14,
  },

  previewImage: {
    width: '100%',
    height: 190,
    borderRadius: 16,
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#334155',
  },

  noteBox: {
    width: '100%',
    backgroundColor: '#0f172a',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },

  noteText: {
    color: '#e5e7eb',
    fontSize: 14,
    lineHeight: 20,
  },

  imageContainer: {
    position: 'relative',
  },

  removePhotoButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },

  removePhotoText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: -2,
  },
  finishedButton: {
    backgroundColor: '#22c55e',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 55,
    borderRadius: 16,
  },
});