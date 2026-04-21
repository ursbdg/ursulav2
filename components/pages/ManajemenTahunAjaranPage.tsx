
import React, { useState, useEffect, useContext } from 'react';
import { supabase } from '../../services/supabase';
import { AppContext } from '../../contexts/AppContext';
import type { TahunAjaran } from '../../types';
import Spinner from '../shared/Spinner';

const ManajemenTahunAjaranPage: React.FC = () => {
    const { tahunAjaranList, activeTahunAjaran, setSelectedTahunAjaran } = useContext(AppContext)!;
    const [list, setList] = useState<TahunAjaran[]>([]);
    const [loading, setLoading] = useState(true);
    const [newTahunAjaranName, setNewTahunAjaranName] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);



    const fetchData = async () => {
        setLoading(true);
        const { data } = await supabase.from('tahun_ajaran').select('*').order('nama', { ascending: false });
        setList((data as TahunAjaran[]) || []);
        setLoading(false);
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleAddNew = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTahunAjaranName.trim() || isSubmitting) return;
        setIsSubmitting(true);
        const { data, error } = await supabase.from('tahun_ajaran').insert({ nama: newTahunAjaranName.trim() }).select().single();
        if (!error && data) {
            setList([data, ...list]);
            setNewTahunAjaranName('');
        } else {
            alert('Gagal menambahkan tahun ajaran baru. Mungkin nama sudah ada.');
        }
        setIsSubmitting(false);
    };

    const handleSetActive = async (idToActivate: number) => {
        if (isSubmitting) return;
        setIsSubmitting(true);
        
        // Deactivate current active
        if (activeTahunAjaran) {
            await supabase.from('tahun_ajaran').update({ is_active: false }).eq('id', activeTahunAjaran.id);
        }

        // Activate new one
        const { data, error } = await supabase.from('tahun_ajaran').update({ is_active: true }).eq('id', idToActivate).select().single();

        if (error) {
            alert('Gagal mengaktifkan tahun ajaran.');
        } else {
            await fetchData();
            setSelectedTahunAjaran(data as TahunAjaran);
        }
        setIsSubmitting(false);
    };

    return (
        <div className="bg-white p-4 sm:p-6 rounded-xl shadow border space-y-6">
            <h1 className="text-xl font-bold text-center">Manajemen Tahun Ajaran</h1>

            <form onSubmit={handleAddNew} className="p-4 border rounded-lg bg-gray-50 flex gap-4 items-center">
                <input
                    type="text"
                    value={newTahunAjaranName}
                    onChange={(e) => setNewTahunAjaranName(e.target.value)}
                    placeholder="Contoh: 2024/2025 Ganjil"
                    className="w-full border rounded-md px-3 py-2 text-sm"
                    required
                />
                <button type="submit" disabled={isSubmitting} className="bg-blue-600 text-white px-4 py-2 text-sm rounded-md hover:bg-blue-700 disabled:bg-gray-400 whitespace-nowrap">
                    {isSubmitting ? 'Menyimpan...' : 'Tambah Baru'}
                </button>
            </form>

            {loading ? (
                 <div className="text-center py-12"><Spinner /></div>
            ) : (
                <div className="space-y-2">
                    {list.map(ta => (
                        <div key={ta.id} className={`p-3 border rounded-lg flex justify-between items-center ${ta.is_active ? 'bg-green-50 border-green-300' : ''}`}>
                            <div className="font-medium text-sm">
                                {ta.nama}
                                {ta.is_active && <span className="text-xs ml-2 bg-green-200 text-green-800 px-2 py-0.5 rounded-full">Aktif</span>}
                            </div>
                            {!ta.is_active && (
                                <button onClick={() => handleSetActive(ta.id)} disabled={isSubmitting} className="bg-gray-200 text-xs px-3 py-1 rounded-md hover:bg-gray-300 disabled:opacity-50">
                                    Aktifkan
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ManajemenTahunAjaranPage;
