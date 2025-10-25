import * as React from 'react';
import * as types from '../lib/types';

interface CustomFontProps {
    site: types.Site;
    fontFamily?: string; // Allow overriding the site's font family
}

// Define Google Fonts (fonts that need to be loaded from Google Fonts)
// Only fonts actually available in FontChooser
const GOOGLE_FONTS = [
    'Mali',
    'Poppins',
    'Roboto',
    'Space Grotesk',
    'Source Code Pro',
    'Crimson Text'
];

// Keep track of loaded fonts to prevent reloading
const loadedFonts = new Set<string>();

// Check if fonts are already loaded (they should be preloaded in _document.tsx)
const checkFontsReady = async (): Promise<boolean> => {
    if (typeof window === 'undefined' || !('fonts' in document)) return true;

    try {
        // Wait for all fonts to be ready
        await document.fonts.ready;
        return true;
    } catch {
        return true; // Fallback if FontFace API not supported
    }
};

export const CustomFont: React.FC<CustomFontProps> = ({ site, fontFamily }) => {
    // Use provided fontFamily prop, fallback to site config, then to default
    const effectiveFontFamily = fontFamily || site.fontFamily;
    const [fontLoaded, setFontLoaded] = React.useState(false);

    // Wait for fonts to be ready (they're preloaded in _document.tsx)
    React.useEffect(() => {
        if (!effectiveFontFamily) return;

        const isGoogleFont = GOOGLE_FONTS.includes(effectiveFontFamily);

        if (isGoogleFont) {
            // Check if font is already loaded from preload
            if (loadedFonts.has(effectiveFontFamily)) {
                setFontLoaded(true);
                return;
            }

            // Wait for fonts to be ready (they should already be loading)
            checkFontsReady().then(() => {
                loadedFonts.add(effectiveFontFamily);
                setFontLoaded(true);
            });
        } else {
            // For non-Google fonts (system fonts), consider them immediately ready
            setFontLoaded(true);
        }
    }, [effectiveFontFamily]);

    // Apply font styles only when font is ready
    React.useEffect(() => {
        if (!effectiveFontFamily || !fontLoaded) return;

        // Create or update the dynamic font style
        const styleId = 'dynamic-font-style';
        let styleElement = document.getElementById(styleId) as HTMLStyleElement;

        if (!styleElement) {
            styleElement = document.createElement('style');
            styleElement.id = styleId;
            document.head.appendChild(styleElement);
        }

        const cssFontFamily = `"${effectiveFontFamily}"`;

        // Define font-specific sizes to normalize appearance
        const getFontSize = (fontFamily: string): string => {
            switch (fontFamily) {
                case 'CMU Serif Roman':
                case 'Crimson Text':
                    return '107.5%';
                case 'CMU Typewriter':
                case 'CMU Unicode Normal':
                    return '102.5%';
                case 'Source Code Pro':
                    return '95%';
                default:
                    return '100%';
            }
        };

        const fontSize = getFontSize(effectiveFontFamily);

        styleElement.textContent = `
            body {
                font-family: ${cssFontFamily}, -apple-system, BlinkMacSystemFont,
                  'Segoe UI', Helvetica, 'Apple Color Emoji', Arial, sans-serif,
                  'Segoe UI Emoji', 'Segoe UI Symbol' !important;
                font-size: ${fontSize} !important;
            }

            .notion.notion-app {
             font-family: ${cssFontFamily}, -apple-system, BlinkMacSystemFont,
                  'Segoe UI', Helvetica, 'Apple Color Emoji', Arial, sans-serif,
                  'Segoe UI Emoji', 'Segoe UI Symbol' !important;
                font-size: ${fontSize} !important;
            }

            /* Specific overrides for components that might have their own font declarations */
            .searchBarContainer,
            .searchInput,
            .sidebar,
            .tag,
            .monthItem,
            .blogCard,
            .cardTitle,
            .cardDescription,
            .cardTags,
            .cardTag,
            .cardDate {
                font-family: inherit !important;
            }
        `;
    }, [effectiveFontFamily, fontLoaded]);

    // Don't render anything in Head since we're handling font loading manually
    return null;
};
