import { createChart, ColorType, IChartApi } from 'lightweight-charts';
import { useEffect, useRef } from 'react';

interface TVChartProps {
    data: { time: string, value: number }[];
    markers?: { time: string, position: 'aboveBar' | 'belowBar', color: string, shape: 'circle' | 'square' | 'arrowUp' | 'arrowDown', text: string }[];
    colors?: {
        backgroundColor?: string;
        lineColor?: string;
        textColor?: string;
        areaTopColor?: string;
        areaBottomColor?: string;
    };
}

export const TVChart = (props: TVChartProps) => {
    const {
        data,
        markers = [],
        colors: {
            backgroundColor = '#020617', // slate-950
            lineColor = '#475569', // slate-600
            textColor = '#94a3b8', // slate-400
            areaTopColor = 'rgba(71, 85, 105, 0.4)',
            areaBottomColor = 'rgba(71, 85, 105, 0.0)',
        } = {},
    } = props;

    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);

    useEffect(() => {
        if (!chartContainerRef.current) return;

        const handleResize = () => {
            chartRef.current?.applyOptions({ width: chartContainerRef.current!.clientWidth });
        };

        const chart = createChart(chartContainerRef.current, {
            layout: {
                background: { type: ColorType.Solid, color: backgroundColor },
                textColor,
            },
            width: chartContainerRef.current.clientWidth,
            height: 400,
            grid: {
                vertLines: { color: '#1e293b' }, // slate-800
                horzLines: { color: '#1e293b' },
            },
            timeScale: {
                borderColor: '#334155',
            },
            rightPriceScale: {
                 borderColor: '#334155',
            }
        });

        // Store chart reference
        chartRef.current = chart;

        const newSeries = chart.addAreaSeries({
            lineColor,
            topColor: areaTopColor,
            bottomColor: areaBottomColor,
        });

        newSeries.setData(data);
        
        // Add markers
        if (markers.length > 0) { // @ts-ignore - markers type is simple enough
             newSeries.setMarkers(markers as any[]); 
        }

        // Fit content
        chart.timeScale().fitContent();

        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            chart.remove();
        };
    }, [data, markers, backgroundColor, lineColor, textColor, areaTopColor, areaBottomColor]);

    return (
        <div ref={chartContainerRef} className="w-full relative" />
    );
};
