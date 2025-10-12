import * as React from 'react';
import { useState, useEffect, useMemo } from 'react';
import Head from 'next/head';
import useDarkMode from 'use-dark-mode';
import BodyClassName from 'react-body-classname';
import { iPost } from '../../lib/types';
import { SearchBar } from '../SearchBar';
import { Sidebar } from '../Sidebar';
import { PostList } from '../PostList';
import Footer from '../Footer';
import Toolbox from '../Toolbox';
import { CustomFont } from '../CustomFont';
import { useFontChooser } from '../FontChooser/useFontChooser';
import * as config from '../../lib/config';
import styles from './homePage.module.css';

interface MonthGroup {
    month: string;
    year: string;
    count: number;
    key: string;
}

export const HomePage: React.FC = () => {
    const [posts, setPosts] = useState<iPost[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
    const [selectedTags, setSelectedTags] = useState<string[]>([]);

    const darkMode = useDarkMode(false, { classNameDark: 'dark-mode' });
    const { selectedFont, changeFont } = useFontChooser();

    // Fetch all posts
    useEffect(() => {
        const fetchPosts = async () => {
            try {
                setLoading(true);
                const response = await fetch('/api/get-all-posts');
                const data = await response.json();

                if (response.ok) {
                    setPosts(data.posts || []);
                } else {
                    setError(data.error || 'Failed to fetch posts');
                }
            } catch (err) {
                setError('Failed to fetch posts');
                console.error('Error fetching posts:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchPosts();
    }, []);

    // Extract month groups from posts
    const monthGroups = useMemo((): MonthGroup[] => {
        const groups = new Map<string, MonthGroup>();

        posts.forEach((post) => {
            if (!post.date) return;

            const date = new Date(post.date);
            const month = date.toLocaleDateString('en-US', { month: 'long' });
            const year = date.getFullYear().toString();
            const key = `${year}-${String(date.getMonth() + 1).padStart(
                2,
                '0'
            )}`;

            if (groups.has(key)) {
                const group = groups.get(key);
                if (group) {
                    group.count += 1;
                }
            } else {
                groups.set(key, { month, year, count: 1, key });
            }
        });

        return Array.from(groups.values()).sort((a, b) =>
            b.key.localeCompare(a.key)
        );
    }, [posts]);

    // Extract unique tags from posts
    const allTags = useMemo(() => {
        const tagSet = new Set<string>();
        posts.forEach((post) => {
            if (post.tag) {
                const tags = post.tag.split(',').map((t) => t.trim());
                tags.forEach((tag) => {
                    if (tag) tagSet.add(tag);
                });
            }
        });
        return Array.from(tagSet)
            .sort()
            .map((tag) => ({ name: tag, color: 'default' }));
    }, [posts]);

    // Color mapping functions
    const getTagBackgroundColor = (color: string) =>
        `var(--notion-${color}_background, var(--notion-item-default))`;
    const getTagTextColor = (color: string) =>
        `var(--notion-item-text-${color}, var(--notion-item-text-default))`;

    // Filter posts based on search, month, and tags
    const filteredPosts = useMemo(() => {
        return posts.filter((post) => {
            // Search filter
            if (searchQuery) {
                const query = searchQuery.toLowerCase();
                const matchesName = post.name.toLowerCase().includes(query);
                const matchesPreview =
                    post.preview?.toLowerCase().includes(query) || false;

                if (!matchesName && !matchesPreview) {
                    return false;
                }
            }

            // Month filter
            if (selectedMonth) {
                if (!post.date) return false;

                const date = new Date(post.date);
                const postKey = `${date.getFullYear()}-${String(
                    date.getMonth() + 1
                ).padStart(2, '0')}`;

                if (postKey !== selectedMonth) {
                    return false;
                }
            }

            // Tag filter
            if (selectedTags.length > 0) {
                if (!post.tag) return false;

                const postTags = post.tag
                    .split(',')
                    .map((t) => t.trim())
                    .filter(Boolean);
                const hasSelectedTag = selectedTags.some((selectedTag) =>
                    postTags.includes(selectedTag)
                );

                if (!hasSelectedTag) {
                    return false;
                }
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

    const site = {
        fontFamily: selectedFont || 'CMU Serif Roman'
    } as any;

    return (
        <>
            <Head>
                <title>{config.name}</title>
                <meta name='description' content={config.description} />
            </Head>

            <CustomFont site={site} fontFamily={selectedFont} />
            <BodyClassName className='home-page' />

            <div className={styles.homePageContainer}>
                <header className={styles.header}>
                    <h1 className={styles.mainTitle}>{config.name}</h1>
                    <p className={styles.subtitle}>{config.description}</p>

                    <div className={styles.searchSection}>
                        <SearchBar
                            value={searchQuery}
                            onChange={setSearchQuery}
                            placeholder='Search posts...'
                        />
                    </div>
                </header>

                <div className={styles.mainContent}>
                    <Sidebar
                        months={monthGroups}
                        tags={allTags.map((t) => t.name)}
                        tagsWithColors={allTags}
                        selectedMonth={selectedMonth}
                        selectedTags={selectedTags}
                        onMonthSelect={setSelectedMonth}
                        onTagToggle={handleToggleTag}
                        onClearFilters={handleClearFilters}
                        getTagBackgroundColor={getTagBackgroundColor}
                        getTagTextColor={getTagTextColor}
                    />

                    <main className={styles.content}>
                        {loading ? (
                            <div className={styles.loading}>
                                <p>Loading posts...</p>
                            </div>
                        ) : error ? (
                            <div className={styles.error}>
                                <p>Error: {error}</p>
                            </div>
                        ) : (
                            <>
                                <div className={styles.resultsInfo}>
                                    <p className={styles.resultsCount}>
                                        {filteredPosts.length} post
                                        {filteredPosts.length !== 1 ? 's' : ''}
                                        {(selectedMonth ||
                                            selectedTags.length > 0 ||
                                            searchQuery) &&
                                            ' found'}
                                    </p>
                                </div>
                                <PostList
                                    posts={filteredPosts}
                                    groupByMonth={false}
                                />
                            </>
                        )}
                    </main>
                </div>

                <Footer />
            </div>

            <Toolbox
                isDarkMode={darkMode.value}
                toggleDarkMode={darkMode.toggle}
                onFontChange={changeFont}
                selectedFont={selectedFont}
            />
        </>
    );
};
