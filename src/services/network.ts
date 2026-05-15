import NetInfo from '@react-native-community/netinfo';

export async function isOnline() {
  const state = await NetInfo.fetch();
  return state.isConnected;
}