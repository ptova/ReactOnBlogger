/**
 * Extracts all image URLs from raw HTML content, handling both standard `src`
 * attributes and the Blogger-specific `data-info` attribute.
 *
 * Blogger's image editor stores higher-resolution URL variants in a `data-info`
 * attribute as a JSON-like array with single quotes (not standard JSON).
 * This function normalises those single quotes to double quotes before parsing,
 * falling back to `img.src` when the attribute is absent or malformed.
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
            // Blogger stores alternative URLs in data-info as a JS-style
            // array with single quotes, e.g. ['url1', 'url2']. Normalise
            // to valid JSON before parsing.
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

    // Deduplicate using a Set, which preserves insertion order.
    return [...new Set(urls)];
}
