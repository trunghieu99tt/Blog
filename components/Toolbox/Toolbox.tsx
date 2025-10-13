import * as React from 'react';

// icons
import {
    IoSunnyOutline,
    IoMoonSharp,
    IoSettingsOutline,
    IoClose
} from 'react-icons/io5';

// components
import FontChooser from '../FontChooser/FontChooser';

// styles
import styles from './toolbox.module.css';

export interface ToolboxProps {
    isDarkMode: boolean;
    toggleDarkMode: () => void;
    onFontChange: (fontFamily: string) => void;
    selectedFont?: string;
    className?: string;
}

const Toolbox: React.FC<ToolboxProps> = ({
    isDarkMode,
    toggleDarkMode,
    onFontChange,
    selectedFont,
    className
}) => {
    const [isExpanded, setIsExpanded] = React.useState(false);
    const [hasMounted, setHasMounted] = React.useState(false);
    const musicPlayer = React.useRef<HTMLAudioElement | null>(null);
    const toolboxRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        setHasMounted(true);
    }, []);

    // Close toolbox when clicking outside
    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                toolboxRef.current &&
                !toolboxRef.current.contains(event.target as Node)
            ) {
                setIsExpanded(false);
            }
        };

        if (isExpanded) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isExpanded]);

    const toggleDarkModeCb = React.useCallback(
        (e: React.MouseEvent) => {
            e.preventDefault();
            e.stopPropagation();
            toggleDarkMode();
            musicPlayer.current?.play();
        },
        [toggleDarkMode, musicPlayer]
    );

    const toggleExpanded = React.useCallback(() => {
        setIsExpanded((prev) => !prev);
    }, []);

    const handleCalendlyClick = React.useCallback(
        async (e: React.MouseEvent) => {
            e.preventDefault();
            e.stopPropagation();

            if (typeof window === 'undefined') return;

            // Load Calendly dynamically only when needed
            if (!(window as any).Calendly) {
                // Load CSS
                const cssLink = document.createElement('link');
                cssLink.rel = 'stylesheet';
                cssLink.href =
                    'https://assets.calendly.com/assets/external/widget.css';
                document.head.appendChild(cssLink);

                // Load JS
                const script = document.createElement('script');
                script.src =
                    'https://assets.calendly.com/assets/external/widget.js';
                script.async = true;
                document.head.appendChild(script);

                // Wait for script to load
                await new Promise((resolve) => {
                    script.onload = resolve;
                });
            }

            // Show the widget
            if ((window as any).Calendly) {
                (window as any).Calendly.showPopupWidget(
                    'https://calendly.com/ricky_nguyen/30min'
                );
            }
        },
        []
    );

    // Don't render until mounted to prevent hydration mismatches
    if (!hasMounted) {
        return null;
    }

    return (
        <div
            ref={toolboxRef}
            className={`${styles.toolbox} ${className || ''}`}
            style={{
                fontFamily: selectedFont ? `"${selectedFont}"` : undefined
            }}
        >
            {/* Floating Toggle Button */}
            <button
                className={styles.toggleButton}
                onClick={toggleExpanded}
                title={isExpanded ? 'Close toolbox' : 'Open toolbox'}
                aria-label={isExpanded ? 'Close toolbox' : 'Open toolbox'}
                aria-expanded={isExpanded}
            >
                {isExpanded ? <IoClose /> : <IoSettingsOutline />}
            </button>

            {/* Expanded Toolbox */}
            {isExpanded && (
                <div className={styles.toolboxPanel}>
                    <div className={styles.toolboxHeader}>
                        <h3 className={styles.toolboxTitle}>Customize</h3>
                    </div>

                    <div className={styles.toolboxContent}>
                        {/* Theme Toggle */}
                        <div className={styles.toolItem}>
                            <label className={styles.toolLabel}>Theme</label>
                            <button
                                className={styles.themeToggle}
                                onClick={toggleDarkModeCb}
                                title='Toggle dark mode'
                                aria-label={`Switch to ${
                                    isDarkMode ? 'light' : 'dark'
                                } mode`}
                            >
                                <span className={styles.themeIcon}>
                                    {isDarkMode ? (
                                        <IoMoonSharp />
                                    ) : (
                                        <IoSunnyOutline />
                                    )}
                                </span>
                                <span className={styles.themeText}>
                                    {isDarkMode ? 'Dark' : 'Light'}
                                </span>
                            </button>
                        </div>

                        {/* Font Chooser */}
                        <div className={styles.toolItem}>
                            <label className={styles.toolLabel}>Font</label>
                            <div className={styles.fontWrapper}>
                                <FontChooser
                                    onFontChange={onFontChange}
                                    variant='inline'
                                />
                            </div>
                        </div>

                        {/* Calendly Button */}
                        <div className={styles.toolItem}>
                            <label className={styles.toolLabel}>
                                Let's Chat
                            </label>
                            <button
                                className={styles.calendlyButton}
                                onClick={handleCalendlyClick}
                                title='Schedule a coffee chat'
                                aria-label='Schedule a coffee chat'
                            >
                                ☕ Coffee talk with me!
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Hidden audio for theme toggle sound */}
            <div className={styles.music} style={{ display: 'none' }}>
                <audio src='./switch.mp3' ref={musicPlayer} controls />
            </div>
        </div>
    );
};

export default Toolbox;
