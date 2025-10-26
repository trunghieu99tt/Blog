import * as React from 'react';
import styles from './filterTags.module.css';

interface FilterTagsProps {
    tags: string[];
    selectedTags: string[];
    onToggleTag: (tag: string) => void;
    onClearAll: () => void;
    tagCounts?: Record<string, number>;
}

export const FilterTags: React.FC<FilterTagsProps> = ({
    tags,
    selectedTags,
    onToggleTag,
    onClearAll,
    tagCounts
}) => {
    if (tags.length === 0) {
        return null;
    }

    return (
        <div className={styles.filterTagsContainer}>
            <div className={styles.header}>
                <h3 className={styles.title}>Filter by Tags</h3>
                {selectedTags.length > 0 && (
                    <button
                        className={styles.clearAllButton}
                        onClick={onClearAll}
                    >
                        Clear All
                    </button>
                )}
            </div>
            <div className={styles.tagsList}>
                {tags.map((tag) => {
                    const isSelected = selectedTags.includes(tag);
                    return (
                        <button
                            key={tag}
                            className={`${styles.tag} ${
                                isSelected ? styles.tagSelected : ''
                            }`}
                            onClick={() => onToggleTag(tag)}
                        >
                            <span className={styles.tagName}>{tag}</span>
                            {tagCounts && tagCounts[tag] !== undefined && (
                                <span className={styles.tagCount}>
                                    {tagCounts[tag]}
                                </span>
                            )}
                            {isSelected && (
                                <span className={styles.checkmark}>✓</span>
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};
