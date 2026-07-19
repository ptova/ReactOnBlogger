import { useCallback, useEffect, useRef, useState } from 'react';
import type { MouseEvent } from 'react';
import { ListWithVirtualScroll } from './ListWithVirtualScroll';
import { preprocessBloggerImageUrl } from '../shared/imageUtils';

interface ImageModalProps {
    imageUrls: string[];
    isOpen: boolean;
    onClose: () => void;
}

function ImagePlaceholder({ size }: { size: number }) {
    return (
        <div
            style={{
                width: size,
                height: size,
                border: '4px solid rgba(255, 255, 255, 0.15)',
                borderTopColor: 'white',
                borderRadius: '50%',
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                animation: 'imgSpin 0.8s linear infinite',
                opacity: 0.6,
            }}
        />
    );
}

function ImageWithPlaceholder({ src, alt }: { src: string; alt: string }) {
    const [loaded, setLoaded] = useState<Record<string, boolean>>({});
    const isLoaded = loaded[src];

    return (
        <>
            {!isLoaded && <ImagePlaceholder size={48} />}
            <img
                src={src}
                alt={alt}
                onLoad={() => setLoaded((prev) => ({ ...prev, [src]: true }))}
                style={{
                    maxWidth: '95vw',
                    maxHeight: '90vh',
                    width: isLoaded ? 'auto' : 0,
                    height: isLoaded ? 'auto' : 0,
                    objectFit: 'contain',
                    borderRadius: '0.5rem',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                    visibility: 'visible',
                }}
            />
        </>
    );
}

export function ImageModal({ imageUrls, isOpen, onClose }: ImageModalProps) {
    const [currentFocusIndex, setCurrentFocusIndex] = useState(0);
    const hasPushedRef = useRef(false);

    useEffect(() => {
        if (isOpen && !hasPushedRef.current) {
            history.pushState({ modal: true }, '');
            hasPushedRef.current = true;
        }
    }, [isOpen]);

    useEffect(() => {
        const handlePopState = () => {
            if (hasPushedRef.current) {
                hasPushedRef.current = false;
                onClose();
            }
        };
        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, [onClose]);

    const handleClose = useCallback(() => {
        if (history.state?.modal) {
            history.back();
        } else {
            onClose();
        }
    }, [onClose]);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && isOpen) {
                handleClose();
            }
        };

        if (isOpen) {
            document.body.style.overflow = 'hidden';
            window.addEventListener('keydown', handleKeyDown);
        } else {
            document.body.style.overflow = 'unset';
            window.removeEventListener('keydown', handleKeyDown);
        }

        return () => {
            document.body.style.overflow = 'unset';
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen, handleClose]);

    if (!isOpen) return null;

    const handleOverlayClick = (event: MouseEvent<HTMLDivElement>) => {
        if (event.target === event.currentTarget) {
            onClose();
        }
    };

    const onIndexChange = (newIndex: number) => setCurrentFocusIndex(newIndex);

    const elements = imageUrls.map((imageUrl, index) => {
        const processedUrl = preprocessBloggerImageUrl(imageUrl);
        return (
            <div
                key={index}
                data-image-index={index}
                style={{
                    minHeight: '95vh',
                    width: '100%',
                    position: 'relative',
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    scrollSnapAlign: 'start',
                }}
            >
                <ImageWithPlaceholder
                    src={processedUrl}
                    alt={`Full size image ${index + 1}`}
                />
            </div>
        );
    });

    return (
        <div
            id="modal-scroll-container"
            style={{
                position: 'fixed',
                inset: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.9)',
                zIndex: 50,
                backdropFilter: 'blur(4px)',
                overflowY: 'auto',
            }}
            onClick={handleOverlayClick}
        >
            <div style={{ position: 'sticky', top: '1rem', height: 0, zIndex: 10 }}>
                <button
                    onClick={handleClose}
                    style={{
                        position: 'absolute',
                        right: '1rem',
                        backgroundColor: 'rgba(255, 255, 255, 0.2)',
                        color: 'white',
                        borderRadius: '9999px',
                        padding: '0.5rem',
                        transition: 'all 0.2s',
                        cursor: 'pointer',
                        backdropFilter: 'blur(4px)',
                    }}
                    aria-label="Close modal"
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.4)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)'; }}
                >
                    <svg style={{ width: '1.5rem', height: '1.5rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
                <div style={{
                    position: 'absolute',
                    top: '1rem',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    backgroundColor: 'rgba(0, 0, 0, 0.7)',
                    color: 'white',
                    padding: '0.5rem 1rem',
                    borderRadius: '9999px',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    backdropFilter: 'blur(4px)',
                    pointerEvents: 'none',
                }}>
                    {currentFocusIndex + 1} / {imageUrls.length}
                </div>
            </div>
            <ListWithVirtualScroll
                elements={elements}
                visibleBuffer={5}
                onIndexChange={onIndexChange}
                scrollMode="container"
            />
            <style>{`
                @keyframes imgSpin {
                    to { transform: translate(-50%, -50%) rotate(360deg); }
                }
            `}</style>
        </div>
    );
}
