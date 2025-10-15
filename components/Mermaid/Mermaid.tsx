import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import elkLayouts from '@mermaid-js/layout-elk';
import styles from './mermaid.module.css';
import MermaidStylePanel, { MermaidConfig } from '../MermaidStylePanel';

interface MermaidProps {
    chart: string;
    className?: string;
    enableStylePanel?: boolean;
}

const Mermaid: React.FC<MermaidProps> = ({
    chart,
    className,
    enableStylePanel = false
}) => {
    const ref = useRef<HTMLDivElement>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showStylePanel, setShowStylePanel] = useState(false);
    const [customConfig, setCustomConfig] = useState<MermaidConfig>({});

    useEffect(() => {
        let isMounted = true;

        const renderMermaid = async () => {
            if (!ref.current || !chart) return;

            try {
                setIsLoading(true);
                setError(null);

                // Parse and clean the chart content
                const { chart: cleanedChart, config: chartConfig } =
                    parseMermaidChart(chart);

                // Always register ELK layout loaders first
                try {
                    mermaid.registerLayoutLoaders(elkLayouts);
                } catch (error) {
                    console.error(
                        'Failed to register ELK layout loaders:',
                        error
                    );
                }

                // Initialize/reinitialize mermaid with current config
                const mermaidConfig: any = {
                    startOnLoad: false,
                    theme: customConfig.theme || 'neutral',
                    securityLevel: 'loose',
                    fontFamily: customConfig.fontFamily || 'Space Grotesk',
                    fontSize: customConfig.fontSize || 18,
                    flowchart: {
                        useMaxWidth: true,
                        htmlLabels: true,
                        curve: customConfig.flowchart?.curve || 'basis',
                        padding: customConfig.flowchart?.padding || 20,
                        nodeSpacing: customConfig.flowchart?.nodeSpacing || 100,
                        rankSpacing: customConfig.flowchart?.rankSpacing || 100
                    },
                    sequence: {
                        useMaxWidth: true,
                        diagramMarginX: 50,
                        diagramMarginY: 10
                    },
                    gantt: {
                        useMaxWidth: true
                    },
                    journey: {
                        useMaxWidth: true
                    },
                    timeline: {
                        useMaxWidth: true
                    },
                    gitGraph: {
                        useMaxWidth: true
                    },
                    themeVariables: {
                        ...customConfig.themeVariables
                    }
                };

                // Apply chart-specific config
                if (chartConfig.layout) {
                    mermaidConfig.flowchart = {
                        ...mermaidConfig.flowchart,
                        layout: chartConfig.layout
                    };
                }

                // Apply nested config (e.g., config.layout)
                if (chartConfig.config) {
                    if (chartConfig.config.layout) {
                        mermaidConfig.flowchart = {
                            ...mermaidConfig.flowchart,
                            layout: chartConfig.config.layout
                        };
                    }
                    // Apply any other nested config
                    Object.assign(mermaidConfig, chartConfig.config);
                }

                // Always initialize/reinitialize mermaid with the current config
                mermaid.initialize(mermaidConfig);

                // Clear previous content
                ref.current.innerHTML = '';

                // Generate unique ID for this chart
                const id = `mermaid-${Date.now()}-${Math.random()
                    .toString(36)
                    .substr(2, 9)}`;

                // Render the chart
                const { svg } = await mermaid.render(id, cleanedChart);

                if (isMounted && ref.current) {
                    ref.current.innerHTML = svg;
                    setIsLoading(false);
                }
            } catch (err) {
                console.error('Mermaid rendering error:', err);
                if (isMounted) {
                    setError(
                        err instanceof Error
                            ? err.message
                            : 'Failed to render diagram'
                    );
                    setIsLoading(false);
                }
            }
        };

        renderMermaid();

        return () => {
            isMounted = false;
        };
    }, [chart, customConfig]);

    // Helper function to parse and clean Mermaid charts
    const parseMermaidChart = (
        rawChart: string
    ): { chart: string; config: any } => {
        let cleanedChart = rawChart.trim();
        let config = {};

        // Parse YAML frontmatter if present
        if (cleanedChart.startsWith('---')) {
            const lines = cleanedChart.split('\n');
            let endIndex = -1;

            // Find the end of the frontmatter
            for (let i = 1; i < lines.length; i++) {
                if (lines[i].trim() === '---') {
                    endIndex = i;
                    break;
                }
            }

            if (endIndex > 0) {
                // Extract config from frontmatter
                const frontmatterLines = lines.slice(1, endIndex);
                config = parseYamlConfig(frontmatterLines.join('\n'));

                // Remove the frontmatter and get the actual chart content
                cleanedChart = lines
                    .slice(endIndex + 1)
                    .join('\n')
                    .trim();
            }
        }

        // Additional cleanup for common issues
        cleanedChart = cleanedChart
            // Remove any remaining config blocks
            .replace(/^---[\s\S]*?---\s*/gm, '')
            // Clean up extra whitespace
            .replace(/\n\s*\n\s*\n/g, '\n\n')
            .trim();

        return { chart: cleanedChart, config };
    };

    // Helper function to parse YAML-like config
    const parseYamlConfig = (yamlString: string): any => {
        const config: any = {};

        try {
            // Parse simple YAML structure
            const lines = yamlString.split('\n');
            let currentObject: any = config;

            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed || trimmed.startsWith('#')) continue;

                const kvMatch = trimmed.match(/^(\w+):\s*(.*)$/);
                if (kvMatch) {
                    const [, key, value] = kvMatch;

                    if (value) {
                        // Simple value
                        let parsedValue: any = value;
                        if (value === 'true') parsedValue = true;
                        else if (value === 'false') parsedValue = false;
                        else if (!isNaN(Number(value)))
                            parsedValue = Number(value);
                        else if (
                            value.startsWith("'") ||
                            value.startsWith('"')
                        ) {
                            parsedValue = value.slice(1, -1);
                        }

                        currentObject[key] = parsedValue;
                    } else {
                        // Nested object
                        currentObject[key] = {};
                        currentObject = currentObject[key];
                    }
                }
            }
        } catch (error) {
            console.error('Error parsing YAML config:', error);
        }

        return config;
    };

    if (error) {
        return (
            <div
                className={`${styles.mermaidContainer} ${styles.error} ${
                    className || ''
                }`}
            >
                <div className={styles.errorMessage}>
                    <strong>Mermaid Diagram Error:</strong>
                    <pre>{error}</pre>
                    <details>
                        <summary>Original Chart Code</summary>
                        <pre className={styles.chartCode}>{chart}</pre>
                    </details>
                    <details>
                        <summary>Parsed Chart Code</summary>
                        <pre className={styles.chartCode}>
                            {parseMermaidChart(chart).chart}
                        </pre>
                    </details>
                </div>
            </div>
        );
    }

    return (
        <>
            <div className={`${styles.mermaidContainer} ${className || ''}`}>
                {enableStylePanel && (
                    <button
                        className={styles.styleButton}
                        onClick={() => setShowStylePanel(!showStylePanel)}
                        aria-label='Toggle styling panel'
                        title='Customize diagram styling'
                    >
                        🎨 Style
                    </button>
                )}
                {isLoading && (
                    <div className={styles.loading}>
                        <div className={styles.spinner}></div>
                        <span>Rendering diagram...</span>
                    </div>
                )}
                <div
                    ref={ref}
                    className={styles.mermaidChart}
                    style={{ display: isLoading ? 'none' : 'block' }}
                />
            </div>
            {enableStylePanel && showStylePanel && (
                <MermaidStylePanel
                    config={customConfig}
                    onChange={setCustomConfig}
                    onClose={() => setShowStylePanel(false)}
                />
            )}
        </>
    );
};

export default Mermaid;
