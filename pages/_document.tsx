import React from 'react';
import Document, { Html, Head, Main, NextScript } from 'next/document';
import { IconContext } from 'react-icons';

export default class MyDocument extends Document {
    render() {
        return (
            <IconContext.Provider
                value={{ style: { verticalAlign: 'middle' } }}
            >
                <Html lang='en'>
                    <Head>
                        <link rel='shortcut icon' href='/favicon.ico' />

                        {/* Preload common Google Fonts to prevent FOIT/FOUT */}
                        <link
                            rel='preconnect'
                            href='https://fonts.googleapis.com'
                        />
                        <link
                            rel='preconnect'
                            href='https://fonts.gstatic.com'
                            crossOrigin='anonymous'
                        />

                        {/* Google Fonts with proper loading */}
                        <link
                            rel='stylesheet'
                            href='https://fonts.googleapis.com/css2?family=Mali:ital,wght@0,200;0,300;0,400;0,500;0,600;0,700;1,200;1,300;1,400;1,500;1,600;1,700&family=Poppins:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,100;1,200;1,300;1,400;1,500;1,600;1,700;1,800;1,900&family=Roboto:ital,wght@0,100;0,300;0,400;0,500;0,700;0,900;1,100;1,300;1,400;1,500;1,700;1,900&family=Space+Grotesk:wght@300;400;500;600;700&family=Source+Code+Pro:ital,wght@0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,200;1,300;1,400;1,500;1,600;1,700;1,800;1,900&family=Spectral:ital,wght@0,200;0,300;0,400;0,500;0,600;0,700;0,800;1,200;1,300;1,400;1,500;1,600;1,700;1,800&family=Crimson+Text:ital,wght@0,400;0,600;0,700;1,400;1,600;1,700&display=swap'
                        />

                        <link
                            rel='apple-touch-icon'
                            sizes='180x180'
                            href='/apple-touch-icon.png'
                        />
                        <link
                            rel='icon'
                            type='image/png'
                            sizes='96x96'
                            href='/favicon-96x96.png'
                        />
                        <link
                            rel='icon'
                            type='image/png'
                            sizes='32x32'
                            href='/favicon-32x32.png'
                        />
                        <link
                            rel='icon'
                            type='image/png'
                            sizes='16x16'
                            href='/favicon-16x16.png'
                        />

                        <link rel='manifest' href='/manifest.json' />
                    </Head>

                    <body>
                        <script src='noflash.js' />

                        <Main />

                        <NextScript />
                    </body>
                </Html>
            </IconContext.Provider>
        );
    }
}
