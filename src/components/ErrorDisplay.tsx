interface ErrorDisplayProps {
    error: string;
}

function ErrorDisplay({ error }: ErrorDisplayProps) {
    return (
        <div className="error-container">
            <p>Error: {error}</p>
            <button onClick={() => window.location.reload()}>Retry</button>
        </div>
    );
}

export default ErrorDisplay;