import * as React from 'react';
import styles from './searchBar.module.css';

interface SearchBarProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
}

export const SearchBar: React.FC<SearchBarProps> = ({
    value,
    onChange,
    placeholder = 'Search posts...'
}) => {
    return (
        <div className={styles.searchBarContainer}>
            <input
                type='text'
                className={styles.searchInput}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
            />
            <div className={styles.searchIcon}>🔍</div>
            {value && (
                <button
                    className={styles.clearButton}
                    onClick={() => onChange('')}
                    aria-label='Clear search'
                >
                    ✕
                </button>
            )}
        </div>
    );
};
