interface ErrorDisplayProps {
    /** Error message to display. */
    error: string | null;
}

/** Shows an error message with a retry button that reloads the page. */
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
