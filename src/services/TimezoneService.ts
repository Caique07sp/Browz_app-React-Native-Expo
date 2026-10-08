import AsyncStorage from '@react-native-async-storage/async-storage';
import { formatInTimeZone, getTimezoneOffset } from 'date-fns-tz';
import { startOfWeek, endOfWeek, startOfDay, endOfDay } from 'date-fns';

const TIMEZONE_STORAGE_KEY = '@app_timezone';

// Lista base de fusos solicitados
export const AVAILABLE_TIMEZONES = [
  { id: 'Pacific/Midway', city: 'Midway', country: 'Estados Unidos', code: 'us' },
  { id: 'Pacific/Honolulu', city: 'Honolulu', country: 'Estados Unidos', code: 'us' },
  { id: 'America/Anchorage', city: 'Anchorage', country: 'Estados Unidos', code: 'us' },
  { id: 'America/Los_Angeles', city: 'Los Angeles', country: 'Estados Unidos', code: 'us' },
  { id: 'America/Denver', city: 'Denver', country: 'Estados Unidos', code: 'us' },
  { id: 'America/Chicago', city: 'Chicago', country: 'Estados Unidos', code: 'us' },
  { id: 'America/New_York', city: 'New York', country: 'Estados Unidos', code: 'us' },
  { id: 'America/Caracas', city: 'Caracas', country: 'Venezuela', code: 've' },
  { id: 'America/Sao_Paulo', city: 'São Paulo', country: 'Brasil', code: 'br' },
  { id: 'America/Argentina/Buenos_Aires', city: 'Buenos Aires', country: 'Argentina', code: 'ar' },
  { id: 'Atlantic/South_Georgia', city: 'Geórgia do Sul', country: 'Reino Unido', code: 'gs' },
  { id: 'Atlantic/Azores', city: 'Açores', country: 'Portugal', code: 'pt' },
  { id: 'Europe/London', city: 'Londres', country: 'Reino Unido', code: 'gb' },
  { id: 'Europe/Paris', city: 'Paris', country: 'França', code: 'fr' },
  { id: 'Europe/Amsterdam', city: 'Amsterdam', country: 'Holanda', code: 'nl' },
  { id: 'Europe/Berlin', city: 'Berlim', country: 'Alemanha', code: 'de' },
  { id: 'Europe/Athens', city: 'Atenas', country: 'Grécia', code: 'gr' },
  { id: 'Europe/Moscow', city: 'Moscou', country: 'Rússia', code: 'ru' },
  { id: 'Africa/Cairo', city: 'Cairo', country: 'Egito', code: 'eg' },
  { id: 'Africa/Johannesburg', city: 'Joanesburgo', country: 'África do Sul', code: 'za' },
  { id: 'Asia/Dubai', city: 'Dubai', country: 'Emirados Árabes Unidos', code: 'ae' },
  { id: 'Asia/Karachi', city: 'Karachi', country: 'Paquistão', code: 'pk' },
  { id: 'Asia/Kolkata', city: 'Nova Deli', country: 'Índia', code: 'in' },
  { id: 'Asia/Dhaka', city: 'Dhaka', country: 'Bangladesh', code: 'bd' },
  { id: 'Asia/Bangkok', city: 'Bangkok', country: 'Tailândia', code: 'th' },
  { id: 'Asia/Shanghai', city: 'Pequim', country: 'China', code: 'cn' },
  { id: 'Asia/Tokyo', city: 'Tóquio', country: 'Japão', code: 'jp' },
  { id: 'Australia/Sydney', city: 'Sydney', country: 'Austrália', code: 'au' },
  { id: 'Pacific/Noumea', city: 'Nouméa', country: 'Nova Caledônia', code: 'nc' },
  { id: 'Pacific/Auckland', city: 'Auckland', country: 'Nova Zelândia', code: 'nz' },
];

export class TimezoneService {
  /**
   * Retorna o timezone salvo ou o padrão do dispositivo
   */
  static async getCurrentTimezone(): Promise<string> {
    try {
      const saved = await AsyncStorage.getItem(TIMEZONE_STORAGE_KEY);
      if (saved) return saved;
      
      // Fallback para o fuso do sistema operacional
      const deviceTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      return deviceTz || 'America/Sao_Paulo';
    } catch (error) {
      return 'America/Sao_Paulo';
    }
  }

  /**
   * Salva o novo timezone escolhido pelo usuário
   */
  static async setCurrentTimezone(tz: string): Promise<void> {
    await AsyncStorage.setItem(TIMEZONE_STORAGE_KEY, tz);
  }

  static getFullTimezoneData() {
  return AVAILABLE_TIMEZONES.map(tz => ({
    ...tz,
    dynamicOffset: this.getDynamicOffset(tz.id),
    offsetValue: getTimezoneOffset(tz.id, new Date())
  })).sort((a, b) => a.offsetValue - b.offsetValue);
}

  /**
   * Calcula o UTC dinamicamente com base na data atual (resolve Horário de Verão automaticamente)
   */
  static getDynamicOffset(ianaTz: string): string {
    const now = new Date();
    const offsetMiliseconds = getTimezoneOffset(ianaTz, now);
    const offsetHours = offsetMiliseconds / (1000 * 60 * 60);
    
    const sign = offsetHours >= 0 ? '+' : ''; // O negativo já vem no número
    return `UTC${sign}${offsetHours}`;
  }

  /**
   * Retorna a lista de fusos formatada e ordenada (Ex: "São Paulo — UTC-3")
   */
  static getFormattedTimezoneList() {
    return AVAILABLE_TIMEZONES.map(tz => {
      return {
        id: tz.id,
        label: `${tz.city} — ${this.getDynamicOffset(tz.id)}`,
        offsetValue: getTimezoneOffset(tz.id, new Date()) // Usado apenas para ordenação
      };
    }).sort((a, b) => a.offsetValue - b.offsetValue);
  }

  /**
   * Formata uma data absoluta (ISO/Timestamp) para o fuso configurado
   */
  static async formatDateTime(date: Date | string | number, formatStr: string): Promise<string> {
    const tz = await this.getCurrentTimezone();
    return formatInTimeZone(new Date(date), tz, formatStr);
  }

  /**
   * Gera a data/hora exata em ISO absoluta, garantindo consistência no banco e API
   */
  static getAbsoluteISO(date: Date = new Date()): string {
    return date.toISOString();
  }

  /**
   * Retorna o início do dia baseado no fuso configurado (útil para os filtros)
   */
  static async getStartOfDayZoned(date: Date = new Date()): Promise<Date> {
    const tz = await this.getCurrentTimezone();
    const dateInTzStr = formatInTimeZone(date, tz, "yyyy-MM-dd'T'00:00:00.000XXX");
    return new Date(dateInTzStr);
  }

  /**
   * Retorna o fim do dia baseado no fuso configurado (útil para os filtros)
   */
  static async getEndOfDayZoned(date: Date = new Date()): Promise<Date> {
    const tz = await this.getCurrentTimezone();
    const dateInTzStr = formatInTimeZone(date, tz, "yyyy-MM-dd'T'23:59:59.999XXX");
    return new Date(dateInTzStr);
  }
}