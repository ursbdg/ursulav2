import React, { useState, useContext, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { AppContext } from '../contexts/AppContext';
import type { UserRole, Ekstrakurikuler } from '../types';
import Icon from './shared/Icon';

import LiveClock from './shared/LiveClock';
import PresensiPage from './pages/PresensiPage';
import MasterDataPage from './pages/MasterDataPage';
import DaftarkanSiswaPage from './pages/DaftarkanSiswaPage';
import ManajemenEkstraPage from './pages/ManajemenEkstraPage';
import PusatIzinTerpusatPage from './pages/PusatIzinTerpusatPage';
import Sidebar from './shared/Sidebar';
import LaporanKehadiranPage from './pages/LaporanKehadiranPage';
import RingkasanPage from './pages/RingkasanPage';
import ManajemenTahunAjaranPage from './pages/ManajemenTahunAjaranPage';
import TahunAjaranSelector from './shared/TahunAjaranSelector';
import ImporSiswaPage from './pages/ImporSiswaPage';

type View = 'dashboard' | 'laporan' | 'ringkasan' | 'manajemen-tahun-ajaran' | 'master-data' | 'impor-siswa' | 'manajemen-ekstra' | 'pusat-izin-terpusat' | 'presensi' | 'daftarkan-siswa';

const DashboardContent: React.FC<{
    userRole: UserRole,
    setView: (view: View) => void,
    setSelectedEkstra: (ekstra: Ekstrakurikuler) => void,
    ekstraOptions: Ekstrakurikuler[],
}> = ({ userRole, setView, setSelectedEkstra, ekstraOptions }) => {
    const { activeTahunAjaran } = useContext(AppContext)!;
    const [actionView, setActionView] = useState<'presensi' | 'daftar'>('presensi');

    const handleIconClick = (ekstra: Ekstrakurikuler) => {
        setSelectedEkstra(ekstra);
        setView(actionView === 'daftar' ? "daftarkan-siswa" : "presensi");
    };

    return (
        <section className="bg-white p-4 rounded-xl shadow border space-y-4">
            {userRole === 'koordinator' && (
                <div className="space-y-4">
                    <div className="flex justify-center bg-gray-200 rounded-lg p-1 text-sm">
                        <button onClick={() => setActionView('presensi')} className={`px-3 py-1 rounded-md w-full ${actionView === 'presensi' ? 'bg-white shadow font-semibold' : 'text-gray-600'}`}>Mode Presensi</button>
                        <button onClick={() => setActionView('daftar')} className={`px-3 py-1 rounded-md w-full ${actionView === 'daftar' ? 'bg-white shadow font-semibold' : 'text-gray-600'}`}>Mode Daftar</button>
                    </div>
                </div>
            )}
             {userRole !== 'koordinator' && activeTahunAjaran && (
                <div className="text-center p-2 bg-blue-50 text-blue-800 rounded-lg text-sm">
                    Tahun Ajaran Aktif: <span className="font-semibold">{activeTahunAjaran.nama}</span>
                </div>
            )}
            <h2 className="text-center font-semibold">Pilih Ekstrakurikuler</h2>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
                {ekstraOptions.map((item, i) => (
                    <div key={i} className="relative group">
                        <button onClick={() => handleIconClick(item)} className="flex flex-col items-center text-xs w-full text-center">
                            <div className="w-16 h-16 flex items-center justify-center bg-blue-50 text-blue-600 rounded-2xl group-hover:bg-blue-600 group-hover:text-white transition-all duration-300 shadow-sm group-hover:shadow-md group-hover:-translate-y-1">
                                <Icon name={item.icon || item.nama} className="w-8 h-8 pointer-events-none" />
                            </div>
                            <span className="mt-1">{item.nama}</span>
                        </button>
                    </div>
                ))}
            </div>
        </section>
    );
};

const MainApplication: React.FC = () => {
    const { userRole, activeTahunAjaran } = useContext(AppContext)!;
    const [view, setView] = useState<View>('dashboard');
    const [selectedEkstra, setSelectedEkstra] = useState<Ekstrakurikuler | null>(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [ekstraOptions, setEkstraOptions] = useState<Ekstrakurikuler[]>([]);
    const isCoordinator = userRole === 'koordinator';

    
    
    useEffect(() => {
        const fetchEkstraOptions = async () => {
            const { data } = await supabase.from('ekstrakurikuler').select('*').order('nama');
            setEkstraOptions(data || []);
        };
        fetchEkstraOptions();
    }, []);

    const goBackToDashboard = () => {
        setView('dashboard');
    }

    const renderContent = () => {
        if (view === 'laporan') return <LaporanKehadiranPage />;
        if (view === 'ringkasan') return <RingkasanPage />;
        if (view === 'manajemen-tahun-ajaran') return <ManajemenTahunAjaranPage />;
        if (view === 'master-data') return <MasterDataPage onBack={goBackToDashboard} />;
        if (view === 'impor-siswa') return <ImporSiswaPage onBack={goBackToDashboard} />;
        if (view === 'manajemen-ekstra') return <ManajemenEkstraPage onBack={goBackToDashboard} />;
        if (view === 'pusat-izin-terpusat') return <PusatIzinTerpusatPage onBack={goBackToDashboard} />;
        if (view === 'presensi') return selectedEkstra && <PresensiPage ekstra={selectedEkstra} onBack={goBackToDashboard} />;
        if (view === 'daftarkan-siswa') return selectedEkstra && <DaftarkanSiswaPage ekstra={selectedEkstra} onBack={goBackToDashboard} />;
        
        return <DashboardContent userRole={userRole} setView={setView} setSelectedEkstra={setSelectedEkstra} ekstraOptions={ekstraOptions} />;
    };

    return (
        <div className="min-h-screen bg-gray-100">
            <header className="fixed top-0 w-full bg-white shadow-md z-40 p-4">
                {/* --- Top Row: Title & Desktop Controls --- */}
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="md:hidden p-1 text-gray-600 hover:text-black">
                            <Icon name="menu" className="w-6 h-6" />
                        </button>
                        <div>
                            <h1 className="text-lg sm:text-xl font-bold">PRESENSI EKSTRA</h1>
                            <h3 className="text-xs sm:text-sm text-gray-600">SMP Santa Ursula Bandung</h3>
                        </div>
                    </div>
                    {/* Controls for Desktop View */}
                    <div className="hidden md:flex items-center gap-4">
                        {isCoordinator ? (
                            <TahunAjaranSelector />
                        ) : (
                            activeTahunAjaran && (
                                <div className="flex items-center gap-2 text-sm">
                                    <Icon name="calendar-days" className="w-4 h-4 text-gray-600" />
                                    <span className="font-medium">{activeTahunAjaran.nama} (Aktif)</span>
                                </div>
                            )
                        )}
                        <LiveClock />
                    </div>
                </div>

                {/* --- Bottom Row: Coordinator Controls on Mobile --- */}
                {isCoordinator && (
                    <div className="md:hidden flex justify-between items-center pt-3 mt-3 border-t">
                        <TahunAjaranSelector />
                        <LiveClock />
                    </div>
                )}
            </header>
            
            {/* Main content with adjusted padding-top */}
            <div className={`flex ${isCoordinator ? 'pt-32 md:pt-20' : 'pt-20'}`}>
                <Sidebar currentView={view} setView={setView} isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
                <main className="flex-1 transition-all duration-300 md:ml-64 p-4 lg:p-6">
                   <div className="max-w-7xl mx-auto">
                     {renderContent()}
                   </div>
                </main>
            </div>
        </div>
    );
};

export default MainApplication;
