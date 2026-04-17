import {useEffect, useState} from 'react';
import * as React from "react";

interface ImageModalProps {
    imageUrl: string;
    isOpen: boolean;
    onClose: () => void;
}

// ===== STYLE CONSTANTS =====
const overlayStyles = ['fixed inset-0', 'bg-black/90', 'z-50', 'flex items-center justify-center', 'p-4', 'backdrop-blur-sm'].join(' ');

const modalContainerStyles = ['relative', 'max-w-[95vw]', 'max-h-[95vh]', 'flex items-center justify-center'].join(' ');

const imageStyles = ['max-w-[95vw]', 'max-h-[95vh]', 'w-auto', 'h-auto', 'object-contain', 'rounded-lg', 'shadow-2xl'].join(' ');

const closeButtonStyles = ['absolute top-4 right-4', 'bg-white/10 hover:bg-white/20', 'text-white', 'rounded-full p-2', 'transition-all duration-200', 'cursor-pointer', 'z-10', 'backdrop-blur-sm'].join(' ');

const closeIconStyles = 'w-6 h-6';

export default function ImageModal({imageUrl, isOpen, onClose}: ImageModalProps) {
    const [isAnimating, setIsAnimating] = useState(false);

    useEffect(() => {
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && isOpen) {
                onClose();
            }
        };

        if (isOpen) {
            document.body.style.overflow = 'hidden';
            window.addEventListener('keydown', handleEscape);
            // Trigger animation after a microtask to avoid the warning
            Promise.resolve().then(() => setIsAnimating(true));
        } else {
            document.body.style.overflow = 'unset';
            window.removeEventListener('keydown', handleEscape);
            // Reset animation state when closing
            Promise.resolve().then(() => setIsAnimating(false));
        }

        return () => {
            document.body.style.overflow = 'unset';
            window.removeEventListener('keydown', handleEscape);
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const handleOverlayClick = (event: React.MouseEvent<HTMLDivElement>) => {
        if (event.target === event.currentTarget) {
            onClose();
        }
    };

    return (<div
        className={overlayStyles}
        onClick={handleOverlayClick}
        style={{
            animation: isAnimating ? 'fadeIn 0.2s ease-out' : 'none'
        }}
    >
        <button
            onClick={onClose}
            className={closeButtonStyles}
            aria-label="Close modal"
        >
            <svg
                className={closeIconStyles}
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
        <div className={modalContainerStyles}>
            <img
                src={imageUrl}
                alt="Full size image"
                className={imageStyles}
                style={{
                    animation: isAnimating ? 'scaleIn 0.2s ease-out' : 'none'
                }}
            />
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
    </div>);}