import { Link } from 'react-router-dom';

/**
 * Top navigation bar with two links:
 * - "Home" → `/` (default internal source, HTML-scraped posts)
 * - "Follow" → `/source/external` (Blogger API via Apps Script proxy)
 *
 * Styled with a translucent dark background and backdrop blur to sit
 * cleanly over the gradient background defined in App.tsx.
 */
export function NavBar() {
    return (
        <nav className="bg-black/70 backdrop-blur-md rounded-xl p-3 px-6 mb-8 flex justify-between items-center flex-wrap gap-4 text-white font-bold">
            <Link
                to="/"
                className="text-2xl no-underline text-white hover:opacity-90 transition-opacity"
            >
                REACT On Blogger
            </Link>
            <div className="flex gap-6 items-center">
                <Link
                    to="/"
                    className="no-underline text-white px-3 py-2 rounded-lg hover:bg-white/10 transition-colors"
                >
                    Home
                </Link>
                <Link
                    to="/source/external"
                    className="no-underline text-white px-3 py-2 rounded-lg hover:bg-white/10 transition-colors"
                >
                    Follow
                </Link>
            </div>
        </nav>
    );
}
