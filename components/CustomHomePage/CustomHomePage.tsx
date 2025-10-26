import * as React from 'react';
import { useState, useMemo } from 'react';
import Link from 'next/link';
import useDarkMode from 'use-dark-mode';
import BodyClassName from 'react-body-classname';
import { ExtendedRecordMap } from 'notion-types';
import * as types from '../../lib/types';
import {
    extractPostsFromRecordMap,
    getMonthGroups,
    getAllTags,
    getAllTagsWithColors,
    BlogPost
} from '../../lib/extract-posts-from-recordmap';
import { SearchBar } from '../SearchBar';
import { Sidebar } from '../Sidebar';
import PageHead from '../PageHead';
import Footer from '../Footer';
import Toolbox from '../Toolbox';
import { CustomFont } from '../CustomFont';
import { useFontChooser } from '../FontChooser/useFontChooser';
import SocialLinks from '../SocialLinks';
import styles from './customHomePage.module.css';

// Notion color mapping using exact CSS variables from react-notion-x
const getTagBackgroundColor = (color: string): string => {
    const colorMap: { [key: string]: string } = {
        default: 'var(--notion-item-default)',
        gray: 'var(--notion-gray_background)',
        brown: 'var(--notion-brown_background)',
        orange: 'var(--notion-orange_background)',
        yellow: 'var(--notion-yellow_background)',
        green: 'var(--notion-item-green)',
        blue: 'var(--notion-blue_background)',
        purple: 'var(--notion-purple_background)',
        pink: 'var(--notion-pink_background)',
        red: 'var(--notion-red_background)',
        teal: 'var(--notion-teal_background)'
    };
    return colorMap[color] || colorMap.default;
};

const getTagTextColor = (color: string): string => {
    const colorMap: { [key: string]: string } = {
        default: 'var(--notion-item-text-default)',
        gray: 'var(--notion-item-text-gray)',
        brown: 'var(--notion-item-text-brown)',
        orange: 'var(--notion-item-text-orange)',
        yellow: 'var(--notion-item-text-yellow)',
        green: 'var(--notion-item-text-green)',
        blue: 'var(--notion-item-text-blue)',
        purple: 'var(--notion-item-text-purple)',
        pink: 'var(--notion-item-text-pink)',
        red: 'var(--notion-item-text-red)',
        teal: 'var(--notion-teal)'
    };
    return colorMap[color] || colorMap.default;
};

interface CustomHomePageProps {
    recordMap: ExtendedRecordMap;
    site: types.Site;
}

export const CustomHomePage: React.FC<CustomHomePageProps> = ({
    recordMap,
    site
}) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [showBackToTop, setShowBackToTop] = useState(false);

    const darkMode = useDarkMode(false, { classNameDark: 'dark-mode' });
    const { selectedFont, changeFont } = useFontChooser();

    // Handle scroll to show/hide back to top button
    React.useEffect(() => {
        const handleScroll = () => {
            const scrollTop =
                window.pageYOffset || document.documentElement.scrollTop;
            setShowBackToTop(scrollTop > 300);
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Scroll to top function
    const scrollToTop = () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    };

    // Extract posts from recordMap (same data that react-notion-x uses)
    const posts = useMemo(() => {
        return extractPostsFromRecordMap(recordMap, site);
    }, [recordMap, site]);

    // Extract month groups and tags
    const monthGroups = useMemo(() => getMonthGroups(posts), [posts]);
    const allTags = useMemo(() => getAllTags(posts), [posts]);
    const allTagsWithColors = useMemo(
        () => getAllTagsWithColors(posts),
        [posts]
    );

    // Calculate tag counts
    const tagCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        posts.forEach((post) => {
            post.tags.forEach((tag) => {
                counts[tag.name] = (counts[tag.name] || 0) + 1;
            });
        });
        return counts;
    }, [posts]);

    // Filter posts based on search, month, and tags
    const filteredPosts = useMemo(() => {
        return posts.filter((post) => {
            // Search filter
            if (searchQuery) {
                const query = searchQuery.toLowerCase();
                const matchesTitle = post.title.toLowerCase().includes(query);
                const matchesDescription =
                    post.description?.toLowerCase().includes(query) || false;
                if (!matchesTitle && !matchesDescription) return false;
            }

            // Month filter
            if (selectedMonth) {
                if (!post.date) return false;
                const date = new Date(post.date);
                const postKey = `${date.getFullYear()}-${String(
                    date.getMonth() + 1
                ).padStart(2, '0')}`;
                if (postKey !== selectedMonth) return false;
            }

            // Tag filter
            if (selectedTags.length > 0) {
                const hasSelectedTag = selectedTags.some((selectedTag) =>
                    post.tags.some((tag) => tag.name === selectedTag)
                );
                if (!hasSelectedTag) return false;
            }

            return true;
        });
    }, [posts, searchQuery, selectedMonth, selectedTags]);

    const handleToggleTag = (tag: string) => {
        setSelectedTags((prev) =>
            prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
        );
    };

    const handleClearFilters = () => {
        setSelectedMonth(null);
        setSelectedTags([]);
        setSearchQuery('');
    };

    return (
        <>
            <PageHead site={site} title={site.name} />

            <CustomFont site={site} fontFamily={selectedFont} />
            <BodyClassName className='custom-home-page' />

            <div
                className={`${styles.homePageContainer} ${
                    darkMode.value ? 'dark-mode' : ''
                }`}
            >
                <header className={styles.header}>
                    <h1 className={styles.mainTitle}>{site.name}</h1>
                    <p className={styles.siteDescription}>{site.description}</p>

                    <div className={styles.socialSection}>
                        <p className={styles.socialLabel}>Connect with me:</p>
                        <SocialLinks />
                    </div>
                </header>

                <div className={styles.mainContent}>
                    {isSidebarOpen && (
                        <div
                            className={styles.sidebarOverlay}
                            onClick={() => setIsSidebarOpen(false)}
                        />
                    )}
                    <main className={styles.content}>
                        <div className={styles.mobileControls}>
                            <div className={styles.resultsInfo}></div>
                            <button
                                className={styles.mobileFilterToggle}
                                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                            >
                                🔍 Filters
                            </button>
                        </div>

                        <p className={styles.resultsCount}>
                            {filteredPosts.length} post
                            {filteredPosts.length !== 1 ? 's' : ''}
                            {(selectedMonth ||
                                selectedTags.length > 0 ||
                                searchQuery) &&
                                ' found'}
                        </p>
                        <BlogGrid posts={filteredPosts} />
                    </main>

                    <aside
                        className={`${styles.sidebar} ${
                            isSidebarOpen ? styles.sidebarOpen : ''
                        }`}
                    >
                        <div className={styles.sidebarHeader}>
                            <h3>Filters</h3>
                            <button
                                className={styles.sidebarClose}
                                onClick={() => setIsSidebarOpen(false)}
                            >
                                ✕
                            </button>
                        </div>
                        <div className={styles.sidebarSearchSection}>
                            <SearchBar
                                value={searchQuery}
                                onChange={setSearchQuery}
                                placeholder='Search posts...'
                            />
                        </div>
                        <Sidebar
                            months={monthGroups}
                            tags={allTags}
                            tagsWithColors={allTagsWithColors}
                            selectedMonth={selectedMonth}
                            selectedTags={selectedTags}
                            onMonthSelect={setSelectedMonth}
                            onTagToggle={handleToggleTag}
                            onClearFilters={handleClearFilters}
                            getTagBackgroundColor={getTagBackgroundColor}
                            getTagTextColor={getTagTextColor}
                            tagCounts={tagCounts}
                        />
                    </aside>
                </div>

                <Footer />
            </div>

            {/* Back to Top Button */}
            {showBackToTop && (
                <button
                    className={styles.backToTop}
                    onClick={scrollToTop}
                    aria-label='Back to top'
                >
                    ↑
                </button>
            )}

            <Toolbox
                isDarkMode={darkMode.value}
                toggleDarkMode={darkMode.toggle}
                onFontChange={changeFont}
                selectedFont={selectedFont}
            />
        </>
    );
};

interface BlogGridProps {
    posts: BlogPost[];
}

const BlogGrid: React.FC<BlogGridProps> = ({ posts }) => {
    if (posts.length === 0) {
        return (
            <div className={styles.emptyState}>
                <p>No posts found matching your criteria.</p>
            </div>
        );
    }

    return (
        <div className={styles.blogGrid}>
            {posts.map((post) => (
                <BlogCard key={post.id} post={post} />
            ))}
        </div>
    );
};

interface BlogCardProps {
    post: BlogPost;
}

const BlogCard: React.FC<BlogCardProps> = ({ post }) => {
    const formattedDate = post.date
        ? new Date(post.date).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric'
          })
        : null;

    return (
        <Link href={post.url} className={styles.blogCard}>
            <div className={styles.cardContent}>
                {/* Title - matches notion-page-title-text */}
                <h3 className={styles.cardTitle}>{post.title}</h3>

                {/* Description - matches notion-collection-card-property */}
                {post.description && (
                    <div className={styles.cardDescription}>
                        {post.description}
                    </div>
                )}

                {/* Tags - matches notion-property-multi_select with colors */}
                {post.tags.length > 0 && (
                    <div className={styles.cardTags}>
                        {post.tags.map((tag) => (
                            <span
                                key={tag.name}
                                className={styles.cardTag}
                                style={{
                                    backgroundColor: getTagBackgroundColor(
                                        tag.color
                                    ),
                                    color: getTagTextColor(tag.color)
                                }}
                            >
                                {tag.name}
                            </span>
                        ))}
                    </div>
                )}

                {/* Date - matches notion-property-date */}
                {formattedDate && (
                    <div className={styles.cardDate}>{formattedDate}</div>
                )}
            </div>
        </Link>
    );
};
