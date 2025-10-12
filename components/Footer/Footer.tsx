import * as React from 'react';

// configs
import * as config from 'lib/config';

// components
import SocialLinks from 'components/SocialLinks';

// Note: Theme toggle and other interactive elements moved to Toolbox component

// styles
import styles from './footer.module.css';

const Footer: React.FC = () => {
    const copyRightYear = new Date().getUTCFullYear();

    return (
        <footer className={styles.footer}>
            <div className={styles.copyright}>
                Copyright {copyRightYear} @{config.author}
            </div>

            {/* Settings moved to Toolbox component */}

            <div className={styles.social}>
                <SocialLinks />
            </div>
        </footer>
    );
};

export default Footer;
