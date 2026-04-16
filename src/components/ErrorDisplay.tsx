interface ErrorDisplayProps {
    error: string;
}

// Error container styles
const errorContainerStyles = ['flex', 'flex-col', 'items-center', 'justify-center', 'min-h-screen', 'text-white', 'text-center', 'p-5'].join(' ');

// Error button styles
const errorButtonStyles = ['mt-5', 'px-5', 'py-2.5', 'bg-white', 'text-[#667eea]', 'border-none', 'rounded-md', 'text-base', 'cursor-pointer', 'transition-transform', 'duration-200', 'hover:scale-105'].join(' ');

function ErrorDisplay({error}: ErrorDisplayProps) {
    return (<div className={errorContainerStyles}>
            <p>Error: {error}</p>
            <button
                onClick={() => window.location.reload()}
                className={errorButtonStyles}
            >
                Retry
            </button>
        </div>);
}

export default ErrorDisplay;