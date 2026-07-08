import { useCallback, useEffect, useRef } from 'react';

/**
 * A sticky header that collapses (hides its children) when the user scrolls down
 * past 50 px and expands when they scroll back up.
 *
 * Uses direct DOM manipulation via a ref to skip React re-renders on every
 * scroll frame, relying on `requestAnimationFrame` for smoothness.
 */
export function CollapsibleHeader({ children }: { children: React.ReactNode }) {
    const lastScrollY = useRef(0);
    const ticking = useRef(false);
    const isCollapsed = useRef(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const handleScroll = useCallback(() => {
        if (ticking.current) return;
        requestAnimationFrame(() => {
            const currentScrollY = window.scrollY;
            const shouldCollapse = currentScrollY > 50 && currentScrollY > lastScrollY.current;

            if (shouldCollapse !== isCollapsed.current) {
                isCollapsed.current = shouldCollapse;
                const el = containerRef.current;
                if (el) {
                    el.style.height = shouldCollapse ? '0' : '';
                    el.style.paddingTop = shouldCollapse ? '0' : '';
                    el.style.paddingBottom = shouldCollapse ? '0' : '';
                    el.style.opacity = shouldCollapse ? '0' : '1';
                }
            }

            lastScrollY.current = currentScrollY;
            ticking.current = false;
        });
        ticking.current = true;
    }, []);

    useEffect(() => {
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, [handleScroll]);

    return (
        <div style={{
            position: 'sticky',
            top: 0,
            zIndex: 10,
            height: 50,
            transition: 'all 200ms ease-in-out',
        }}>
            <div
                ref={containerRef}
                style={{
                    transition: 'all 200ms ease-in-out',
                    overflow: 'hidden',
                }}
            >
                {children}
            </div>
        </div>
    );
}
