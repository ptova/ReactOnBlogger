/**
 * Extracts all image URLs from raw HTML content, handling both `src` and
 * the Blogger-specific `data-info` attribute (which may contain an array
 * of higher-resolution URLs encoded as a JS-like string with single quotes).
 *
 * @param html - Raw HTML string (e.g. post body content).
 * @returns Deduplicated array of image URLs.
 */
export function extractImageUrlsFromHtml(html: string): string[] {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const imgs = doc.querySelectorAll('img');
    const urls: string[] = [];

    for (const img of imgs) {
        if (!img.src) continue;

        try {
            const raw = img.getAttribute('data-info');
            if (raw) {
                const parsed = JSON.parse(raw.replace(/'([^']*)'/g, '"$1"'));
                if (Array.isArray(parsed)) {
                    urls.push(...parsed);
                    continue;
                }
            }
        } catch {
            // data-info wasn't valid JSON; fall through to img.src
        }

        urls.push(img.src);
    }

    return [...new Set(urls)];
}
