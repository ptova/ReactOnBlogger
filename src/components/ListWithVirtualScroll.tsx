import {type CSSProperties, type ReactNode, useEffect, useLayoutEffect, useMemo, useRef, useState} from "react";

type ScrollMode = "window" | "container";

type ScrollAdapter = {
    getScrollTop: () => number;
    scrollToIndex: (index: number) => void;
    getScrollTarget: () => HTMLElement | Window | null;
    getOuterStyle: (elementsLength: number, vh: number) => CSSProperties;
};

// --- Adapter factories

function createWindowAdapter(getContainerTop: () => number, getViewportHeight: () => number): ScrollAdapter {
    return {

        getScrollTop: () => Math.max(0, window.scrollY - getContainerTop()),

        scrollToIndex: (index) => {
            window.scrollTo({
                top: getContainerTop() + index * getViewportHeight(), behavior: "smooth"
            });
        },

        getScrollTarget: () => window,

        getOuterStyle: (length, vh) => ({
            height: length * vh
        })
    };
}

function createContainerAdapter(getContainer: () => HTMLDivElement | null, getViewportHeight: () => number): ScrollAdapter {
    return {

        getScrollTop: () => getContainer()?.scrollTop ?? 0,

        scrollToIndex: (index) => {
            getContainer()?.scrollTo({
                top: index * getViewportHeight(), behavior: "smooth"
            });
        },

        getScrollTarget: () => getContainer(),

        getOuterStyle: () => ({
            height: "100vh", overflowY: "auto"
        })
    };
}

// --- Component

export default function ListWithVirtualScroll({
                                                  elements,
                                                  visibleBuffer,
                                                  buttonScrollDisabled,
                                                  onIndexChange,
                                                  scrollMode = "window"
                                              }: {
    elements: ReactNode[];
    visibleBuffer: number;
    buttonScrollDisabled?: boolean;
    onIndexChange?: (index: number) => void;
    scrollMode?: ScrollMode;
}) {
    const isWindow = scrollMode === "window";

    const containerRef = useRef<HTMLDivElement | null>(null);

    const [currentFocusIndex, setCurrentFocusIndex] = useState(0);
    const [viewportHeight, setViewportHeight] = useState(window.innerHeight);
    const [containerTop, setContainerTop] = useState(0);
    const [scrollTop, setScrollTop] = useState(0);

    // --- Adapter (memoized)
    const adapter = useMemo(() => {
        const getVH = () => viewportHeight;
        const getTop = () => containerTop;
        const getContainer = () => containerRef.current;

        // eslint-disable-next-line react-hooks/refs
        return isWindow ? createWindowAdapter(getTop, getVH) : createContainerAdapter(getContainer, getVH);
    }, [isWindow, containerTop, viewportHeight]);

    // --- Metrics (resize + container position)
    useLayoutEffect(() => {
        const updateMetrics = () => {
            setViewportHeight(window.innerHeight);

            if (isWindow && containerRef.current) {
                setContainerTop(containerRef.current.offsetTop);
            }
        };

        updateMetrics();

        window.addEventListener("resize", updateMetrics);
        return () => window.removeEventListener("resize", updateMetrics);
    }, [isWindow]);


    useEffect(() => {
        const target = adapter.getScrollTarget();
        if (!target) return;

        const handleScroll = () => {
            const newScrollTop = adapter.getScrollTop();

            setScrollTop(newScrollTop);

            const newIndex = Math.max(0, Math.round(newScrollTop / viewportHeight));

            setCurrentFocusIndex(newIndex);
            onIndexChange?.(newIndex);
        };

        target.addEventListener("scroll", handleScroll);

        return () => {
            target.removeEventListener("scroll", handleScroll);
        };
    }, [adapter, viewportHeight, onIndexChange]);

    // --- Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (elements.length === 0 || buttonScrollDisabled) return;

            const isDown = event.key === "ArrowDown" || event.key === " " || event.code === "Space";

            const isUp = event.key === "ArrowUp";

            if (!isDown && !isUp) return;

            event.preventDefault();

            let nextIndex = currentFocusIndex;

            if (isDown) {
                nextIndex = Math.min(currentFocusIndex + 1, elements.length - 1);
            } else if (isUp) {
                nextIndex = Math.max(currentFocusIndex - 1, 0);
            }

            if (nextIndex !== currentFocusIndex) {
                adapter.scrollToIndex(nextIndex);
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [currentFocusIndex, elements.length, buttonScrollDisabled, adapter]);

    // --- Virtualization math
    const startIndex = Math.floor(scrollTop / viewportHeight);
    const endIndex = Math.ceil((scrollTop + viewportHeight) / viewportHeight);

    const visibleStart = Math.max(0, startIndex - visibleBuffer);
    const visibleEnd = Math.min(elements.length - 1, endIndex + visibleBuffer);

    const outerStyle = adapter.getOuterStyle(elements.length, viewportHeight);

    return (<div ref={containerRef} style={outerStyle}>
        <div
            style={{
                display: "flex",
                flexDirection: "column",
                gap: "5vh",
                transform: `translateY(${visibleStart * viewportHeight}px)`,
                paddingTop: "2.5vh"
            }}
        >
            {elements
                .slice(visibleStart, visibleEnd + 1)
                .map((element, index) => (<div
                    key={visibleStart + index}
                    style={{height: "95vh"}}
                >
                    {element}
                </div>))}
        </div>
    </div>);
}