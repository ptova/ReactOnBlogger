// Loading spinner container styles
const loadingContainerStyles = ['flex', 'flex-col', 'items-center', 'justify-center', 'min-h-screen', 'text-white'].join(' ');

// Spinner styles
const spinnerStyles = ['w-12', 'h-12', 'border-4', 'border-white/30', 'border-t-white', 'rounded-full', 'animate-spin', 'mb-5'].join(' ');

function LoadingSpinner() {
    return (<div className={loadingContainerStyles}>
            <div className={spinnerStyles}></div>
            <p>Loading posts...</p>
        </div>);
}

export default LoadingSpinner;