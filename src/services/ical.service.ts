import { isMockMode, supabase } from '../integrations/supabase/client';
import { icalMockService } from './ical.mock';

export interface ICalFeed {
  id: string;
  property_id: string;
  unidad_id: string;
  nombre: string | null;
  plataforma: 'BOOKING' | 'AIRBNB' | 'ESCAPADARURAL' | 'OTRO';
  url: string;
  activo: boolean;
  ultima_sync: string | null;
  error_ultimo: string | null;
  created_at: string;
}

export interface SyncLog {
  id: string;
  feed_id: string | null;
  unidad_id: string | null;
  estado: 'OK' | 'ERROR';
  bloqueos_creados: number;
  bloqueos_omitidos: number;
  detalle: string | null;
  created_at: string;
  // Alias de compatibilidad con el componente
  resultado: 'OK' | 'ERROR';
  bloqueos_importados: number;
  mensaje: string | null;
}

export const icalService = {
  async getFeeds(): Promise<ICalFeed[]> {
    if (isMockMode) return icalMockService.getFeeds() as any;
    const { data, error } = await supabase
      .from('feeds_ical')
      .select('*')
      .order('created_at', { ascending: true });
    if (error) throw error;
    return data ?? [];
  },

  async addFeed(feed: { nombre: string; plataforma: ICalFeed['plataforma']; url: string; unidad_id: string; property_id: string }): Promise<ICalFeed> {
    if (isMockMode) throw new Error('No disponible en modo mock');
    const { data, error } = await supabase
      .from('feeds_ical')
      .insert({ ...feed, activo: true })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deleteFeed(id: string): Promise<void> {
    if (isMockMode) return;
    // Solo desactiva el feed — los bloqueos importados se conservan
    const { error } = await supabase
      .from('feeds_ical')
      .update({ activo: false })
      .eq('id', id);
    if (error) throw error;
  },

  async deleteFeedPermanent(id: string): Promise<void> {
    if (isMockMode) return;
    const { error } = await supabase.from('feeds_ical').delete().eq('id', id);
    if (error) throw error;
  },

  async getLogs(feedId?: string): Promise<SyncLog[]> {
    if (isMockMode) return [];
    let q = supabase
      .from('logs_ical')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);
    if (feedId) q = q.eq('feed_id', feedId);
    const { data } = await q;
    // Normalizar columnas v2 → alias compatibles con el componente
    return (data ?? []).map((row: any) => ({
      ...row,
      resultado:           row.estado,
      bloqueos_importados: row.bloqueos_creados ?? 0,
      mensaje:             row.detalle ?? null,
    }));
  },

  async syncFeed(feedId: string): Promise<{ importados: number; error?: string }> {
    if (isMockMode) {
      await new Promise(r => setTimeout(r, 1500));
      return { importados: 0 };
    }
    try {
      const { data, error } = await supabase.functions.invoke('sync-ical-import', {
        body: { feedId },
      });
      if (error) throw error;
      const result = data?.results?.[0];
      if (result?.status === 'ERROR') return { importados: 0, error: result.error };
      return { importados: result?.bloqueos_creados ?? result?.creadas ?? 0 };
    } catch (err: any) {
      return { importados: 0, error: err.message };
    }
  },

  async syncAll(): Promise<{ total: number; errores: number }> {
    if (isMockMode) {
      await new Promise(r => setTimeout(r, 2000));
      return { total: 0, errores: 0 };
    }
    try {
      const { data, error } = await supabase.functions.invoke('sync-ical-import', {
        body: {},
      });
      if (error) throw error;
      const results: any[] = data?.results ?? [];
      const total  = results.reduce((s, r) => s + (r.creadas ?? 0), 0);
      const errores = results.filter(r => r.status === 'ERROR').length;
      return { total, errores };
    } catch (err: any) {
      return { total: 0, errores: 1 };
    }
  },
};
