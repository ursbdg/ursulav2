
import React, { useState, useEffect, useRef, useCallback, useContext } from 'react';
import { supabase } from '../../services/supabase';
import { IZIN_STATUS } from '../../constants';
import { AppContext } from '../../contexts/AppContext';
import type { Profile, Presensi, EkstraIconType } from '../../types';
import Spinner from '../shared/Spinner';
import Icon from '../shared/Icon';
import ConfirmationModal from '../shared/ConfirmationModal';
import StatusTag from '../shared/StatusTag';

// Define Html5Qrcode type to avoid using 'any' repeatedly
type Html5QrcodeScanner = {
    start: (cameraConfig: any, config: any, successCallback: (decodedText: string) => void, errorCallback: () => void) => Promise<null>;
    stop: () => Promise<void>;
    isScanning: boolean;
};

interface PresensiPageProps {
    ekstra: EkstraIconType;
    onBack: () => void;
}

const PresensiPage: React.FC<PresensiPageProps> = ({ ekstra, onBack }) => {
    const { activeTahunAjaran } = useContext(AppContext)!;
    const [mode, setMode] = useState<'scan' | 'manual'>('scan');
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState<Profile[]>([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const [status, setStatus] = useState({ loading: false, error: '', success: '', info: 'Arahkan kamera ke QR code siswa.' });
    const html5QrCodeRef = useRef<Html5QrcodeScanner | null>(null);
    
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [todayAttendance, setTodayAttendance] = useState<Presensi[]>([]);
    const [loadingAttendance, setLoadingAttendance] = useState(true);
    const [izinList, setIzinList] = useState<Presensi[]>([]);
    const [loadingIzin, setLoadingIzin] = useState(true);

    const [registeredStudents, setRegisteredStudents] = useState<Profile[]>([]);
    const [registeredLoading, setRegisteredLoading] = useState(true);
    const [showRegistered, setShowRegistered] = useState(false);
    const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);
    const [selectedPresensiId, setSelectedPresensiId] = useState<number | null>(null);

    const fetchRegisteredStudents = useCallback(async () => {
        if (!activeTahunAjaran) return;
        setRegisteredLoading(true);
        const { data } = await supabase.from('profiles').select('id, nama, kelas, ekstra').not('ekstra', 'is', null).order('nama').limit(10000);
        
        const filtered = (data as Profile[] || [])
            .filter(p => p.ekstra?.[activeTahunAjaran.nama]?.includes(ekstra.nama));

        setRegisteredStudents(filtered);
        setRegisteredLoading(false);
    }, [ekstra.nama, activeTahunAjaran]);

    const fetchAttendanceData = useCallback(async () => {
        if (!activeTahunAjaran) return;
        setLoadingAttendance(true);
        setLoadingIzin(true);
        
        const { data: hadirData } = await supabase
          .from('presensi')
          .select('id, profile_id, waktu_presensi, catatan, profiles(nama, kelas)')
          .eq('tanggal', selectedDate)
          .eq('ekstra', ekstra.nama)
          .eq('tahun_ajaran_nama', activeTahunAjaran.nama)
          .not('waktu_presensi', 'is', null) 
          .order('waktu_presensi', { ascending: false });
        
        const formattedHadir = (hadirData as any[] || []).map(d => ({
            ...d,
            profiles: Array.isArray(d.profiles) ? d.profiles[0] : d.profiles
        }));
        setTodayAttendance(formattedHadir as Presensi[]);
        setLoadingAttendance(false);

        const { data: izinData } = await supabase
          .from('presensi')
          .select('id, profile_id, catatan, profiles(nama, kelas)')
          .eq('tanggal', selectedDate)
          .eq('ekstra', ekstra.nama)
          .eq('tahun_ajaran_nama', activeTahunAjaran.nama)
          .is('waktu_presensi', null)
          .in('catatan', [IZIN_STATUS.SAKIT, IZIN_STATUS.IZIN]);
        
        const formattedIzin = (izinData as any[] || []).map(d => ({
            ...d,
            profiles: Array.isArray(d.profiles) ? d.profiles[0] : d.profiles
        }));
        setIzinList(formattedIzin as Presensi[]);
        setLoadingIzin(false);
    }, [ekstra.nama, activeTahunAjaran, selectedDate]);

    useEffect(() => {
        fetchAttendanceData();
        fetchRegisteredStudents();
    }, [fetchAttendanceData, fetchRegisteredStudents]);

    useEffect(() => {
        if (mode !== 'manual' || !searchTerm || !activeTahunAjaran) { setSearchResults([]); return; }
        setSearchLoading(true);
        const handler = setTimeout(async () => {
            const { data, error } = await supabase.from('profiles').select('id, nama, kelas, ekstra').ilike('nama', `%${searchTerm}%`);
            
            const filteredData = (data as Profile[] || []).filter(p => p.ekstra?.[activeTahunAjaran.nama]?.includes(ekstra.nama));

            if (!error) setSearchResults(filteredData);
            setSearchLoading(false);
        }, 300);
        return () => clearTimeout(handler);
    }, [searchTerm, mode, ekstra.nama, activeTahunAjaran]);

    const handlePresensiByName = useCallback(async (namaSiswa: string) => {
        if (!activeTahunAjaran) return;
        setStatus({ loading: true, error: '', success: '', info: 'Mencari siswa...' });
        const { data, error } = await supabase.from('profiles').select('id, nama, kelas, ekstra').eq('nama', namaSiswa).single();
        const profile = data as Profile | null;
        if (error || !profile || !profile.ekstra?.[activeTahunAjaran.nama]?.includes(ekstra.nama)) { 
            setStatus({ loading: false, error: `Siswa "${namaSiswa}" tidak terdaftar di ${ekstra.nama} pada tahun ajaran ini.`, success: '', info: '' }); 
            return; 
        }
        await handlePresensi(profile);
    }, [ekstra.nama, fetchAttendanceData, activeTahunAjaran]);
    
    useEffect(() => {
        const Html5Qrcode = (window as any).Html5Qrcode;
        if (mode === 'scan') {
            html5QrCodeRef.current = new Html5Qrcode("qr-reader");
            const startScanner = () => {
                if(html5QrCodeRef.current) {
                    html5QrCodeRef.current.start(
                        { facingMode: "environment" }, 
                        { fps: 5, qrbox: {width: 250, height: 250} }, 
                        (decodedText: string) => { 
                            if (html5QrCodeRef.current?.isScanning) { 
                                html5QrCodeRef.current.stop(); 
                            } 
                            handlePresensiByName(decodedText); 
                        }, 
                        () => {}
                    ).catch(() => setStatus(s => ({...s, info: 'Kamera tidak ditemukan atau izin ditolak.'})));
                }
            };
            startScanner();
        }
        return () => { 
            if (html5QrCodeRef.current?.isScanning) { 
                html5QrCodeRef.current.stop().catch(() => {}); 
            } 
        };
    }, [mode, handlePresensiByName]);

    const handlePresensi = async (profile: Profile) => {
        if (status.loading || !activeTahunAjaran) return;
        setStatus({ loading: true, error: '', success: '', info: 'Memproses...' });
        const waktu_presensi = new Date().toISOString();

        const { data } = await supabase.from('presensi').select('*').eq('profile_id', profile.id).eq('tanggal', selectedDate).eq('ekstra', ekstra.nama).eq('tahun_ajaran_nama', activeTahunAjaran.nama).maybeSingle();
        const existingRecord = data as Presensi | null;

        if (existingRecord) {
            if (existingRecord.waktu_presensi) {
                setStatus({ loading: false, error: `${profile.nama} sudah presensi pada tanggal ${selectedDate}.`, success: '', info: '' }); return;
            }
            if (existingRecord.catatan === IZIN_STATUS.SAKIT || existingRecord.catatan === IZIN_STATUS.IZIN) {
                setStatus({ loading: false, error: `Presensi gagal: ${profile.nama} tercatat ${existingRecord.catatan}.`, success: '', info: '' }); return;
            }
            if (existingRecord.catatan === IZIN_STATUS.TANPA_SERAGAM) {
                const { error } = await supabase.from('presensi').update({ waktu_presensi }).eq('id', existingRecord.id);
                if (error) setStatus({ loading: false, error: error.message, success: '', info: '' });
                else {
                    setStatus({ loading: false, error: '', success: `Berhasil: ${profile.nama} hadir (tanpa seragam).`, info: '' });
                    fetchAttendanceData();
                }
                setSearchTerm(''); setSearchResults([]); return;
            }
        }

        const { error } = await supabase.from('presensi').insert({ profile_id: profile.id, tanggal: selectedDate, ekstra: ekstra.nama, waktu_presensi, tahun_ajaran_nama: activeTahunAjaran.nama });
        if (error) setStatus({ loading: false, error: error.message, success: '', info: '' });
        else { 
            setStatus({ loading: false, error: '', success: `Berhasil: ${profile.nama} (${profile.kelas}) hadir.`, info: '' });
            fetchAttendanceData();
        }
        setSearchTerm(''); setSearchResults([]);
    };

    const handleDeletePresensi = async () => {
        if (!selectedPresensiId) return;
        setStatus({ loading: true, error: '', success: '', info: 'Menghapus...' });
        const { error } = await supabase.from('presensi').delete().eq('id', selectedPresensiId);
        if (error) {
            setStatus({ loading: false, error: error.message, success: '', info: '' });
        } else {
            setStatus({ loading: false, error: '', success: 'Data presensi berhasil dihapus.', info: '' });
            fetchAttendanceData();
        }
        setDeleteModalOpen(false);
        setSelectedPresensiId(null);
    };

    const openDeleteModal = (presensiId: number) => {
        setSelectedPresensiId(presensiId);
        setDeleteModalOpen(true);
    };
    
    const resetAll = useCallback(() => {
        setStatus({ loading: false, error: '', success: '', info: 'Arahkan kamera ke QR code siswa.' });
    }, []);

    return (
        <section className="bg-white p-6 rounded-xl shadow border space-y-4">
          <h2 className="text-center font-semibold text-lg">Presensi {ekstra.nama}</h2>
          <p className="text-center text-xs text-gray-500 -mt-2">Tahun Ajaran: {activeTahunAjaran?.nama}</p>

          <div className="flex flex-col items-center space-y-2 py-2 bg-blue-50 rounded-lg border border-blue-100">
            <label className="text-xs font-semibold text-blue-700 uppercase tracking-wider">Tanggal Presensi</label>
            <input 
                type="date" 
                value={selectedDate} 
                onChange={(e) => setSelectedDate(e.target.value)}
                className="border border-blue-200 rounded px-3 py-1.5 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
            />
            {selectedDate !== new Date().toISOString().split('T')[0] && (
                <p className="text-[10px] text-orange-600 font-bold animate-pulse">Mode: Presensi Tanggal Lampau/Mendatang</p>
            )}
          </div>

            <div className="border rounded-lg">
                <button onClick={() => setShowRegistered(!showRegistered)} className="w-full flex justify-between items-center p-3 font-semibold text-sm">
                    <span>Peserta Terdaftar ({registeredStudents.length})</span>
                    <Icon name={showRegistered ? 'chevron-up' : 'chevron-down'} className="w-5 h-5 transition-transform" />
                </button>
                {showRegistered && (
                    <div className="border-t p-3">
                        {registeredLoading ? <div className="text-center py-4"><Spinner size="sm"/></div> :
                        <div className="space-y-1 max-h-48 overflow-y-auto text-sm pr-2">
                            {registeredStudents.length > 0 ? registeredStudents.map(s => {
                                const attended = todayAttendance.find(att => att.profile_id === s.id);
                                const isIzin = izinList.find(iz => iz.profile_id === s.id);
                                return (
                                <div key={s.id} className="flex justify-between items-center p-1.5 bg-gray-50 rounded">
                                    <div>
                                        <span>{s.nama}</span>
                                        <span className="text-gray-500 ml-2">{s.kelas}</span>
                                    </div>
                                    {attended ? (
                                        <span className="font-mono text-xs bg-gray-200 text-gray-700 px-1.5 rounded">{new Date(attended.waktu_presensi!).toLocaleTimeString('id-ID')}</span>
                                    ) : isIzin ? (
                                        <StatusTag status={isIzin.catatan} />
                                    ) : (
                                        <button onClick={() => handlePresensi(s)} className="bg-blue-500 text-white text-xs px-2 py-1 rounded hover:bg-blue-600 transition-colors disabled:bg-gray-300" disabled={status.loading}>Hadir</button>
                                    )}
                                </div>
                                )
                            }) : <p className="text-xs text-center text-gray-400">Belum ada siswa terdaftar.</p>}
                        </div>}
                    </div>
                )}
            </div>

          <div className="flex justify-center bg-gray-100 rounded-md p-1 text-sm"><button onClick={() => setMode('scan')} className={`px-3 py-1 rounded w-full ${mode === 'scan' ? 'bg-white shadow' : ''}`}>Scan QR</button><button onClick={() => setMode('manual')} className={`px-3 py-1 rounded w-full ${mode === 'manual' ? 'bg-white shadow' : ''}`}>Input Manual</button></div>
          {mode === 'scan' ? ( <div id="qr-reader" className="w-full aspect-square max-w-sm mx-auto border bg-gray-100 rounded-lg overflow-hidden"></div> ) : (<div className="relative"><input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Ketik nama siswa..." className="w-full border px-3 py-2 rounded text-sm" />{searchLoading && <div className="absolute right-3 top-2.5 w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>}{searchResults.length > 0 && (<div className="absolute w-full mt-1 bg-white border rounded-md shadow-lg z-10 max-h-48 overflow-y-auto">{searchResults.map(profile => (<div key={profile.id} onClick={() => handlePresensi(profile)} className="px-3 py-2 text-sm hover:bg-gray-100 cursor-pointer">{profile.nama} ({profile.kelas})</div>))}</div>)}</div>)}
          <div className="text-center text-sm text-gray-500 h-4">{status.loading ? 'Memproses...' : status.info}</div>
          {status.error && <div className="bg-red-100 border border-red-400 text-red-700 p-3 rounded text-center text-sm"><p>{status.error}</p></div>}
          {status.success && <div className="bg-green-100 border border-green-400 text-green-700 p-3 rounded text-center"><p className="font-semibold">{status.success}</p></div>}
          {(status.error || status.success) && <button onClick={resetAll} className="w-full bg-gray-500 text-white py-2 rounded">Presensi Lagi</button>}
          
          <div className="pt-4 border-t">
              <h3 className="font-semibold text-center text-base mb-2">Siswa Izin/Sakit ({izinList.length})</h3>
              {loadingIzin ? <div className="text-center py-4"><Spinner size="sm"/></div> :
              <div className="space-y-1 max-h-24 overflow-y-auto text-sm pr-2">
                  {izinList.length > 0 ? izinList.map(izin => 
                    <div key={izin.id} className="flex justify-between items-center p-1.5 bg-gray-100 rounded">
                      <div className="flex items-center"><span>{izin.profiles?.nama}</span><span className="text-gray-400 ml-1">({izin.profiles?.kelas})</span></div><StatusTag status={izin.catatan} />
                    </div>
                  ) : <p className="text-xs text-center text-gray-400">Tidak ada.</p>}
              </div>}
          </div>

          <div className="pt-4 border-t">
              <h3 className="font-semibold text-center text-base mb-2">Daftar Hadir ({todayAttendance.length})</h3>
              <p className="text-[10px] text-center text-gray-400 mb-2">Tanggal: {new Date(selectedDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
              {loadingAttendance ? <div className="text-center py-4"><Spinner size="sm"/></div> :
              <div className="space-y-1 max-h-48 overflow-y-auto text-sm pr-2">
                  {todayAttendance.filter(att => att.profiles).map(att => 
                    <div key={att.id} className="flex justify-between items-center p-1.5 bg-gray-50 rounded">
                      <div className="flex items-center"><span>{att.profiles?.nama}</span> <span className="text-gray-400 ml-1">({att.profiles?.kelas})</span><StatusTag status={att.catatan} /></div>
                      <div className="flex items-center gap-2">
                          <span className="font-mono text-xs bg-gray-200 text-gray-700 px-1.5 rounded">{new Date(att.waktu_presensi!).toLocaleTimeString('id-ID')}</span>
                          <button onClick={() => openDeleteModal(att.id)} className="text-red-500 hover:text-red-700" disabled={status.loading}>
                              <Icon name="trash-2" className="w-4 h-4" />
                          </button>
                      </div>
                    </div>
                  )}
              </div>}
          </div>
          <button onClick={onBack} className="w-full bg-gray-200 text-sm rounded py-2 mt-2 hover:bg-gray-300 transition-colors">Kembali ke Pilihan</button>

            <ConfirmationModal 
                isOpen={isDeleteModalOpen}
                onClose={() => setDeleteModalOpen(false)}
                onConfirm={handleDeletePresensi}
                title="Konfirmasi Hapus"
                message="Apakah Anda yakin ingin menghapus data presensi ini? Tindakan ini tidak dapat dibatalkan."
                confirmText="Ya, Hapus"
            />
        </section>
    );
}

export default PresensiPage;
