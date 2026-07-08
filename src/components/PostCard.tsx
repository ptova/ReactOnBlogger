import type { Post } from '../types/Post';
import { useEffect, useRef } from 'react';
import { extractImageUrlsFromHtml } from '../shared/contentUtils';

interface PostCardProps {
    post: Post;
    /** Called when an image inside the post content is clicked, with all image URLs in the post. */
    onImageClick: (imageUrl: string[]) => void;
}

const articleStyles = ['h-[95vh]', 'bg-gray-900', 'rounded-xl', 'p-4', 'sm:p-6', 'md:p-8', 'shadow-lg', 'hover:shadow-xl', 'transition-all', 'duration-300', 'hover:-translate-y-1'].join(' ');
const titleStyles = ['text-gray-100', 'text-xl', 'sm:text-2xl', 'md:text-3xl', 'font-bold', 'mb-3', 'sm:mb-4', 'leading-tight', 'truncate', 'max-w-full'].join(' ');
const metaContainerStyles = ['mb-4', 'sm:mb-5', 'pb-3', 'sm:pb-4', 'border-b-2', 'border-gray-800'].join(' ');
const dateStyles = ['text-gray-400', 'text-sm', 'block', 'mb-3'].join(' ');
const labelsContainerStyles = ['flex', 'gap-2', 'flex-wrap', 'justify-evenly'].join(' ');
const labelStyles = ['bg-gradient-to-r', 'from-purple-500', 'to-indigo-600', 'text-white', 'px-3', 'py-1', 'rounded-full', 'text-xs', 'sm:text-sm', 'font-medium'].join(' ');
const separatorStyles = ['[&_.separator]:!p-0'].join(' ');
const imageStyles = ['[&_img]:!max-w-[100%]', '[&_img]:!max-h-[60vh]', '[&_iframe]:!min-h-[60vh]', '[&_img]:!w-auto', '[&_img]:!h-auto', '[&_img]:!rounded-lg', '[&_img]:!my-4'].join(' ');
const videoStyles = ['[&_iframe]:!max-w-[100%]', '[&_iframe]:!max-h-[60vh]', '[&_iframe]:!min-h-[60vh]', '[&_iframe]:!rounded-lg'].join(' ');
const imageLinkStyles = ['[&_a:has(img)]:!flex', '[&_a:has(img)]:!justify-center', '[&_a:has(img)]:!items-center', '[&_a:has(img)]:!cursor-pointer'].join(' ');
const paragraphStyles = '[&_p]:mb-4';
const linkStyles = ['[&_a]:text-indigo-400', '[&_a]:no-underline', '[&_a]:border-b', '[&_a]:border-transparent', '[&_a]:transition-colors', '[&_a:hover]:border-indigo-400'].join(' ');
const proseContentStyles = ['prose-content', 'text-gray-300', 'leading-relaxed', 'text-sm', 'sm:text-base', 'max-h-[70vh]', 'overflow-y-auto', imageStyles, imageLinkStyles, paragraphStyles, linkStyles, videoStyles, separatorStyles].join(' ');

/** Displays a single blog post as a full-viewport card with title, metadata, and rendered HTML content. */
export function PostCard({ post, onImageClick }: PostCardProps) {
    const contentRef = useRef<HTMLDivElement>(null);

    /**
     * Delegated click listener on the content container.
     * When an `<a>` wrapping an `<img>` is clicked, extracts all image URLs
     * from the post content and opens the image gallery modal.
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
                <div className={labelsContainerStyles}>
                    {post.labels.map((label, index) => (
                        <span key={index} className={labelStyles}>{label}</span>
                    ))}
                </div>
            </div>

            <div ref={contentRef} className={proseContentStyles}>
                <div dangerouslySetInnerHTML={{ __html: post.content }} />
            </div>
        </article>
    );
}
