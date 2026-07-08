import { type CSSProperties, type ReactNode, useEffect, useLayoutEffect, useRef, useState } from 'react';

type ScrollMode = 'window' | 'container';

interface ScrollAdapter {
    getScrollTop: () => number;
    scrollToIndex: (index: number) => void;
    getScrollTarget: () => HTMLElement | Window | null;
}

/**
 * Factory for the window-based scroll adapter.
 * Each item occupies one viewport, and scrolling is done via `window.scrollTo`.
 */
function createWindowAdapter(
    getContainerTop: () => number,
    getViewportHeight: () => number,
): ScrollAdapter {
    return {
        getScrollTop: () => Math.max(0, window.scrollY - getContainerTop()),
        scrollToIndex: (index) => {
            window.scrollTo({ top: getContainerTop() + index * getViewportHeight(), behavior: 'smooth' });
        },
        getScrollTarget: () => window,
    };
}

/**
 * Factory for the container-based scroll adapter.
 * Used inside the image modal where a `div` is the scrollport.
 */
function createContainerAdapter(
    containerRef: React.RefObject<HTMLDivElement | null>,
    getViewportHeight: () => number,
): ScrollAdapter {
    return {
        getScrollTop: () => containerRef.current?.scrollTop ?? 0,
        scrollToIndex: (index) => {
            containerRef.current?.scrollTo({ top: index * getViewportHeight(), behavior: 'smooth' });
        },
        getScrollTarget: () => containerRef.current,
    };
}

export interface ListWithVirtualScrollProps {
    /** Child elements to virtualise (typically full-viewport cards). */
    elements: ReactNode[];
    /** Number of off-screen items to render on each side for smooth pre-loading. */
    visibleBuffer: number;
    /** When true, keyboard navigation is disabled. */
    buttonScrollDisabled?: boolean;
    /** Fired when the focused/visible item changes. */
    onIndexChange?: (index: number) => void;
    /** Fired when Enter is pressed on the currently focused item. */
    onEnter?: (index: number) => void;
    /** Whether scrolling is tied to the window or an inner scroll container. @default 'window' */
    scrollMode?: ScrollMode;
}

/**
 * Virtual-scroll list that renders only the visible items plus a buffer.
 *
 * Supports two scroll modes:
 * - **window** (`scrollMode="window"`): items occupy the full viewport and
 *   native `window` scrolling controls visibility.
 * - **container** (`scrollMode="container"`): items scroll inside a fixed-height
 *   `div` with `overflow-y: auto`.
 *
 * Also provides arrow-key / space navigation between items.
 */
export function ListWithVirtualScroll({
    elements,
    visibleBuffer,
    buttonScrollDisabled,
    onIndexChange,
    onEnter,
    scrollMode = 'window',
}: ListWithVirtualScrollProps) {
    const isWindow = scrollMode === 'window';
    const containerRef = useRef<HTMLDivElement | null>(null);
    const [currentFocusIndex, setCurrentFocusIndex] = useState(0);
    const [viewportHeight, setViewportHeight] = useState(window.innerHeight);
    const [containerTop, setContainerTop] = useState(0);
    const [scrollTop, setScrollTop] = useState(0);
    const adapterRef = useRef<ScrollAdapter>(null!);

    /** Re-measure viewport height and container offset on resize. */
    useLayoutEffect(() => {
        const updateMetrics = () => {
            setViewportHeight(window.innerHeight);
            if (isWindow && containerRef.current) {
                setContainerTop(containerRef.current.offsetTop);
            }
        };
        updateMetrics();
        window.addEventListener('resize', updateMetrics);
        return () => window.removeEventListener('resize', updateMetrics);
    }, [isWindow]);

    /** Rebuild the scroll adapter whenever layout-critical values change. */
    useLayoutEffect(() => {
        const getVH = () => viewportHeight;
        const getTop = () => containerTop;
        adapterRef.current = isWindow
            ? createWindowAdapter(getTop, getVH)
            : createContainerAdapter(containerRef, getVH);
    }, [isWindow, containerTop, viewportHeight]);

    /** Track scroll position and notify parent of the focused index. */
    useEffect(() => {
        const target = adapterRef.current.getScrollTarget();
        if (!target) return;

        const handleScroll = () => {
            const newScrollTop = adapterRef.current.getScrollTop();
            setScrollTop(newScrollTop);
            const newIndex = Math.max(0, Math.round(newScrollTop / viewportHeight));
            setCurrentFocusIndex(newIndex);
            onIndexChange?.(newIndex);
        };

        target.addEventListener('scroll', handleScroll);
        return () => target.removeEventListener('scroll', handleScroll);
    }, [viewportHeight, onIndexChange]);

    /** Arrow-up / arrow-down / space keyboard navigation and Enter to activate. */
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (elements.length === 0 || buttonScrollDisabled) return;

            const isEnter = event.key === 'Enter';
            if (isEnter) {
                event.preventDefault();
                onEnter?.(currentFocusIndex);
                return;
            }

            const isDown = event.key === 'ArrowDown' || event.key === ' ' || event.code === 'Space';
            const isUp = event.key === 'ArrowUp';
            if (!isDown && !isUp) return;

            event.preventDefault();
            let nextIndex = currentFocusIndex;
            if (isDown) nextIndex = Math.min(currentFocusIndex + 1, elements.length - 1);
            if (isUp) nextIndex = Math.max(currentFocusIndex - 1, 0);

            if (nextIndex !== currentFocusIndex) {
                adapterRef.current.scrollToIndex(nextIndex);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [currentFocusIndex, elements.length, buttonScrollDisabled, onEnter]);

    // Virtualisation math: determine which items are (or should be) visible.
    const startIndex = Math.floor(scrollTop / viewportHeight);
    const endIndex = Math.ceil((scrollTop + viewportHeight) / viewportHeight);
    const visibleStart = Math.max(0, startIndex - visibleBuffer);
    const visibleEnd = Math.min(elements.length - 1, endIndex + visibleBuffer);
    const outerStyle: CSSProperties = isWindow
        ? { height: elements.length * viewportHeight }
        : { height: '100vh', overflowY: 'auto' };

    return (
        <div ref={containerRef} style={outerStyle}>
            <div
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '5vh',
                    transform: `translateY(${visibleStart * viewportHeight}px)`,
                    paddingTop: '2.5vh',
                }}
            >
                {elements.slice(visibleStart, visibleEnd + 1).map((element, index) => (
                    <div key={visibleStart + index} style={{ height: '95vh' }}>
                        {element}
                    </div>
                ))}
            </div>
        </div>
    );
}
