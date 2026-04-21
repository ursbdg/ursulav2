
import React, { useState } from 'react';
import { supabase } from '../../services/supabase';

const LoginPage: React.FC = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        const email = `${username.toLowerCase()}@sheetizen.web.id`;
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
            setError("Username atau password salah.");
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <form onSubmit={handleLogin} className="bg-white p-6 rounded-xl shadow border space-y-4 w-full max-w-sm">
                <h2 className="text-lg font-semibold text-center">Ekstra SMP Santa Ursula Bdg</h2>
                {error && <p className="bg-red-100 text-red-700 text-sm p-3 rounded">{error}</p>}
                <input 
                    type="text" 
                    value={username} 
                    onChange={e => setUsername(e.target.value)} 
                    placeholder="Username" 
                    required 
                    className="w-full border rounded px-3 py-2 text-sm" 
                />
                <input 
                    type="password" 
                    value={password} 
                    onChange={e => setPassword(e.target.value)} 
                    placeholder="Password" 
                    required 
                    className="w-full border rounded px-3 py-2 text-sm" 
                />
                <button 
                    type="submit" 
                    disabled={loading} 
                    className="w-full bg-black text-white py-2 rounded disabled:bg-gray-400 transition-colors"
                >
                    {loading ? 'Memuat...' : 'Masuk'}
                </button>
            </form>
        </div>
    );
};

export default LoginPage;
