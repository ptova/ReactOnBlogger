/**
 * Root application component.
 *
 * Layout structure (outside-in):
 * - ErrorBoundary catches any rendering errors in the tree and shows a fallback.
 * - BrowserRouter provides client-side routing via react-router-dom.
 * - CollapsibleHeader wraps the NavBar so it auto-hides on scroll-down.
 * - Routes maps URL paths to page components:
 *   • "/" → PostsContainer using the default (internal) source.
 *   • "/source/:sourceType" → PostsContainer with a dynamic source
 *     (e.g., "external" triggers the Apps Script proxy).
 *
 * Inline styles are used for the outer layout shell because Tailwind classes
 * for full-viewport gradients don't compose well with the Blogger theme
 * injection target.
 */
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { PostsContainer } from './components/PostsContainer';
import { CollapsibleHeader } from './components/CollapsibleHeader';
import { NavBar } from './components/NavBar';
import { ErrorBoundary } from './components/ErrorBoundary';

function App() {
    return (
        <ErrorBoundary>
            <BrowserRouter>
                <div style={{
                    minHeight: '100vh',
                    background: 'linear-gradient(to bottom right, #a855f7, #4f46e5)',
                }}>
                    <div style={{
                        maxWidth: '72rem',
                        margin: '0 auto',
                        padding: '0 1rem',
                    }}>
                        <CollapsibleHeader>
                            <NavBar />
                        </CollapsibleHeader>
                        <Routes>
                            <Route path="/" element={<PostsContainer />} />
                            <Route path="/source/:sourceType" element={<PostsContainer />} />
                        </Routes>
                    </div>
                </div>
            </BrowserRouter>
        </ErrorBoundary>
    );
}

export default App;
