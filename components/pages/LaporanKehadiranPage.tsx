
import React, { useState, useEffect, useMemo, useCallback, useContext } from 'react';
import { supabase } from '../../services/supabase';
import { AppContext } from '../../contexts/AppContext';
import type { Profile, Presensi } from '../../types';
import Spinner from '../shared/Spinner';
import ConfirmationModal from '../shared/ConfirmationModal';

const LaporanKehadiranPage: React.FC = () => {
    const { selectedTahunAjaran, userRole } = useContext(AppContext)!;
    const [ekstraOptions, setEkstraOptions] = useState<string[]>([]);
    const [selectedEkstra, setSelectedEkstra] = useState<string>('');
    const [startDate, setStartDate] = useState(new Date(new Date().setDate(1)).toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
    
    const [loading, setLoading] = useState(false);
    const [presensiData, setPresensiData] = useState<Presensi[]>([]);
    const [masterList, setMasterList] = useState<Profile[]>([]);
    const [activeTab, setActiveTab] = useState<'matrix' | 'rekap'>('matrix');
    const [isHadirModalOpen, setHadirModalOpen] = useState(false);
    const [selectedSiswa, setSelectedSiswa] = useState<{ profileId: string; tanggal: string } | null>(null);
    const [showDebug, setShowDebug] = useState(false);

    const LIMIT = 50000;

    useEffect(() => {
        const fetchEkstraOptions = async () => {
            const { data } = await supabase.from('ekstrakurikuler').select('nama').order('nama');
            const options = (data || []).map(e => e.nama);
            setEkstraOptions(options);
            if (options.length > 0) {
                setSelectedEkstra(options[0]);
            }
        };
        fetchEkstraOptions();
    }, []);

    const handleFilter = useCallback(async () => {
        if (!selectedEkstra || !startDate || !endDate || !selectedTahunAjaran) {
            return;
        }
        setLoading(true);

        const { data: profilesData } = await supabase
            .from('profiles')
            .select('id, nama, kelas, ekstra')
            .not('ekstra', 'is', null)
            .limit(10000);
        
        const currentMasterList = (profilesData as Profile[] || [])
            .filter(p => p.ekstra?.[selectedTahunAjaran.nama]?.includes(selectedEkstra));
        setMasterList(currentMasterList);
        
        if (currentMasterList.length > 0) {
            const profileIds = currentMasterList.map(p => p.id);
            let allFetchedData: Presensi[] = [];
            let from = 0;
            let finished = false;

            while (!finished) {
                const { data: chunk, error: presensiError } = await supabase
                    .from('presensi')
                    .select('*')
                    .in('profile_id', profileIds)
                    .eq('ekstra', selectedEkstra)
                    .eq('tahun_ajaran_nama', selectedTahunAjaran.nama)
                    .gte('tanggal', startDate)
                    .lte('tanggal', endDate)
                    .order('tanggal', { ascending: true })
                    .range(from, from + 999);
                
                if (presensiError) {
                    console.error("Error fetching presensi chunk:", presensiError);
                    break;
                }

                if (chunk && chunk.length > 0) {
                    allFetchedData = [...allFetchedData, ...chunk];
                    if (chunk.length < 1000) {
                        finished = true;
                    } else {
                        from += 1000;
                    }
                } else {
                    finished = true;
                }

                // Safety break for very large datasets
                if (from >= LIMIT) {
                    console.warn("LIMIT reached in pagination fetch");
                    break;
                }
            }

            console.log(`DEBUG: Fetched TOTAL ${allFetchedData.length} rows for ${selectedEkstra} (${startDate} to ${endDate}). ProfileIds count: ${profileIds.length}`);
            setPresensiData(allFetchedData);
        } else {
            setPresensiData([]);
        }
        
        setLoading(false);
    }, [selectedEkstra, startDate, endDate, selectedTahunAjaran]);

    useEffect(() => {
        if (selectedEkstra && selectedTahunAjaran) {
            handleFilter();
        }
    }, [selectedEkstra, selectedTahunAjaran, handleFilter]);
    
    const { matrixData, meetingDates } = useMemo(() => {
        const dates = new Set<string>();
        presensiData.forEach(p => {
             if(p.waktu_presensi) dates.add(p.tanggal);
        });
        const sortedDates = Array.from(dates).sort();
        
        const matrix = masterList.map(student => {
            const attendanceByDate: Record<string, string> = {};
            sortedDates.forEach(date => {
                const record = presensiData.find(p => p.profile_id === student.id && p.tanggal === date);
                let status = 'Alpha';
                if (record) {
                    if (record.waktu_presensi) status = 'Hadir';
                    else if (record.catatan) status = record.catatan;
                }
                attendanceByDate[date] = status;
            });
            return { student, attendanceByDate };
        }).sort((a, b) => a.student.nama.localeCompare(b.student.nama));
        return { matrixData: matrix, meetingDates: sortedDates };
    }, [presensiData, masterList]);

    const rekapData = useMemo(() => {
        return masterList.map(student => {
            const studentRecords = presensiData.filter(p => p.profile_id === student.id);
            const hadir = studentRecords.filter(p => p.waktu_presensi).length;
            const sakit = studentRecords.filter(p => p.catatan === 'Sakit').length;
            const izin = studentRecords.filter(p => p.catatan === 'Izin').length;
            const totalPertemuan = meetingDates.length;
            const alpha = totalPertemuan > 0 ? totalPertemuan - hadir - sakit - izin : 0;
            const persentase = totalPertemuan > 0 ? (hadir / totalPertemuan) * 100 : 0;
            return { ...student, hadir, sakit, izin, alpha: alpha < 0 ? 0 : alpha, totalPertemuan, persentase };
        }).sort((a,b) => a.nama.localeCompare(b.nama));
    }, [presensiData, masterList, meetingDates]);

    const handleHadir = async () => {
        if (!selectedSiswa) return;
        setLoading(true);
        const { profileId, tanggal } = selectedSiswa;
        const existingRecord = presensiData.find(p => p.profile_id === profileId && p.tanggal === tanggal);
        if (existingRecord) {
            await supabase.from('presensi').delete().eq('id', existingRecord.id);
        }
        await handleFilter();
        setLoading(false);
        setHadirModalOpen(false);
        setSelectedSiswa(null);
    };

    const openHadirModal = (profileId: string, tanggal: string) => {
        setSelectedSiswa({ profileId, tanggal });
        setHadirModalOpen(true);
    };

    const getStatusInfo = (status: string) => {
        switch (status) {
            case 'Hadir': return { color: 'bg-green-100 text-green-800', short: 'H' };
            case 'Sakit': return { color: 'bg-red-100 text-red-800', short: 'S' };
            case 'Izin': return { color: 'bg-yellow-100 text-yellow-800', short: 'I' };
            case 'Tanpa Seragam': return { color: 'bg-blue-100 text-blue-800', short: 'H' };
            default: return { color: 'bg-gray-100 text-gray-800', short: 'A' };
        }
    };
    
    return (
        <>
        <div className="bg-white p-4 sm:p-6 rounded-xl shadow border space-y-6">
            <div className="text-center">
                <h1 className="text-xl font-bold">Laporan Kehadiran</h1>
                <p className="text-sm text-gray-500">Tahun Ajaran: {selectedTahunAjaran?.nama || 'Tidak dipilih'}</p>
            </div>
            
            <div className="p-4 border rounded-lg bg-gray-50 space-y-4 md:space-y-0 md:flex md:items-end md:gap-4">
                <div className="flex-1">
                    <label className="text-sm font-medium text-gray-700 block mb-1">Ekstrakurikuler</label>
                    <select value={selectedEkstra} onChange={e => setSelectedEkstra(e.target.value)} className="w-full border rounded px-3 py-2 text-sm bg-white">
                        {ekstraOptions.map(e => <option key={e} value={e}>{e}</option>)}
                    </select>
                </div>
                <div className="flex-1">
                    <label className="text-sm font-medium text-gray-700 block mb-1">Tanggal Mulai</label>
                    <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full border rounded px-3 py-2 text-sm"/>
                </div>
                <div className="flex-1">
                    <label className="text-sm font-medium text-gray-700 block mb-1">Tanggal Selesai</label>
                    <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full border rounded px-3 py-2 text-sm"/>
                </div>
                <button onClick={handleFilter} disabled={loading || !selectedTahunAjaran} className="w-full md:w-auto bg-blue-600 text-white px-4 py-2 text-sm rounded-md hover:bg-blue-700 disabled:bg-gray-400">
                    {loading ? 'Memuat...' : 'Terapkan Filter'}
                </button>
            </div>

            <div className="flex border-b">
                <button onClick={() => setActiveTab('matrix')} className={`px-4 py-2 text-sm font-medium ${activeTab === 'matrix' ? 'border-b-2 border-black' : 'text-gray-500'}`}>Log Kehadiran (Matrix)</button>
                <button onClick={() => setActiveTab('rekap')} className={`px-4 py-2 text-sm font-medium ${activeTab === 'rekap' ? 'border-b-2 border-black' : 'text-gray-500'}`}>Rekap Total Siswa</button>
                {userRole === 'koordinator' && (
                    <button onClick={() => setShowDebug(!showDebug)} className="ml-auto text-xs text-gray-400 hover:text-gray-600 px-4">Debug</button>
                )}
            </div>

            {showDebug && (
                <div className="p-3 bg-gray-900 text-green-400 font-mono text-[10px] rounded-lg overflow-auto max-h-40">
                    <p>-- DEBUG INFO --</p>
                    <p>Total Siswa Master: {masterList.length}</p>
                    <p>Total Data Presensi: {presensiData.length} {presensiData.length === LIMIT ? '(LIMIT REACHED!)' : ''}</p>
                    <p>Total Tgl Pertemuan: {meetingDates.length}</p>
                    <p>Range: {startDate} s/d {endDate}</p>
                    <p>Ekstra: {selectedEkstra}</p>
                </div>
            )}
            
            {presensiData.length === LIMIT && (
                <div className="bg-amber-50 border-l-4 border-amber-400 p-4 text-amber-700 text-sm">
                    <p className="font-bold">Peringatan: Data Terlalu Banyak</p>
                    <p>Sistem mencapai batas maksimal data ({LIMIT} baris). Laporan mungkin tidak akurat. Silakan perkecil rentang tanggal.</p>
                </div>
            )}
            
            {loading ? <div className="text-center py-12"><Spinner /></div> : 
                !selectedTahunAjaran ? <p className="text-center text-gray-500 py-12">Pilih tahun ajaran untuk melihat laporan.</p> :
                masterList.length === 0 ? <p className="text-center text-gray-500 py-12">Tidak ada siswa terdaftar di ekstrakurikuler ini pada tahun ajaran yang dipilih.</p> :
                activeTab === 'matrix' ? (
                    <div className="overflow-x-auto">
                        {meetingDates.length > 0 ? (
                        <table className="w-full border-collapse text-sm">
                            <thead>
                                <tr className="bg-gray-100">
                                    <th className="p-2 border font-semibold text-left sticky left-0 bg-gray-100 z-10 w-12">No</th>
                                    <th className="p-2 border font-semibold text-left sticky left-12 bg-gray-100 z-10 w-48">Nama Siswa</th>
                                    <th className="p-2 border font-semibold text-left sticky left-60 bg-gray-100 z-10 w-20">Kelas</th>
                                    {meetingDates.map(date => <th key={date} className="p-2 border font-semibold min-w-[100px]">{new Date(date + 'T00:00:00').toLocaleDateString('id-ID', {day:'2-digit', month:'short'})}</th>)}
                                    <th className="p-2 border font-semibold text-center">Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {matrixData.map(({ student, attendanceByDate }, index) => (
                                    <tr key={student.id} className="odd:bg-white even:bg-gray-50">
                                        <td className="p-2 border text-center font-medium sticky left-0 odd:bg-white even:bg-gray-50 z-10">{index + 1}</td>
                                        <td className="p-2 border font-medium sticky left-12 odd:bg-white even:bg-gray-50 z-10">{student.nama}</td>
                                        <td className="p-2 border sticky left-60 odd:bg-white even:bg-gray-50 z-10">{student.kelas}</td>
                                        {meetingDates.map(date => {
                                            const status = getStatusInfo(attendanceByDate[date]);
                                            const isTidakHadir = ['Sakit', 'Izin', 'Alpha'].includes(attendanceByDate[date]);
                                            return (
                                                <td key={date} className={`p-2 border text-center font-semibold text-xs ${status.color}`}>
                                                    {status.short}
                                                    {isTidakHadir && (
                                                        <button onClick={() => openHadirModal(student.id, date)} className="ml-2 text-xs bg-green-500 text-white rounded px-1 py-0.5 hover:bg-green-600">Hadir</button>
                                                    )}
                                                </td>
                                            )
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        ) : <p className="text-center text-gray-500 py-12">Tidak ada data pertemuan pada periode ini.</p>}
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse text-sm">
                           <thead>
                                <tr className="bg-gray-100">
                                    <th className="p-2 border font-semibold text-left">No</th>
                                    <th className="p-2 border font-semibold text-left">Nama Siswa</th>
                                    <th className="p-2 border font-semibold text-left">Kelas</th>
                                    <th className="p-2 border font-semibold text-center">Hadir</th>
                                    <th className="p-2 border font-semibold text-center">Izin</th>
                                    <th className="p-2 border font-semibold text-center">Sakit</th>
                                    <th className="p-2 border font-semibold text-center">Alpha</th>
                                    <th className="p-2 border font-semibold text-center">Total Pertemuan</th>
                                    <th className="p-2 border font-semibold text-center">Kehadiran</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rekapData.map((s, index) => (
                                     <tr key={s.id} className="odd:bg-white even:bg-gray-50">
                                        <td className="p-2 border text-center">{index + 1}</td>
                                        <td className="p-2 border">{s.nama}</td>
                                        <td className="p-2 border">{s.kelas}</td>
                                        <td className="p-2 border text-center font-medium">{s.hadir}</td>
                                        <td className="p-2 border text-center font-medium">{s.izin}</td>
                                        <td className="p-2 border text-center font-medium">{s.sakit}</td>
                                        <td className="p-2 border text-center font-medium">{s.alpha}</td>
                                        <td className="p-2 border text-center font-medium">{s.totalPertemuan}</td>
                                        <td className="p-2 border text-center font-bold">{Math.round(s.persentase)}%</td>
                                     </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )
            }
        </div>

        <ConfirmationModal
            isOpen={isHadirModalOpen}
            onClose={() => setHadirModalOpen(false)}
            onConfirm={handleHadir}
            title="Konfirmasi Kehadiran"
            message="Apakah Anda yakin ingin menandai siswa ini sebagai HADIR? Status sebelumnya akan dihapus."
            confirmText="Ya, Hadir"
            cancelText="Batal"
        />
        </>
    );
};

export default LaporanKehadiranPage;
