import React from 'react';
import { Mermaid } from '../components';

const MermaidDemo = () => {
    const sampleDiagram = `flowchart TD
    A[Start] --> B{Is it working?}
    B -->|Yes| C[Great!]
    B -->|No| D[Debug]
    D --> A
    C --> E[End]
    
    style A fill:#4a90e2,stroke:#357abd,stroke-width:2px,color:#fff
    style E fill:#51cf66,stroke:#37b24d,stroke-width:2px,color:#fff`;

    const elkDiagram = `
    %%{init: { 'layout': 'elk' } }%%
graph TD
    %% Styling
    classDef zkStyle fill:#fff3e0,stroke:#ff9800,stroke-width:3px,color:#000
    classDef dbStyle fill:#e3f2fd,stroke:#2196f3,stroke-width:3px,color:#000
    classDef publisherStyle fill:#f3e5f5,stroke:#9c27b0,stroke-width:2px,color:#000
    classDef ephemeralStyle fill:#e8f5e9,stroke:#4caf50,stroke-width:2px,color:#000
    classDef subscriberStyle fill:#fce4ec,stroke:#e91e63,stroke-width:2px,color:#000

    %% 1. Database Layer (Top)
    subgraph DB["🗄️ Database Layer"]
        M[("Master Database<br/><i>primary</i>")]
        S[("Slave Database<br/><i>replica</i>")]
    end

    %% 2. Publisher Layer
    subgraph PUB["📤 Publishers"]
        P1["Publisher P1<br/><i>active</i>"]
        P2["Publisher P2<br/><i>standby</i>"]
    end

    %% 3. ZooKeeper Coordination Layer
    subgraph ZK["🗂️ ZooKeeper Coordination"]
        ZK1["Data Markers Store<br/><i>persistent datamarkers</i>"]
        subgraph ZK2["Ephemeral Nodes<br/><i>publisher ownership</i>"]
        ZK21["Ephemeral Node (P1)"]
        ZK22["Ephemeral Node (P1)"]
        end ZK2
    end

    %% 4. Application Layer (Bottom)
    subgraph APP["📱 Application A1"]
        Sub1["Subscriber 1"]
        Sub2["Subscriber 2"]
    end

    %% Data Flow (top to bottom)
    M -->|tail log| P1
    S -->|tail log| P2
    M -.->|replication| S

    P1 -->|update datamarkers| ZK1
    P1 -->|register ownership| ZK21
    P2 -->|register standby| ZK2

    P1 -->|publish| Sub1
    P1 -->|publish| Sub2
    P2 -.->|standby for| Sub2

    P2 -.-> |watch ownership| ZK21

    %% Failover mechanism
    ZK2 -.->|watch ownership| P2

    %% Apply styles
    class ZK1,ZK2 zkStyle
    class M,S dbStyle
    class P1,P2 publisherStyle
    class Sub1,Sub2 subscriberStyle`;

    return (
        <div style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto' }}>
            <h1>Mermaid Styling Panel Demo</h1>
            <p>
                This page demonstrates the interactive Mermaid styling panel.
                Click the "🎨 Style" button on any diagram to customize it!
            </p>

            <section style={{ marginTop: '40px' }}>
                <h2>Example 1: Simple Flowchart</h2>
                <p>
                    Try customizing the theme, colors, and layout of this
                    diagram:
                </p>
                <Mermaid chart={sampleDiagram} enableStylePanel={true} />
            </section>

            <section style={{ marginTop: '60px' }}>
                <h2>Example 2: ELK Layout with YAML Config</h2>
                <p>
                    This diagram uses ELK layout and custom colors defined in
                    YAML:
                </p>
                <Mermaid chart={elkDiagram} enableStylePanel={true} />
            </section>

            <section
                style={{
                    marginTop: '60px',
                    padding: '20px',
                    background: '#f8fafc',
                    borderRadius: '8px'
                }}
            >
                <h2>How to Use</h2>
                <ol>
                    <li>Click the "🎨 Style" button on any diagram</li>
                    <li>
                        Use the tabs to navigate between settings:
                        <ul>
                            <li>
                                <strong>Settings</strong>: Theme, layout
                                algorithm, and curve style
                            </li>
                            <li>
                                <strong>Presets</strong>: Quick theme templates
                            </li>
                        </ul>
                    </li>
                    <li>
                        Click "📋 Copy YAML Config" to export your configuration
                    </li>
                    <li>Paste the YAML config into your Notion code block</li>
                </ol>
            </section>

            <section
                style={{
                    marginTop: '40px',
                    padding: '20px',
                    background: '#fff3cd',
                    borderRadius: '8px'
                }}
            >
                <h3>💡 Pro Tips</h3>
                <ul>
                    <li>Start with a preset theme, then customize it</li>
                    <li>Use ELK layout for hierarchical diagrams</li>
                    <li>Increase node/rank spacing for complex diagrams</li>
                    <li>Export your config and reuse it across diagrams</li>
                </ul>
            </section>
        </div>
    );
};

export default MermaidDemo;
