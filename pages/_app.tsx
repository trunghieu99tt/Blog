// global styles shared across the entire site
import 'styles/global.css';

// core styles shared by all of react-notion-x (required)
import 'react-notion-x/src/styles.css';

// used for code syntax highlighting (optional)
import 'prismjs/themes/prism-coy.css';

// this might be better for dark mode
// import 'prismjs/themes/prism-okaidia.css'

// used for collection views selector (optional)
// TODO: re-add if we enable collection view dropdowns
// import 'rc-dropdown/assets/index.css'

// used for rendering equations (optional)
import 'katex/dist/katex.min.css';

// core styles for static tweet renderer (optional)
import 'react-static-tweets/styles.css';

// global style overrides for prism theme (optional)
import 'styles/prism-theme.css';

// global style overrides for notion
import 'styles/notion.css';

// here we're bringing in any languages we want to support for
// syntax highlighting via Notion's Code block
import 'prismjs';
import 'prismjs/components/prism-markup';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-c';
import 'prismjs/components/prism-java';

import React from 'react';
import { useRouter } from 'next/router';
import { bootstrap } from 'lib/bootstrap-client';
import { fathomId, fathomConfig, isDev } from 'lib/config';
import * as Fathom from 'fathom-client';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { Analytics } from '@vercel/analytics/next';

if (typeof window !== 'undefined') {
    bootstrap();

    // Handle browser extension runtime errors
    if (
        typeof (window as any).chrome !== 'undefined' &&
        (window as any).chrome.runtime &&
        (window as any).chrome.runtime.lastError
    ) {
        // Silently ignore extension runtime errors
        (window as any).chrome.runtime.lastError = undefined;
    }
}

export default function App({ Component, pageProps }) {
    const router = useRouter();

    React.useEffect(() => {
        if (fathomId) {
            Fathom.load(fathomId, fathomConfig);

            function onRouteChangeComplete() {
                Fathom.trackPageview();
            }

            router.events.on('routeChangeComplete', onRouteChangeComplete);

            return () => {
                router.events.off('routeChangeComplete', onRouteChangeComplete);
            };
        }
    }, []);

    return (
        <>
            <Component {...pageProps} />
            {/* Only load Vercel analytics in production and when not blocked */}
            {!isDev && (
                <>
                    <SpeedInsights />
                    <Analytics />
                </>
            )}
        </>
    );
}
