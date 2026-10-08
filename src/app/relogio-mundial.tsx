import React, { useState, useEffect, memo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput, FlatList,
  StatusBar, Image
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ChevronLeft, Search, Star, CheckCircle2, ChevronRight } from 'lucide-react-native';
import { formatInTimeZone } from 'date-fns-tz';
import { TimezoneService } from '@/services/TimezoneService';
import { useTheme } from '@/theme/ThemeContext';
import { ScreenWrapper } from '@/components/ScreenWrapper';

// COMPONENTE: Relógio em Tempo Real 
const RealTimeClock = memo(({ tz, color, isMain }: { tz: string, color: string, isMain?: boolean }) => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <Text style={[styles.timeText, { color }, isMain && { fontSize: 24, fontWeight: '800' }]}>
      {formatInTimeZone(time, tz, 'HH:mm:ss')}
    </Text>
  );
});

export default function RelogioMundial() {
  const router = useRouter();
  const { theme, darkMode } = useTheme(); // Usando diretamente as cores globais

  const [search, setSearch] = useState('');
  const [timezones, setTimezones] = useState<any[]>([]);
  const [selectedTz, setSelectedTz] = useState('America/Sao_Paulo');
  const [favorites, setFavorites] = useState<string[]>([]);

  useEffect(() => {
    async function loadData() {
      const tzList = TimezoneService.getFullTimezoneData();
      setTimezones(tzList);

      const current = await TimezoneService.getCurrentTimezone();
      setSelectedTz(current);

      const favs = await AsyncStorage.getItem('@favoritos_fuso');
      if (favs) setFavorites(JSON.parse(favs));
    }
    loadData();
  }, []);

  const toggleFavorite = async (id: string) => {
    const newFavs = favorites.includes(id) 
      ? favorites.filter(f => f !== id) 
      : [...favorites, id];
    
    setFavorites(newFavs);
    await AsyncStorage.setItem('@favoritos_fuso', JSON.stringify(newFavs));
  };

  const selectTimezone = async (id: string) => {
    setSelectedTz(id);
    await TimezoneService.setCurrentTimezone(id);
    setTimeout(() => router.back(), 300); 
  };

 const filtered = timezones.filter(tz => {
    const termo = search.toLowerCase().trim();
    const cidade = tz.city.toLowerCase();
    const pais = tz.country.toLowerCase();
    const offset = tz.dynamicOffset.toLowerCase(); // Ex: "utc-3"
    
    // Remove "utc" para permitir buscar apenas por "-3" ou "+4"
    const apenasNumeroOffset = offset.replace('utc', ''); 

    return (
      cidade.includes(termo) || 
      pais.includes(termo) || 
      offset.includes(termo) ||
      apenasNumeroOffset.includes(termo)
    );
  }).sort((a, b) => {
    if (a.id === selectedTz) return -1;
    if (b.id === selectedTz) return 1;
    const aFav = favorites.includes(a.id);
    const bFav = favorites.includes(b.id);
    if (aFav && !bFav) return -1;
    if (!aFav && bFav) return 1;
    return a.city.localeCompare(b.city);
  });

  const renderItem = ({ item }: { item: any }) => {
    const isSelected = item.id === selectedTz;
    const isFav = favorites.includes(item.id);

    return (
      <TouchableOpacity 
        style={[styles.card, { backgroundColor: theme.card, borderColor: isSelected ? '#3b82f6' : theme.border }]}
        onPress={() => selectTimezone(item.id)}
        activeOpacity={0.8}
      >
        <View style={styles.cardMain}>
          <Image source={{ uri: `https://flagcdn.com/w40/${item.code}.png` }} style={styles.flag} />
          <View style={styles.cityInfo}>
            <Text style={[styles.cityName, { color: theme.text }]}>{item.city}</Text>
            <Text style={[styles.countryName, { color: theme.subText }]}>{item.country}</Text>
          </View>
        </View>

        <View style={styles.cardRight}>
          <RealTimeClock tz={item.id} color={isSelected ? '#3b82f6' : theme.text} isMain={isSelected} />
          <Text style={[styles.offsetText, { color: theme.subText }]}>{item.dynamicOffset}</Text>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity onPress={() => toggleFavorite(item.id)} style={{ padding: 4 }}>
            <Star color={isFav ? '#F59E0B' : theme.border} fill={isFav ? '#F59E0B' : 'transparent'} size={22} />
          </TouchableOpacity>
          {isSelected ? (
            <CheckCircle2 color="#3b82f6" size={22} style={{ marginLeft: 8 }} />
          ) : (
            <ChevronRight color={theme.subText} size={22} style={{ marginLeft: 8 }} />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <ScreenWrapper style={{ flex: 1, backgroundColor: theme.background }}>
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <StatusBar translucent backgroundColor="transparent" barStyle={darkMode ? 'light-content' : 'dark-content'} />
        
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
            <ChevronLeft color={theme.text} size={28} />
          </TouchableOpacity>
          
          <Text style={[styles.headerTitle, { color: theme.text }]}>Relógio Mundial</Text>
          
          {/* View vazia com a mesma largura do botão voltar para manter o título perfeitamente centralizado */}
          <View style={{ width: 36 }} />
        </View>

        <View style={styles.searchContainer}>
          <View style={[styles.searchBox, { backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1 }]}>
            <Search size={20} color={theme.subText} />
            <TextInput
              style={[styles.searchInput, { color: theme.text }]}
              placeholder="Pesquisar cidade ou país..."
              placeholderTextColor={theme.subText}
              value={search}
              onChangeText={setSearch}
            />
          </View>
        </View>

        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          removeClippedSubviews={true}
          initialNumToRender={10}
        />
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 60, paddingBottom: 15,
  },
  headerTitle: { fontSize: 22, fontWeight: '700' },
  iconBtn: { padding: 4 },
  searchContainer: { paddingHorizontal: 20, paddingBottom: 20 },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16,
    height: 52, borderRadius: 16, gap: 12,
  },
  searchInput: { flex: 1, fontSize: 16, fontWeight: '500' },
  listContent: { paddingHorizontal: 20, paddingBottom: 40, gap: 12 },
  card: {
    flexDirection: 'row', alignItems: 'center', padding: 16,
    borderRadius: 20, borderWidth: 1, elevation: 2, shadowColor: '#000',
    shadowOpacity: 0.05, shadowOffset: { width: 0, height: 2 }, shadowRadius: 8,
  },
  cardMain: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  flag: { width: 32, height: 24, borderRadius: 4, marginRight: 12, backgroundColor: '#e2e8f0' },
  cityInfo: { flex: 1 },
  cityName: { fontSize: 17, fontWeight: '700', marginBottom: 2 },
  countryName: { fontSize: 13, fontWeight: '500' },
  cardRight: { alignItems: 'flex-end', marginRight: 16 },
  timeText: { fontSize: 18, fontWeight: '600', fontVariant: ['tabular-nums'] },
  offsetText: { fontSize: 12, fontWeight: '600', marginTop: 2 },
  actions: { flexDirection: 'row', alignItems: 'center', borderLeftWidth: 1, borderLeftColor: 'rgba(150,150,150,0.2)', paddingLeft: 12 },
});