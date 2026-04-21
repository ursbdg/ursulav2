
import React, { useState, useEffect, useRef, useCallback, useContext } from 'react';
import { supabase } from '../../services/supabase';
import type { Profile, Ekstrakurikuler } from '../../types';
import { AppContext } from '../../contexts/AppContext';
import Spinner from '../shared/Spinner';

type Html5QrcodeScanner = {
    start: (cameraConfig: any, config: any, successCallback: (decodedText: string) => void, errorCallback: () => void) => Promise<null>;
    stop: () => Promise<void>;
    isScanning: boolean;
};

interface DaftarkanSiswaPageProps {
    ekstra: Ekstrakurikuler;
    onBack: () => void;
}

const DaftarkanSiswaPage: React.FC<DaftarkanSiswaPageProps> = ({ ekstra, onBack }) => {
    const { activeTahunAjaran } = useContext(AppContext)!;
    const [mode, setMode] = useState<'scan' | 'manual'>('scan');
    const [manualName, setManualName] = useState('');
    const [status, setStatus] = useState({ loading: false, error: '', success: '', info: 'Arahkan kamera ke QR code siswa.' });
    const html5QrCodeRef = useRef<Html5QrcodeScanner | null>(null);
    
    const [foundProfile, setFoundProfile] = useState<Profile | null>(null);
    const [searchResults, setSearchResults] = useState<Profile[]>([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const [ekstraSettings, setEkstraSettings] = useState<Record<string, boolean>>({});
    
    const [registeredStudents, setRegisteredStudents] = useState<{nama: string, kelas: string}[]>([]);
    const [registeredLoading, setRegisteredLoading] = useState(true);

    const fetchRegisteredStudents = useCallback(async () => {
        if (!activeTahunAjaran) return;
        setRegisteredLoading(true);
        const { data } = await supabase.from('profiles').select('nama, kelas, ekstra').not('ekstra', 'is', null).order('nama');
        
        const filtered = (data as Profile[] || [])
            .filter(p => p.ekstra?.[activeTahunAjaran.nama]?.includes(ekstra.nama))
            .map(p => ({ nama: p.nama, kelas: p.kelas }));

        setRegisteredStudents(filtered);
        setRegisteredLoading(false);
    }, [ekstra.nama, activeTahunAjaran]);

    useEffect(() => {
        const fetchEkstraSettings = async () => {
            const { data } = await supabase.from('ekstrakurikuler').select('nama, boleh_dobel');
            const settings = (data || []).reduce((acc: Record<string, boolean>, curr) => {
                acc[curr.nama] = curr.boleh_dobel;
                return acc;
            }, {});
            setEkstraSettings(settings);
        };
        fetchEkstraSettings();
        fetchRegisteredStudents();
    }, [ekstra.nama, fetchRegisteredStudents]);



    const handleSearchSiswa = useCallback(async (namaSiswa: string) => {
        if (!namaSiswa || status.loading || !activeTahunAjaran) return;
        setStatus({ loading: true, error: '', success: '', info: `Mencari ${namaSiswa}...` });
        setManualName(namaSiswa);
        setSearchResults([]);
        
        const { data, error } = await supabase.from('profiles').select('id, nama, kelas, ekstra').eq('nama', namaSiswa).single();
        const profile = data as Profile;

        if (error || !profile) {
            setStatus({ loading: false, error: `Siswa "${namaSiswa}" tidak ditemukan di database.`, success: '', info: '' }); return;
        }

        const currentEkstra = profile.ekstra?.[activeTahunAjaran.nama] || [];
        if (currentEkstra.includes(ekstra.nama)) {
            setStatus({ loading: false, error: `${profile.nama} sudah terdaftar di ${ekstra.nama} pada tahun ajaran ini.`, success: '', info: '' }); return;
        }
        if (currentEkstra.length >= 2) {
            setStatus({ loading: false, error: `${profile.nama} sudah terdaftar di 2 ekstra: ${currentEkstra.join(', ')}.`, success: '', info: '' }); return;
        }
        if (currentEkstra.length === 1) {
            const ekstraPertama = currentEkstra[0];
            if (!ekstraSettings[ekstraPertama] && !ekstraSettings[ekstra.nama]) {
                setStatus({ loading: false, error: `${profile.nama} sudah ikut ${ekstraPertama}. Pendaftaran ke ${ekstra.nama} gagal karena kedua ekstra tidak memperbolehkan pendaftaran ganda.`, success: '', info: '' }); return;
            }
        }
        setFoundProfile(profile);
        setStatus({ loading: false, error: '', success: '', info: '' });
    }, [status.loading, ekstra.nama, ekstraSettings, activeTahunAjaran]);
    
    useEffect(() => {
        if (mode !== 'manual' || !manualName) { setSearchResults([]); return; }
        setSearchLoading(true);
        const handler = setTimeout(async () => {
            const { data } = await supabase.from('profiles').select('id, nama, kelas, ekstra').ilike('nama', `%${manualName}%`).limit(10);
            setSearchResults((data as Profile[]) || []);
            setSearchLoading(false);
        }, 300);
        return () => clearTimeout(handler);
    }, [manualName, mode]);
    
    useEffect(() => {
        const Html5Qrcode = (window as any).Html5Qrcode;
        if (!foundProfile && mode === 'scan') {
            html5QrCodeRef.current = new Html5Qrcode("qr-reader-daftar");
            const startScanner = () => {
                if(html5QrCodeRef.current) {
                    html5QrCodeRef.current.start(
                        { facingMode: "environment" }, { fps: 5, qrbox: {width: 250, height: 250} }, 
                        (decodedText) => { if (html5QrCodeRef.current?.isScanning) { html5QrCodeRef.current.stop(); } handleSearchSiswa(decodedText); }, 
                        () => {}
                    ).catch(() => setStatus(s => ({...s, info: 'Kamera tidak ditemukan atau izin ditolak.'})));
                }
            };
            startScanner();
        }
        return () => { if (html5QrCodeRef.current?.isScanning) { html5QrCodeRef.current.stop().catch(() => {}); } };
    }, [mode, foundProfile, handleSearchSiswa]);

    const handleDaftarkanSiswa = async () => {
        if (!foundProfile || !activeTahunAjaran) return;
        setStatus({ loading: true, error: '', success: '', info: `Mendaftarkan ${foundProfile.nama}...` });
        const currentEkstra = foundProfile.ekstra?.[activeTahunAjaran.nama] || [];
        const newEkstraArray = [...currentEkstra, ekstra.nama];
        
        const updatedEkstraJson = {
            ...(foundProfile.ekstra || {}),
            [activeTahunAjaran.nama]: newEkstraArray
        };

        const { error } = await supabase.from('profiles').update({ ekstra: updatedEkstraJson }).eq('id', foundProfile.id);
        if (error) {
            setStatus({ loading: false, error: `Gagal mendaftarkan: ${error.message}`, success: '', info: '' });
        } else {
            setStatus({ loading: false, error: '', success: `Berhasil: ${foundProfile.nama} (${foundProfile.kelas}) telah didaftarkan ke ${ekstra.nama}.`, info: '' });
            fetchRegisteredStudents();
        }
        setFoundProfile(null);
        setManualName('');
    };

    const resetAll = () => {
        setFoundProfile(null);
        setManualName('');
        setStatus({ loading: false, error: '', success: '', info: 'Arahkan kamera ke QR code siswa.' });
    };

    return (
        <section className="bg-white p-6 rounded-xl shadow border space-y-4">
          <h2 className="text-center font-semibold">Daftarkan Siswa ke {ekstra.nama}</h2>
          <p className="text-center text-xs text-gray-500 -mt-2">Tahun Ajaran: {activeTahunAjaran?.nama}</p>
          {!foundProfile ? (
            <>
              <div className="flex justify-center bg-gray-100 rounded-md p-1 text-sm"><button onClick={() => setMode('scan')} className={`px-3 py-1 rounded w-full ${mode === 'scan' ? 'bg-white shadow' : ''}`}>Scan QR</button><button onClick={() => setMode('manual')} className={`px-3 py-1 rounded w-full ${mode === 'manual' ? 'bg-white shadow' : ''}`}>Input Manual</button></div>
              {mode === 'scan' ? ( <div id="qr-reader-daftar" className="w-full aspect-square max-w-sm mx-auto border bg-gray-100 rounded-lg overflow-hidden"></div> ) : (
                <div className="relative">
                  <input type="text" value={manualName} onChange={e => setManualName(e.target.value)} placeholder="Ketik nama lengkap siswa" required className="w-full border px-3 py-2 rounded text-sm" />
                  {searchLoading && <div className="absolute right-3 top-2.5 w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>}
                  {searchResults.length > 0 && (<div className="absolute w-full mt-1 bg-white border rounded-md shadow-lg z-10 max-h-48 overflow-y-auto">{searchResults.map(profile => (<div key={profile.id} onClick={() => handleSearchSiswa(profile.nama)} className="px-3 py-2 text-sm hover:bg-gray-100 cursor-pointer">{profile.nama} <span className="text-gray-400">({profile.kelas})</span></div>))}</div>)}
                </div>
              )}
            </>
          ) : (
            <div className="space-y-4 text-center">
              <p className="text-sm">Siswa ditemukan:</p>
              <div className="p-4 bg-gray-100 rounded-lg"><p className="font-bold text-lg">{foundProfile.nama}</p><p className="text-gray-600">{foundProfile.kelas}</p>{(foundProfile.ekstra?.[activeTahunAjaran?.nama || ''] || []).length > 0 && <p className="text-xs mt-1 text-blue-600">Ekstra saat ini: {(foundProfile.ekstra?.[activeTahunAjaran?.nama || ''] || []).join(', ')}</p>}</div>
              <button onClick={handleDaftarkanSiswa} disabled={status.loading} className="w-full bg-green-600 text-white py-2 rounded disabled:bg-gray-400">{status.loading ? 'Mendaftarkan...' : `Daftarkan ke ${ekstra.nama}`}</button>
            </div>
          )}
          <div className="text-center text-sm text-gray-500 h-4">{status.info}</div>
          {status.error && <div className="bg-red-100 border border-red-400 text-red-700 p-3 rounded text-center text-sm"><p>{status.error}</p></div>}
          {status.success && <div className="bg-green-100 border border-green-400 text-green-700 p-3 rounded text-center text-sm"><p className="font-semibold">{status.success}</p></div>}
          {(status.error || status.success || foundProfile) && <button onClick={resetAll} className="w-full bg-gray-500 text-white py-2 rounded mt-2">Cari Siswa Lain</button>}
          <button onClick={onBack} className="w-full bg-gray-200 text-sm rounded py-2 mt-2 hover:bg-gray-300 transition-colors">Kembali ke Pilihan</button>

          <div className="pt-4 border-t">
              <h3 className="font-semibold text-center text-base mb-2">Pendaftar {ekstra.nama} ({registeredStudents.length})</h3>
              {registeredLoading ? <div className="text-center py-4"><Spinner size="sm"/></div> :
              <div className="space-y-1 max-h-48 overflow-y-auto text-sm pr-2">{registeredStudents.map(s => <div key={s.nama} className="flex justify-between p-1.5 bg-gray-50 rounded"><span>{s.nama}</span><span className="text-gray-500">{s.kelas}</span></div>)}</div>}
          </div>
        </section>
    );
};

export default DaftarkanSiswaPage;