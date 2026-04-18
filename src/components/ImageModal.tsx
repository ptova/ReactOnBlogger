import * as React from 'react';
import {useEffect, useRef, useState} from 'react';
import {handleArrowsScroll, trackVisibleItemOnScroll} from "../shared/utils.ts";

interface ImageModalProps {
    imageUrls: string[];  // Changed from single imageUrl to array
    isOpen: boolean;
    onClose: () => void;
}


export default function ImageModal({imageUrls, isOpen, onClose}: ImageModalProps) {
    const [isAnimating, setIsAnimating] = useState(false);
    const [currentFocusIndex, setCurrentFocusIndex] = useState(0);
    const containerRefs = useRef<(HTMLDivElement | null)[]>([]);
    const scrollTimeoutRef = useRef<number | null>(null);

    // Update current focus index based on scroll position
    useEffect(() => {
        const scrollContainer = document.getElementById('modal-scroll-container');
        if (!scrollContainer) return;
        return trackVisibleItemOnScroll(imageUrls, scrollTimeoutRef, containerRefs, setCurrentFocusIndex, scrollContainer);
    }, [imageUrls]);


    useEffect(() => {

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && isOpen) {
                onClose();
            }
            handleArrowsScroll(event, currentFocusIndex, imageUrls, setCurrentFocusIndex, containerRefs);
        };
        if (isOpen) {
            document.body.style.overflow = 'hidden';
            window.addEventListener('keydown', handleKeyDown);
            Promise.resolve().then(() => setIsAnimating(true));
        } else {
            document.body.style.overflow = 'unset';
            window.removeEventListener('keydown', handleKeyDown);
            // Reset animation state when closing
            Promise.resolve().then(() => setIsAnimating(false));
            // Reset index when modal closes
            Promise.resolve().then(() => setCurrentFocusIndex(0));
        }
        return () => {
            document.body.style.overflow = 'unset';
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen, onClose, imageUrls.length, currentFocusIndex, imageUrls]);

    if (!isOpen) return null;

    const handleOverlayClick = (event: React.MouseEvent<HTMLDivElement>) => {
        if (event.target === event.currentTarget) {
            onClose();
        }
    };

    return (<div
        id="modal-scroll-container"
        style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            zIndex: 50,
            backdropFilter: 'blur(4px)',
            overflowY: 'auto',
            animation: isAnimating ? 'fadeIn 0.2s ease-out' : 'none'
        }}
        onClick={handleOverlayClick}
    >
        <div style={{
            position: "sticky", top: '1rem', height: 0, zIndex: 10,
        }}>
            <button
                onClick={onClose}
                style={{
                    position: 'absolute',
                    right: '1rem',
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                    color: 'white',
                    borderRadius: '9999px',
                    padding: '0.5rem',
                    transition: 'all 0.2s',
                    cursor: 'pointer',
                    backdropFilter: 'blur(4px)'
                }}
                aria-label="Close modal"
                onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.4)';
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
                }}
            >
                <svg
                    style={{width: '1.5rem', height: '1.5rem'}}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                    />
                </svg>
            </button>
            {/* Image counter indicator */}
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
                pointerEvents: 'none'
            }}>
                {currentFocusIndex + 1} / {imageUrls.length}
            </div>
        </div>
        <div
            style={{
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'start'
            }}
        >
            {imageUrls.map((imageUrl, index) => (<div
                key={index}
                data-image-index={index}
                ref={(el) => {
                    containerRefs.current[index] = el;
                }}
                style={{
                    minHeight: '100vh',
                    width: '100%',
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    scrollSnapAlign: 'start', // border: index === currentFocusIndex ? '2px solid rgba(255, 255, 255, 0.3)' : '2px solid transparent',
                    transition: 'border-color 0.2s ease'
                }}
            >
                <img
                    src={imageUrl}
                    alt={`Full size image ${index + 1}`}
                    style={{
                        maxWidth: '95vw',
                        maxHeight: '90vh',
                        width: 'auto',
                        height: 'auto',
                        objectFit: 'contain' as const,
                        borderRadius: '0.5rem',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                        opacity: index === currentFocusIndex ? 1 : 0.7,
                        transition: 'opacity 0.2s ease',
                        animationName: isAnimating ? 'scaleIn' : 'none',
                        animationDuration: '0.2s',
                        animationTimingFunction: 'ease-out',
                        animationDelay: isAnimating ? `${index * 0.05}s` : '0s',
                        animationFillMode: 'both'
                    }}
                />
            </div>))}
        </div>
        <style>{`
            @keyframes fadeIn {
              from {
                opacity: 0;
              }
              to {
                opacity: 1;
              }
            }
            @keyframes scaleIn {
              from {
                transform: scale(0.95);
                opacity: 0;
              }
              to {
                transform: scale(1);
                opacity: 1;
              }
            }
        `}</style>
    </div>);
}
