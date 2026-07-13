
import { Platform, StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? 10 : 0,
  },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  backButton: { padding: 5 },

  scroll: {
     padding: 15,
     flex: 1,

    },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'flex-start',
  },
  imageWrapper: {
    width: '48%',
    height: 150,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    
  },
  thumbnail: { width: '100%', height: '100%' },
  deleteBtn: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: 'rgba(239, 68, 68, 0.8)',
    padding: 8,
    borderRadius: 8,
    
  },
  emptyText: { textAlign: 'center', width: '100%', marginTop: 50 },
  footer: {
    flexDirection: 'row',
    padding: 20,
    gap: 35,
    borderTopWidth: 1,
    
     
   marginBottom: Platform.OS === 'android' ? 5 : 0,
    
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    height: 55,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    
  },
  actionBtnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontWeight: 'bold',  },
  
});
