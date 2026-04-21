
import React, { useState, useEffect } from 'react';

const LiveClock: React.FC = () => {
    const [time, setTime] = useState(new Date());

    useEffect(() => {
        const timerId = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timerId);
    }, []);

    return <div className="text-sm font-mono">{time.toLocaleTimeString('id-ID')}</div>;
};

export default LiveClock;
