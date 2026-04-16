import type {Post} from '../types/post';

interface PostCardProps {
    post: Post;
}

// ===== STYLE CONSTANTS =====

// Article (card) styles
const articleStyles = ['bg-gray-900', 'rounded-xl', 'p-4', 'sm:p-6', 'md:p-8', 'shadow-lg', 'hover:shadow-xl', 'transition-all', 'duration-300', 'hover:-translate-y-1'].join(' ');

// Title styles
const titleStyles = ['text-gray-100', 'text-xl', 'sm:text-2xl', 'md:text-3xl', 'font-bold', 'mb-3', 'sm:mb-4', 'leading-tight', 'truncate', 'max-w-full'].join(' ');

// Meta section container
const metaContainerStyles = ['mb-4', 'sm:mb-5', 'pb-3', 'sm:pb-4', 'border-b-2', 'border-gray-800'].join(' ');

// Date styles
const dateStyles = ['text-gray-400', 'text-sm', 'block', 'mb-3'].join(' ');

// Labels container
const labelsContainerStyles = ['flex', 'gap-2', 'flex-wrap', 'justify-evenly'].join(' ');

// Individual label styles
const labelStyles = ['bg-gradient-to-r', 'from-purple-500', 'to-indigo-600', 'text-white', 'px-3', 'py-1', 'rounded-full', 'text-xs', 'sm:text-sm', 'font-medium'].join(' ');

// Separator styles (inside prose-content)
const separatorStyles = ['[&_.separator]:!p-0'].join(' ');

// Image styles (inside prose-content)
const imageStyles = ['[&_img]:!max-w-[100%]', '[&_img]:!max-h-[60vh]', '[&_iframe]:!min-h-[60vh]', '[&_img]:!w-auto', '[&_img]:!h-auto', '[&_img]:!rounded-lg', '[&_img]:!my-4'].join(' ');

// Video styles (inside prose-content)
const videoStyles = ['[&_iframe]:!max-w-[100%]', '[&_iframe]:!max-h-[60vh]', '[&_iframe]:!min-h-[60vh]', '[&_iframe]:!rounded-lg',].join(' ');

// Image link styles (centering images inside anchors)
const imageLinkStyles = ['[&_a:has(img)]:!flex', '[&_a:has(img)]:!justify-center', '[&_a:has(img)]:!items-center'].join(' ');

// Paragraph styles
const paragraphStyles = '[&_p]:mb-4';

// Regular text link styles
const linkStyles = ['[&_a]:text-indigo-400', '[&_a]:no-underline', '[&_a]:border-b', '[&_a]:border-transparent', '[&_a]:transition-colors', '[&_a:hover]:border-indigo-400'].join(' ');

// Prose content container (combines all content styles)
const proseContentStyles = ['prose-content', 'text-gray-300', 'leading-relaxed', 'text-sm', 'sm:text-base', 'max-h-[70vh]', 'overflow-y-auto', imageStyles, imageLinkStyles, paragraphStyles, linkStyles, videoStyles, separatorStyles].join(' ');




function PostCard({post}: PostCardProps) {
    return (<article className={articleStyles}>
        <h2 className={titleStyles} title={post.title}>
            {post.title}
        </h2>

        <div className={metaContainerStyles}>
                <span className={dateStyles}>
                    {new Date(post.datePublished).toLocaleDateString('en-US', {
                        year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
                    })}
                </span>

            <div className={labelsContainerStyles}>
                {post.labels.map((label, index) => (<span key={index} className={labelStyles}>
                            {label}
                        </span>))}
            </div>
        </div>

        <div className={proseContentStyles}>
            <div dangerouslySetInnerHTML={{__html: post.content}}/>
        </div>
    </article>);
}

export default PostCard;