module.exports = {
    // where it all starts -- the site's root Notion page (required)
    // rootNotionPageId: '78fc5a4b88d74b0e824e29407e9f1ec1',
    rootNotionPageId: '16dc2d2fdc8c46ee96f581afde5a0c0c',

    // if you want to restrict pages to a single notion workspace (optional)
    // (this should be a Notion ID; see the docs for how to extract this)
    rootNotionSpaceId: null,

    // basic site info (required)
    name: "Hieu's blog",
    domain: 'blog.hieunt.me',
    author: 'Hieu Nguyen',

    // open graph metadata (optional)
    description:
        'Hi, I’m Trung Hieu (Elliot) Nguyen, a software engineer passionate about building scalable backend systems and exploring innovative tech solutions. On this blog, I share insights, experiences, and lessons learned from my journey in software development. Thanks for stopping by!',
    socialImageTitle: 'Who wrote this shit?',
    socialImageSubtitle: 'Can you tell me who the hell wrote this! 👋',

    // social usernames (optional)
    facebook: 'ricky.nguyen99',
    github: 'trunghieu99tt',
    linkedin: 'elliotnguyen99',
    portfolio: 'https://hieunt.me/',

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
    utterancesGitHubRepo: 'trunghieu99tt/Blog',

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
    pageUrlOverrides: null
};
