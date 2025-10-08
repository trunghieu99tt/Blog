module.exports = {
    // where it all starts -- the site's root Notion page (required)
    // rootNotionPageId: '78fc5a4b88d74b0e824e29407e9f1ec1',
    rootNotionPageId: '16dc2d2fdc8c46ee96f581afde5a0c0c',

    // if you want to restrict pages to a single notion workspace (optional)
    // (this should be a Notion ID; see the docs for how to extract this)
    rootNotionSpaceId: null,

    // basic site info (required)
    name: "Hieu's blogs",
    domain: 'blog.hieunt.me',
    author: 'Elliot Nguyen',

    // open graph metadata (optional)
    description:
        'This is a blog site which contains all blogs written by Nguyen Trung Hieu (aka Elliot Nguyen)',
    socialImageTitle: 'Who wrote this shit?',
    socialImageSubtitle: 'Can you tell me who the hell wrote this! 👋',

    // social usernames (optional)
    facebook: 'ricky.nguyen99',
    github: 'trunghieu99tt',
    linkedin: 'elliotnguyen99',

    // default notion icon and cover images for site-wide consistency (optional)
    // page-specific values will override these site-wide defaults
    defaultPageIcon: null,
    defaultPageCover: null,
    defaultPageCoverPosition: 0.5,

    fontFamily: 'Mali',

    // image CDN host to proxy all image requests through (optional)
    // NOTE: this requires you to set up an external image proxy
    imageCDNHost: null,

    // Utteranc.es comments via GitHub issue comments (optional)
    utterancesGitHubRepo: 'trunghieu99tt/WhoWroteThisShit',

    // whether or not to enable support for LQIP preview images (optional)
    // NOTE: this requires you to set up Google Firebase and add the environment
    // variables specified in .env.example
    isPreviewImageSupportEnabled: false,

    // map of notion page IDs to URL paths (optional)
    // any pages defined here will override their default URL paths
    // example:
    //
    // pageUrlOverrides: {
    //   '/foo': '067dd719a912471ea9a3ac10710e7fdf',
    //   '/bar': '0be6efce9daf42688f65c76b89f8eb27'
    // }
    pageUrlOverrides: null,
};
