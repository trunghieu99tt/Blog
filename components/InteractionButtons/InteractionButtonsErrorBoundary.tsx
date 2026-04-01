import React from 'react';

interface State {
    hasError: boolean;
}

/**
 * Catches any render/effect errors inside InteractionButtons so that a crash
 * there doesn't blank out the whole NotionRenderer page content.
 */
export class InteractionButtonsErrorBoundary extends React.Component<
    React.PropsWithChildren<object>,
    State
> {
    constructor(props: React.PropsWithChildren<object>) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(): State {
        return { hasError: true };
    }

    componentDidCatch(error: Error, info: React.ErrorInfo) {
        console.error('[InteractionButtons] render error:', error, info);
    }

    render() {
        if (this.state.hasError) {
            return null;
        }
        return this.props.children;
    }
}
