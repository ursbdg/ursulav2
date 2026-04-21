
import React, { useState, useEffect, useContext } from 'react';
import { supabase } from '../../services/supabase';
import type { Ekstrakurikuler, Profile } from '../../types';
import Spinner from '../shared/Spinner';
import { AppContext } from '../../contexts/AppContext';

interface ManajemenEkstraPageProps {
    onBack: () => void;
}

const ManajemenEkstraPage: React.FC<ManajemenEkstraPageProps> = ({ onBack }) => {
    const { selectedTahunAjaran } = useContext(AppContext)!;
    const [ekstraList, setEkstraList] = useState<Ekstrakurikuler[]>([]);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);



    const fetchEkstra = async () => {
        setLoading(true);
        const { data, error } = await supabase.from('ekstrakurikuler').select('*').order('nama');
        if (!error) setEkstraList(data);
        setLoading(false);
    };
    
    useEffect(() => {
        fetchEkstra();
    }, []);

    const handleToggle = async (ekstra: Ekstrakurikuler) => {
        if (updating) return;
        setUpdating(true);

        const newBolehDobel = !ekstra.boleh_dobel;
        setEkstraList(ekstraList.map(e => e.id === ekstra.id ? { ...e, boleh_dobel: newBolehDobel } : e));

        const { error } = await supabase.from('ekstrakurikuler').update({ boleh_dobel: newBolehDobel }).eq('id', ekstra.id);

        if (error) {
            setEkstraList(ekstraList.map(e => e.id === ekstra.id ? { ...e, boleh_dobel: !newBolehDobel } : e));
            alert('Gagal memperbarui data.');
        } else if (!newBolehDobel) {
            alert('Aturan diperbarui. Sistem akan menghapus ekstra kedua dari siswa yang terdampak. Proses ini mungkin memakan waktu beberapa saat.');
            
            if (!selectedTahunAjaran) {
                alert('Pilih tahun ajaran terlebih dahulu.');
                setEkstraList(ekstraList.map(e => e.id === ekstra.id ? { ...e, boleh_dobel: !newBolehDobel } : e)); // revert UI change
                setUpdating(false);
                return;
            }

            const { data: profilesToUpdate, error: fetchError } = await supabase
                .from('profiles')
                .select('id, ekstra')
                .not('ekstra', 'is', null);
            
            if (!fetchError && profilesToUpdate) {
                const updates = (profilesToUpdate as Profile[])
                    .filter(p => {
                        const pEkstra = p.ekstra?.[selectedTahunAjaran.nama] || [];
                        return pEkstra.includes(ekstra.nama) && pEkstra.length > 1;
                    })
                    .map(p => {
                        const pEkstra = p.ekstra?.[selectedTahunAjaran.nama] || [];
                        // Keep the first extra from the list of remaining extras (after removing the one being toggled)
                        const remainingEkstra = pEkstra.filter(e => e !== ekstra.nama);
                        const updatedEkstraForTA = remainingEkstra.length > 0 ? [remainingEkstra[0]] : [];
                        
                        const updatedEkstraJson = {
                            ...(p.ekstra || {}),
                            [selectedTahunAjaran.nama]: updatedEkstraForTA
                        };
                        return supabase.from('profiles').update({ ekstra: updatedEkstraJson }).eq('id', p.id);
                    });
                
                await Promise.all(updates);
                alert('Pembaruan data siswa selesai.');
            }
        }
        setUpdating(false);
    };

    return (
        <div className="bg-white p-4 sm:p-6 rounded-xl shadow border space-y-4">
            <h2 className="text-lg font-semibold">Manajemen Ekstrakurikuler</h2>
            <p className="text-sm text-gray-600">Aktifkan toggle untuk mengizinkan anggota ekstrakurikuler tersebut dapat memilih ekstra kedua.</p>
            {loading ? <div className="text-center py-8"><Spinner /></div> : (
                <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
                    {ekstraList.map(ekstra => (
                        <div key={ekstra.id} className="p-3 border rounded-lg flex justify-between items-center">
                            <span className="font-medium text-sm">{ekstra.nama}</span>
                            <button disabled={updating} onClick={() => handleToggle(ekstra)} className={`w-12 h-6 rounded-full flex items-center transition-colors ${ekstra.boleh_dobel ? 'bg-blue-600 justify-end' : 'bg-gray-300 justify-start'} disabled:opacity-50`}>
                                <span className="h-5 w-5 bg-white rounded-full shadow transform transition-transform mx-0.5"></span>
                            </button>
                        </div>
                    ))}
                </div>
            )}
            <button onClick={onBack} className="w-full bg-gray-200 text-sm rounded py-2 mt-4 hover:bg-gray-300 transition-colors">Kembali</button>
        </div>
    );
};

export default ManajemenEkstraPage;
