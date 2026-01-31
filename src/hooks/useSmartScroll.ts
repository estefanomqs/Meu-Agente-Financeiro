import { useState, useEffect, useRef } from 'react';

export const useSmartScroll = (currentDate: Date) => {
    const [isScrolled, setIsScrolled] = useState(false);
    const listStartRef = useRef<HTMLDivElement>(null);
    const monthsContainerRef = useRef<HTMLDivElement>(null);
    const hasInitialScrolled = useRef(false);

    // Monitorar Scroll Global
    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 20);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Smart Scroll Reset ao mudar a data
    useEffect(() => {
        const timer = setTimeout(() => {
            // Só ativa se o usuário já rolou para baixo (passou dos cards)
            if (listStartRef.current && window.scrollY > 300) {

                // Altura total do bloco fixo unificado (ajuste seguro)
                const TOTAL_STICKY_HEIGHT = 320;

                const elementTop = listStartRef.current.getBoundingClientRect().top + window.scrollY;
                const targetPosition = elementTop - TOTAL_STICKY_HEIGHT;

                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        }, 100);

        return () => clearTimeout(timer);
    }, [currentDate]);

    return {
        isScrolled,
        listStartRef,
        monthsContainerRef,
        hasInitialScrolled
    };
};
