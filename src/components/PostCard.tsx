import type {Post} from '../types/post';

interface PostCardProps {
    post: Post;
}

function PostCard({ post }: PostCardProps) {
    return (
        <article className="post-card">
            <h2 className="post-title">{post.title}</h2>

            <div className="post-meta">
        <span className="post-date">
          {new Date(post.datePublished).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
          })}
        </span>
                <div className="post-labels">
                    {post.labels.map((label, index) => (
                        <span key={index} className="label">
              {label}
            </span>
                    ))}
                </div>
            </div>

            <div className="post-content">
                <div dangerouslySetInnerHTML={{ __html: post.content }} />
            </div>
        </article>
    );
}

export default PostCard;