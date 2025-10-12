import React, { useState, useEffect, useRef, useCallback } from 'react';
import styles from './interactionButtons.module.css';
import { formatCount, getInteractionCounts } from '../../lib/interactions';
import { useFireworks } from './useFireworks';
import ShareMenu from './ShareMenu';
import { api } from '../../lib/config';

interface InteractionButtonsProps {
    postId: string;
    postTitle?: string;
    postUrl?: string;
}

interface InteractionData {
    likes: number;
    shares: number;
}

export default function InteractionButtons({
    postId,
    postTitle,
    postUrl
}: InteractionButtonsProps) {
    const [interactions, setInteractions] = useState<InteractionData>({
        likes: 0,
        shares: 0
    });
    const [isLoading, setIsLoading] = useState(false);
    const [likesRemaining, setLikesRemaining] = useState(5);
    const [showShareMenu, setShowShareMenu] = useState(false);
    const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
    const [pendingLikes, setPendingLikes] = useState(0);

    const likeButtonRef = useRef<HTMLButtonElement>(null);
    const shareButtonRef = useRef<HTMLButtonElement>(null);
    const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const { triggerFirework } = useFireworks();

    const MAX_LIKES = 5;
    const DEBOUNCE_DELAY = 2000; // 800ms debounce - wait for user to stop clicking

    // Load initial counts and sync with server-side remaining count
    useEffect(() => {
        const fetchCounts = async () => {
            try {
                const response = await getInteractionCounts(postId);
                if (response) {
                    const data = response;
                    setInteractions({ likes: data.likes, shares: data.shares });

                    // Sync with server-side remaining count (source of truth)
                    if (typeof data.remaining === 'number') {
                        const serverRemaining = Math.max(
                            0,
                            Math.min(data.remaining, MAX_LIKES)
                        );
                        setLikesRemaining(serverRemaining);
                        // Update localStorage to match server
                        localStorage.setItem(
                            `likes_remaining_${postId}`,
                            serverRemaining.toString()
                        );
                    }
                }
            } catch (error) {
                console.error('Failed to fetch interaction counts:', error);
            }
        };

        fetchCounts();
    }, [postId, MAX_LIKES]);

    // Throttled API call to update likes on the server
    const sendLikesToServer = useCallback(
        async (count: number) => {
            try {
                // Send multiple likes in a single batch
                const response = await fetch(`${api.interactions}/${postId}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ type: 'like', count })
                });

                if (response.ok) {
                    const data = await response.json();
                    setInteractions({ likes: data.likes, shares: data.shares });

                    // Sync with server-side remaining count
                    if (typeof data.remaining === 'number') {
                        const serverRemaining = Math.max(
                            0,
                            Math.min(data.remaining, MAX_LIKES)
                        );
                        setLikesRemaining(serverRemaining);
                        localStorage.setItem(
                            `likes_remaining_${postId}`,
                            serverRemaining.toString()
                        );
                    }
                } else if (response.status === 429) {
                    // Rate limit exceeded - sync with server
                    const data = await response.json();
                    if (data.remaining !== undefined) {
                        setLikesRemaining(data.remaining);
                        localStorage.setItem(
                            `likes_remaining_${postId}`,
                            data.remaining.toString()
                        );
                    }
                    if (data.likes !== undefined && data.shares !== undefined) {
                        setInteractions({
                            likes: data.likes,
                            shares: data.shares
                        });
                    }
                    console.warn('Rate limit reached');
                }
            } catch (error) {
                console.error('Failed to like post:', error);
            }
        },
        [postId, MAX_LIKES]
    );

    // Effect to handle pending likes with debounce
    // This ensures API is only called ONCE after user stops clicking
    useEffect(() => {
        if (pendingLikes > 0) {
            // Clear existing timer (this is the debounce part)
            // Each new like resets the timer, so API only fires after last click
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }

            // Set new timer - only fires if no more clicks happen
            debounceTimerRef.current = setTimeout(() => {
                sendLikesToServer(pendingLikes);
                setPendingLikes(0);
            }, DEBOUNCE_DELAY);
        }

        return () => {
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }
        };
    }, [pendingLikes, sendLikesToServer, DEBOUNCE_DELAY]);

    const handleLike = () => {
        // Only block if no likes remaining - don't block during API call
        if (likesRemaining <= 0) return;

        // Decrease remaining likes immediately for UI feedback
        const newLikesRemaining = Math.max(0, likesRemaining - 1);
        setLikesRemaining(newLikesRemaining);

        // Store in localStorage with enforcement
        localStorage.setItem(
            `likes_remaining_${postId}`,
            newLikesRemaining.toString()
        );

        // Optimistically update the count in UI
        setInteractions((prev) => ({ ...prev, likes: prev.likes + 1 }));

        // Add to pending likes for batched/debounced API call
        // This will trigger the useEffect above which resets the timer
        setPendingLikes((prev) => {
            const newCount = prev + 1;
            return newCount;
        });

        // Trigger firework effect
        if (likeButtonRef.current) {
            triggerFirework(likeButtonRef.current, '#ef4444');
        }
    };

    const handleShareClick = () => {
        if (isLoading || !shareButtonRef.current) return;

        const rect = shareButtonRef.current.getBoundingClientRect();
        const isMobile = window.innerWidth <= 768;
        const menuWidth = 220; // Menu width
        const totalOffset = menuWidth; // Total distance from button

        // Calculate x position, ensuring it doesn't go off-screen
        let x = rect.left - totalOffset;
        if (x < 10) {
            // If menu would go off-screen, position it to the right instead
            x = rect.right + 10;
        }

        setMenuPosition({
            x: isMobile ? window.innerWidth / 2 : x,
            y: isMobile ? rect.bottom + 10 : rect.top
        });
        setShowShareMenu(true);
    };

    const handleShareAction = async (
        platform: 'facebook' | 'twitter' | 'linkedin' | 'copy'
    ) => {
        setShowShareMenu(false);

        if (isLoading) return;
        setIsLoading(true);

        const shareUrl = postUrl || window.location.href;
        const shareTitle = postTitle || 'Check this out!';

        // Increment share count
        try {
            const response = await fetch(`/api/interactions/${postId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ type: 'share' })
            });

            if (response.ok) {
                const data = await response.json();
                setInteractions(data);

                // Trigger firework effect
                if (shareButtonRef.current) {
                    triggerFirework(shareButtonRef.current, '#3b82f6');
                }
            }
        } catch (error) {
            console.error('Failed to update share count:', error);
        }

        // Open sharing based on platform
        if (platform === 'facebook') {
            const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
                shareUrl
            )}`;
            window.open(facebookUrl, '_blank', 'width=600,height=400');
        } else if (platform === 'twitter') {
            const twitterUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(
                shareUrl
            )}&text=${encodeURIComponent(shareTitle)}`;
            window.open(twitterUrl, '_blank', 'width=600,height=400');
        } else if (platform === 'linkedin') {
            const linkedinUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(
                shareUrl
            )}`;
            window.open(linkedinUrl, '_blank', 'width=600,height=400');
        } else if (platform === 'copy') {
            try {
                await navigator.clipboard.writeText(shareUrl);
                // You could add a toast notification here
                alert('Link copied to clipboard!');
            } catch (error) {
                console.error('Failed to copy to clipboard:', error);
            }
        }

        setIsLoading(false);
    };

    return (
        <>
            <div className={styles.container}>
                <button
                    ref={likeButtonRef}
                    className={`${styles.button} ${styles.likeButton} ${
                        likesRemaining === 0 ? styles.maxedOut : ''
                    }`}
                    onClick={handleLike}
                    disabled={likesRemaining === 0}
                    aria-label={`Like this post (${interactions.likes} likes, ${likesRemaining} of ${MAX_LIKES} likes remaining)`}
                    title={
                        likesRemaining > 0
                            ? `Click to like (${likesRemaining}/${MAX_LIKES} remaining)`
                            : 'Maximum likes reached'
                    }
                >
                    <div className={styles.likeButtonBgPane} />
                    <div className={styles.heartContainer}>
                        <svg
                            className={styles.heartOutline}
                            viewBox='0 0 24 24'
                            fill='none'
                            stroke='currentColor'
                        >
                            <path
                                strokeLinecap='round'
                                strokeLinejoin='round'
                                strokeWidth={2}
                                d='M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z'
                            />
                        </svg>
                        <svg
                            className={styles.heartFill}
                            viewBox='0 0 24 24'
                            fill='currentColor'
                            stroke='none'
                            style={{
                                clipPath: `inset(${
                                    (likesRemaining / MAX_LIKES) * 100
                                }% 0 0 0)`
                            }}
                        >
                            <path d='M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z' />
                        </svg>
                    </div>
                    <span className={styles.count}>
                        {formatCount(interactions.likes)}
                    </span>
                </button>

                <button
                    ref={shareButtonRef}
                    className={`${styles.button} ${styles.shareButton}`}
                    onClick={handleShareClick}
                    disabled={isLoading}
                    aria-label={`Share this post (${interactions.shares} shares)`}
                >
                    <div className={styles.shareButtonBgPane} />
                    <svg
                        className={styles.icon}
                        viewBox='0 0 24 24'
                        fill='none'
                        stroke='currentColor'
                    >
                        <path
                            strokeLinecap='round'
                            strokeLinejoin='round'
                            strokeWidth={2}
                            d='M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z'
                        />
                    </svg>
                    <span className={styles.count}>
                        {formatCount(interactions.shares)}
                    </span>
                </button>
            </div>

            <ShareMenu
                isOpen={showShareMenu}
                onClose={() => setShowShareMenu(false)}
                onShare={handleShareAction}
                position={menuPosition}
            />
        </>
    );
}
