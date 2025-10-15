import * as React from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/router';
import { useSearchParam } from 'react-use';
import BodyClassName from 'react-body-classname';
import useDarkMode from 'use-dark-mode';
import { PageBlock } from 'notion-types';

// core notion renderer
import { NotionRenderer } from 'react-notion-x';

// utils
import { getBlockTitle } from 'notion-utils';
import { mapPageUrl, getCanonicalPageUrl } from 'lib/map-page-url';
import { mapNotionImageUrl } from 'lib/map-image-url';
import { getPageDescription } from 'lib/get-page-description';
import * as types from 'lib/types';
import * as config from 'lib/config';

// components
import { CustomFont } from './CustomFont';
import Loading from './Loading';
import PageHead from './PageHead';
import Footer from './Footer';
import ErrorPage from 'pages/404';
import Comment from './Comment';
import BlogHeader from './BlogHeader';
import { useFontChooser } from './FontChooser/useFontChooser';
import Toolbox from './Toolbox';
import InteractionButtons from './InteractionButtons';
import { CustomHomePage } from './CustomHomePage';

const Code = dynamic(
    () =>
        import('./MermaidCodeBlock').then(async (m) => {
            // additional prism syntaxes
            await Promise.all([
                import('prismjs/components/prism-markup-templating.js'),
                import('prismjs/components/prism-markup.js'),
                import('prismjs/components/prism-bash.js'),
                import('prismjs/components/prism-c.js'),
                import('prismjs/components/prism-cpp.js'),
                import('prismjs/components/prism-csharp.js'),
                import('prismjs/components/prism-docker.js'),
                import('prismjs/components/prism-java.js'),
                import('prismjs/components/prism-js-templates.js'),
                import('prismjs/components/prism-coffeescript.js'),
                import('prismjs/components/prism-diff.js'),
                import('prismjs/components/prism-git.js'),
                import('prismjs/components/prism-go.js'),
                import('prismjs/components/prism-graphql.js'),
                import('prismjs/components/prism-handlebars.js'),
                import('prismjs/components/prism-less.js'),
                import('prismjs/components/prism-makefile.js'),
                import('prismjs/components/prism-markdown.js'),
                import('prismjs/components/prism-objectivec.js'),
                import('prismjs/components/prism-ocaml.js'),
                import('prismjs/components/prism-python.js'),
                import('prismjs/components/prism-reason.js'),
                import('prismjs/components/prism-rust.js'),
                import('prismjs/components/prism-sass.js'),
                import('prismjs/components/prism-scss.js'),
                import('prismjs/components/prism-solidity.js'),
                import('prismjs/components/prism-sql.js'),
                import('prismjs/components/prism-stylus.js'),
                import('prismjs/components/prism-swift.js'),
                import('prismjs/components/prism-wasm.js'),
                import('prismjs/components/prism-yaml.js')
            ]);
            return m.default;
        }),
    {
        ssr: false
    }
);
const Collection = dynamic(() =>
    import('react-notion-x/build/third-party/collection').then(
        (m) => m.Collection
    )
);
const Equation = dynamic(() =>
    import('react-notion-x/build/third-party/equation').then((m) => m.Equation)
);
const Pdf = dynamic(
    () => import('react-notion-x/build/third-party/pdf').then((m) => m.Pdf),
    {
        ssr: false
    }
);
const Modal = dynamic(
    () => import('react-notion-x/build/third-party/modal').then((m) => m.Modal),
    {
        ssr: false
    }
);

export const NotionPage: React.FC<types.PageProps> = ({
    site,
    recordMap,
    error,
    pageId,
    post
}) => {
    const router = useRouter();
    const lite = useSearchParam('lite');

    const params: any = {};
    if (lite) params.lite = lite;

    // lite mode is for oembed
    const isLiteMode = lite === 'true';
    const searchParams = new URLSearchParams(params);

    const darkMode = useDarkMode(false, { classNameDark: 'dark-mode' });
    const { selectedFont, changeFont } = useFontChooser();

    if (router.isFallback) {
        return <Loading />;
    }

    const keys = Object.keys(recordMap?.block || {});
    const block = recordMap?.block?.[keys[0]]?.value;

    if (error || !site || !keys.length || !block) {
        return <ErrorPage site={site} pageId={pageId} error={error} />;
    }

    const title = getBlockTitle(block, recordMap) || site.name;

    if (!config.isServer) {
        // add important objects to the window global for easy debugging
        const g = window as any;
        g.pageId = pageId;
        g.recordMap = recordMap;
        g.block = block;
    }

    const siteMapPageUrl = mapPageUrl(site, recordMap, searchParams);

    const canonicalPageUrl =
        !config.isDev && getCanonicalPageUrl(site, recordMap)(pageId);

    const isRootPage = pageId === site.rootNotionPageId;
    const isBlogPost =
        block.type === 'page' && block.parent_table === 'collection';
    const showTableOfContents = !!isBlogPost;
    const minTableOfContentsItems = 3;

    const socialImage = mapNotionImageUrl(
        (block as PageBlock).format?.page_cover ||
            ((block as PageBlock).format as any)
                ?.social_media_image_preview_url ||
            config.defaultPageCover,
        block
    );

    const socialDescription =
        getPageDescription(block, recordMap) ?? config.description;

    // only display comments and page actions on blog post pages
    const comments = isBlogPost && config?.utterancesGitHubRepo && (
        <Comment
            repo={config.utterancesGitHubRepo}
            issueMap='issue-term'
            issueTerm='title'
            theme={darkMode.value ? 'photon-dark' : 'github-light'}
        />
    );

    // Add interaction buttons for blog posts
    const interactionButtons = isBlogPost && (
        <InteractionButtons
            postId={pageId}
            postTitle={title}
            postUrl={getCanonicalPageUrl(site, recordMap)(pageId)}
        />
    );

    // Use custom homepage for root page, otherwise use NotionRenderer
    if (isRootPage) {
        return <CustomHomePage recordMap={recordMap} site={site} />;
    }

    return (
        <React.Fragment>
            <PageHead
                site={site}
                title={title}
                socialDescription={socialDescription}
                canonicalPageUrl={canonicalPageUrl}
                socialImage={socialImage}
                isBlogPost={isBlogPost}
            />

            <CustomFont site={site} fontFamily={selectedFont} />

            {isLiteMode && <BodyClassName className='notion-lite' />}

            <NotionRenderer
                bodyClassName={pageId === site.rootNotionPageId && 'index-page'}
                components={{
                    Code,
                    Collection,
                    Modal,
                    Pdf,
                    Equation
                }}
                pageHeader={post && <BlogHeader post={post} />}
                recordMap={recordMap}
                rootPageId={site.rootNotionPageId}
                fullPage={!isLiteMode}
                darkMode={darkMode.value}
                previewImages={site.previewImages !== false}
                showCollectionViewDropdown={false}
                showTableOfContents={showTableOfContents}
                minTableOfContentsItems={minTableOfContentsItems}
                defaultPageIcon={config.defaultPageIcon}
                defaultPageCover={config.defaultPageCover}
                defaultPageCoverPosition={config.defaultPageCoverPosition}
                mapPageUrl={siteMapPageUrl}
                mapImageUrl={mapNotionImageUrl}
                // searchNotion={searchNotion}
                pageFooter={
                    <>
                        {interactionButtons}
                        {comments}
                    </>
                }
                footer={<Footer />}
            />

            {/* Unified Toolbox with font chooser, theme toggle, and Calendly */}
            <Toolbox
                isDarkMode={darkMode.value}
                toggleDarkMode={darkMode.toggle}
                onFontChange={changeFont}
                selectedFont={selectedFont}
            />
        </React.Fragment>
    );
};
