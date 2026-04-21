
import React, { useEffect, useRef } from 'react';

// Chart.js is loaded from CDN and will be available on the window object.
declare const Chart: any;

interface ChartData {
    name: string;
    count: number;
}

interface EkstraPieChartProps {
    chartData: ChartData[];
}

const EkstraPieChart: React.FC<EkstraPieChartProps> = ({ chartData }) => {
    const chartRef = useRef<HTMLCanvasElement>(null);
    const chartInstanceRef = useRef<any>(null);

    // Function to generate a pleasant color palette
    const generateColors = (numColors: number) => {
        const colors = [
            '#4A90E2', '#50E3C2', '#F5A623', '#F8E71C', '#D0021B', '#BD10E0', '#9013FE', '#4A4A4A',
            '#B8E986', '#7ED321', '#9B9B9B', '#007AFF', '#5AC8FA', '#FF2D55', '#FF9500', '#FFCC00'
        ];
        const generatedColors = [];
        for (let i = 0; i < numColors; i++) {
            generatedColors.push(colors[i % colors.length]);
        }
        return generatedColors;
    };

    useEffect(() => {
        if (chartRef.current && chartData.length > 0) {
            if (chartInstanceRef.current) {
                chartInstanceRef.current.destroy();
            }

            const ctx = chartRef.current.getContext('2d');
            if (ctx) {
                chartInstanceRef.current = new Chart(ctx, {
                    type: 'pie',
                    data: {
                        labels: chartData.map(d => d.name),
                        datasets: [{
                            label: 'Jumlah Peserta',
                            data: chartData.map(d => d.count),
                            backgroundColor: generateColors(chartData.length),
                            hoverOffset: 8,
                            borderColor: '#fff',
                            borderWidth: 2,
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: true,
                        plugins: {
                            legend: {
                                position: 'bottom',
                                labels: {
                                    boxWidth: 12,
                                    padding: 15,
                                    font: {
                                        size: 11,
                                    }
                                }
                            },
                        }
                    }
                });
            }
        }

        return () => {
            if (chartInstanceRef.current) {
                chartInstanceRef.current.destroy();
            }
        };
    }, [chartData]);

    if (chartData.length === 0) {
        return <p className="text-center text-gray-500 py-10">Tidak ada data peserta.</p>;
    }

    return <canvas ref={chartRef}></canvas>;
};

export default EkstraPieChart;
