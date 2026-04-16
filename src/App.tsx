import {useEffect, useState} from 'react';
import './App.css';
import type {Post} from './types/post';
import {loadPosts} from './services/postService';
import LoadingSpinner from './components/LoadingSpinner';
import ErrorDisplay from './components/ErrorDisplay';
import PostCard from './components/PostCard';

const BASE_URL = import.meta.env.DEV
    ? "examplePostSource.html"
    : import.meta.env.VITE_API_URL;

function App() {
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchPosts = async () => {
            try {
                const data = await loadPosts(BASE_URL);
                setPosts(data);
                setLoading(false);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'An error occurred');
                setLoading(false);
            }
        };

        fetchPosts();
    }, []);

    if (loading) {
        return <LoadingSpinner/>;
    }

    if (error) {
        return <ErrorDisplay error={error}/>;
    }

    return (<div className="app">
            <header className="app-header">
                <h1>Posts Display</h1>
                <p className="post-count">Total posts: {posts.length}</p>
            </header>

            <main className="posts-container">
                {posts.map((post) => (<PostCard key={post.id} post={post}/>))}
            </main>
        </div>);
}

export default App;