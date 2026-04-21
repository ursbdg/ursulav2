
import React, { useContext } from 'react';
import { AppContext } from '../../contexts/AppContext';
import Icon from './Icon';

const TahunAjaranSelector: React.FC = () => {
    const { tahunAjaranList, selectedTahunAjaran, setSelectedTahunAjaran } = useContext(AppContext)!;

    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const selected = tahunAjaranList.find(ta => ta.nama === e.target.value) || null;
        setSelectedTahunAjaran(selected);
    };

    if (tahunAjaranList.length === 0) {
        return null;
    }

    return (
        <div className="flex items-center gap-2">
            <Icon name="calendar-days" className="w-4 h-4 text-gray-600" />
            <select
                value={selectedTahunAjaran?.nama || ''}
                onChange={handleChange}
                className="bg-white border-none text-sm font-medium rounded-md focus:ring-0"
            >
                {tahunAjaranList.map(ta => (
                    <option key={ta.id} value={ta.nama}>
                        {ta.nama} {ta.is_active ? ' (Aktif)' : ''}
                    </option>
                ))}
            </select>
        </div>
    );
};

export default TahunAjaranSelector;
