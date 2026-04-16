const parser = new DOMParser();

const checkStatus = (response) => {
    if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
    }
    return response.text();
};

const gatherPosts = (html) => {
    const doc = parser.parseFromString(html, 'text/html');
    return [...doc.querySelectorAll('.post-outer')];
};

const parsePost = (postElement) => {
    // Extract JSON-LD data from script tag
    const scriptTag = postElement.querySelector('script[type="application/ld+json"]');
    let jsonLdData = {};
    if (scriptTag) {
        try {
            jsonLdData = JSON.parse(scriptTag.textContent);
        } catch (e) {
            console.error('Failed to parse JSON-LD:', e);
        }
    }

    // Extract labels from post-footer
    const labels = [];
    const labelLinks = postElement.querySelectorAll('.post-labels a[rel="tag"]');
    labelLinks.forEach(link => {
        const labelText = link.textContent.trim();
        if (labelText) {
            labels.push(labelText);
        }
    });

    // Extract ID from the anchor name attribute
    const idAnchor = postElement.querySelector('a[name]');
    const id = idAnchor ? idAnchor.getAttribute('name') : '';

    // Extract title from the post-title element
    const titleElement = postElement.querySelector('.post-title.entry-title');
    let title = '';
    if (titleElement) {
        const titleLink = titleElement.querySelector('a');
        title = titleLink ? titleLink.textContent.trim() : titleElement.textContent.trim();
    }

    // Extract content from the post-body
    const contentElement = postElement.querySelector('.post-body.entry-content');
    let content = contentElement.innerHTML.trim();


    // Get datePublished from JSON-LD or fallback to empty string
    const datePublished = jsonLdData.datePublished || '';

    return {
        title,
        content,
        id,
        labels,
        datePublished
    };
};

const handleError = (error) => {
    console.error('Failed to load posts:', error);
    return [];
};

const loadPosts = (url) =>
    fetch(url)
        .then(checkStatus)
        .then(gatherPosts)
        .then(posts => posts.map(parsePost))
        .catch(handleError);