import { useState, useEffect, useRef } from 'react';

/**
 * Animates a number from its previous value to `target` over `duration` ms
 * using an ease-out curve. Returns the current interpolated integer value.
 * The very first render (target going from 0 to the fetched value) is skipped
 * so the badge doesn't animate on initial page load.
 */
export function useCountUp(target: number, duration = 600): number {
    const [displayed, setDisplayed] = useState(target);
    const prevTarget = useRef<number | null>(null);
    const rafRef = useRef<number | null>(null);

    useEffect(() => {
        // Skip the very first real value (initial fetch populating 0 → N)
        if (prevTarget.current === null) {
            prevTarget.current = target;
            setDisplayed(target);
            return;
        }

        const from = prevTarget.current;
        prevTarget.current = target;

        if (from === target) return;

        const startTime = performance.now();

        const tick = (now: number) => {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            // Ease-out cubic
            const eased = 1 - Math.pow(1 - progress, 3);
            setDisplayed(Math.round(from + (target - from) * eased));

            if (progress < 1) {
                rafRef.current = requestAnimationFrame(tick);
            }
        };

        rafRef.current = requestAnimationFrame(tick);
        return () => {
            if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
        };
    }, [target, duration]);

    return displayed;
}
