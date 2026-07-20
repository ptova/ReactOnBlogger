interface ErrorDisplayProps {
    /** Error message to display. */
    error: string | null;
}

/**
 * Inline error display with a retry button.
 * Shown below the post list when a fetch fails (e.g., network error, CORS).
 * Retry simply reloads the page to reset all state, which is the safest
 * recovery path since partial state could be inconsistent.
 */
export function ErrorDisplay({ error }: ErrorDisplayProps) {
    return (
        <div className="flex flex-col items-center justify-center text-white text-center p-5">
            <p>Error: {error}</p>
            <button
                onClick={() => window.location.reload()}
                className="mt-5 px-5 py-2.5 bg-white text-[#667eea] border-none rounded-md text-base cursor-pointer transition-transform duration-200 hover:scale-105"
            >
                Retry
            </button>
        </div>
    );
}
