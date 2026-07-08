const imageExtensions = /\.(jpg|jpeg|png|gif|webp|bmp|svg|ico)$/i;

/**
 * Strips the last two path segments from a Blogger-hosted image URL to request
 * the full-resolution version instead of a scaled thumbnail.
 *
 * Blogger serves resized images via URLs like:
 * ```
 * https://blogger.googleusercontent.com/img/b/…/s640/photo.jpg
 * ```
 * Removing `s640/photo.jpg` returns the original image.
 *
 * @param url - The raw image URL from the post content.
 * @returns The preprocessed URL (unchanged if it is not a recognised Blogger pattern).
 */
export function preprocessBloggerImageUrl(url: string): string {
    try {
        const urlObj = new URL(url);
        if (urlObj.hostname.includes('blogger.googleusercontent.com') && urlObj.pathname.includes('/img/')) {
            const segments = urlObj.pathname.split('/').filter(segment => segment.length > 0);
            const lastSegment = segments[segments.length - 1];
            if (imageExtensions.test(lastSegment)) {
                const newSegments = segments.slice(0, -2);
                urlObj.pathname = '/' + newSegments.join('/');
                return urlObj.toString();
            }
        }
    } catch {
        console.warn('Failed to parse URL:', url);
    }
    return url;
}
