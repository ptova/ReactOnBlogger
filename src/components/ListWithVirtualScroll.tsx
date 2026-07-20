import { type CSSProperties, type ReactNode, useEffect, useLayoutEffect, useRef, useState } from 'react';

/**
 * Determines which element controls scrolling.
 * - 'window': items fill the page; native window scroll controls visibility.
 * - 'container': items scroll inside a fixed-height div (used by ImageModal).
 */
type ScrollMode = 'window' | 'container';

/**
 * Strategy pattern for scroll position calculation and programmatic scrolling.
 * Abstracts over the two scroll modes so the rest of the component doesn't
 * need to know whether it's scrolling the window or a container div.
 */
interface ScrollAdapter {
    /** Returns the current scroll offset relative to the list start. */
    getScrollTop: () => number;
    /** Smoothly scrolls so that the item at `index` is at the top of the viewport. */
    scrollToIndex: (index: number) => void;
    /** Returns the element to attach the scroll listener to (Window or HTMLElement). */
    getScrollTarget: () => HTMLElement | Window | null;
}

/**
 * Creates a ScrollAdapter for window-based scrolling (full-viewport post cards).
 *
 * `getContainerTop` returns the container's offset from the page top, which
 * is needed because the list may not start at y=0 (e.g., after the header).
 * `getViewportHeight` provides the current viewport height for index math.
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
 * Creates a ScrollAdapter for container-based scrolling (image modal gallery).
 * The container div has `overflow-y: auto` and is the scroll port.
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
 * Instead of rendering all elements (which could be hundreds of full-viewport
 * post cards), this component calculates which items are in or near the viewport
 * and only renders those. The outer container's height is set to simulate the
 * full list height, and a `translateY` offset positions the visible slice.
 *
 * Two scroll modes:
 * - **window** (`scrollMode="window"`): items occupy the full viewport and
 *   native `window` scrolling controls visibility. Used for the post list.
 * - **container** (`scrollMode="container"`): items scroll inside a fixed-height
 *   `div` with `overflow-y: auto`. Used for the image gallery modal.
 *
 * Keyboard navigation: arrow keys / space / Enter allow navigating between
 * items without a mouse.
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

    // Re-measure viewport height and container offset on resize.
    // useLayoutEffect (not useEffect) so measurements happen synchronously
    // before the browser paints, preventing visual glitches.
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

    // Rebuild the scroll adapter whenever layout-critical values change.
    // The adapter is stored in a ref (not state) to avoid re-renders.
    useLayoutEffect(() => {
        const getVH = () => viewportHeight;
        const getTop = () => containerTop;
        adapterRef.current = isWindow
            ? createWindowAdapter(getTop, getVH)
            : createContainerAdapter(containerRef, getVH);
    }, [isWindow, containerTop, viewportHeight]);

    // Track scroll position and compute the focused index.
    // The focused index = which item is currently "at the top" of the viewport.
    // This drives both the virtualisation window and the parent's auto-load logic.
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

    // Arrow-up / arrow-down / space keyboard navigation and Enter to activate.
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

    // --- Virtualisation math ---
    // Determine which slice of elements is (or should be) visible.
    // startIndex/endIndex = the items currently in the viewport.
    // visibleStart/visibleEnd = startIndex/endIndex expanded by the buffer,
    // so items just off-screen are pre-rendered for smooth scrolling.
    const startIndex = Math.floor(scrollTop / viewportHeight);
    const endIndex = Math.ceil((scrollTop + viewportHeight) / viewportHeight);
    const visibleStart = Math.max(0, startIndex - visibleBuffer);
    const visibleEnd = Math.min(elements.length - 1, endIndex + visibleBuffer);

    // In window mode, the outer div's height equals the total list height
    // so the browser's native scrollbar reflects the full content.
    // In container mode, the div fills the viewport with overflow auto.
    const outerStyle: CSSProperties = isWindow
        ? { height: elements.length * viewportHeight }
        : { height: '100vh', overflowY: 'auto' };

    return (
        <div ref={containerRef} style={outerStyle}>
            {/*
              Inner container is translated down to position the visible slice.
              translateY = visibleStart * viewportHeight so the first visible
              item aligns with the top of the viewport.
            */}
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
