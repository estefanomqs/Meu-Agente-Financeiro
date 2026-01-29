import React, { useRef, useEffect, useState } from 'react';

interface Props {
    closingDay: number;
    dueDay: number;
    onUpdate: (field: 'closing' | 'due', newValue: number) => void;
    disabled?: boolean;
}

export const BillingCycleSlider: React.FC<Props> = ({ closingDay, dueDay, onUpdate, disabled = false }) => {
    const trackRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState<'closing' | 'due' | null>(null);

    // Helper to calculate day from X coordinate
    const getDayFromX = (clientX: number) => {
        if (!trackRef.current) return 1;
        const rect = trackRef.current.getBoundingClientRect();
        const width = rect.width;
        const offset = Math.max(0, Math.min(clientX - rect.left, width));
        const percentage = offset / width;

        // Map 0..1 to 1..31
        const day = Math.round(percentage * 30) + 1;
        return Math.max(1, Math.min(31, day));
    };

    const handlePointerDown = (e: React.PointerEvent, type: 'closing' | 'due') => {
        if (disabled) return;
        setIsDragging(type);
        e.currentTarget.setPointerCapture(e.pointerId);
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (!isDragging || disabled) return;

        const newDay = getDayFromX(e.clientX);

        if (isDragging === 'closing') {
            // Constraint: closing <= due
            if (newDay <= dueDay) {
                onUpdate('closing', newDay);
            } else {
                // Optional: Push due day if we want "push" behavior, but for now stick to hard limit
                // onUpdate('closing', dueDay); 
            }
        } else {
            // Constraint: due >= closing
            if (newDay >= closingDay) {
                onUpdate('due', newDay);
            }
        }
    };

    const handlePointerUp = (e: React.PointerEvent) => {
        setIsDragging(null);
        e.currentTarget.releasePointerCapture(e.pointerId);
    };

    // Click on track to jump closest handle
    const handleTrackClick = (e: React.MouseEvent) => {
        if (disabled) return;
        const clickedDay = getDayFromX(e.clientX);

        // Find closest handle
        const distToClosing = Math.abs(clickedDay - closingDay);
        const distToDue = Math.abs(clickedDay - dueDay);

        if (distToClosing < distToDue) {
            if (clickedDay <= dueDay) onUpdate('closing', clickedDay);
        } else {
            if (clickedDay >= closingDay) onUpdate('due', clickedDay);
        }
    };

    // Calculations for positioning
    // Map 1..31 to 0%..100%
    // (Day - 1) / 30 * 100
    const getPercent = (day: number) => ((day - 1) / 30) * 100;

    const closingPos = getPercent(closingDay);
    const duePos = getPercent(dueDay);

    return (
        <div className={`relative h-16 pt-6 select-none touch-none ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
            {/* Labels Scale */}
            <div className="absolute top-0 w-full flex justify-between text-[10px] text-zinc-600 font-medium px-1 pointer-events-none">
                <span>Dia 1</span>
                <span>Dia 15</span>
                <span>Dia 31</span>
            </div>

            {/* Track Area */}
            <div
                ref={trackRef}
                className="absolute top-6 left-0 right-0 h-2 bg-zinc-800 rounded-full cursor-pointer group"
                onClick={handleTrackClick}
            >
                {/* Hover Effect */}
                <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-full"></div>

                {/* Active Range Bar */}
                <div
                    className="absolute top-0 bottom-0 bg-gradient-to-r from-red-500/30 to-emerald-500/30 rounded-full pointer-events-none"
                    style={{ left: `${closingPos}%`, width: `${duePos - closingPos}%` }}
                ></div>
            </div>

            {/* Closing Handle (Red) */}
            <div
                className="absolute top-6 ml-[1px] transform -translate-x-1/2 flex flex-col items-center cursor-grab active:cursor-grabbing z-10 touch-none"
                style={{ left: `${closingPos}%` }}
                onPointerDown={(e) => handlePointerDown(e, 'closing')}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
            >
                {/* Handle Visual */}
                <div className={`w-4 h-4 -mt-1 rounded-full border-2 bg-zinc-950 transition-transform ${isDragging === 'closing' ? 'scale-125 border-red-400' : 'border-red-500 hover:scale-110'}`}></div>
                {/* Label */}
                <div className="mt-2 flex flex-col items-center">
                    <span className="text-[9px] font-bold text-red-400 bg-zinc-950 px-1.5 py-0.5 rounded border border-red-500/30 whitespace-nowrap">
                        Fec. {closingDay}
                    </span>
                </div>
            </div>

            {/* Due Handle (Green) */}
            <div
                className="absolute top-6 ml-[1px] transform -translate-x-1/2 flex flex-col items-center cursor-grab active:cursor-grabbing z-10 touch-none"
                style={{ left: `${duePos}%` }}
                onPointerDown={(e) => handlePointerDown(e, 'due')}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
            >
                {/* Handle Visual */}
                <div className={`w-4 h-4 -mt-1 rounded-full border-2 bg-zinc-950 transition-transform ${isDragging === 'due' ? 'scale-125 border-emerald-400' : 'border-emerald-500 hover:scale-110'}`}></div>
                {/* Label */}
                <div className="mt-2 flex flex-col items-center">
                    <span className="text-[9px] font-bold text-emerald-400 bg-zinc-950 px-1.5 py-0.5 rounded border border-emerald-500/30 whitespace-nowrap">
                        Venc. {dueDay}
                    </span>
                </div>
            </div>

            {/* Hint Text */}
            {!disabled && (
                <div className="absolute -bottom-1 w-full text-center pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-[9px] text-zinc-600">Arraste para ajustar</span>
                </div>
            )}
        </div>
    );
};
