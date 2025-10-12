import * as React from 'react';
import Link from 'next/link';
import { iPost } from '../../lib/types';
import styles from './postList.module.css';

interface PostListProps {
    posts: iPost[];
    groupByMonth: boolean;
}

export const PostList: React.FC<PostListProps> = ({ posts, groupByMonth }) => {
    if (posts.length === 0) {
        return (
            <div className={styles.emptyState}>
                <p>No posts found matching your criteria.</p>
            </div>
        );
    }

    if (!groupByMonth) {
        return (
            <div className={styles.postListContainer}>
                <div className={styles.postsList}>
                    {posts.map((post) => (
                        <PostCard key={post.id} post={post} />
                    ))}
                </div>
            </div>
        );
    }

    // Group posts by month
    const groupedPosts = posts.reduce((groups, post) => {
        if (!post.date) {
            const key = 'No Date';
            if (!groups[key]) {
                groups[key] = [];
            }
            groups[key].push(post);
            return groups;
        }

        const date = new Date(post.date);
        const monthYear = date.toLocaleDateString('en-US', {
            month: 'long',
            year: 'numeric'
        });

        if (!groups[monthYear]) {
            groups[monthYear] = [];
        }
        groups[monthYear].push(post);
        return groups;
    }, {} as Record<string, iPost[]>);

    // Sort groups by date (newest first)
    const sortedGroups = Object.entries(groupedPosts).sort((a, b) => {
        if (a[0] === 'No Date') return 1;
        if (b[0] === 'No Date') return -1;

        const dateA = new Date(a[1][0].date);
        const dateB = new Date(b[1][0].date);
        return dateB.getTime() - dateA.getTime();
    });

    return (
        <div className={styles.postListContainer}>
            {sortedGroups.map(([monthYear, groupPosts]) => (
                <div key={monthYear} className={styles.monthGroup}>
                    <h2 className={styles.monthHeader}>{monthYear}</h2>
                    <div className={styles.postsList}>
                        {groupPosts.map((post) => (
                            <PostCard key={post.id} post={post} />
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
};

interface PostCardProps {
    post: iPost;
}

const PostCard: React.FC<PostCardProps> = ({ post }) => {
    const postUrl = post.slug ? `/${post.slug}` : `/${post.id}`;
    const formattedDate = post.date
        ? new Date(post.date).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric'
          })
        : null;

    return (
        <Link href={postUrl} className={styles.postCard}>
            <div className={styles.postContent}>
                <h3 className={styles.postTitle}>{post.name}</h3>
                {post.preview && (
                    <p className={styles.postPreview}>{post.preview}</p>
                )}
                <div className={styles.postMeta}>
                    {formattedDate && (
                        <span className={styles.postDate}>{formattedDate}</span>
                    )}
                    {post.tag && (
                        <span className={styles.postTag}>{post.tag}</span>
                    )}
                </div>
            </div>
        </Link>
    );
};
