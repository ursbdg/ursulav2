import React, { useState, useEffect, useMemo, useContext, useRef } from 'react';
import { supabase } from '../../services/supabase';
import { AppContext } from '../../contexts/AppContext';
import type { Profile, TahunAjaran } from '../../types';
import Spinner from '../shared/Spinner';
import Icon from '../shared/Icon';

interface ImporSiswaPageProps {
    onBack: () => void;
}

type PreviewData = {
    nama: string;
    kelas: string;
    status: 'Ditemukan' | 'Tidak Ditemukan' | 'Tidak Ada Perubahan';
    ekstraLama: string[];
    ekstraBaru: string[];
    profileId?: string;
};

const ImporSiswaPage: React.FC<ImporSiswaPageProps> = ({ onBack }) => {
    const { selectedTahunAjaran } = useContext(AppContext)!;
    const [allProfiles, setAllProfiles] = useState<Profile[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [importStatus, setImportStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
    const [previewData, setPreviewData] = useState<PreviewData[] | null>(null);
    const [pastedText, setPastedText] = useState('');



    const fetchAllProfiles = async () => {
        const { data } = await supabase.from('profiles').select('*');
        setAllProfiles((data as Profile[]) || []);
    };

    useEffect(() => {
        fetchAllProfiles();
    }, []);

    const handlePreviewFromText = () => {
        if (!pastedText.trim() || !selectedTahunAjaran) {
            if (!selectedTahunAjaran) {
                setImportStatus({ type: 'error', message: 'Silakan pilih tahun ajaran terlebih dahulu.' });
            }
            return;
        }

        setIsProcessing(true);
        setImportStatus(null);
        setPreviewData(null);

        try {
            const text = pastedText;
            const lines = text.split(/\r\n|\n/).filter(line => line.trim() !== '');
            if (lines.length === 0) throw new Error("Tidak ada data untuk diproses.");

            const headerLine = lines[0].includes('nama') ? lines.shift()! : 'nama,kelas,ekstra_1,ekstra_2';
            const header = headerLine.split(',').map(h => h.trim().replace(/"/g, ''));
            const nameIndex = header.indexOf('nama');
            if (nameIndex === -1) throw new Error("Kolom 'nama' tidak ditemukan. Pastikan header disertakan atau formatnya benar.");

            const data = lines;
            const profilesMap: Map<string, Profile> = new Map(allProfiles.map(p => [p.nama, p]));
            
            const parsedData: PreviewData[] = data.map(line => {
                const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
                const nama = values[nameIndex];
                const profile = profilesMap.get(nama);
                
                if (!profile) {
                    return { nama, kelas: 'N/A', status: 'Tidak Ditemukan', ekstraLama: [], ekstraBaru: [] };
                }

                const ekstra1 = values[header.indexOf('ekstra_1')] || '';
                const ekstra2 = values[header.indexOf('ekstra_2')] || '';
                const ekstraBaru = [ekstra1, ekstra2].filter(Boolean);
                const ekstraLama = profile.ekstra?.[selectedTahunAjaran.nama] || [];

                const isSame = ekstraLama.length === ekstraBaru.length && ekstraLama.every(e => ekstraBaru.includes(e));
                
                return {
                    nama: profile.nama,
                    kelas: profile.kelas,
                    status: isSame ? 'Tidak Ada Perubahan' : 'Ditemukan',
                    ekstraLama,
                    ekstraBaru,
                    profileId: profile.id
                };
            });
            
            setPreviewData(parsedData);
        } catch (error: any) {
            setImportStatus({ type: 'error', message: error.message });
        } finally {
            setIsProcessing(false);
        }
    };

    const handleConfirmImport = async () => {
        if (!previewData || !selectedTahunAjaran) return;
        setIsProcessing(true);

        const dataToUpdate = previewData.filter(p => p.status === 'Ditemukan' && p.profileId);
        
        try {
            const updatePromises = dataToUpdate.map(item => {
                const profileToUpdate = allProfiles.find(p => p.id === item.profileId);
                const updatedEkstraJson = {
                    ...(profileToUpdate?.ekstra || {}),
                    [selectedTahunAjaran.nama]: item.ekstraBaru
                };
                return supabase.from('profiles').update({ ekstra: updatedEkstraJson }).eq('id', item.profileId!);
            });

            await Promise.all(updatePromises);
            
            const notFoundCount = previewData.filter(p => p.status === 'Tidak Ditemukan').length;
            let message = `Impor berhasil! ${dataToUpdate.length} data siswa diperbarui.`;
            if (notFoundCount > 0) message += ` ${notFoundCount} nama tidak ditemukan.`;
            
            setImportStatus({ type: 'success', message });
            handleCancelImport();
            await fetchAllProfiles();
        } catch (error: any) {
             setImportStatus({ type: 'error', message: 'Terjadi kesalahan saat menyimpan data.' });
        } finally {
            setIsProcessing(false);
        }
    };
    
    const handleCancelImport = () => {
        setPreviewData(null);
        setPastedText(''); // <-- THIS IS THE FIX
    };

    const importSummary = useMemo(() => {
        if (!previewData) return { toUpdate: 0, notFound: 0, noChange: 0 };
        return {
            toUpdate: previewData.filter(p => p.status === 'Ditemukan').length,
            notFound: previewData.filter(p => p.status === 'Tidak Ditemukan').length,
            noChange: previewData.filter(p => p.status === 'Tidak Ada Perubahan').length,
        }
    }, [previewData]);

    return (
        <div className="bg-white p-4 sm:p-6 rounded-xl shadow border space-y-4">
            <h2 className="text-xl font-bold text-center">Impor Data Ekstra Siswa</h2>
            <p className="text-sm text-gray-500 text-center -mt-2">Tahun Ajaran: <span className="font-semibold">{selectedTahunAjaran?.nama || 'Tidak dipilih'}</span></p>
            
            {!previewData ? (
                <div className="p-4 border rounded-lg bg-gray-50 space-y-3">
                    <div className="text-sm text-gray-700 space-y-1">
                        <p className="font-semibold">Salin data dari spreadsheet (misal: Excel, Google Sheets) dan tempel di bawah.</p>
                        <p className="text-xs">Pastikan urutan kolom adalah: <code className="bg-gray-200 px-1 py-0.5 rounded">nama</code>, <code className="bg-gray-200 px-1 py-0.5 rounded">kelas</code>, <code className="bg-gray-200 px-1 py-0.5 rounded">ekstra_1</code>, <code className="bg-gray-200 px-1 py-0.5 rounded">ekstra_2</code>. Baris header bersifat opsional.</p>
                    </div>
                    <textarea
                        value={pastedText}
                        onChange={(e) => setPastedText(e.target.value)}
                        placeholder={'Contoh:\n"Agnes","7A","Pramuka","Band"\n"Budi","7B","Futsal",'}
                        className="w-full h-48 p-2 border rounded font-mono text-xs bg-white"
                        disabled={isProcessing}
                    />
                    <button 
                        onClick={handlePreviewFromText} 
                        disabled={!selectedTahunAjaran || !pastedText.trim() || isProcessing}
                        className="w-full bg-blue-600 text-white py-2 rounded-lg flex items-center justify-center gap-2 text-base font-semibold hover:bg-blue-700 transition-colors disabled:bg-gray-400"
                    >
                        {isProcessing ? <Spinner size="sm" /> : <Icon name="search" />}
                        {isProcessing ? 'Memproses...' : 'Pratinjau Data'}
                    </button>
                    {importStatus && (
                        <div className={`mt-3 p-3 text-sm rounded-lg ${importStatus.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {importStatus.message}
                        </div>
                    )}
                </div>
            ) : (
                <div className="p-4 border rounded-lg bg-gray-50 space-y-3">
                    <p className="text-sm font-semibold">Pratinjau Impor Data</p>
                    <div className="flex gap-2 text-xs flex-wrap">
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full">{importSummary.toUpdate} akan diubah</span>
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full">{importSummary.noChange} tidak ada perubahan</span>
                        <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full">{importSummary.notFound} tidak ditemukan</span>
                    </div>
                    <div className="max-h-60 overflow-y-auto border bg-white rounded-md">
                        <table className="w-full text-xs">
                            <thead className="bg-gray-100 sticky top-0">
                                <tr>
                                    <th className="p-2 text-left">Nama Siswa</th>
                                    <th className="p-2 text-left">Ekstra Saat Ini</th>
                                    <th className="p-2 text-left">Ekstra Baru (Data Ditempel)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {previewData.map((item, idx) => (
                                    <tr key={idx} className={`border-t ${item.status === 'Tidak Ditemukan' ? 'bg-red-50 text-red-600' : ''} ${item.status === 'Tidak Ada Perubahan' ? 'text-gray-400' : ''}`}>
                                        <td className="p-2 font-medium">{item.nama} <span className="font-normal">({item.kelas})</span></td>
                                        <td className="p-2">{item.ekstraLama.join(', ') || '-'}</td>
                                        <td className="p-2 font-semibold text-blue-700">{item.ekstraBaru.join(', ') || '-'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="grid grid-cols-2 gap-3 pt-2">
                        <button onClick={handleConfirmImport} disabled={isProcessing || importSummary.toUpdate === 0} className="w-full bg-green-600 text-white py-2 rounded flex items-center justify-center gap-2 text-sm hover:bg-green-700 transition-colors disabled:bg-gray-400">
                            {isProcessing ? <Spinner size="sm" /> : <Icon name="check" />}
                            Konfirmasi & Impor
                        </button>
                        <button onClick={handleCancelImport} disabled={isProcessing} className="w-full bg-gray-500 text-white py-2 rounded flex items-center justify-center gap-2 text-sm hover:bg-gray-600 transition-colors disabled:opacity-50">
                            <Icon name="edit-3" /> Ubah Data
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ImporSiswaPage;
