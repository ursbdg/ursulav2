
import type { Session } from '@supabase/supabase-js';

export type UserRole = 'koordinator' | 'pembina' | 'input';

export interface TahunAjaran {
    id: number;
    nama: string;
    is_active: boolean;
}

export interface AppContextType {
    session: Session | null;
    userRole: UserRole;
    tahunAjaranList: TahunAjaran[];
    activeTahunAjaran: TahunAjaran | null;
    selectedTahunAjaran: TahunAjaran | null;
    setSelectedTahunAjaran: (tahunAjaran: TahunAjaran | null) => void;
}

export type IzinStatus = 'Sakit' | 'Izin' | 'Tanpa Seragam';

export interface IzinStatusMap {
    SAKIT: 'Sakit';
    IZIN: 'Izin';
    TANPA_SERAGAM: 'Tanpa Seragam';
}

export interface Profile {
    id: string;
    nama: string;
    kelas: string;
    ekstra: { [tahunAjaran: string]: string[] } | null;
}

export interface Presensi {
    id: number;
    profile_id: string;
    tanggal: string;
    ekstra: string;
    waktu_presensi: string | null;
    catatan: IzinStatus | null;
    tahun_ajaran_nama: string;
    profiles?: {
      id: string;
      nama: string;
      kelas: string;
    };
}



export interface Ekstrakurikuler {
    id: number;
    nama: string;
    icon: string;
    boleh_dobel: boolean;
}

export type EkstraIconType = Ekstrakurikuler;

export interface MonthlyAttendance {
    [date: string]: (Profile & { profile_id: string, presensi_id: number, waktu_presensi: string | null, catatan: IzinStatus | null })[];
}
