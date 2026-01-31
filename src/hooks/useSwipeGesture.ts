import React, { useRef } from 'react';

interface UseSwipeGestureProps {
    onSwipe: (direction: 'next' | 'prev') => void;
}

export const useSwipeGesture = ({ onSwipe }: UseSwipeGestureProps) => {
    const mainContentRef = useRef<HTMLDivElement>(null);
    const touchStart = useRef<{ x: number, y: number } | null>(null);
    const currentDiffX = useRef(0);
    const isSwiping = useRef(false);
    const swipeThreshold = 100;

    const onTouchStart = (e: React.TouchEvent) => {
        // 1. Reset states
        if (mainContentRef.current) {
            mainContentRef.current.style.transition = 'none'; // Remove lag
        }
        touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        currentDiffX.current = 0;
        isSwiping.current = false;
    };

    const onTouchMove = (e: React.TouchEvent) => {
        if (!touchStart.current || !mainContentRef.current) return;

        const currentX = e.touches[0].clientX;
        const currentY = e.touches[0].clientY;
        const diffX = currentX - touchStart.current.x;
        const diffY = currentY - touchStart.current.y;

        // 2. Direction Lock (First move determines intent)
        if (!isSwiping.current) {
            if (Math.abs(diffY) > Math.abs(diffX)) {
                touchStart.current = null; // It's a scroll, ignore swipe
                return;
            }
            isSwiping.current = true;
        }

        // 3. Direct Manipulation (Follow finger)
        currentDiffX.current = diffX;
        mainContentRef.current.style.transform = `translate3d(${diffX}px, 0, 0)`;
    };

    const onTouchEnd = () => {
        if (!mainContentRef.current) return;

        // 4. Snap Logic
        const diff = currentDiffX.current;
        const absDiff = Math.abs(diff);

        mainContentRef.current.style.transition = 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)'; // Spring-like

        if (absDiff > swipeThreshold) {
            // Swipe Triggered
            const direction = diff > 0 ? 1 : -1; // 1 = right (prev), -1 = left (next)
            const textWrap = direction * 100; // Move out completely

            // Animate out
            mainContentRef.current.style.transform = `translate3d(${textWrap}vw, 0, 0)`;

            // Wait for animation then switch
            setTimeout(() => {
                if (direction > 0) {
                    onSwipe('prev'); // Right swipe -> Prev Month
                } else {
                    onSwipe('next'); // Left swipe -> Next Month
                }

                // Reset Position (Instant)
                if (mainContentRef.current) {
                    mainContentRef.current.style.transition = 'none';
                    mainContentRef.current.style.transform = 'translate3d(0, 0, 0)';
                }
            }, 300);
        } else {
            // Snap Back (Cancelled)
            mainContentRef.current.style.transform = 'translate3d(0, 0, 0)';
        }

        touchStart.current = null;
        currentDiffX.current = 0;
        isSwiping.current = false;
    };

    return {
        mainContentRef,
        onTouchStart,
        onTouchMove,
        onTouchEnd
    };
};
