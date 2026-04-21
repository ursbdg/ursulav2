import React, { useState, useEffect, useMemo, useContext } from 'react';
import { supabase } from '../../services/supabase';
import { AppContext } from '../../contexts/AppContext';
import type { Profile, TahunAjaran, Ekstrakurikuler } from '../../types';
import Spinner from '../shared/Spinner';
import Icon from '../shared/Icon';

interface MasterDataPageProps {
    onBack: () => void;
}

const ProfileList = ({ profiles, editingProfileId, startEditing, setEditingProfileId, ekstraSettings, handleSaveEkstra, selectedTahunAjaran, ekstraOptions }: {
    profiles: Profile[];
    editingProfileId: string | null;
    startEditing: (id: string) => void;
    setEditingProfileId: (id: string | null) => void;
    ekstraSettings: Record<string, boolean>;
    handleSaveEkstra: (profileId: string, newName: string, newClass: string, tempEkstra: string[]) => Promise<void>;
    selectedTahunAjaran: TahunAjaran | null;
    ekstraOptions: Ekstrakurikuler[];
}) => {
    const [tempEkstra, setTempEkstra] = useState<string[]>([]);
    const [tempNama, setTempNama] = useState('');
    const [tempKelas, setTempKelas] = useState('');


    if (!selectedTahunAjaran) {
        return <p className="text-center text-sm text-gray-500 py-4">Pilih tahun ajaran untuk melihat data.</p>;
    }

    const startEditWrapper = (profile: Profile) => {
        setTempEkstra(profile.ekstra?.[selectedTahunAjaran.nama] || []);
        setTempNama(profile.nama);
        setTempKelas(profile.kelas);
        startEditing(profile.id);
    };
    
    const handleTempAddEkstra = (newEkstra: string) => {
        if (newEkstra && !tempEkstra.includes(newEkstra)) {
            setTempEkstra([...tempEkstra, newEkstra]);
        }
    };
    
    const handleTempRemoveEkstra = (ekstraToRemove: string) => {
        setTempEkstra(tempEkstra.filter(e => e !== ekstraToRemove));
    };

    const onSave = async (profileId: string) => {
        await handleSaveEkstra(profileId, tempNama, tempKelas, tempEkstra);
    }
    
    return (
        <div className="space-y-2 max-h-80 overflow-y-auto pr-2">
            {profiles.length > 0 ? profiles.map((p: Profile) => {
                const isEditingThis = editingProfileId === p.id;
                const currentEkstraForTA = p.ekstra?.[selectedTahunAjaran.nama] || [];
                const displayEkstra = isEditingThis ? tempEkstra : currentEkstraForTA;
                const canAddMore = displayEkstra.length === 1 && ekstraSettings[displayEkstra[0]];

                return (
                    <div key={p.id} className="p-3 border rounded-lg bg-gray-50 text-sm">
                        <div className="flex justify-between items-center">
                            <div>
                                <p className="font-semibold">{p.nama} <span className="text-xs font-normal text-gray-500 bg-gray-200 px-1.5 py-0.5 rounded-full">{p.kelas || 'N/A'}</span></p>
                            </div>
                            {!isEditingThis && <button onClick={() => startEditWrapper(p)} className="bg-gray-200 hover:bg-gray-300 px-2 py-1 rounded text-xs">Ubah</button>}
                        </div>
                        
                        {isEditingThis && (
                            <div className="mt-2 space-y-2 border-t pt-2">
                                <div className='space-y-1'>
                                    <label className='text-xs font-medium'>Nama</label>
                                    <input type='text' value={tempNama} onChange={(e) => setTempNama(e.target.value)} className='w-full border rounded px-2 py-1 text-sm bg-white' />
                                </div>
                                <div className='space-y-1'>
                                    <label className='text-xs font-medium'>Kelas</label>
                                    <input type='text' value={tempKelas} onChange={(e) => setTempKelas(e.target.value)} className='w-full border rounded px-2 py-1 text-sm bg-white' />
                                </div>
                                <h4 className='text-xs font-medium pt-2'>Ekstrakurikuler</h4>
                                {displayEkstra.map(e => (
                                    <div key={e} className="flex justify-between items-center bg-white p-1.5 rounded">
                                        <span>{e}</span>
                                        <button onClick={() => handleTempRemoveEkstra(e)} className="text-red-500 hover:text-red-700 p-1"><Icon name="x" className="w-4 h-4" /></button>
                                    </div>
                                ))}

                                {(displayEkstra.length === 0 || canAddMore || displayEkstra.length < 1) && (
                                    <select onChange={(e) => handleTempAddEkstra(e.target.value)} value="" className="w-full border rounded px-2 py-1 text-sm bg-white border-blue-300">
                                        <option value="" disabled>+ Tambah Ekstra</option>
                                        {ekstraOptions.map(e => <option key={e.id} value={e.nama}>{e.nama}</option>).filter(item => !displayEkstra.includes(item.props.value))}
                                    </select>
                                )}
                                <div className="flex gap-2 pt-1">
                                    <button onClick={() => onSave(p.id)} className="w-full bg-blue-600 text-white text-xs py-1 rounded hover:bg-blue-700">Simpan</button>
                                    <button onClick={() => setEditingProfileId(null)} className="w-full bg-gray-200 text-gray-800 text-xs py-1 rounded hover:bg-gray-300">Batal</button>
                                </div>
                            </div>
                        )}
                    </div>
                );
            }) : <p className="text-center text-sm text-gray-500 py-4">Tidak ada data siswa yang cocok.</p>}
        </div>
    );
};


const MasterDataPage: React.FC<MasterDataPageProps> = ({ onBack }) => {
    const { selectedTahunAjaran } = useContext(AppContext)!;
    const [allProfiles, setAllProfiles] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingProfileId, setEditingProfileId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState('ekstra');
    const [kelasOptions, setKelasOptions] = useState<string[]>([]);
    const [selectedEkstra, setSelectedEkstra] = useState('');
    const [selectedKelas, setSelectedKelas] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [ekstraSettings, setEkstraSettings] = useState<Record<string, boolean>>({});
    
    const [ekstraOptions, setEkstraOptions] = useState<Ekstrakurikuler[]>([]);
    const [showAddForm, setShowAddForm] = useState(false);
    const [newStudentName, setNewStudentName] = useState('');
    const [newStudentClass, setNewStudentClass] = useState('');
    const [isAdding, setIsAdding] = useState(false);
    const [copied, setCopied] = useState(false);

    const fetchData = async () => {
        setLoading(true);
        const [profilesRes, ekstraRes] = await Promise.all([
            supabase.from('profiles').select('*').order('nama', { ascending: true }).limit(10000),
            supabase.from('ekstrakurikuler').select('*')
        ]);
        const profiles = (profilesRes.data as Profile[]) || [];
        setAllProfiles(profiles);
        const uniqueKelas = [...new Set(profiles.map(p => p.kelas).filter(Boolean))].sort();
        setKelasOptions(uniqueKelas);
        const settings = (ekstraRes.data || []).reduce((acc, curr) => {
            acc[curr.nama] = curr.boleh_dobel;
            return acc;
        }, {} as Record<string, boolean>);
        setEkstraSettings(settings);
        setEkstraOptions(ekstraRes.data || []);
        setLoading(false);
    };

    useEffect(() => {
        fetchData();
    }, []);
    
    const filteredProfiles = useMemo(() => {
        if (!selectedTahunAjaran) return [];
        let result = allProfiles;
        const getEkstraForTA = (p: Profile) => p.ekstra?.[selectedTahunAjaran.nama] || [];
        if (activeTab === 'belum-daftar') {
            result = allProfiles.filter(p => getEkstraForTA(p).length === 0);
            if (selectedKelas) result = result.filter(p => p.kelas === selectedKelas);
        } else if (activeTab === 'ekstra') {
            if (selectedEkstra) result = allProfiles.filter(p => getEkstraForTA(p).includes(selectedEkstra));
        } else if (activeTab === 'kelas') {
            if (selectedKelas) result = allProfiles.filter(p => p.kelas === selectedKelas);
        } else if (activeTab === 'nama') {
            if (searchTerm) result = allProfiles.filter(p => p.nama.toLowerCase().includes(searchTerm.toLowerCase()));
            else result = [];
        }
        return result;
    }, [allProfiles, activeTab, selectedEkstra, selectedKelas, searchTerm, selectedTahunAjaran]);



    const handleSaveEkstra = async (profileId: string, newName: string, newClass: string, tempEkstra: string[]) => {
        if (!selectedTahunAjaran || !newName || !newClass) {
            alert('Nama dan Kelas tidak boleh kosong.');
            return;
        }
        
        const profileToUpdate = allProfiles.find(p => p.id === profileId);
        if (!profileToUpdate) return;

        const updatedEkstraJson = {
            ...(profileToUpdate.ekstra || {}),
            [selectedTahunAjaran.nama]: tempEkstra
        };
        
        await supabase.from('profiles').update({ nama: newName, kelas: newClass, ekstra: updatedEkstraJson }).eq('id', profileId);
        setAllProfiles(allProfiles.map(p => p.id === profileId ? { ...p, nama: newName, kelas: newClass, ekstra: updatedEkstraJson } : p));
        setEditingProfileId(null);
    };

    const handleDownloadTemplate = () => {
        if (!selectedTahunAjaran) {
            alert("Pilih tahun ajaran terlebih dahulu.");
            return;
        }
        const headers = "nama,kelas,ekstra_1,ekstra_2";
        const rows = allProfiles.map(p => {
            const currentEkstra = p.ekstra?.[selectedTahunAjaran.nama] || [];
            const row = [`"${p.nama}"`, `"${p.kelas}"`, `"${currentEkstra[0] || ''}"`, `"${currentEkstra[1] || ''}"`];
            return row.join(',');
        });
        const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].join("\r\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `template_ekstra_${selectedTahunAjaran.nama.replace(/\//g, '-')}.csv`);
        document.body.appendChild(link);
        link.click();
        if (link.parentNode) {
            link.parentNode.removeChild(link);
        }
    };

    const handleAddStudent = async () => {
        if (!newStudentName || !newStudentClass) {
            alert('Nama dan Kelas siswa tidak boleh kosong.');
            return;
        }
        setIsAdding(true);
        const { data, error } = await supabase.from('profiles').insert({ nama: newStudentName, kelas: newStudentClass, ekstra: {} }).select().single();
        if (error) {
            alert('Gagal menambahkan siswa: ' + error.message);
        } else if (data) {
            setAllProfiles([data, ...allProfiles]);
            setNewStudentName('');
            setNewStudentClass('');
            setShowAddForm(false);
        }
        setIsAdding(false);
    };

    const getFilteredDataForExport = () => {
        if (!selectedTahunAjaran) return null;
        
        let data: { nama: string; kelas: string; ekstra: string }[] = [];
        let filename = "";

        if (activeTab === 'ekstra') {
            filename = `data_siswa_ekstra_${selectedEkstra || 'semua'}_${selectedTahunAjaran.nama.replace(/\//g, '-')}.csv`;
            if (selectedEkstra) {
                data = filteredProfiles.map(p => ({
                    nama: p.nama,
                    kelas: p.kelas,
                    ekstra: selectedEkstra
                }));
            } else {
                // All extras - duplicate students if they have 2
                allProfiles.forEach(p => {
                    const extras = p.ekstra?.[selectedTahunAjaran.nama] || [];
                    if (extras.length > 0) {
                        extras.forEach(e => {
                            data.push({
                                nama: p.nama,
                                kelas: p.kelas,
                                ekstra: e
                            });
                        });
                    } else {
                        data.push({
                            nama: p.nama,
                            kelas: p.kelas,
                            ekstra: '-'
                        });
                    }
                });
            }
        } else if (activeTab === 'kelas') {
            filename = `data_siswa_kelas_${selectedKelas || 'semua'}_${selectedTahunAjaran.nama.replace(/\//g, '-')}.csv`;
            data = filteredProfiles.map(p => ({
                nama: p.nama,
                kelas: p.kelas,
                ekstra: (p.ekstra?.[selectedTahunAjaran.nama] || []).join('; ')
            }));
        } else if (activeTab === 'belum-daftar') {
            filename = `siswa_belum_daftar_${selectedKelas || 'semua'}_${selectedTahunAjaran.nama.replace(/\//g, '-')}.csv`;
            data = filteredProfiles.map(p => ({
                nama: p.nama,
                kelas: p.kelas,
                ekstra: 'Belum Daftar'
            }));
        } else {
            filename = `data_siswa_cari_${searchTerm || 'semua'}_${selectedTahunAjaran.nama.replace(/\//g, '-')}.csv`;
            data = filteredProfiles.map(p => ({
                nama: p.nama,
                kelas: p.kelas,
                ekstra: (p.ekstra?.[selectedTahunAjaran.nama] || []).join('; ')
            }));
        }
        return { data, filename };
    };

    const handleDownloadFiltered = () => {
        const exportData = getFilteredDataForExport();
        if (!exportData) {
            alert("Pilih tahun ajaran terlebih dahulu.");
            return;
        }
        
        const { data, filename } = exportData;

        if (data.length === 0) {
            alert("Tidak ada data untuk diunduh.");
            return;
        }

        const headers = "Nama,Kelas,Ekstrakurikuler";
        const rows = data.map(item => `"${item.nama}","${item.kelas}","${item.ekstra}"`);
        const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].join("\r\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", filename);
        document.body.appendChild(link);
        link.click();
        if (link.parentNode) {
            link.parentNode.removeChild(link);
        }
    };

    const handleCopyFiltered = () => {
        const exportData = getFilteredDataForExport();
        if (!exportData) {
            alert("Pilih tahun ajaran terlebih dahulu.");
            return;
        }
        
        const { data } = exportData;

        if (data.length === 0) {
            alert("Tidak ada data untuk disalin.");
            return;
        }

        const textToCopy = data.map(item => `${item.nama}\t${item.kelas}\t${item.ekstra}`).join('\n');
        navigator.clipboard.writeText(textToCopy).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    return (
        <div className="bg-white p-4 sm:p-6 rounded-xl shadow border space-y-4">
            <h2 className="text-lg font-semibold">Kelola Data Siswa</h2>
            <p className="text-sm text-gray-500 -mt-2">Tahun Ajaran: <span className="font-semibold">{selectedTahunAjaran?.nama || 'Tidak dipilih'}</span></p>

            <div className="p-4 border rounded-lg bg-gray-50 space-y-3">
                <div className="flex justify-between items-center">
                    <h3 className="text-sm font-semibold">Tambah Siswa Baru</h3>
                    <button onClick={() => setShowAddForm(!showAddForm)} className='bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center'>
                        <Icon name={showAddForm ? 'minus' : 'plus'} className='w-4 h-4' />
                    </button>
                </div>
                {showAddForm && (
                    <div className='space-y-2 pt-2 border-t'>
                        <input type='text' placeholder='Nama Lengkap Siswa' value={newStudentName} onChange={(e) => setNewStudentName(e.target.value)} className='w-full border rounded px-3 py-2 text-sm' />
                        <input type='text' placeholder='Kelas (e.g. 7A)' value={newStudentClass} onChange={(e) => setNewStudentClass(e.target.value)} className='w-full border rounded px-3 py-2 text-sm' />
                        <button onClick={handleAddStudent} disabled={isAdding} className='w-full bg-blue-600 text-white py-2 rounded text-sm hover:bg-blue-700 disabled:bg-gray-400'>
                            {isAdding ? 'Menambahkan...' : 'Simpan Siswa'}
                        </button>
                    </div>
                )}
            </div>

            <div className="p-4 border rounded-lg bg-gray-50 space-y-3">
                <h3 className="text-sm font-semibold">Ekspor Data Ekstra</h3>
                <p className="text-xs text-gray-600">Unduh data ekstrakurikuler semua siswa pada tahun ajaran yang dipilih dalam format CSV. File ini dapat diedit dan diunggah kembali melalui menu "Impor Siswa".</p>
                <button onClick={handleDownloadTemplate} disabled={!selectedTahunAjaran || allProfiles.length === 0} className="w-full bg-green-600 text-white py-2 rounded flex items-center justify-center gap-2 text-sm hover:bg-green-700 transition-colors disabled:bg-gray-400">
                    <Icon name="download" />Download Template (CSV)
                </button>
            </div>

            <div className="flex border-b text-sm overflow-x-auto">
                <button onClick={() => setActiveTab('ekstra')} className={`px-3 py-2 font-medium whitespace-nowrap ${activeTab === 'ekstra' ? 'border-b-2 border-black text-black' : 'text-gray-500'}`}>Per Ekstra</button>
                <button onClick={() => setActiveTab('kelas')} className={`px-3 py-2 font-medium whitespace-nowrap ${activeTab === 'kelas' ? 'border-b-2 border-black text-black' : 'text-gray-500'}`}>Per Kelas</button>
                <button onClick={() => setActiveTab('nama')} className={`px-3 py-2 font-medium whitespace-nowrap ${activeTab === 'nama' ? 'border-b-2 border-black text-black' : 'text-gray-500'}`}>Cari Nama</button>
                <button onClick={() => setActiveTab('belum-daftar')} className={`px-3 py-2 font-medium whitespace-nowrap ${activeTab === 'belum-daftar' ? 'border-b-2 border-black text-black' : 'text-gray-500'}`}>Belum Daftar</button>
            </div>
            {loading ? <div className="text-center py-8"><Spinner /></div> : (
            <div className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-2">
                    {activeTab === 'ekstra' && (
                        <select 
                            onChange={(e) => setSelectedEkstra(e.target.value)} 
                            value={selectedEkstra} 
                            className="flex-1 border rounded px-3 py-2 text-sm bg-white"
                        >
                            <option value="">-- Semua Ekstrakurikuler --</option>
                            {ekstraOptions.map(e => <option key={e.nama} value={e.nama}>{e.nama}</option>)}
                        </select>
                    )}
                    {(activeTab === 'kelas' || activeTab === 'belum-daftar') && (
                        <select 
                            onChange={(e) => setSelectedKelas(e.target.value)} 
                            value={selectedKelas} 
                            className="flex-1 border rounded px-3 py-2 text-sm bg-white"
                        >
                            <option value="">-- Semua Kelas --</option>
                            {kelasOptions.map(kelas => <option key={kelas} value={kelas}>{kelas}</option>)}
                        </select>
                    )}
                    {activeTab === 'nama' && (
                        <input 
                            type="text" 
                            value={searchTerm} 
                            onChange={e => setSearchTerm(e.target.value)} 
                            placeholder="Ketik nama siswa untuk mencari..." 
                            className="flex-1 border rounded px-3 py-2 text-sm"
                        />
                    )}
                    <div className="flex gap-2">
                        <button 
                            onClick={handleDownloadFiltered}
                            className="bg-green-600 text-white px-3 py-2 rounded text-sm font-medium hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                            title="Download hasil filter ke CSV"
                        >
                            <Icon name="download" className="w-4 h-4" />
                            <span className="hidden sm:inline">Download</span>
                        </button>
                        <button 
                            onClick={handleCopyFiltered}
                            className={`${copied ? 'bg-gray-800' : 'bg-blue-600'} text-white px-3 py-2 rounded text-sm font-medium hover:opacity-90 transition-all flex items-center justify-center gap-2 min-w-[80px]`}
                            title="Salin hasil filter ke clipboard"
                        >
                            <Icon name={copied ? 'check' : 'copy'} className="w-4 h-4" />
                            <span>{copied ? 'Copied!' : 'Copy'}</span>
                        </button>
                    </div>
                </div>
                <ProfileList profiles={filteredProfiles} editingProfileId={editingProfileId} startEditing={setEditingProfileId} setEditingProfileId={setEditingProfileId} ekstraSettings={ekstraSettings} handleSaveEkstra={handleSaveEkstra} selectedTahunAjaran={selectedTahunAjaran} ekstraOptions={ekstraOptions} />
              </div>
            )}
            <button onClick={onBack} className="w-full bg-gray-200 text-sm rounded py-2 mt-4 hover:bg-gray-300 transition-colors">Kembali</button>
        </div>
    );
};

export default MasterDataPage;
