/** Full-page loading indicator shown while posts are being fetched. */
export function LoadingSpinner() {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen text-white">
            <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin mb-5" />
            <p>Loading posts...</p>
        </div>
    );
}
