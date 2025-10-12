import * as React from 'react';
import { useState, useEffect, useMemo } from 'react';
import Head from 'next/head';
import useDarkMode from 'use-dark-mode';
import BodyClassName from 'react-body-classname';
import { iPost } from '../lib/types';
import { SearchBar } from '../components/SearchBar';
import { FilterTags } from '../components/FilterTags';
import { PostList } from '../components/PostList';
import Footer from '../components/Footer';
import Toolbox from '../components/Toolbox';
import { CustomFont } from '../components/CustomFont';
import { useFontChooser } from '../components/FontChooser/useFontChooser';
import * as config from '../lib/config';
import styles from '../styles/search.module.css';

export default function SearchPage() {
    const [posts, setPosts] = useState<iPost[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [groupByMonth, setGroupByMonth] = useState(true);

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

    // Extract unique tags from posts
    const allTags = useMemo(() => {
        const tagSet = new Set<string>();
        posts.forEach((post) => {
            if (post.tag) {
                // Handle multiple tags if separated by comma
                const tags = post.tag.split(',').map((t) => t.trim());
                tags.forEach((tag) => {
                    if (tag) tagSet.add(tag);
                });
            }
        });
        return Array.from(tagSet).sort();
    }, [posts]);

    // Filter and search posts
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
    }, [posts, searchQuery, selectedTags]);

    const handleToggleTag = (tag: string) => {
        setSelectedTags((prev) =>
            prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
        );
    };

    const handleClearAllTags = () => {
        setSelectedTags([]);
    };

    const site = {
        fontFamily: selectedFont || 'CMU Serif Roman'
    } as any;

    return (
        <>
            <Head>
                <title>Search Posts - {config.name}</title>
                <meta
                    name='description'
                    content={`Search and browse all posts on ${config.name}`}
                />
            </Head>

            <CustomFont site={site} fontFamily={selectedFont} />
            <BodyClassName className='search-page' />

            <div className={styles.searchPageContainer}>
                <header className={styles.header}>
                    <h1 className={styles.mainTitle}>Search & Browse Posts</h1>
                    <p className={styles.subtitle}>
                        Find posts by name, filter by tags, or browse by month
                    </p>
                </header>

                <div className={styles.controls}>
                    <SearchBar
                        value={searchQuery}
                        onChange={setSearchQuery}
                        placeholder='Search posts by name or content...'
                    />

                    {allTags.length > 0 && (
                        <FilterTags
                            tags={allTags}
                            selectedTags={selectedTags}
                            onToggleTag={handleToggleTag}
                            onClearAll={handleClearAllTags}
                        />
                    )}

                    <div className={styles.viewOptions}>
                        <label className={styles.checkboxLabel}>
                            <input
                                type='checkbox'
                                checked={groupByMonth}
                                onChange={(e) =>
                                    setGroupByMonth(e.target.checked)
                                }
                                className={styles.checkbox}
                            />
                            <span>Group by month</span>
                        </label>
                        <div className={styles.resultsCount}>
                            {loading
                                ? 'Loading...'
                                : `${filteredPosts.length} post${
                                      filteredPosts.length !== 1 ? 's' : ''
                                  } found`}
                        </div>
                    </div>
                </div>

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
                        <PostList
                            posts={filteredPosts}
                            groupByMonth={groupByMonth}
                        />
                    )}
                </main>

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
}
