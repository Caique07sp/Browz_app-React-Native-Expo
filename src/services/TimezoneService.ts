import AsyncStorage from '@react-native-async-storage/async-storage';
import { formatInTimeZone, getTimezoneOffset } from 'date-fns-tz';
import { startOfWeek, endOfWeek, startOfDay, endOfDay } from 'date-fns';

const TIMEZONE_STORAGE_KEY = '@app_timezone';

// Lista base de fusos solicitados
export const AVAILABLE_TIMEZONES = [
  { id: 'Etc/GMT+12', city: 'Baker Island' }, // UTC-12
  { id: 'Pacific/Midway', city: 'Midway' }, // UTC-11
  { id: 'Pacific/Honolulu', city: 'Honolulu' }, // UTC-10
  { id: 'America/Anchorage', city: 'Anchorage' }, // UTC-9
  { id: 'America/Los_Angeles', city: 'Los Angeles' }, // UTC-8
  { id: 'America/Denver', city: 'Denver' }, // UTC-7
  { id: 'America/Chicago', city: 'Chicago' }, // UTC-6
  { id: 'America/New_York', city: 'New York' }, // UTC-5
  { id: 'America/Caracas', city: 'Caracas' }, // UTC-4
  { id: 'America/Sao_Paulo', city: 'São Paulo' }, // UTC-3
  { id: 'Atlantic/South_Georgia', city: 'South Georgia' }, // UTC-2
  { id: 'Atlantic/Azores', city: 'Azores' }, // UTC-1
  { id: 'Europe/London', city: 'London' }, // UTC+0
  { id: 'Europe/Paris', city: 'Paris' }, // UTC+1
  { id: 'Europe/Athens', city: 'Athens' }, // UTC+2
  { id: 'Europe/Moscow', city: 'Moscow' }, // UTC+3
  { id: 'Asia/Dubai', city: 'Dubai' }, // UTC+4
  { id: 'Asia/Karachi', city: 'Karachi' }, // UTC+5
  { id: 'Asia/Kolkata', city: 'Nova Deli' }, // UTC+5:30 
  { id: 'Asia/Dhaka', city: 'Dhaka' }, // UTC+6
  { id: 'Asia/Bangkok', city: 'Bangkok' }, // UTC+7
  { id: 'Asia/Shanghai', city: 'Beijing' }, // UTC+8
  { id: 'Asia/Tokyo', city: 'Tokyo' }, // UTC+9
  { id: 'Australia/Sydney', city: 'Sydney' }, // UTC+10
  { id: 'Pacific/Noumea', city: 'Noumea' }, // UTC+11
  { id: 'Pacific/Auckland', city: 'Auckland' }, // UTC+12
  { id: 'Pacific/Tongatapu', city: 'Tonga' }, // UTC+13
  { id: 'Pacific/Kiritimati', city: 'Kiritimati' }, // UTC+14
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