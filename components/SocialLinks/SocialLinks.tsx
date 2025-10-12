import React from 'react';
import cs from 'classnames';
import { FaGithub, FaLinkedin, FaGlobe } from 'react-icons/fa';

import * as config from 'lib/config';

import styles from './socialLinks.module.css';

interface SocialLink {
    name: string;
    title: string;
    icon: React.ReactNode;
    href?: string;
}

const socialLinks: SocialLink[] = [
    config.github && {
        name: 'github',
        href: `https://github.com/${config.github}`,
        title: `GitHub @${config.github}`,
        icon: <FaGithub />
    },

    config.linkedin && {
        name: 'linkedin',
        href: `https://www.linkedin.com/in/${config.linkedin}`,
        title: `LinkedIn ${config.author}`,
        icon: <FaLinkedin />
    },

    config.portfolio && {
        name: 'portfolio',
        href: config.portfolio,
        title: `Portfolio - ${config.author}`,
        icon: <FaGlobe />
    }
];

const SocialLinks: React.FC = () => {
    return (
        <div className={styles.root}>
            {socialLinks.map((action) => (
                <a
                    className={cs(styles.action, styles[action.name])}
                    href={action.href}
                    key={action.name}
                    title={action.title}
                    target='_blank'
                    rel='noopener noreferrer'
                >
                    <div className={styles.actionBg}>
                        <div className={styles.actionBgPane} />
                    </div>

                    <div className={styles.actionBg}>{action.icon}</div>
                </a>
            ))}
        </div>
    );
};

export default SocialLinks;
