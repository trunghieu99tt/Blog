import * as React from 'react';

const STORAGE_KEY = 'selectedFontFamily';
const DEFAULT_FONT = 'CMU Serif Roman';

export function useFontChooser() {
    const [selectedFont, setSelectedFont] =
        React.useState<string>(DEFAULT_FONT);
    const [hasMounted, setHasMounted] = React.useState(false);

    // Load saved font from localStorage on mount
    React.useEffect(() => {
        setHasMounted(true);
        try {
            const savedFont = localStorage.getItem(STORAGE_KEY);
            if (savedFont) {
                setSelectedFont(savedFont);
            }
        } catch (error) {
            console.warn(
                'Could not load font preference from localStorage:',
                error
            );
        }
    }, []);

    const changeFont = React.useCallback((fontFamily: string) => {
        setSelectedFont(fontFamily);

        // Save to localStorage
        try {
            localStorage.setItem(STORAGE_KEY, fontFamily);
        } catch (error) {
            console.warn(
                'Could not save font preference to localStorage:',
                error
            );
        }
    }, []);

    return {
        selectedFont: hasMounted ? selectedFont : DEFAULT_FONT,
        changeFont,
        hasMounted
    };
}
