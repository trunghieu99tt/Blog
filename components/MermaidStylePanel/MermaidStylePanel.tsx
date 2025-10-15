import React, { useState } from 'react';
import styles from './mermaidStylePanel.module.css';

export interface MermaidConfig {
    theme?: 'default' | 'forest' | 'dark' | 'neutral' | 'base';
    fontSize?: number;
    fontFamily?: string;
    flowchart?: {
        layout?: 'dagre' | 'elk';
        curve?:
            | 'basis'
            | 'linear'
            | 'cardinal'
            | 'monotoneX'
            | 'monotoneY'
            | 'natural'
            | 'step'
            | 'stepAfter'
            | 'stepBefore';
        padding?: number;
        nodeSpacing?: number;
        rankSpacing?: number;
    };
    themeVariables?: {
        primaryColor?: string;
        primaryTextColor?: string;
        primaryBorderColor?: string;
        lineColor?: string;
        secondaryColor?: string;
        tertiaryColor?: string;
    };
}

interface MermaidStylePanelProps {
    config: MermaidConfig;
    onChange: (config: MermaidConfig) => void;
    onClose?: () => void;
}

const PRESET_THEMES = {
    default: {
        name: 'Default',
        config: {
            theme: 'default' as const,
            fontSize: 16
        }
    },
    dark: {
        name: 'Dark Mode',
        config: {
            theme: 'dark' as const,
            fontSize: 16,
            themeVariables: {
                primaryColor: '#4a90e2',
                primaryTextColor: '#ffffff',
                primaryBorderColor: '#357abd',
                lineColor: '#5cb85c'
            }
        }
    },
    forest: {
        name: 'Forest',
        config: {
            theme: 'forest' as const,
            fontSize: 16
        }
    },
    minimal: {
        name: 'Minimal',
        config: {
            theme: 'neutral' as const,
            fontSize: 14,
            flowchart: {
                padding: 10,
                nodeSpacing: 50,
                rankSpacing: 50
            }
        }
    },
    vibrant: {
        name: 'Vibrant',
        config: {
            theme: 'default' as const,
            fontSize: 18,
            themeVariables: {
                primaryColor: '#ff6b6b',
                primaryTextColor: '#ffffff',
                primaryBorderColor: '#c92a2a',
                lineColor: '#339af0',
                secondaryColor: '#51cf66',
                tertiaryColor: '#ffd43b'
            }
        }
    }
};

const MermaidStylePanel: React.FC<MermaidStylePanelProps> = ({
    config,
    onChange,
    onClose
}) => {
    const [activeTab, setActiveTab] = useState<'settings' | 'presets'>(
        'settings'
    );

    const updateConfig = (path: string[], value: any) => {
        const newConfig = { ...config };
        let current: any = newConfig;

        for (let i = 0; i < path.length - 1; i++) {
            if (!current[path[i]]) {
                current[path[i]] = {};
            }
            current = current[path[i]];
        }

        current[path[path.length - 1]] = value;
        onChange(newConfig);
    };

    const applyPreset = (presetKey: string) => {
        const preset = PRESET_THEMES[presetKey as keyof typeof PRESET_THEMES];
        if (preset) {
            onChange({ ...config, ...preset.config });
        }
    };

    const exportConfig = () => {
        const yamlConfig = generateYAML(config);
        navigator.clipboard.writeText(yamlConfig);
        alert('Configuration copied to clipboard!');
    };

    const generateYAML = (obj: any, indent = 0): string => {
        let yaml = '';
        const spaces = '  '.repeat(indent);

        for (const [key, value] of Object.entries(obj)) {
            if (value === undefined || value === null) continue;

            if (typeof value === 'object' && !Array.isArray(value)) {
                yaml += `${spaces}${key}:\n`;
                yaml += generateYAML(value, indent + 1);
            } else {
                yaml += `${spaces}${key}: ${value}\n`;
            }
        }

        return yaml;
    };

    return (
        <div className={styles.panel}>
            <div className={styles.header}>
                <h3>Mermaid Styling Panel</h3>
                {onClose && (
                    <button
                        className={styles.closeButton}
                        onClick={onClose}
                        aria-label='Close panel'
                    >
                        ×
                    </button>
                )}
            </div>

            <div className={styles.tabs}>
                <button
                    className={`${styles.tab} ${
                        activeTab === 'settings' ? styles.active : ''
                    }`}
                    onClick={() => setActiveTab('settings')}
                >
                    Settings
                </button>
                <button
                    className={`${styles.tab} ${
                        activeTab === 'presets' ? styles.active : ''
                    }`}
                    onClick={() => setActiveTab('presets')}
                >
                    Presets
                </button>
            </div>

            <div className={styles.content}>
                {activeTab === 'settings' && (
                    <div className={styles.section}>
                        <div className={styles.field}>
                            <label>Theme</label>
                            <select
                                value={config.theme || 'default'}
                                onChange={(e) =>
                                    updateConfig(['theme'], e.target.value)
                                }
                            >
                                <option value='default'>Default</option>
                                <option value='forest'>Forest</option>
                                <option value='dark'>Dark</option>
                                <option value='neutral'>Neutral</option>
                                <option value='base'>Base</option>
                            </select>
                        </div>

                        <div className={styles.field}>
                            <label>Layout Algorithm</label>
                            <select
                                value={config.flowchart?.layout || 'dagre'}
                                onChange={(e) =>
                                    updateConfig(
                                        ['flowchart', 'layout'],
                                        e.target.value
                                    )
                                }
                            >
                                <option value='dagre'>Dagre (Default)</option>
                                <option value='elk'>ELK (Hierarchical)</option>
                            </select>
                        </div>

                        <div className={styles.field}>
                            <label>Curve Style</label>
                            <select
                                value={config.flowchart?.curve || 'basis'}
                                onChange={(e) =>
                                    updateConfig(
                                        ['flowchart', 'curve'],
                                        e.target.value
                                    )
                                }
                            >
                                <option value='basis'>Basis (Smooth)</option>
                                <option value='linear'>Linear</option>
                                <option value='cardinal'>Cardinal</option>
                                <option value='monotoneX'>Monotone X</option>
                                <option value='monotoneY'>Monotone Y</option>
                                <option value='natural'>Natural</option>
                                <option value='step'>Step</option>
                                <option value='stepAfter'>Step After</option>
                                <option value='stepBefore'>Step Before</option>
                            </select>
                        </div>
                    </div>
                )}

                {activeTab === 'presets' && (
                    <div className={styles.section}>
                        <div className={styles.presets}>
                            {Object.entries(PRESET_THEMES).map(
                                ([key, preset]) => (
                                    <button
                                        key={key}
                                        className={styles.presetButton}
                                        onClick={() => applyPreset(key)}
                                    >
                                        <span className={styles.presetName}>
                                            {preset.name}
                                        </span>
                                        <span
                                            className={styles.presetDescription}
                                        >
                                            {preset.config.theme} theme
                                        </span>
                                    </button>
                                )
                            )}
                        </div>
                    </div>
                )}
            </div>

            <div className={styles.footer}>
                <button className={styles.exportButton} onClick={exportConfig}>
                    📋 Copy YAML Config
                </button>
            </div>
        </div>
    );
};

export default MermaidStylePanel;
