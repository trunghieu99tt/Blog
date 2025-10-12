// Utility functions for interaction handling

import { api } from './config';

export interface InteractionCounts {
    likes: number;
    shares: number;
    remaining: number;
}

export async function getInteractionCounts(
    postId: string
): Promise<InteractionCounts> {
    try {
        const response = await fetch(`${api.interactions}/${postId}`);
        if (response.ok) {
            return response.json();
        }
    } catch (error) {
        console.error('Error fetching interaction counts:', error);
        return { likes: 0, shares: 0, remaining: 0 };
    }
}

export async function incrementLike(
    postId: string
): Promise<InteractionCounts> {
    try {
        const response = await fetch(`${api.interactions}/${postId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ type: 'like' })
        });

        if (response.ok) {
            return await response.json();
        }
        throw new Error('Failed to increment like');
    } catch (error) {
        console.error('Error incrementing like:', error);
        throw error;
    }
}

export async function incrementShare(
    postId: string
): Promise<InteractionCounts> {
    try {
        const response = await fetch(`/api/interactions/${postId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ type: 'share' })
        });

        if (response.ok) {
            return await response.json();
        }
        throw new Error('Failed to increment share');
    } catch (error) {
        console.error('Error incrementing share:', error);
        throw error;
    }
}

export function formatCount(count: number): string {
    if (count >= 1000000) {
        return `${(count / 1000000).toFixed(1)}M`;
    } else if (count >= 1000) {
        return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
}
