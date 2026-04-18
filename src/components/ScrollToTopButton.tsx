import {useEffect, useState} from "react";

interface ScrollToTopButtonProps {
    threshold?: number; // Optional custom scroll threshold
}

const buttonStyles = ['fixed bottom-4 right-4', 'bg-gray-200/20 hover:bg-gray-100/30 backdrop-blur-sm', 'text-gray-400 hover:text-gray-100', 'rounded-full p-3 shadow-lg', 'transition-all duration-300 z-50', 'focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2'].join(' ');

export function ScrollToTopButton({threshold = 300}: ScrollToTopButtonProps) {
    const [showButton, setShowButton] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setShowButton(window.scrollY > threshold);
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, [threshold]);

    const scrollToTop = () => {
        window.scrollTo({
            top: 0, behavior: 'smooth'
        });
    };

    if (!showButton) return null;

    return (<button
        onClick={scrollToTop}
        className={buttonStyles}
        aria-label="Scroll to top"
    >
        <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
        >
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 10l7-7m0 0l7 7m-7-7v18"
            />
        </svg>
    </button>);
}