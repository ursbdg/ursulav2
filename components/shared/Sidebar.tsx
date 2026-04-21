import React, { useContext } from 'react';
import { AppContext } from '../../contexts/AppContext';
import { supabase } from '../../services/supabase';
import Icon from './Icon';
import type { UserRole } from '../../types';

type View = 'dashboard' | 'laporan' | 'ringkasan' | 'manajemen-tahun-ajaran' | 'master-data' | 'impor-siswa' | 'manajemen-ekstra' | 'pusat-izin-terpusat';

interface SidebarProps {
    currentView: string;
    setView: (view: View) => void;
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, setView, isOpen, setIsOpen }) => {
    const { userRole } = useContext(AppContext)!;
    
    const navItems = [
        { id: 'dashboard', label: 'Dashboard', icon: 'layout-dashboard', roles: ['koordinator', 'pembina', 'input'] },
        { id: 'laporan', label: 'Laporan Kehadiran', icon: 'file-text', roles: ['koordinator', 'pembina'] },
        { id: 'ringkasan', label: 'Ringkasan', icon: 'pie-chart', roles: ['koordinator'] },
        { type: 'divider', roles: ['koordinator'] },
        { id: 'master-data', label: 'Kelola Siswa', icon: 'database', roles: ['koordinator'] },
        { id: 'impor-siswa', label: 'Impor Siswa', icon: 'file-import', roles: ['koordinator'] },
        { id: 'manajemen-ekstra', label: 'Kelola Ekstra', icon: 'settings-2', roles: ['koordinator'] },
        { id: 'pusat-izin-terpusat', label: 'Input Izin Terpusat', icon: 'clipboard-check', roles: ['koordinator'] },
        { id: 'manajemen-tahun-ajaran', label: 'Th. Ajaran', icon: 'calendar-days', roles: ['koordinator'] },
    ];

    const handleNavClick = (view: View) => {
        setView(view);
        if (window.innerWidth < 768) { // Close sidebar on mobile after navigation
            setIsOpen(false);
        }
    };

    const availableNavItems = navItems.filter(item => item.roles.includes(userRole));

    return (
        <>
            {/* Overlay for mobile */}
            <div 
                className={`fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden ${isOpen ? 'block' : 'hidden'}`}
                onClick={() => setIsOpen(false)}
            ></div>

            <aside className={`fixed top-0 left-0 h-full bg-white border-r w-64 z-30 transform transition-transform ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 flex flex-col`}>
                <div className={`flex-1 overflow-y-auto ${userRole === 'koordinator' ? 'pt-32 md:pt-20' : 'pt-20 md:pt-20'}`}>
                    <div className="p-4 border-b md:hidden">
                        <h2 className="text-lg font-bold">Menu Navigasi</h2>
                    </div>
                    <nav className="p-4 space-y-2">
                        {availableNavItems.map((item, index) => {
                            if (item.type === 'divider') {
                                return <hr key={`divider-${index}`} className="my-2" />;
                            }
                            return (
                                <button
                                    key={item.id}
                                    onClick={() => handleNavClick(item.id as View)}
                                    className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                                        currentView === item.id 
                                        ? 'bg-blue-100 text-blue-700' 
                                        : 'text-gray-600 hover:bg-gray-100'
                                    }`}
                                >
                                    <Icon name={item.icon || 'circle-help'} className="w-5 h-5" />
                                    <span>{item.label}</span>
                                </button>
                            );
                        })}
                    </nav>
                </div>
                
                <div className="p-4 border-t">
                    <button
                        onClick={() => supabase.auth.signOut()}
                        className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-red-100 hover:text-red-700 transition-colors"
                    >
                        <Icon name="log-out" className="w-5 h-5" />
                        <span>Logout</span>
                    </button>
                </div>
            </aside>
        </>
    );
};

export default Sidebar;