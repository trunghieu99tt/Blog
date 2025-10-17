import React, { useEffect, useRef, useState, useCallback } from 'react';
import mermaid from 'mermaid';
import elkLayouts from '@mermaid-js/layout-elk';
import styles from './mermaid.module.css';
import MermaidStylePanel, { MermaidConfig } from '../MermaidStylePanel';

interface MermaidProps {
    chart: string;
    className?: string;
    enableStylePanel?: boolean;
}

interface ZoomState {
    scale: number;
    translateX: number;
    translateY: number;
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
    const [isLightboxOpen, setIsLightboxOpen] = useState(false);
    const [lightboxZoomState, setLightboxZoomState] = useState<ZoomState>({
        scale: 1,
        translateX: 0,
        translateY: 0
    });
    const [isLightboxPanning, setIsLightboxPanning] = useState(false);
    const [lightboxPanStart, setLightboxPanStart] = useState({ x: 0, y: 0 });
    const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
    const imageRef = useRef<HTMLImageElement>(null);

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

    // Apply zoom/pan transform to lightbox image
    useEffect(() => {
        if (isLightboxOpen && imageRef.current) {
            imageRef.current.style.transform = `translate(${lightboxZoomState.translateX}px, ${lightboxZoomState.translateY}px) scale(${lightboxZoomState.scale})`;
            imageRef.current.style.transformOrigin = 'center center';
        }
    }, [lightboxZoomState, isLightboxOpen]);

    // Convert SVG to data URI for lightbox
    const svgToDataUri = useCallback((): string | null => {
        if (!ref.current) return null;

        const svg = ref.current.querySelector('svg');
        if (!svg) return null;

        try {
            // Clone the SVG to avoid modifying the original
            const clonedSvg = svg.cloneNode(true) as SVGSVGElement;

            // Get SVG dimensions
            const bbox = svg.getBBox();
            const viewBox = svg.viewBox.baseVal;
            const width = viewBox.width || bbox.width || 800;
            const height = viewBox.height || bbox.height || 600;

            // Set explicit dimensions and ensure it's self-contained
            clonedSvg.setAttribute('width', width.toString());
            clonedSvg.setAttribute('height', height.toString());
            clonedSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

            // Add white background
            const rect = document.createElementNS(
                'http://www.w3.org/2000/svg',
                'rect'
            );
            rect.setAttribute('width', '100%');
            rect.setAttribute('height', '100%');
            rect.setAttribute('fill', 'white');
            clonedSvg.insertBefore(rect, clonedSvg.firstChild);

            // Serialize SVG to string
            const svgData = new XMLSerializer().serializeToString(clonedSvg);

            // Create data URI
            const svgBase64 = btoa(unescape(encodeURIComponent(svgData)));
            return `data:image/svg+xml;base64,${svgBase64}`;
        } catch (error) {
            console.error('Error converting SVG to data URI:', error);
            return null;
        }
    }, []);

    // Lightbox handlers
    const openLightbox = useCallback(() => {
        // Convert SVG to data URI
        const imageUrl = svgToDataUri();
        if (imageUrl) {
            setImageDataUrl(imageUrl);
            setIsLightboxOpen(true);
            // Reset lightbox zoom when opening
            setLightboxZoomState({
                scale: 1,
                translateX: 0,
                translateY: 0
            });
            // Prevent body scroll
            document.body.style.overflow = 'hidden';
        }
    }, [svgToDataUri]);

    const closeLightbox = useCallback(() => {
        setIsLightboxOpen(false);
        setIsLightboxPanning(false);
        setImageDataUrl(null);
        // Restore body scroll
        document.body.style.overflow = '';
    }, []);

    // Convert SVG to PNG using canvas (with fallback)
    const svgToPng = useCallback(async (): Promise<string | null> => {
        const svgDataUri = imageDataUrl || svgToDataUri();
        if (!svgDataUri) return null;

        try {
            // Try to convert to PNG via canvas
            return new Promise((resolve) => {
                const img = new Image();
                img.crossOrigin = 'anonymous';

                img.onload = () => {
                    try {
                        const canvas = document.createElement('canvas');
                        const svg = ref.current?.querySelector('svg');
                        const bbox = svg?.getBBox();
                        const viewBox = svg?.viewBox.baseVal;
                        const width = viewBox?.width || bbox?.width || 800;
                        const height = viewBox?.height || bbox?.height || 600;

                        const scale = 2; // Higher resolution
                        canvas.width = width * scale;
                        canvas.height = height * scale;

                        const ctx = canvas.getContext('2d', {
                            willReadFrequently: false
                        });
                        if (ctx) {
                            ctx.scale(scale, scale);
                            ctx.fillStyle = 'white';
                            ctx.fillRect(0, 0, width, height);
                            ctx.drawImage(img, 0, 0, width, height);
                            resolve(canvas.toDataURL('image/png'));
                        } else {
                            resolve(null);
                        }
                    } catch (error) {
                        console.warn(
                            'Canvas conversion failed, will use SVG:',
                            error
                        );
                        resolve(null);
                    }
                };

                img.onerror = () => resolve(null);
                img.src = svgDataUri;
            });
        } catch (error) {
            console.warn('PNG conversion failed:', error);
            return null;
        }
    }, [imageDataUrl, svgToDataUri]);

    // Download diagram
    const downloadDiagram = useCallback(async () => {
        // Try PNG first, fallback to SVG
        let downloadUrl = await svgToPng();
        let filename = `mermaid-diagram-${Date.now()}.png`;

        if (!downloadUrl) {
            // Fallback to SVG
            downloadUrl = svgToDataUri();
            filename = `mermaid-diagram-${Date.now()}.svg`;
        }

        if (!downloadUrl) return;

        const link = document.createElement('a');
        link.download = filename;
        link.href = downloadUrl;
        link.click();
    }, [svgToPng, svgToDataUri]);

    // ESC key to close lightbox
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isLightboxOpen) {
                closeLightbox();
            }
        };

        if (isLightboxOpen) {
            document.addEventListener('keydown', handleKeyDown);
        }

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isLightboxOpen, closeLightbox]);

    // Lightbox zoom handlers
    const handleLightboxZoomIn = useCallback(() => {
        setLightboxZoomState((prev) => ({
            ...prev,
            scale: Math.min(prev.scale * 1.2, 10) // Max zoom 10x in lightbox
        }));
    }, []);

    const handleLightboxZoomOut = useCallback(() => {
        setLightboxZoomState((prev) => ({
            ...prev,
            scale: Math.max(prev.scale / 1.2, 0.1)
        }));
    }, []);

    const handleLightboxResetZoom = useCallback(() => {
        setLightboxZoomState({
            scale: 1,
            translateX: 0,
            translateY: 0
        });
    }, []);

    // Lightbox wheel zoom
    const handleLightboxWheel = useCallback(
        (e: React.WheelEvent<HTMLDivElement>) => {
            e.preventDefault();
            const delta = e.deltaY > 0 ? 0.9 : 1.1;
            setLightboxZoomState((prev) => ({
                ...prev,
                scale: Math.min(Math.max(prev.scale * delta, 0.1), 10)
            }));
        },
        []
    );

    // Lightbox pan handlers
    const handleLightboxMouseDown = useCallback(
        (e: React.MouseEvent<HTMLDivElement>) => {
            if (e.button === 0) {
                setIsLightboxPanning(true);
                setLightboxPanStart({ x: e.clientX, y: e.clientY });
                e.preventDefault();
                e.stopPropagation();
            }
        },
        []
    );

    const handleLightboxMouseMove = useCallback(
        (e: React.MouseEvent<HTMLDivElement>) => {
            if (isLightboxPanning) {
                const dx = e.clientX - lightboxPanStart.x;
                const dy = e.clientY - lightboxPanStart.y;
                setLightboxZoomState((prev) => ({
                    ...prev,
                    translateX: prev.translateX + dx,
                    translateY: prev.translateY + dy
                }));
                setLightboxPanStart({ x: e.clientX, y: e.clientY });
            }
        },
        [isLightboxPanning, lightboxPanStart]
    );

    const handleLightboxMouseUp = useCallback(() => {
        setIsLightboxPanning(false);
    }, []);

    const handleLightboxMouseLeave = useCallback(() => {
        setIsLightboxPanning(false);
    }, []);

    const handleLightboxBackgroundClick = useCallback(
        (e: React.MouseEvent<HTMLDivElement>) => {
            // Only close if clicking directly on the background, not after dragging
            if (
                e.target === e.currentTarget &&
                Math.abs(e.clientX - lightboxPanStart.x) < 5 &&
                Math.abs(e.clientY - lightboxPanStart.y) < 5
            ) {
                closeLightbox();
            }
        },
        [closeLightbox, lightboxPanStart]
    );

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
                {/* Controls */}
                <div className={styles.controls}>
                    <button
                        className={styles.controlButton}
                        onClick={openLightbox}
                        aria-label='Open in lightbox'
                        title='Open in fullscreen'
                    >
                        ⛶
                    </button>
                    <button
                        className={styles.controlButton}
                        onClick={downloadDiagram}
                        aria-label='Download diagram'
                        title='Download as PNG/SVG'
                    >
                        ⬇
                    </button>
                </div>

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

            {/* Lightbox Modal */}
            {isLightboxOpen && imageDataUrl && (
                <div
                    className={styles.lightbox}
                    onClick={handleLightboxBackgroundClick}
                >
                    <div className={styles.lightboxContent}>
                        {/* Lightbox Zoom Controls */}
                        <div className={styles.lightboxZoomControls}>
                            <button
                                className={styles.lightboxButton}
                                onClick={handleLightboxZoomIn}
                                aria-label='Zoom in'
                                title='Zoom in'
                            >
                                +
                            </button>
                            <button
                                className={styles.lightboxButton}
                                onClick={handleLightboxZoomOut}
                                aria-label='Zoom out'
                                title='Zoom out'
                            >
                                −
                            </button>
                            <button
                                className={styles.lightboxButton}
                                onClick={handleLightboxResetZoom}
                                aria-label='Reset zoom'
                                title='Reset zoom'
                            >
                                ⟲
                            </button>
                            <button
                                className={styles.lightboxButton}
                                onClick={downloadDiagram}
                                aria-label='Download diagram'
                                title='Download as PNG'
                            >
                                ⬇
                            </button>
                            <span className={styles.lightboxZoomLevel}>
                                {Math.round(lightboxZoomState.scale * 100)}%
                            </span>
                        </div>

                        {/* Close Button */}
                        <button
                            className={styles.lightboxClose}
                            onClick={closeLightbox}
                            aria-label='Close lightbox'
                            title='Close (ESC)'
                        >
                            ✕
                        </button>

                        {/* Diagram Image */}
                        <div
                            className={styles.lightboxDiagram}
                            style={{
                                cursor: isLightboxPanning ? 'grabbing' : 'grab'
                            }}
                            onWheel={handleLightboxWheel}
                            onMouseDown={handleLightboxMouseDown}
                            onMouseMove={handleLightboxMouseMove}
                            onMouseUp={handleLightboxMouseUp}
                            onMouseLeave={handleLightboxMouseLeave}
                        >
                            <img
                                ref={imageRef}
                                src={imageDataUrl}
                                alt='Mermaid Diagram'
                                className={styles.lightboxImage}
                                draggable={false}
                            />
                        </div>
                    </div>
                </div>
            )}

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
