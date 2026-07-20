import type { Post } from '../types/Post';
import { useEffect, useRef, useState } from 'react';
import { extractImageUrlsFromHtml } from '../shared/contentUtils';

interface PostCardProps {
    post: Post;
    /** Called when an image inside the post content is clicked, with all image URLs in the post. */
    onImageClick: (imageUrl: string[]) => void;
}

// Tailwind class strings are pre-built as constants to avoid object recreation
// on every render, which would break memo() optimisation in PostsContainer.
const articleStyles = ['h-[95vh]', 'bg-gray-900', 'rounded-xl', 'p-4', 'sm:p-6', 'md:p-8', 'shadow-lg', 'hover:shadow-xl', 'transition-all', 'duration-300', 'hover:-translate-y-1'].join(' ');
const titleStyles = ['text-gray-100', 'text-xl', 'sm:text-2xl', 'md:text-3xl', 'font-bold', 'mb-3', 'sm:mb-4', 'leading-tight', 'truncate', 'max-w-full'].join(' ');
const metaContainerStyles = ['mb-4', 'sm:mb-5', 'pb-3', 'sm:pb-4', 'border-b-2', 'border-gray-800'].join(' ');
const dateStyles = ['text-gray-400', 'text-sm', 'block', 'mb-3'].join(' ');
const labelsWrapperStyles = ['overflow-hidden', 'transition-all', 'duration-300', 'ease-in-out', 'relative'].join(' ');
const labelsContainerStyles = ['flex', 'gap-2', 'flex-wrap', 'justify-evenly'].join(' ');
const labelsContainerSingleStyles = ['flex', 'gap-2', 'flex-nowrap', 'justify-evenly'].join(' ');
const labelStyles = ['bg-gradient-to-r', 'from-purple-500', 'to-indigo-600', 'text-white', 'px-3', 'py-1', 'rounded-full', 'text-xs', 'sm:text-sm', 'font-medium', 'whitespace-nowrap'].join(' ');
const separatorStyles = ['[&_.separator]:!p-0'].join(' ');
const imageStyles = ['[&_img]:!max-w-[100%]', '[&_img]:!max-h-[60vh]', '[&_iframe]:!min-h-[60vh]', '[&_img]:!w-auto', '[&_img]:!h-auto', '[&_img]:!rounded-lg', '[&_img]:!my-4'].join(' ');
const videoStyles = ['[&_iframe]:!max-w-[100%]', '[&_iframe]:!max-h-[60vh]', '[&_iframe]:!min-h-[60vh]', '[&_iframe]:!rounded-lg'].join(' ');
const imageLinkStyles = ['[&_a:has(img)]:!flex', '[&_a:has(img)]:!justify-center', '[&_a:has(img)]:!items-center', '[&_a:has(img)]:!cursor-pointer'].join(' ');
const paragraphStyles = '[&_p]:mb-4';
const linkStyles = ['[&_a]:text-indigo-400', '[&_a]:no-underline', '[&_a]:border-b', '[&_a]:border-transparent', '[&_a]:transition-colors', '[&_a:hover]:border-indigo-400'].join(' ');
const proseContentStyles = ['prose-content', 'text-gray-300', 'leading-relaxed', 'text-sm', 'sm:text-base', 'max-h-[70vh]', 'overflow-y-auto', imageStyles, imageLinkStyles, paragraphStyles, linkStyles, videoStyles, separatorStyles].join(' ');

/**
 * Displays a single blog post as a full-viewport card.
 *
 * Layout (top to bottom):
 * 1. Title (truncated with ellipsis)
 * 2. Metadata: formatted date + labels with overflow indicator
 * 3. Rendered HTML content (from Blogger's post body)
 *
 * Image click handling uses event delegation: a single click listener on the
 * content container checks if the click target is an `<a>` wrapping an `<img>`,
 * and if so, opens the image gallery modal with all post images.
 */
export function PostCard({ post, onImageClick }: PostCardProps) {
    const contentRef = useRef<HTMLDivElement>(null);
    const [hoveringLabels, setHoveringLabels] = useState(false);
    const labelsRef = useRef<HTMLDivElement>(null);
    /** Whether the labels row overflows its container (hides the "+N" indicator when false). */
    const [overflows, setOverflows] = useState(false);

    // Measure whether labels overflow after render.
    // scrollWidth > clientWidth means content is wider than the visible area.
    useEffect(() => {
        const el = labelsRef.current;
        if (el) setOverflows(el.scrollWidth > el.clientWidth);
    }, [post.labels]);

    /**
     * Delegated click listener on the content container.
     * When an `<a>` wrapping an `<img>` is clicked, extracts all image URLs
     * from the post content and opens the image gallery modal.
     *
     * Event delegation is used instead of per-image listeners because the
     * content is injected via dangerouslySetInnerHTML, so we can't attach
     * React event handlers to inner elements.
     */
    useEffect(() => {
        const contentDiv = contentRef.current;
        if (!contentDiv) return;

        const handleClick = (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            const link = target.closest('a');
            const img = target.closest('img') ?? target.querySelector('img');
            if (!link || !img) return;

            event.preventDefault();
            onImageClick(extractImageUrlsFromHtml(post.content));
        };

        contentDiv.addEventListener('click', handleClick);
        return () => contentDiv.removeEventListener('click', handleClick);
    }, [post.content, onImageClick]);

    return (
        <article className={articleStyles} tabIndex={-1} style={{ outline: 'none' }}>
            <h2 className={titleStyles} title={post.title}>
                {post.title}
            </h2>

            <div className={metaContainerStyles}>
                <span className={dateStyles}>
                    {new Date(post.datePublished).toLocaleDateString('en-US', {
                        year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
                    })}
                </span>
                {/*
                  Labels container with expand-on-hover.
                  By default, labels are in a single row with overflow hidden.
                  On hover, max-height expands to reveal all labels (calculated
                  as labelCount * 2rem + 1rem padding).
                */}
                <div
                    className={labelsWrapperStyles}
                    style={{ maxHeight: hoveringLabels ? (post.labels.length * 2 + 1) + 'rem' : '2rem' }}
                    onMouseEnter={() => setHoveringLabels(true)}
                    onMouseLeave={() => setHoveringLabels(false)}
                >
                    <div ref={labelsRef} className={hoveringLabels ? labelsContainerStyles : labelsContainerSingleStyles}>
                        {post.labels.map((label, index) => (
                            <span key={index} className={labelStyles}>{label}</span>
                        ))}
                    </div>
                    {/*
                      "+N" overflow indicator: shown when labels don't fit in one row
                      and the user isn't hovering. Uses a gradient fade from the
                      card background to transparent so it blends seamlessly.
                    */}
                    {overflows && !hoveringLabels && (
                        <div style={{
                            position: 'absolute', right: 0, top: 0,
                            background: 'linear-gradient(to left, #111827, transparent)',
                            paddingLeft: '2rem', height: '100%', display: 'flex', alignItems: 'center',
                        }}>
                            <span className={labelStyles}>+{post.labels.length - 1}</span>
                        </div>
                    )}
                </div>
            </div>

            <div ref={contentRef} className={proseContentStyles}>
                <div dangerouslySetInnerHTML={{ __html: post.content }} />
            </div>
        </article>
    );
}
