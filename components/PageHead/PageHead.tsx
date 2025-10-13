import Head from 'next/head';
import Script from 'next/script';
import * as React from 'react';
import * as types from 'lib/types';
import * as config from 'lib/config';

interface Props extends types.PageProps {
    title?: string;
    socialImage?: string;
    socialDescription?: string;
    canonicalPageUrl?: string;
    isBlogPost?: boolean;
}

const PageHead: React.FC<Props> = ({
    site,
    title,
    socialImage,
    socialDescription,
    canonicalPageUrl,
    isBlogPost
}) => {
    return (
        <Head>
            <meta charSet='utf-8' />
            <meta httpEquiv='Content-Type' content='text/html; charset=utf-8' />
            <meta
                name='viewport'
                content='width=device-width, initial-scale=1, shrink-to-fit=no'
            />
            {config.facebook && (
                <meta name='facebook:creator' content={`@${config.facebook}`} />
            )}

            {site?.name && <meta property='og:site_name' content={site.name} />}

            {/* Use socialDescription if available, otherwise fallback to site.description */}
            {(socialDescription || site?.description) && (
                <>
                    <meta
                        name='description'
                        content={socialDescription || site.description}
                    />
                    <meta
                        property='og:description'
                        content={socialDescription || site.description}
                    />
                    <meta
                        name='twitter:description'
                        content={socialDescription || site.description}
                    />
                </>
            )}
            {socialImage ? (
                <>
                    <meta name='twitter:card' content='summary_large_image' />
                    <meta name='twitter:image' content={socialImage} />
                    <meta property='og:image' content={socialImage} />
                </>
            ) : (
                <meta name='twitter:card' content='summary' />
            )}
            {canonicalPageUrl && (
                <>
                    <link rel='canonical' href={canonicalPageUrl} />
                    <meta property='og:url' content={canonicalPageUrl} />
                    <meta property='twitter:url' content={canonicalPageUrl} />
                </>
            )}

            <title>{title}</title>
            {title && <meta property='og:title' content={title} />}

            <meta
                property='og:type'
                content={isBlogPost ? 'article' : 'website'}
            />

            {/* Load Umami analytics with proper privacy settings */}
            <Script
                src='https://cloud.umami.is/script.js'
                data-website-id='3580f550-d3be-4d55-ba73-12593758e87b'
                data-do-not-track='true'
                data-respect-dnt='true'
                strategy='afterInteractive'
            />
        </Head>
    );
};

export default PageHead;
