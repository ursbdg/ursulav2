
import React from 'react';
import type { IzinStatus } from '../../types';

const IZIN_STATUS = {
    SAKIT: 'Sakit',
    IZIN: 'Izin',
    TANPA_SERAGAM: 'Tanpa Seragam'
};

interface StatusTagProps {
    status: IzinStatus | null | undefined;
    onClick?: () => void;
    clickable?: boolean;
}

const StatusTag: React.FC<StatusTagProps> = ({ status, onClick, clickable = false }) => {
    if (!status) return null;

    const style =
        status === IZIN_STATUS.SAKIT ? 'bg-red-100 text-red-800' :
        status === IZIN_STATUS.IZIN ? 'bg-yellow-100 text-yellow-800' :
        status === IZIN_STATUS.TANPA_SERAGAM ? 'bg-blue-100 text-blue-800' : 
        'bg-gray-100 text-gray-800';

    const cursorStyle = clickable ? 'cursor-pointer hover:opacity-75' : '';

    return (
        <span onClick={onClick} className={`text-xs font-medium ml-2 px-2 py-0.5 rounded-full ${style} ${cursorStyle}`}>
            {status}
        </span>
    );
};

export default StatusTag;
