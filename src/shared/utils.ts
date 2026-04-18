export function trackVisibleItemOnScroll(imageUrls: unknown[], scrollTimeoutRef: React.RefObject<number | null>, containerRefs: React.RefObject<(HTMLDivElement | null)[]>, setCurrentFocusIndex: (value: (((prevState: number) => number) | number)) => void, scrollContainer: HTMLElement | Window) {
    if (imageUrls.length === 0) return;

    const handleScroll = () => {
        // Debounce scroll events for better performance
        if (scrollTimeoutRef.current) {
            clearTimeout(scrollTimeoutRef.current);
        }

        scrollTimeoutRef.current = setTimeout(() => {
            // Find the post that is most visible in the viewport
            let bestIndex = -1;
            let bestVisibility = 0;

            containerRefs.current.forEach((postRef, index) => {
                if (postRef) {
                    const rect = postRef.getBoundingClientRect();
                    const viewportHeight = window.innerHeight;

                    // Calculate how much of the element is visible in the viewport
                    const visibleTop = Math.max(0, rect.top);
                    const visibleBottom = Math.min(viewportHeight, rect.bottom);
                    const visibleHeight = Math.max(0, visibleBottom - visibleTop);
                    const totalHeight = rect.height;
                    const visibilityRatio = totalHeight > 0 ? visibleHeight / totalHeight : 0;

                    // Also consider how close the element is to the center of the viewport
                    const elementCenter = (rect.top + rect.bottom) / 2;
                    const viewportCenter = viewportHeight / 2;
                    const centerDistance = Math.abs(elementCenter - viewportCenter);
                    const centerScore = Math.max(0, 1 - (centerDistance / viewportHeight));

                    // Combine visibility ratio and center proximity for better selection
                    const score = visibilityRatio * 0.7 + centerScore * 0.3;

                    if (score > bestVisibility) {
                        bestVisibility = score;
                        bestIndex = index;
                    }
                }
            });

            if (bestIndex !== -1) {
                setCurrentFocusIndex(prevIndex => bestIndex !== prevIndex ? bestIndex : prevIndex);
            }
        }, 100);
    };

    scrollContainer.addEventListener('scroll', handleScroll, {passive: true});
    // Also run once on mount to set initial index
    handleScroll();

    return () => {
        scrollContainer.removeEventListener('scroll', handleScroll);
        if (scrollTimeoutRef.current) {
            clearTimeout(scrollTimeoutRef.current);
        }
    };
}

export function handleArrowsScroll(event: KeyboardEvent, currentFocusIndex: number, entries: unknown[], setCurrentFocusIndex: (value: (((prevState: number) => number) | number)) => void, containerRefs: React.RefObject<(HTMLDivElement | null)[]>) {
    const isDownArrow = event.key === 'ArrowDown' || event.key === ' ' || event.key === 'Spacebar' || event.code === 'Space';
    const isUpArrow = event.key === 'ArrowUp';

    if (!isDownArrow && !isUpArrow) return;

    event.preventDefault();

    let nextIndex = currentFocusIndex;

    if (isDownArrow) {
        nextIndex = currentFocusIndex === -1 ? 0 : Math.min(currentFocusIndex + 1, entries.length - 1);
    } else if (isUpArrow) {
        nextIndex = currentFocusIndex === -1 ? entries.length - 1 : Math.max(currentFocusIndex - 1, 0);
    }

    if (nextIndex !== currentFocusIndex) {
        setCurrentFocusIndex(nextIndex);
        const nextCard = containerRefs.current[nextIndex];
        if (nextCard) {
            nextCard.focus();
            // Optional: smooth scroll to the focused card
            nextCard.scrollIntoView({behavior: 'smooth', block: 'center'});
        }
    }
}