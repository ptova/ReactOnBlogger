import type {JsonLdData, Post} from '../types/post';

const parser = new DOMParser();

export const gatherPosts = (html: string): Element[] => {
    const doc = parser.parseFromString(html, 'text/html');
    return [...doc.querySelectorAll('.post-outer')];
};

export const parsePost = (postElement: Element): Post => {
    // Extract JSON-LD data from script tag
    const scriptTag = postElement.querySelector('script[type="application/ld+json"]');
    let jsonLdData: JsonLdData = {};
    if (scriptTag) {
        try {
            jsonLdData = JSON.parse(scriptTag.textContent || '');
        } catch (e) {
            console.error('Failed to parse JSON-LD:', e);
        }
    }

    // Extract labels from post-footer
    const labels: string[] = [];
    const labelLinks = postElement.querySelectorAll('.post-labels a[rel="tag"]');
    labelLinks.forEach((link: Element) => {
        const labelText = link.textContent?.trim() || '';
        if (labelText) {
            labels.push(labelText);
        }
    });

    // Extract ID from the anchor name attribute
    const idAnchor = postElement.querySelector('a[name]');
    const id = idAnchor ? idAnchor.getAttribute('name') || '' : '';

    // Extract title from the post-title element
    const titleElement = postElement.querySelector('.post-title.entry-title');
    let title = '';
    if (titleElement) {
        const titleLink = titleElement.querySelector('a');
        title = titleLink ? titleLink.textContent?.trim() || '' : titleElement.textContent?.trim() || '';
    }

    // Extract content from the post-body
    const contentElement = postElement.querySelector('.post-body.entry-content');
    const content = contentElement?.innerHTML?.trim() || '';

    // Get datePublished from JSON-LD or fallback to empty string
    const datePublished = jsonLdData.datePublished || '';
    return {
        title, content, id, labels, datePublished
    };
};

const checkStatus = (response: Response): Promise<string> => {
    if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
    }
    return response.text();
};


export const loadPosts = (url: string): Promise<Post[]> => fetch(url)
    .then(checkStatus)
    .then(gatherPosts)
    .then(posts => posts.map(parsePost))
