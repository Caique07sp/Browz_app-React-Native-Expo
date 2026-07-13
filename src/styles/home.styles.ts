import { Platform, StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f172a",
    paddingTop: Platform.OS === 'android' ? 20 : 0,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  logoContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  logoImage: {
    width: 120,
    height: 30,
    resizeMode: "contain",
  },
  headerIcons: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconButton: {
    marginLeft: 15,
  },
  badge: {
    position: "absolute",
    top: -5,
    right: -5,
    backgroundColor: "#ef4444",
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#0f172a",
  },
  badgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "bold",
  },
  searchSection: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    marginBottom: 25,
  },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1e293b",
    borderRadius: 12,
    height: 50,
    borderWidth: 1,
    borderColor: "#334155",
    paddingHorizontal: 12,
  },
  input: {
    flex: 1,
    color: "#fff",
    paddingHorizontal: 10,
    fontSize: 16,
  },
  filterButton: {
    backgroundColor: "#3b82f6",
    width: 50,
    height: 50,
    borderRadius: 12,
    marginLeft: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  sectionTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  card: {
    backgroundColor: "#1e293b",
    borderRadius: 16,
    padding: 16,
    marginBottom: 15,
    borderWidth: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  idBadge: {
    backgroundColor: "#334155",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  idText: {
    color: "#94a3b8",
    fontSize: 12,
    fontWeight: "700",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  statusText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "600",
  },
  cardTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 6,
  },
  cardDescription: {
    color: "#94a3b8",
    fontSize: 14,
    marginBottom: 15,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#334155",
    paddingTop: 12,
  },
  footerInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  footerText: {
    color: "#64748b",
    fontSize: 12,
    marginLeft: 6,
  },
  footerDate: {
    color: "#64748b",
    fontSize: 14,
    marginBottom: 10,
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalBox: {
    width: "92%",
    maxWidth: 450,
    maxHeight: "85%",

    backgroundColor: "#1e293b",
    padding: 24,

    borderRadius: 24,

    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 20,

     ...Platform.select({
        android: {
        
      },
      ios: {
       width: "92%",  // Mantém o padrão no iOS
      },
      }),
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: "#33415550",
    paddingBottom: 18,
  },
  modalTitle: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "700",
  },
  modalLabel: {
    color: "#94a3b8",
    marginBottom: 12,
    marginTop: 18,
    fontSize: 15,
    fontWeight: "600",
  },
  optionColumn: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  optionBtn: {
    backgroundColor: "#0f172a",
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#334155",
  },
  optionBtnActive: {
    backgroundColor: "#2563eb",
    borderColor: "#60a5fa",
    elevation: 3,
  },
  optionText: {
    color: "#fff",
    fontWeight: "600",
  },
  applyBtn: {
    backgroundColor: "#2563eb",
    padding: 17,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 25,
  },
  applyText: {
    color: "#fff",
    fontWeight: "bold",
  },


  menuHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 40,
    marginBottom: 30,
  },
  menuTitle: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "bold",
  },
  profileBox: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 30,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#334155",
  },
  avatar: {
    width: 45,
    height: 45,
    borderRadius: 25,
    backgroundColor: "#3b82f6",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  userName: {
    color: "#fff",
    fontWeight: "bold",
  },
  userSub: {
    color: "#94a3b8",
    fontSize: 12,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    gap: 12,
  },
  menuText: {
    color: "#fff",
    fontSize: 16,
  },
  logoutBtn: {
    marginTop: "auto",
    marginBottom: 40,
    backgroundColor: "#ef4444",
    padding: 14,
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
  },
  logoutText: {
    color: "#fff",
    fontWeight: "bold",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 60,
  },

  illustrationContainer: {
    marginBottom: 20,
  },

  isometricBox: {
    width: 100,
    height: 100,
    backgroundColor: "#1e293b",
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#334155",
  },

  emptyTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 5,
  },

  emptySubtitle: {
    color: "#94a3b8",
    textAlign: "center",
  },
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 60,
  },

  loadingText: {
    color: "#94a3b8",
    marginTop: 12,
    fontSize: 14,
  },



  syncBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#e0f2fe",
    alignSelf: "flex-start",
    marginBottom: 10,
  },

  syncText: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#0369a1",
  },
  buttonRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 25,
  },

  clearFilterBtn: {
    flex: 1,
    backgroundColor: "#7f1d1d",
    padding: 16,
    borderRadius: 16,
    alignItems: "center",
  },

  clearFilterText: {
    color: "#fff",
    fontWeight: "700",
  },

  applyFilterBtn: {
    flex: 1,
    backgroundColor: "#2563eb",
    padding: 16,
    borderRadius: 16,
    alignItems: "center",
  },
  // Adicione ou substitua estas propriedades no seu styles do CSS:

  modalDragIndicator: {
    width: 50,
    height: 6,
    backgroundColor: "#64748b",
    borderRadius: 99,
    alignSelf: "center",
    marginBottom: 20,
    display: "none",
  },
  modalCloseButton: {
    backgroundColor: "#33415540",
    padding: 8,
    borderRadius: 99,
  },
  statusGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    justifyContent: "space-between",
    marginBottom: 10,
  },
  filterOptionBtn: {
  
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    gap: 8,

     ...Platform.select({
        android: {
        width: "48.5%", 
      },
      ios: {
         width: "48.0%",  // Mantém o padrão no iOS
      },
      }),
  },
  dateInput: {
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    justifyContent: "center",
  },
  clearDateBtn: {
    marginTop: 12,
    alignSelf: "flex-start",
  },
  clearDateText: {
    color: "#f43f5e",
    fontWeight: "600",
    fontSize: 13,
  },
  filterFooterActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 30,
    marginBottom: Platform.OS === "ios" ? 15 : 5,
  },
  modalPrimaryBtn: {
    flex: 2,
    backgroundColor: "#3b82f6",
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#3b82f6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  modalPrimaryBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
  modalSecondaryBtn: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  modalSecondaryBtnText: {
    fontWeight: "600",
    fontSize: 15,
  },
  centeredView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.6)", // Fundo escurecido
  },
  calendarModalBox: {
    width: "85%",
    maxWidth: 360,
    borderRadius: 20,
    padding: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  calendarCloseBtn: {
    marginTop: 15,
    backgroundColor: "#3b82f6",
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 10,
    width: "100%",
    alignItems: "center",
  },
  calendarCloseBtnText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    flexDirection: "row", // Garante o alinhamento horizontal correto no iOS
    justifyContent: "flex-end", 
  },
  menuCloseOverlayTouch: {
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
    right: "75%", // Cobre exatamente a parte esquerda que sobrou do menu
  },
  menuBox: {
    width: "75%",
    height: "100%",
    backgroundColor: "#1e293b",
    paddingHorizontal: 20,
    paddingVertical: Platform.OS === "ios" ? 10 : 25, // Reduz o padding vertical no iOS por conta da SafeArea
    shadowColor: "#000",
    shadowOffset: { width: -4, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 16,
  },
  menuHeaderAdjusted: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: Platform.OS === "android" ? 40 : 10, // Margem inteligente para não colar no topo do iPhone
    marginBottom: 25,
    paddingBottom: 10,
  },
  menuCloseBtnClickable: {
    padding: 6, // Facilita o clique no iOS
  },
  
});