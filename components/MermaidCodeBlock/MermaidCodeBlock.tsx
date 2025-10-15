import React from 'react';
import { Code } from 'react-notion-x/build/third-party/code';
import { CodeBlock } from 'notion-types';
import Mermaid from '../Mermaid';

interface MermaidCodeBlockProps {
    block: CodeBlock;
    defaultLanguage?: string;
    className?: string;
}

const MermaidCodeBlock: React.FC<MermaidCodeBlockProps> = ({
    block,
    defaultLanguage,
    className
}) => {
    const code = block.properties?.title?.[0]?.[0] || '';
    const language =
        block.properties?.language?.[0]?.[0] || defaultLanguage || '';

    if (
        language.toLowerCase() === 'mermaid' ||
        code.trim().startsWith('graph') ||
        code.trim().startsWith('flowchart')
    ) {
        return <Mermaid chart={code} className={className} />;
    }

    // Fall back to regular code block for non-mermaid code
    return (
        <Code
            block={block}
            defaultLanguage={defaultLanguage}
            className={className}
        />
    );
};

export default MermaidCodeBlock;
