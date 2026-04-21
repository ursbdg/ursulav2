import React, { useState, useEffect, useCallback, useContext } from 'react';
import { supabase } from '../../services/supabase';
import { IZIN_STATUS } from '../../constants';
import { AppContext } from '../../contexts/AppContext';
import type { Profile, IzinStatus, Presensi } from '../../types';
import Spinner from '../shared/Spinner';
import StatusTag from '../shared/StatusTag';
import ConfirmationModal from '../shared/ConfirmationModal';

interface PusatIzinTerpusatPageProps {
    onBack: () => void;
}

interface IzinData {
    [ekstraName: string]: { id: number; catatan: IzinStatus | null };
}

const PusatIzinTerpusatPage: React.FC<PusatIzinTerpusatPageProps> = ({ onBack }) => {
    const { activeTahunAjaran } = useContext(AppContext)!;
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState<Profile[]>([]);
    const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
    const [izinData, setIzinData] = useState<IzinData>({});
    const [loading, setLoading] = useState(false);
    const [updating, setUpdating] = useState(false);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [izinRecap, setIzinRecap] = useState<Presensi[]>([]);
    const [loadingRecap, setLoadingRecap] = useState(false);
    const [isHadirModalOpen, setHadirModalOpen] = useState(false);
    const [selectedPresensiId, setSelectedPresensiId] = useState<number | null>(null);

    const fetchIzinRecap = useCallback(async (date: string) => {
        if (!activeTahunAjaran) return;
        setLoadingRecap(true);
        const { data } = await supabase
            .from('presensi')
            .select('id, ekstra, catatan, profiles(nama, kelas)')
            .eq('tanggal', date)
            .eq('tahun_ajaran_nama', activeTahunAjaran.nama)
            .in('catatan', [IZIN_STATUS.SAKIT, IZIN_STATUS.IZIN, IZIN_STATUS.TANPA_SERAGAM]);

        const recapData = (data as any[] || []).map(d => ({
            ...d,
            profiles: Array.isArray(d.profiles) ? d.profiles[0] : d.profiles
        })) as Presensi[];
        recapData.sort((a, b) => a.profiles?.nama.localeCompare(b.profiles?.nama || '') || 0);
        setIzinRecap(recapData);
        setLoadingRecap(false);
    }, [activeTahunAjaran]);

    useEffect(() => {
        fetchIzinRecap(selectedDate);
    }, [selectedDate, fetchIzinRecap]);

    useEffect(() => {
        if (!searchTerm) {
            setSearchResults([]);
            return;
        }
        setLoading(true);
        const handler = setTimeout(async () => {
            const { data } = await supabase.from('profiles').select('id, nama, kelas, ekstra').ilike('nama', `%${searchTerm}%`).limit(10);
            setSearchResults(data || []);
            setLoading(false);
        }, 300);
        return () => clearTimeout(handler);
    }, [searchTerm]);

    const fetchIzinData = useCallback(async (profileId: string) => {
        if (!activeTahunAjaran) return;
        const { data } = await supabase.from('presensi').select('id, ekstra, catatan').eq('profile_id', profileId).eq('tanggal', selectedDate).eq('tahun_ajaran_nama', activeTahunAjaran.nama);
        const izinMap = (data || []).reduce((acc, curr) => {
            acc[curr.ekstra] = { id: curr.id, catatan: curr.catatan as IzinStatus };
            return acc;
        }, {} as IzinData);
        setIzinData(izinMap);
    }, [selectedDate, activeTahunAjaran]);

    const handleSelectProfile = (profile: Profile) => {
        setSelectedProfile(profile);
        setSearchTerm(profile.nama);
        setSearchResults([]);
        fetchIzinData(profile.id);
    };

    const handleSetIzin = async (ekstraName: string, status: IzinStatus) => {
        if (!selectedProfile || !activeTahunAjaran) return;
        setUpdating(true);
        const existingIzin = izinData[ekstraName];

        if (existingIzin && existingIzin.catatan === status) {
            await supabase.from('presensi').delete().eq('id', existingIzin.id);
        } else {
            await supabase.from('presensi').upsert({
                id: existingIzin?.id,
                profile_id: selectedProfile.id,
                tanggal: selectedDate,
                ekstra: ekstraName,
                catatan: status,
                waktu_presensi: (status === IZIN_STATUS.TANPA_SERAGAM) ? new Date().toISOString() : null,
                tahun_ajaran_nama: activeTahunAjaran.nama,
            }, { onConflict: 'id' });
        }
        await fetchIzinData(selectedProfile.id);
        await fetchIzinRecap(selectedDate);
        setUpdating(false);
    };

    const handleHadir = async () => {
        if (!selectedPresensiId) return;
        setUpdating(true);
        await supabase.from('presensi').delete().eq('id', selectedPresensiId);
        await fetchIzinRecap(selectedDate);
        if (selectedProfile) {
            await fetchIzinData(selectedProfile.id);
        }
        setUpdating(false);
        setHadirModalOpen(false);
        setSelectedPresensiId(null);
    };

    const openHadirModal = (presensiId: number) => {
        setSelectedPresensiId(presensiId);
        setHadirModalOpen(true);
    };
    
    const resetSearch = () => {
        setSelectedProfile(null);
        setSearchTerm('');
        setSearchResults([]);
        setIzinData({});
    };

    const StatusButton = ({ ekstraName, status, label }: { ekstraName: string, status: IzinStatus, label: React.ReactNode }) => {
        const currentStatus = izinData[ekstraName]?.catatan;
        const isActive = currentStatus === status;
        
        const colorClasses = 
            status === IZIN_STATUS.SAKIT ? (isActive ? 'bg-red-500 text-white' : 'bg-red-100 text-red-700') :
            status === IZIN_STATUS.IZIN ? (isActive ? 'bg-yellow-500 text-white' : 'bg-yellow-100 text-yellow-700') :
            (isActive ? 'bg-blue-500 text-white' : 'bg-blue-100 text-blue-700');

        return <button disabled={updating} onClick={() => handleSetIzin(ekstraName, status)} className={`px-2 py-1 text-xs rounded-md transition-opacity ${colorClasses} disabled:opacity-30`}>{label}</button>;
    };

    const studentEkstraList = selectedProfile?.ekstra?.[activeTahunAjaran?.nama || ''] || [];

    return (
        <div className="bg-white p-4 sm:p-6 rounded-xl shadow border space-y-4">
            <h2 className="text-lg font-semibold">Pusat Izin Harian Terpusat</h2>
            <p className="text-center text-xs text-gray-500 -mt-2">Tahun Ajaran: {activeTahunAjaran?.nama}</p>
            
            <div className="space-y-2">
                <label htmlFor="izin-date" className="block text-sm font-medium text-gray-700">Tanggal Izin</label>
                <input
                    type="date"
                    id="izin-date"
                    value={selectedDate}
                    onChange={e => setSelectedDate(e.target.value)}
                    className="w-full border rounded-md px-3 py-2 text-sm bg-white"
                />
            </div>

            <div className="relative">
                <input type="text" value={searchTerm} onChange={e => { setSearchTerm(e.target.value); setSelectedProfile(null); }} placeholder="Ketik nama siswa untuk mencari..." className="w-full border rounded-md px-3 py-2 text-sm" />
                {loading && <div className="absolute right-3 top-2.5 w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>}
                {searchResults.length > 0 && (
                    <div className="absolute w-full mt-1 bg-white border rounded-md shadow-lg z-10 max-h-60 overflow-y-auto">
                        {searchResults.map(p => <div key={p.id} onClick={() => handleSelectProfile(p)} className="px-3 py-2 text-sm hover:bg-gray-100 cursor-pointer">{p.nama} ({p.kelas})</div>)}
                    </div>
                )}
            </div>

            {selectedProfile && (
                <div className="border-t pt-4 space-y-3">
                    <div className="flex justify-between items-center">
                        <div>
                            <p className="font-bold">{selectedProfile.nama}</p>
                            <p className="text-sm text-gray-500">{selectedProfile.kelas}</p>
                        </div>
                        <button onClick={resetSearch} className="text-sm text-blue-600 hover:underline">Cari Lagi</button>
                    </div>
                    <div className="space-y-2">
                        {studentEkstraList.length > 0 ? studentEkstraList.map((ekstra: string) => (
                            <div key={ekstra} className="p-3 border rounded-lg bg-gray-50">
                                <p className="font-semibold text-sm mb-2">{ekstra}</p>
                                <div className="flex gap-2">
                                    <StatusButton ekstraName={ekstra} status={IZIN_STATUS.SAKIT} label="Sakit" />
                                    <StatusButton ekstraName={ekstra} status={IZIN_STATUS.IZIN} label="Izin" />
                                    <StatusButton ekstraName={ekstra} status={IZIN_STATUS.TANPA_SERAGAM} label="Seragam" />
                                </div>
                            </div>
                        )) : <p className="text-sm text-center text-gray-500 py-4">Siswa ini belum terdaftar di ekstrakurikuler manapun pada tahun ajaran ini.</p>}
                    </div>
                    {updating && <p className="text-sm text-center text-gray-500 animate-pulse">Memperbarui status...</p>}
                </div>
            )}

            <div className="border-t pt-4 space-y-3">
                <h3 className="font-semibold text-base">Rekap Izin ({new Date(selectedDate + 'T00:00:00').toLocaleDateString('id-ID', {day: 'numeric', month: 'long' })})</h3>
                {loadingRecap ? <div className="text-center py-4"><Spinner size="sm" /></div> : (
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                        {izinRecap.length > 0 ? izinRecap.map(izin => (
                            <div key={izin.id} className="p-2 border rounded-lg bg-gray-50 text-sm flex justify-between items-center">
                                <div>
                                    <p className="font-medium">{izin.profiles?.nama} <span className="text-xs text-gray-500">({izin.profiles?.kelas})</span></p>
                                    <p className="text-xs text-blue-600">{izin.ekstra}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <StatusTag status={izin.catatan} />
                                    <button 
                                        onClick={() => openHadirModal(izin.id)} 
                                        disabled={updating}
                                        className="px-2 py-1 text-xs rounded-md transition-opacity bg-green-100 text-green-700 hover:bg-green-200 disabled:opacity-30"
                                    >
                                        Hadir
                                    </button>
                                </div>
                            </div>
                        )) : <p className="text-sm text-center text-gray-500 py-4">Belum ada siswa yang izin/sakit pada tanggal ini.</p>}
                    </div>
                )}
            </div>
            
            <button onClick={onBack} className="w-full bg-gray-200 text-sm rounded py-2 mt-4 hover:bg-gray-300 transition-colors">Kembali</button>

            <ConfirmationModal
                isOpen={isHadirModalOpen}
                onClose={() => setHadirModalOpen(false)}
                onConfirm={handleHadir}
                title="Konfirmasi Kehadiran"
                message="Apakah Anda yakin ingin menandai siswa ini sebagai HADIR? Status izin akan dihapus."
                confirmText="Ya, Hadir"
                cancelText="Batal"
            />
        </div>
    );
}

export default PusatIzinTerpusatPage;
