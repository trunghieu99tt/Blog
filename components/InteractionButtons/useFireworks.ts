import { useCallback } from 'react';

interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    life: number;
    maxLife: number;
    color: string;
    size: number;
}

export function useFireworks() {
    const createFirework = useCallback(
        (x: number, y: number, color: string) => {
            const canvas = document.createElement('canvas');
            canvas.style.position = 'fixed';
            canvas.style.top = '0';
            canvas.style.left = '0';
            canvas.style.width = '100vw';
            canvas.style.height = '100vh';
            canvas.style.pointerEvents = 'none';
            canvas.style.zIndex = '9999';
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            document.body.appendChild(canvas);

            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            const particles: Particle[] = [];
            const particleCount = 30;

            // Create particles
            for (let i = 0; i < particleCount; i++) {
                const angle = (Math.PI * 2 * i) / particleCount;
                const velocity = 2 + Math.random() * 3;
                particles.push({
                    x,
                    y,
                    vx: Math.cos(angle) * velocity,
                    vy: Math.sin(angle) * velocity,
                    life: 1,
                    maxLife: 1,
                    color,
                    size: 2 + Math.random() * 3
                });
            }

            let animationFrame: number;

            const animate = () => {
                ctx.clearRect(0, 0, canvas.width, canvas.height);

                let allDead = true;

                particles.forEach((particle) => {
                    if (particle.life > 0) {
                        allDead = false;

                        // Update position
                        particle.x += particle.vx;
                        particle.y += particle.vy;
                        particle.vy += 0.15; // Gravity
                        particle.vx *= 0.98; // Air resistance
                        particle.life -= 0.02;

                        // Draw particle
                        ctx.globalAlpha = particle.life;
                        ctx.fillStyle = particle.color;
                        ctx.beginPath();
                        ctx.arc(
                            particle.x,
                            particle.y,
                            particle.size,
                            0,
                            Math.PI * 2
                        );
                        ctx.fill();

                        // Add glow effect
                        ctx.shadowBlur = 10;
                        ctx.shadowColor = particle.color;
                    }
                });

                ctx.globalAlpha = 1;
                ctx.shadowBlur = 0;

                if (!allDead) {
                    animationFrame = requestAnimationFrame(animate);
                } else {
                    document.body.removeChild(canvas);
                }
            };

            animate();

            return () => {
                if (animationFrame) {
                    cancelAnimationFrame(animationFrame);
                }
                if (canvas.parentNode) {
                    document.body.removeChild(canvas);
                }
            };
        },
        []
    );

    const triggerFirework = useCallback(
        (element: HTMLElement, color: string) => {
            const rect = element.getBoundingClientRect();
            const x = rect.left + rect.width / 2;
            const y = rect.top + rect.height / 2;
            createFirework(x, y, color);
        },
        [createFirework]
    );

    return { triggerFirework };
}
