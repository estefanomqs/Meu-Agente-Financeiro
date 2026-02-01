import React from 'react';
import { ResponsiveContainer, BarChart, XAxis, Bar, LabelList, Cell } from 'recharts';

interface DashboardChartProps {
    chartData: any[];
    showChart: boolean;
    isScrolled: boolean;
}

export const DashboardChart: React.FC<DashboardChartProps> = ({ chartData, showChart, isScrolled }) => {
    return (
        <div className={`overflow-hidden transition-all duration-500 ease-in-out ${showChart ? (isScrolled ? 'max-h-24 opacity-100' : 'max-h-40 opacity-100') : 'max-h-0 opacity-0'}`}>
            <div className={`${isScrolled ? 'h-24' : 'h-32'} w-full mt-2 px-2 transition-all duration-300`}>
                <div className="w-full h-full outline-none focus:outline-none ring-0 [&_.recharts-surface]:outline-none" tabIndex={-1}>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: isScrolled ? 5 : 20, right: 5, left: -20, bottom: 0 }} barCategoryGap="16%">
                            <XAxis
                                dataKey="name"
                                hide={isScrolled}
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#71717a', fontSize: 10 }}
                                dy={10}
                            />
                            <Bar
                                dataKey="value"
                                radius={[4, 4, 0, 0]}
                                isAnimationActive={false} // Performance optimization
                            >
                                <LabelList
                                    dataKey="value"
                                    position="top"
                                    content={(props: any) => {
                                        const { x, y, width, value, index } = props;
                                        const isCurrent = chartData[index]?.isCurrent;

                                        if (!isCurrent || !value) return null;

                                        return (
                                            <text
                                                x={x + width / 2}
                                                y={y - 10}
                                                fill="#34d399" // Emerald-400
                                                textAnchor="middle"
                                                fontWeight="bold"
                                                fontSize={12}
                                                fontFamily="sans-serif"
                                            >
                                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)}
                                            </text>
                                        );
                                    }}
                                />
                                {chartData.map((entry, index) => (
                                    <Cell
                                        key={`cell-${index}`}
                                        fill={entry.isCurrent ? '#10b981' : '#3f3f46'} // Emerald for current, Zinc for others
                                        fillOpacity={entry.isCurrent ? 1 : 0.3}
                                        style={{ outline: 'none' }}
                                        className="outline-none focus:outline-none"
                                    />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};
