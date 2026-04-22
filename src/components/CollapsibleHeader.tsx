import {useCallback, useEffect, useRef, useState} from 'react';

interface CollapsibleHeaderProps {
    postSource: 'internal' | 'external';
    onSourceChange: (source: 'internal' | 'external') => void;
}

export function CollapsibleHeader({postSource, onSourceChange}: CollapsibleHeaderProps) {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const lastScrollY = useRef(0);
    const ticking = useRef(false);
    const header = useRef(null);
    const handleScroll = useCallback(() => {
        if (ticking.current) {
            return;
        }
        requestAnimationFrame(() => {
            const currentScrollY = window.scrollY;

            // Compress when scrolling down past 50px
            if (currentScrollY > 50 && currentScrollY > lastScrollY.current) {

                setIsCollapsed(true);
            }
            // Expand when scrolling up
            else if (currentScrollY < lastScrollY.current) {
                setIsCollapsed(false);
            }

            lastScrollY.current = currentScrollY;
            ticking.current = false;
        });
        ticking.current = true;
    }, [])
    useEffect(() => {
        window.removeEventListener('scroll', handleScroll)
        setTimeout(() => window.addEventListener('scroll', handleScroll, {passive: true}),600)
    }, [handleScroll, isCollapsed]);
    useEffect(() => {
        window.addEventListener('scroll', handleScroll, {passive: true});
        return () => window.removeEventListener('scroll', handleScroll);
    }, [handleScroll]);


    return (<div
        ref={header}
        className={`sticky top-0 z-10 transition-all duration-500 ease-in-out ${isCollapsed ? 'bg-gray-900/98 backdrop-blur-md border-b border-gray-800 shadow-lg h-0 overflow-hidden p-0' : 'bg-gray-900/95 backdrop-blur-sm'}`}
    >
        <div
            className={`transition-all duration-500 ease-in-out overflow-hidden ${isCollapsed ? 'h-0 py-0 opacity-0' : 'py-4 opacity-100'}`}
        >
            <div className="container mx-auto px-4">
                <div className="flex justify-center gap-4">
                    <button
                        onClick={() => onSourceChange('internal')}
                        className={`px-6 py-3 rounded-lg border-2 transition-all duration-300 ${postSource === 'internal' ? 'border-purple-500 bg-purple-500/10 text-purple-300 shadow-lg shadow-purple-500/20' : 'border-gray-700 bg-gray-800/50 text-gray-400 hover:border-gray-600 hover:bg-gray-800/70 hover:text-gray-300'}`}
                    >
                        📄 Internal Posts
                    </button>
                    <button
                        onClick={() => onSourceChange('external')}
                        className={`px-6 py-3 rounded-lg border-2 transition-all duration-300 ${postSource === 'external' ? 'border-purple-500 bg-purple-500/10 text-purple-300 shadow-lg shadow-purple-500/20' : 'border-gray-700 bg-gray-800/50 text-gray-400 hover:border-gray-600 hover:bg-gray-800/70 hover:text-gray-300'}`}
                    >
                        🌐 External Posts
                    </button>
                </div>
            </div>
        </div>
    </div>);
}