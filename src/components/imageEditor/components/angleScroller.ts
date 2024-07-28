type BuildResult = { container: HTMLDivElement, canvas: HTMLCanvasElement };

export class AngleScroller {

    private context: CanvasRenderingContext2D | null

    private displayWidth: number = 2000;
    private displayHeight: number = 48;
    private size: number = 2
    private spacing: number = this.size * 2;

    private centerX: number = this.displayWidth / 2;
    private centerY: number = this.displayHeight / 2;

    private containerWidth: number = 0;

    private isDragging: boolean = false;
    private startX: number = 0;

    onUpdate: ((value: number) => any) | null = null;

    readonly element: HTMLElement;

    constructor() {
        const buildResult = this.build();
        this.element = buildResult.container;
        this.context = buildResult.canvas.getContext('2d');
    }

    private build(): BuildResult {
        const container = document.createElement('div');
        container.classList.add('angle-scroller');
        container.style.height = `${this.displayHeight}px`;

        container.addEventListener('mousedown', (e) => { this.startDrag(e) });
        container.addEventListener('touchstart', (e) => { this.startDrag(e.touches[0]) })

        window.addEventListener('mousemove', (e) => { this.onDrag(e) });
        window.addEventListener('touchmove', (e) => { this.onDrag(e.touches[0]) });

        window.addEventListener('mouseup', () => { this.endDrag() });
        window.addEventListener('touchend', () => { this.endDrag() });

        container.addEventListener('scroll', () => {
            const scrollLeft = container.scrollLeft;
            const centerDegree = (scrollLeft + this.containerWidth / 2 - this.centerX) / this.spacing;
            if (centerDegree >= -45 && centerDegree <= 45) {
                this.drawScale(centerDegree);
                this.onUpdate?.(Math.round(centerDegree));
            }
        });

        const canvas = document.createElement('canvas');
        const scaleFactor = window.devicePixelRatio || 1;
        canvas.width = this.displayWidth * scaleFactor;
        canvas.height = this.displayHeight * scaleFactor;
        canvas.getContext('2d')?.scale(scaleFactor, scaleFactor);
        canvas.style.width = `${this.displayWidth}px`;
        canvas.style.height = `${this.displayHeight}px`;
        
        container.appendChild(canvas);

        return {
            container: container,
            canvas: canvas
        };
    }

    private startDrag(e: MouseEvent | Touch) {
        if (e instanceof MouseEvent) {
            e.preventDefault();
        }

        this.isDragging = true;
        this.startX = e.pageX - this.element.offsetLeft;
        this.element.style.cursor = 'grabbing';
    }

    private onDrag(e: MouseEvent | Touch) {
        if (this.isDragging) {
            if (e instanceof MouseEvent) {
                e.preventDefault();
            }

            const currentX = e.pageX - this.element.offsetLeft;
            const deltaX = this.startX - currentX;
            const newScrollLeft = this.element.scrollLeft + deltaX;
            const centerDegree = (newScrollLeft + this.containerWidth / 2 - this.centerX) / this.spacing;

            if (centerDegree >= -45 && centerDegree <= 45) {
                this.element.scrollLeft = newScrollLeft;
                this.startX = currentX;
            }
        }
    }

    private endDrag() {
        this.isDragging = false;
        this.element.style.cursor = 'grab';

        const nearestScrollLeft = this.getNearestDivision(this.element.scrollLeft);
        this.smoothScrollTo(nearestScrollLeft);
    }

    private drawCircle(x: number, y: number, radius: number, fillStyle: string) {
        const context = this.context;
        if (!context) {
            return;
        }

        context.beginPath();
        context.arc(x, y, radius, 0, Math.PI * 2);
        context.fillStyle = fillStyle;
        context.fill();
        context.closePath();
    }

    private drawPointer(x: number, y: number) {
        const context = this.context;
        if (!context) {
            return;
        }

        const size = 2;
        context.lineJoin = "round";
        context.lineWidth = 3;
        context.strokeStyle = '#FFFFFF';
        context.fillStyle = 'FFFFFF';
        context.beginPath();
        context.moveTo(x, y - size);
        context.lineTo(x - size, y);
        context.lineTo(x + size, y);
        context.closePath();
        context.stroke();
        context.fill();
    }

    private drawScale(centerDegree: number) {
        const context = this.context;
        if (!context) {
            return;
        }

        context.clearRect(0, 0, this.displayWidth, this.displayHeight);
    
        for (let i = -180; i <= 180; i += 3) {
            const x = this.centerX + i * this.spacing;

            let rounded = Math.round(centerDegree);
            let fillStyle = '#FFFFFF33';
            if (rounded >= 0 && i <= rounded && i >= 0 ||
                rounded <= 0 && i >= rounded && i <= 0
            ) {
                fillStyle = '#FFFFFF';
            } else if (i % 15 === 0) {
                fillStyle = '#FFFFFF80';
            }

            if (i % 15 === 0) {
                context.font = '500 16px Roboto';
                context.textAlign = 'center';
                context.fillStyle = fillStyle;
                let offset = 0;
                if (i >= 0) {
                    offset = 2;
                }
                context.fillText(`${i}°`, x + offset, this.centerY - this.spacing);
            }

            this.drawCircle(x, this.centerY + 15, this.size, fillStyle);
        }

        this.drawPointer(this.element.scrollLeft + this.containerWidth / 2, this.centerY + 5);
    }

    private getNearestDivision(scrollLeft: number) {
        const centerDegree = (scrollLeft + this.containerWidth / 2 - this.centerX) / this.spacing;
        const nearest = Math.round(centerDegree / 3) * 3;
        const final = nearest * this.spacing - (this.containerWidth / 2) + this.centerX;
        return final
    }

    private smoothScrollTo(target: number) {
        const start = this.element.scrollLeft;
        const distance = target - start;
        const duration = 225;
        let startTime: number | null = null;

        const animation = (currentTime: number) => {
            if (!startTime) startTime = currentTime;
            const timeElapsed = currentTime - startTime;
            const progress = Math.min(timeElapsed / duration, 1);

            this.element.scrollLeft = start + distance * this.easeInOutQuad(progress);

            if (timeElapsed < duration) {
                requestAnimationFrame(animation);
            } else {
                this.element.scrollLeft = target;
            }
        }

        requestAnimationFrame(animation);
    }

    private easeInOutQuad(t: number) {
        return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    }

    invalidate(degree: number = 0) {
        this.containerWidth = this.element.clientWidth;
        const offset = (this.displayWidth / 2) - (this.containerWidth / 2) + degree * this.spacing;
        this.element.scrollLeft = offset;
        this.drawScale(degree);
    }

}