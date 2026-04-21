import React, { useState, useEffect, ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../../services/supabase';
import { AppContext } from '../../contexts/AppContext';
import type { UserRole, TahunAjaran } from '../../types';
import Spinner from '../shared/Spinner';

interface AuthProviderProps {
    children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [session, setSession] = useState<Session | null>(null);
    const [userRole, setUserRole] = useState<UserRole>('pembina');
    const [tahunAjaranList, setTahunAjaranList] = useState<TahunAjaran[]>([]);
    const [activeTahunAjaran, setActiveTahunAjaran] = useState<TahunAjaran | null>(null);
    const [selectedTahunAjaran, setSelectedTahunAjaran] = useState<TahunAjaran | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const handleAuthChange = async (session: Session | null) => {
            if (session) {
                // User logged in: fetch data
                const { data: tahunAjaranData } = await supabase.from('tahun_ajaran').select('*').order('nama', { ascending: false });
                const list = (tahunAjaranData as TahunAjaran[]) || [];
                const active = list.find(ta => ta.is_active) || list[0] || null;
                
                setTahunAjaranList(list);
                setActiveTahunAjaran(active);
                setSelectedTahunAjaran(active);
                setUserRole((session?.user?.user_metadata?.role as UserRole) || 'pembina');
            } else {
                // User logged out: clear data
                setTahunAjaranList([]);
                setActiveTahunAjaran(null);
                setSelectedTahunAjaran(null);
                setUserRole('pembina');
            }
            setSession(session);
            setLoading(false);
        };

        supabase.auth.getSession().then(({ data: { session } }) => {
            handleAuthChange(session);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setLoading(true);
            handleAuthChange(session);
        });

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Spinner size="lg" />
            </div>
        );
    }

    return (
        <AppContext.Provider value={{ session, userRole, tahunAjaranList, activeTahunAjaran, selectedTahunAjaran, setSelectedTahunAjaran: setSelectedTahunAjaran }}>
            {children}
        </AppContext.Provider>
    );
};