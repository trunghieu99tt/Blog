import React, { useEffect, useRef } from 'react';
import styles from './shareMenu.module.css';

interface ShareMenuProps {
    isOpen: boolean;
    onClose: () => void;
    onShare: (platform: 'facebook' | 'twitter' | 'copy') => void;
    position: { x: number; y: number };
}

export default function ShareMenu({
    isOpen,
    onClose,
    onShare,
    position
}: ShareMenuProps) {
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                menuRef.current &&
                !menuRef.current.contains(event.target as Node)
            ) {
                onClose();
            }
        };

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('keydown', handleEscape);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div
            ref={menuRef}
            className={styles.menu}
            style={{
                top: `${position.y}px`,
                left: `${position.x}px`
            }}
        >
            <button
                className={`${styles.menuItem} ${styles.facebook}`}
                onClick={() => onShare('facebook')}
            >
                <svg
                    className={styles.icon}
                    viewBox='0 0 24 24'
                    fill='currentColor'
                >
                    <path d='M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z' />
                </svg>
                <span>Facebook</span>
            </button>

            <button
                className={`${styles.menuItem} ${styles.twitter}`}
                onClick={() => onShare('twitter')}
            >
                <svg
                    className={styles.icon}
                    viewBox='0 0 24 24'
                    fill='currentColor'
                >
                    <path d='M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z' />
                </svg>
                <span>Twitter</span>
            </button>

            <button
                className={`${styles.menuItem} ${styles.copy}`}
                onClick={() => onShare('copy')}
            >
                <svg
                    className={styles.icon}
                    viewBox='0 0 24 24'
                    fill='none'
                    stroke='currentColor'
                >
                    <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth={2}
                        d='M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z'
                    />
                </svg>
                <span>Copy Link</span>
            </button>
        </div>
    );
}
