
import React, { useState, useEffect, useContext } from 'react';
import { supabase } from '../../services/supabase';
import { AppContext } from '../../contexts/AppContext';
import EkstraPieChart from '../shared/EkstraPieChart';
import Spinner from '../shared/Spinner';
import type { Profile } from '../../types';

interface SummaryData {
    name: string;
    count: number;
}

const RingkasanPage: React.FC = () => {
    const { selectedTahunAjaran } = useContext(AppContext)!;
    const [summaryData, setSummaryData] = useState<SummaryData[]>([]);
    const [loading, setLoading] = useState(true);



    useEffect(() => {
        const fetchSummaryData = async () => {
            if (!selectedTahunAjaran) {
                setSummaryData([]);
                setLoading(false);
                return;
            };

            setLoading(true);
            const { data, error } = await supabase.from('profiles').select('ekstra');
            
            if (error || !data) {
                setLoading(false);
                return;
            }

            const counts: { [key: string]: number } = {};
            (data as Profile[]).forEach(profile => {
                const ekstras = profile.ekstra?.[selectedTahunAjaran.nama] || [];
                ekstras.forEach(ekstraName => {
                    counts[ekstraName] = (counts[ekstraName] || 0) + 1;
                });
            });

            const formattedData = Object.entries(counts)
                .map(([name, count]) => ({ name, count }))
                .sort((a, b) => b.count - a.count);

            setSummaryData(formattedData);
            setLoading(false);
        };

        fetchSummaryData();
    }, [selectedTahunAjaran]);

    return (
        <div className="bg-white p-4 sm:p-6 rounded-xl shadow border space-y-6">
            <div className="text-center">
                <h1 className="text-xl font-bold">Ringkasan Peserta Ekstrakurikuler</h1>
                <p className="text-sm text-gray-500">Tahun Ajaran: {selectedTahunAjaran?.nama || 'Tidak dipilih'}</p>
            </div>
            
            {loading ? (
                <div className="flex justify-center items-center h-96">
                    <Spinner size="lg" />
                </div>
            ) : summaryData.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                    <div className="max-w-md mx-auto w-full">
                        <EkstraPieChart chartData={summaryData} />
                    </div>
                    <div className="overflow-x-auto border rounded-lg">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-100">
                                <tr>
                                    <th className="p-3 text-left font-semibold">No</th>
                                    <th className="p-3 text-left font-semibold">Nama Ekstrakurikuler</th>
                                    <th className="p-3 text-left font-semibold">Jumlah Peserta</th>
                                </tr>
                            </thead>
                            <tbody>
                                {summaryData.map((item, index) => (
                                    <tr key={item.name} className="border-t">
                                        <td className="p-3">{index + 1}</td>
                                        <td className="p-3 font-medium">{item.name}</td>
                                        <td className="p-3 font-medium">{item.count}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <p className="text-center text-gray-500 py-12">
                    {selectedTahunAjaran ? 'Tidak ada data peserta untuk ditampilkan pada tahun ajaran ini.' : 'Silakan pilih tahun ajaran untuk melihat ringkasan.'}
                </p>
            )}
        </div>
    );
};

export default RingkasanPage;
