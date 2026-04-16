function listener() {

    /* ================================
          CONFIGURATION CONSTANTS
       ================================= */
    const CONFIG = {
        VIRTUAL_SCROLL: {
            BUFFER_SIZE: 2
        }, SCROLL: {
            THRESHOLD_PX: 500, DEBOUNCE_MS: 10, INITIAL_DELAY_MS: 500
        }, ANIMATION: {
            SPINNER_SIZE_PX: 30, SPINNER_BORDER_PX: 3, LOADING_DURATION_SEC: 1, POST_FADE_DURATION_SEC: 0.5
        }, COLORS: {
            SPINNER_MAIN: '#2196f3', SPINNER_BG: 'rgba(33, 150, 243, 0.3)', ERROR: '#f44336'
        }, SELECTORS: {
            POSTS_CONTAINER: '.blog-posts',
            POST_ELEMENT: '.post-outer',
            PAGER: '.blog-pager',
            OLDER_POSTS_LINK: '.blog-pager-older-link'
        }, TEXT: {
            LOADING: 'Loading more posts...', NO_MORE_POSTS: 'No more posts to load', ERROR: 'Error loading posts'
        }, TIMING: {
            ERROR_REMOVE_MS: 3000
        }
    };

    /* ================================
          VIRTUAL VISIBILITY FUNCTIONS
       ================================= */

    function isElementInViewport(element) {
        const rect = element.getBoundingClientRect();
        return (rect.top < (window.innerHeight || document.documentElement.clientHeight) && rect.bottom > 0);
    }

    function updateVirtualVisibility(buffer = CONFIG.VIRTUAL_SCROLL.BUFFER_SIZE) {
        const elements = document.querySelectorAll(CONFIG.SELECTORS.POST_ELEMENT);
        let first = -1;
        let last = -1;

        elements.forEach((el, i) => {
            if (isElementInViewport(el)) {
                if (first === -1) first = i;
                last = i;
            }
        });

        if (first === -1) return;

        const hideBefore = Math.max(0, first - buffer);
        const hideAfter = last + buffer + 1;

        //  Preserve scroll position relative to first visible element
        const firstVisibleEl = elements[first];
        const prevOffset = firstVisibleEl.getBoundingClientRect().top;

        elements.forEach((el, i) => {
            el.classList.toggle('hidden', i < hideBefore || i >= hideAfter);
        });

        // Adjust scroll so first visible element stays in place
        const newOffset = firstVisibleEl.getBoundingClientRect().top;
        window.scrollBy(0, newOffset - prevOffset);
    }


    /* ================================
           INFINITE SCROLL SETUP
        ================================= */

    // Hide the traditional pagination (if it exists)
    const blogPager = document.querySelector(CONFIG.SELECTORS.PAGER);
    if (blogPager) {
        blogPager.style.display = 'none';
    }

    // Find the "Older Posts" link
    const olderLink = document.querySelector(CONFIG.SELECTORS.OLDER_POSTS_LINK);
    if (olderLink) {
        window.nextPageUrl = olderLink.href;
    }

    let isLoading = false;
    let lastLoadedUrl = null; // Track the last successfully loaded URL

    //  NEW: Check if we need to fetch based on buffer count
    function checkBufferAndFetch() {
        if (isLoading || !window.nextPageUrl) return false;
        if (window.nextPageUrl === lastLoadedUrl) {
            console.log('Skipping load - same URL as last loaded page');
            return false;
        }

        const elements = document.querySelectorAll(CONFIG.SELECTORS.POST_ELEMENT);
        let firstVisible = -1;
        let lastVisible = -1;
        let totalElements = elements.length;

        elements.forEach((el, i) => {
            if (isElementInViewport(el)) {
                if (firstVisible === -1) firstVisible = i;
                lastVisible = i;
            }
        });

        // If no elements are visible yet (page just loaded), use 0
        if (firstVisible === -1) firstVisible = 0;
        if (lastVisible === -1) lastVisible = 0;

        // Calculate forward buffer: elements after last visible that are NOT hidden
        const forwardBufferElements = [];
        for (let i = lastVisible + 1; i < totalElements; i++) {
            if (!elements[i].classList.contains('hidden')) {
                forwardBufferElements.push(i);
            }
        }

        //  Check if forward buffer is below threshold
        if (forwardBufferElements.length < CONFIG.VIRTUAL_SCROLL.FETCH_THRESHOLD) {
            console.log(`Buffer low: ${forwardBufferElements.length} visible posts ahead, fetching more...`);
            loadNextPage();
            return true;
        }

        return false;
    }

    // Updated checkScroll to use buffer checking
    function checkScroll() {
        // Try buffer-based check first
        const shouldFetch = checkBufferAndFetch();

        // Fallback to scroll-based check if buffer check returns false
        // (this maintains backward compatibility)
        if (!(!shouldFetch && window.nextPageUrl && window.nextPageUrl !== lastLoadedUrl)) {
            return;
        }
        loadNextPage();

        // const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        // const windowHeight = window.innerHeight;
        // const docHeight = document.documentElement.scrollHeight;
        // if (docHeight - (scrollTop + windowHeight) < CONFIG.SCROLL.THRESHOLD_PX) {
        //     loadNextPage();
        // }
    }

    // Load the next page
    function loadNextPage() {
        if (isLoading || !window.nextPageUrl) return;

        // Prevent loading the same page twice (redundant check for safety)
        if (window.nextPageUrl === lastLoadedUrl) {
            console.log('Skipping load - same URL as last loaded page');
            return;
        }

        isLoading = true;

        // Show loading indicator
        const loadingIndicator = document.createElement('div');
        loadingIndicator.className = 'infinite-scroll-loading';
        loadingIndicator.innerHTML = `<div style="text-align: center; padding: 30px; color: #666;">${CONFIG.TEXT.LOADING}</div>`;
        document.querySelector(CONFIG.SELECTORS.POSTS_CONTAINER).appendChild(loadingIndicator);

        // Fetch the next page
        fetch(window.nextPageUrl)
            .then(response => response.text())
            .then(html => {
                const parser = new DOMParser();
                const doc = parser.parseFromString(html, 'text/html');

                // Find the main content container
                const mainContainer = document.querySelector(CONFIG.SELECTORS.POSTS_CONTAINER);
                if (!mainContainer) return;

                // Extract posts - adjust selector for Contempo template
                const newPosts = doc.querySelectorAll(CONFIG.SELECTORS.POST_ELEMENT);

                // Append each new post
                newPosts.forEach(post => {
                    // Check if post already exists
                    const postId = post.querySelector('[itemprop="postId"]')?.content || post.querySelector('a[name]')?.getAttribute('name');

                    if (postId && !document.querySelector(`[data-post-id="${postId}"]`)) {
                        const postClone = post.cloneNode(true);
                        postClone.setAttribute('data-post-id', postId);
                        mainContainer.appendChild(postClone);
                    }
                });

                // Track the URL that was just loaded
                lastLoadedUrl = window.nextPageUrl;

                // Update next page URL
                const newOlderLink = doc.querySelector(CONFIG.SELECTORS.OLDER_POSTS_LINK);
                let foundNextUrl = null;

                if (newOlderLink) {
                    foundNextUrl = newOlderLink.href;
                }

                window.nextPageUrl = foundNextUrl;

                // Remove loading indicator
                loadingIndicator.remove();
                isLoading = false;

                // If no more pages, show message
                if (!window.nextPageUrl) {
                    const noMorePosts = document.createElement('div');
                    noMorePosts.innerHTML = `<div style="text-align: center; padding: 20px; color: #888;">${CONFIG.TEXT.NO_MORE_POSTS}</div>`;
                    mainContainer.appendChild(noMorePosts);
                }

                //  IMPORTANT: update virtualization after new posts load
                updateVirtualVisibility();

                //  NEW: Immediately check if we need more posts after loading
                // This ensures continuous loading if user scrolls quickly
                setTimeout(checkBufferAndFetch, 100);

            })
            .catch(error => {
                console.error('Error loading next page:', error);
                loadingIndicator.innerHTML = `<div style="text-align: center; padding: 20px; color: ${CONFIG.COLORS.ERROR};">${CONFIG.TEXT.ERROR}</div>`;
                setTimeout(() => loadingIndicator.remove(), CONFIG.TIMING.ERROR_REMOVE_MS);
                isLoading = false;
            });
    }

    // Add CSS for loading animation
    const style = document.createElement('style');
    style.textContent = `
        .infinite-scroll-loading {
            text-align: center;
            padding: 40px;
            margin: 20px 0;
        }

        .infinite-scroll-loading::after {
            content: '';
            display: inline-block;
            width: ${CONFIG.ANIMATION.SPINNER_SIZE_PX}px;
            height: ${CONFIG.ANIMATION.SPINNER_SIZE_PX}px;
            border: ${CONFIG.ANIMATION.SPINNER_BORDER_PX}px solid ${CONFIG.COLORS.SPINNER_BG};
            border-radius: 50%;
            border-top-color: ${CONFIG.COLORS.SPINNER_MAIN};
            animation: infinite-scroll-spin ${CONFIG.ANIMATION.LOADING_DURATION_SEC}s ease-in-out infinite;
        }

        @keyframes infinite-scroll-spin {
            to { transform: rotate(360deg); }
        }

        .post-outer {
            animation: fadeInUp ${CONFIG.ANIMATION.POST_FADE_DURATION_SEC}s ease-out;
        }

        @keyframes fadeInUp {
            from {
                opacity: 0;
                transform: translateY(20px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
    `;
    document.head.appendChild(style);

    let scrollTimeout;
    window.addEventListener('scroll', function () {
        if (scrollTimeout) clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
            checkScroll();
            updateVirtualVisibility();
        }, CONFIG.SCROLL.DEBOUNCE_MS);
    });

    // Initial run
    setTimeout(() => {
        checkScroll();
        updateVirtualVisibility();
    }, CONFIG.SCROLL.INITIAL_DELAY_MS);
}
document.addEventListener('DOMContentLoaded', listener);
