import { useCallback, useEffect, useRef } from 'react';

/**
 * A sticky header that collapses (hides its children) when the user scrolls down
 * past 50 px and expands when they scroll back up.
 *
 * Performance approach: Uses direct DOM manipulation via a ref to skip React
 * re-renders on every scroll frame. The `ticking` ref + `requestAnimationFrame`
 * pattern ensures only one layout read/write per frame, preventing jank on
 * low-powered devices.
 *
 * The collapse threshold (50px) is intentionally small so the header hides
 * quickly during fast scrolling but stays visible during small adjustments.
 */
export function CollapsibleHeader({ children }: { children: React.ReactNode }) {
    /** Tracks the previous scrollY to determine scroll direction. */
    const lastScrollY = useRef(0);
    /**
     * Guards against scheduling multiple rAF callbacks per frame.
     * When a rAF is already scheduled, subsequent scroll events are ignored
     * until the callback fires.
     */
    const ticking = useRef(false);
    /** Current collapsed state, tracked outside React to avoid re-renders. */
    const isCollapsed = useRef(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const handleScroll = useCallback(() => {
        if (ticking.current) return;
        requestAnimationFrame(() => {
            const currentScrollY = window.scrollY;
            // Collapse when scrolling down past 50px; expand when scrolling up.
            const shouldCollapse = currentScrollY > 50 && currentScrollY > lastScrollY.current;

            if (shouldCollapse !== isCollapsed.current) {
                isCollapsed.current = shouldCollapse;
                const el = containerRef.current;
                if (el) {
                    // Directly set inline styles instead of toggling CSS classes
                    // to avoid the re-render cycle entirely.
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
        // passive: true allows the browser to scroll without waiting for JS.
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
