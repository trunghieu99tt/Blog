import * as React from 'react';
import styles from './sidebar.module.css';
import { BlogTag } from '../../lib/extract-posts-from-recordmap';

interface MonthGroup {
    month: string;
    year: string;
    count: number;
    key: string;
}

interface SidebarProps {
    months: MonthGroup[];
    tags: string[];
    tagsWithColors: BlogTag[];
    selectedMonth: string | null;
    selectedTags: string[];
    onMonthSelect: (monthKey: string | null) => void;
    onTagToggle: (tag: string) => void;
    onClearFilters: () => void;
    getTagBackgroundColor: (color: string) => string;
    getTagTextColor: (color: string) => string;
    tagCounts?: Record<string, number>;
}

export const Sidebar: React.FC<SidebarProps> = ({
    months,
    tags,
    tagsWithColors,
    selectedMonth,
    selectedTags,
    onMonthSelect,
    onTagToggle,
    onClearFilters,
    getTagBackgroundColor,
    getTagTextColor,
    tagCounts
}) => {
    const hasActiveFilters = selectedMonth || selectedTags.length > 0;

    // Group months by year for better organization
    const monthsByYear = React.useMemo(() => {
        const grouped: { [year: string]: MonthGroup[] } = {};
        months.forEach((month) => {
            if (!grouped[month.year]) {
                grouped[month.year] = [];
            }
            grouped[month.year].push(month);
        });
        return grouped;
    }, [months]);

    // Get sorted years (newest first)
    const sortedYears = Object.keys(monthsByYear).sort((a, b) =>
        b.localeCompare(a)
    );

    // Sort tags by count in descending order
    const sortedTags = React.useMemo(() => {
        return [...tagsWithColors].sort((a, b) => {
            const countA = tagCounts?.[a.name] || 0;
            const countB = tagCounts?.[b.name] || 0;
            return countB - countA; // Descending order
        });
    }, [tagsWithColors, tagCounts]);

    return (
        <aside className={styles.sidebar}>
            <div className={styles.sidebarContent}>
                {/* Clear Filters Button */}
                {hasActiveFilters && (
                    <div className={styles.clearSection}>
                        <button
                            className={styles.clearButton}
                            onClick={onClearFilters}
                        >
                            Clear All Filters
                        </button>
                    </div>
                )}

                {/* Tag Filter - Move to top for better UX */}
                {tags.length > 0 && (
                    <div className={styles.filterSection}>
                        <h3 className={styles.filterTitle}>Tags</h3>
                        <div className={styles.tagGrid}>
                            {sortedTags.map((tag) => {
                                const isSelected = selectedTags.includes(
                                    tag.name
                                );
                                return (
                                    <button
                                        key={tag.name}
                                        className={`${styles.tag} ${
                                            isSelected ? styles.tagSelected : ''
                                        }`}
                                        onClick={() => onTagToggle(tag.name)}
                                        title={`Filter by ${tag.name}`}
                                        style={
                                            !isSelected
                                                ? {
                                                      backgroundColor:
                                                          getTagBackgroundColor(
                                                              tag.color
                                                          ),
                                                      color: getTagTextColor(
                                                          tag.color
                                                      )
                                                  }
                                                : undefined
                                        }
                                    >
                                        <span className={styles.tagName}>
                                            {tag.name}
                                        </span>
                                        {tagCounts &&
                                            tagCounts[tag.name] !==
                                                undefined && (
                                                <span
                                                    className={styles.tagCount}
                                                >
                                                    {tagCounts[tag.name]}
                                                </span>
                                            )}
                                        {isSelected && (
                                            <span className={styles.checkmark}>
                                                ✓
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Month Filter - More compact design */}
                <div className={styles.filterSection}>
                    <h3 className={styles.filterTitle}>Months</h3>
                    <div className={styles.monthContainer}>
                        {sortedYears.map((year) => (
                            <div key={year} className={styles.yearGroup}>
                                <div className={styles.yearHeader}>
                                    <span className={styles.yearLabel}>
                                        {year}
                                    </span>
                                    <span className={styles.yearCount}>
                                        {monthsByYear[year].reduce(
                                            (sum, month) => sum + month.count,
                                            0
                                        )}
                                    </span>
                                </div>
                                <div className={styles.monthGrid}>
                                    {monthsByYear[year].map((monthGroup) => {
                                        const isSelected =
                                            selectedMonth === monthGroup.key;
                                        return (
                                            <button
                                                key={monthGroup.key}
                                                className={`${
                                                    styles.monthItem
                                                } ${
                                                    isSelected
                                                        ? styles.monthItemActive
                                                        : ''
                                                }`}
                                                onClick={() =>
                                                    onMonthSelect(
                                                        isSelected
                                                            ? null
                                                            : monthGroup.key
                                                    )
                                                }
                                                title={`Filter by ${monthGroup.month} ${monthGroup.year}`}
                                            >
                                                <span
                                                    className={
                                                        styles.monthLabel
                                                    }
                                                >
                                                    {monthGroup.month}
                                                </span>
                                                <span
                                                    className={
                                                        styles.monthCount
                                                    }
                                                >
                                                    {monthGroup.count}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </aside>
    );
};
