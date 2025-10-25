import * as React from 'react';
import { IoCheckmarkSharp } from 'react-icons/io5';
import styles from './fontChooser.module.css';

export interface FontOption {
    name: string;
    displayName: string;
    googleFont?: boolean;
    preview: string;
}

interface FontChooserProps {
    onFontChange?: (fontFamily: string) => void;
    className?: string;
    variant?: 'standalone' | 'inline';
}

const FONT_OPTIONS: FontOption[] = [
    {
        name: 'CMU Serif Roman',
        displayName: 'CMU Serif Roman',
        googleFont: false,
        preview: 'The quick brown fox jumps over the lazy dog'
    },
    {
        name: 'CMU Typewriter',
        displayName: 'CMU Typewriter',
        googleFont: false,
        preview: 'The quick brown fox jumps over the lazy dog'
    },
    {
        name: 'CMU Unicode Normal',
        displayName: 'CMU Unicode Normal',
        googleFont: false,
        preview: 'The quick brown fox jumps over the lazy dog'
    },
    {
        name: 'Spectral',
        displayName: 'Spectral',
        googleFont: true,
        preview: 'The quick brown fox jumps over the lazy dog'
    },
    {
        name: 'Space Grotesk',
        displayName: 'Space Grotesk',
        googleFont: true,
        preview: 'The quick brown fox jumps over the lazy dog'
    },
    {
        name: 'Source Code Pro',
        displayName: 'Source Code Pro',
        googleFont: true,
        preview: 'The quick brown fox jumps over the lazy dog'
    },
    {
        name: 'Mali',
        displayName: 'Mali',
        googleFont: true,
        preview: 'The quick brown fox jumps over the lazy dog'
    },
    {
        name: 'Poppins',
        displayName: 'Poppins',
        googleFont: true,
        preview: 'The quick brown fox jumps over the lazy dog'
    },
    {
        name: 'Roboto',
        displayName: 'Roboto',
        googleFont: true,
        preview: 'The quick brown fox jumps over the lazy dog'
    },
    {
        name: 'Crimson Text',
        displayName: 'Crimson Text',
        googleFont: true,
        preview: 'The quick brown fox jumps over the lazy dog'
    }
];

const STORAGE_KEY = 'selectedFontFamily';

const FontChooser: React.FC<FontChooserProps> = ({
    onFontChange,
    className,
    variant = 'standalone'
}) => {
    const [selectedFont, setSelectedFont] =
        React.useState<string>('CMU Serif Roman');
    const [isOpen, setIsOpen] = React.useState(false);
    const [hasMounted, setHasMounted] = React.useState(false);
    const dropdownRef = React.useRef<HTMLDivElement>(null);

    // Load saved font from localStorage on mount
    React.useEffect(() => {
        setHasMounted(true);
        try {
            const savedFont = localStorage.getItem(STORAGE_KEY);
            if (savedFont) {
                setSelectedFont(savedFont);
                if (onFontChange) {
                    onFontChange(savedFont);
                }
            }
        } catch (error) {
            console.warn(
                'Could not load font preference from localStorage:',
                error
            );
        }
    }, [onFontChange]);

    // Close dropdown when clicking outside
    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(event.target as Node)
            ) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    const handleFontSelect = React.useCallback(
        (fontName: string) => {
            setSelectedFont(fontName);
            setIsOpen(false);

            // Save to localStorage
            try {
                localStorage.setItem(STORAGE_KEY, fontName);
            } catch (error) {
                console.warn(
                    'Could not save font preference to localStorage:',
                    error
                );
            }

            // Notify parent component
            if (onFontChange) {
                onFontChange(fontName);
            }
        },
        [onFontChange]
    );

    const selectedFontOption = FONT_OPTIONS.find(
        (font) => font.name === selectedFont
    );

    // Don't render until mounted to prevent hydration mismatches
    if (!hasMounted) {
        return null;
    }

    return (
        <div
            className={`${styles.fontChooser} ${
                variant === 'inline' ? styles.inline : ''
            } ${className || ''}`}
            ref={dropdownRef}
        >
            <button
                className={styles.fontToggle}
                onClick={() => setIsOpen(!isOpen)}
                aria-label='Choose font family'
                aria-expanded={isOpen}
            >
                <span>
                    Font: {selectedFontOption?.displayName || selectedFont}
                </span>
                <span
                    className={`${styles.chevron} ${isOpen ? styles.open : ''}`}
                >
                    ▼
                </span>
            </button>

            {isOpen && (
                <div className={styles.fontDropdown}>
                    <div className={styles.fontList} role='listbox'>
                        {FONT_OPTIONS.map((font) => (
                            <button
                                key={font.name}
                                className={`${styles.fontOption} ${
                                    selectedFont === font.name
                                        ? styles.selected
                                        : ''
                                }`}
                                onClick={() => handleFontSelect(font.name)}
                                role='option'
                                aria-selected={selectedFont === font.name}
                                style={{
                                    fontFamily: font.googleFont
                                        ? `"${font.name}", -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`
                                        : `"${font.name}", serif`
                                }}
                            >
                                <div className={styles.fontInfo}>
                                    <div className={styles.fontName}>
                                        {font.displayName}
                                    </div>
                                    <div className={styles.fontPreview}>
                                        {font.preview}
                                    </div>
                                </div>
                                {selectedFont === font.name && (
                                    <IoCheckmarkSharp
                                        className={styles.checkmark}
                                    />
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default FontChooser;
