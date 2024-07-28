import { ColorUtils } from "../utils/colorUtils";
import { MathUtils } from "../utils/mathUtils";

export class EditableField {

    private static TAG = 'its_editable_field';
    private static TEXT_HORIZONTAL_PADDING = 8;
    private static TEXT_VERTICAL_PADDING = 4;

    private _color: string;
    private _font: string;
    private _size: number;
    private _alignment: string;
    private _style: string;
    private onSelectionChanged: (isSelected: boolean) => any;
    private onTransformStarted: () => any;

    private isSelected: boolean = false;
    private isEnabled: boolean = true;

    private lastInterceptedPointerX: number = 0;
    private lastInterceptedPointerY: number = 0;
    private dragAction: (e: MouseEvent) => any = (e: MouseEvent) => { this.drag(e) };
    private endDragAction: (e: MouseEvent) => any = (e: MouseEvent) => { this.endDrag() };

    private currentResizerAngle: number = 0;
    private _rotation: number = 0;
    private rotateAndScaleAction: (e: MouseEvent) => any = (e: MouseEvent) => { this.rotateAndScale(e) };
    private endRotateAndScaleAction: (e: MouseEvent) => any = (e: MouseEvent) => { this.endRotateAndScale() };

    private previousScale: number = 1;
    private _scale: number = 1;

    private field: HTMLSpanElement;
    readonly element: HTMLElement;

    get color(): string {
        return this._color;
    }

    get font(): string {
        return this._font;
    }

    get size(): number {
        return this._size;
    }

    get strokeSize(): number {
        return this._style == 'outlined' ? this._size / 35 : 0;
    }

    get strokeColor(): string {
        return ColorUtils.isLight(this._color) ? '#000000' : '#FFFFFF';
    }

    get backgroundColor(): string {
        return ColorUtils.isLight(this._color) ? '#000000' : '#FFFFFF';
    }

    get alignment(): string {
        return this._alignment;
    }

    get style(): string {
        return this._style;
    }

    get rotation(): number {
        return this._rotation;
    }

    get scale(): number {
        return this._scale;
    }

    get lineHeight(): number {
        return this.size + this.textVerticalPadding * 2;
    }

    get textHorizontalPadding(): number {
        return EditableField.TEXT_HORIZONTAL_PADDING;
    }

    get textVerticalPadding(): number {
        return EditableField.TEXT_VERTICAL_PADDING;
    }

    get value(): string {
        return this.field.textContent ?? '';
    }

    get textScaledOffsetLeft(): number {
        const dx = (this.element.clientWidth * (1 - this._scale)) / 2;
        const style = window.getComputedStyle(this.element);
        const innerOffsetLeft = (parseFloat(style.paddingLeft) * 2 + this.textHorizontalPadding) * this.scale;
        return this.element.offsetLeft + innerOffsetLeft + dx;
    }

    get textScaledOffsetTop(): number {
        const dy = (this.element.clientHeight * (1 - this._scale)) / 2;
        const style = window.getComputedStyle(this.element);
        const innerOffsetTop = (parseFloat(style.paddingTop) * 2 + this.textVerticalPadding) * this.scale;
        return this.element.offsetTop + innerOffsetTop + dy;
    }

    get maxTextWidth(): number {
        const style = window.getComputedStyle(this.element);
        return this.element.clientWidth - (parseFloat(style.paddingLeft) + parseFloat(style.paddingRight) + this.textHorizontalPadding * 2);
    }

    constructor(
        color: string,
        font: string,
        size: number,
        alignment: string,
        style: string,
        onSelectionChanged: (isSelected: boolean) => any,
        onTransformStarted: () => any
    ) {
        this._color = color;
        this._font = font;
        this._size = size;
        this._alignment = alignment;
        this._style = style;
        this.onSelectionChanged = onSelectionChanged;
        this.onTransformStarted = onTransformStarted;

        this.field = this.createField();
        this.element = this.build(this.field);
        this.updateParams({});
    }

    private build(field: HTMLSpanElement): HTMLElement {
        const container = document.createElement('div');
        container.classList.add('text-overlay-input-container');
        container.dataset.editableFieldTag = EditableField.TAG;
        container.appendChild(field);

        const ltDot = this.createResizerDot({ l: -4, t: -4 });
        container.appendChild(ltDot);

        const rtDot = this.createResizerDot({ r: -4, t: -4 });
        container.appendChild(rtDot);

        const rbDot = this.createResizerDot({ r: -4, b: -4 });
        container.appendChild(rbDot);

        const lbDot = this.createResizerDot({ l: -4, b: -4 });
        container.appendChild(lbDot);

        return container;
    }

    private createField(): HTMLSpanElement {
        const field = document.createElement('span');
        field.contentEditable = 'true';
        field.classList.add('text-overlay-input');
        field.style.paddingLeft = field.style.paddingRight = `${this.textHorizontalPadding}px`;
        field.dataset.editableFieldTag = EditableField.TAG;
        field.addEventListener('mousedown', (e: MouseEvent) => { this.startDrag(e) });
        return field;
    }

    private createResizerDot(
        position: {
            l?: number,
            t?: number,
            r?: number,
            b?: number
        }
    ) {
        const left = position.l != null ? `${position.l}px` : '';
        const top = position.t != null ? `${position.t}px` : '';
        const right = position.r != null ? `${position.r}px` : '';
        const bottom = position.b != null ? `${position.b}px` : '';

        const cursor = left && top || right && bottom ? 'nwse-resize' : 'nesw-resize';

        const resizerDot = document.createElement('div');
        resizerDot.classList.add('resizer-dot');
        resizerDot.style.left = left;
        resizerDot.style.top = top;
        resizerDot.style.right = right;
        resizerDot.style.bottom = bottom;
        resizerDot.style.cursor = cursor;
        resizerDot.addEventListener('mousedown', (e: MouseEvent) => { this.startRotateAndScale(e) }, true);

        return resizerDot;
    }

    private startDrag(e: MouseEvent) {
        e.stopPropagation();
        e.preventDefault();
        
        if (!this.isEnabled) {
            return;
        }

        this.lastInterceptedPointerX = e.clientX - this.element.offsetLeft;
        this.lastInterceptedPointerY = e.clientY - this.element.offsetTop;
        document.addEventListener('mousemove', this.dragAction);
        document.addEventListener('mouseup', this.endDragAction);
        this.setSelected(true);
    }

    private drag(e: MouseEvent) {
        e.preventDefault();
        this.element.style.left = `${e.clientX - this.lastInterceptedPointerX}px`;
        this.element.style.top = `${e.clientY - this.lastInterceptedPointerY}px`;
    }

    private endDrag() {
        document.removeEventListener('mousemove', this.dragAction);
        document.removeEventListener('mouseup', this.endDragAction);
    }

    private startRotateAndScale(e: MouseEvent) {
        e.preventDefault();
        e.stopPropagation();
        this.currentResizerAngle = this.calculateAngleFromCenter(e.clientX, e.clientY);
        this.lastInterceptedPointerX = e.pageX;
        this.lastInterceptedPointerY = e.pageY; 
        this.previousScale = this._scale;
        document.addEventListener('mousemove', this.rotateAndScaleAction);
        document.addEventListener('mouseup', this.endRotateAndScaleAction);
        this.onTransformStarted();
    }

    private rotateAndScale(e: MouseEvent) {
        e.preventDefault();
        e.stopPropagation();

        const pointerAngle = this.calculateAngleFromCenter(e.clientX, e.clientY);
        const deltaAngle = pointerAngle - this.currentResizerAngle;
        this._rotation = this._rotation + deltaAngle;
        this.currentResizerAngle = pointerAngle;

        const dx = e.pageX - this.lastInterceptedPointerX;
        const dy = e.pageY - this.lastInterceptedPointerY;
        const w = this.element.clientWidth;
        const h = this.element.clientHeight;
        const distance = Math.sqrt(Math.pow(dx + w, 2) + Math.pow(dy + h, 2));
        const initialDistance = Math.sqrt(w * w + h * h);
        const offset = distance / initialDistance;
        const newScale = this.previousScale * offset;
        this._scale = MathUtils.clamp(newScale, .5, 2);

        this.element.style.transform = `rotate(${this._rotation}rad) scale(${this._scale})`;
    }

    private calculateAngleFromCenter(x: number, y: number): number {
        const rect = this.element.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        return Math.atan2(y - centerY, x - centerX);
    }

    private endRotateAndScale() {
        document.removeEventListener('mousemove', this.rotateAndScaleAction);
        document.removeEventListener('mouseup', this.endRotateAndScaleAction);
    }

    setSelected(isSelected: boolean) {
        if (isSelected == this.isSelected || isSelected && !this.isEnabled) {
            return;
        }

        const resizerDots = this.element.querySelectorAll('div.resizer-dot');

        this.isSelected = isSelected;
        if (isSelected) {
            this.element.classList.add('selected');
            this.updateFocus();
            resizerDots.forEach((resizer) => {
                resizer.classList.add('selected');
            });
        } else {
            this.element.classList.remove('selected');
            this.field.blur();
            resizerDots.forEach((resizer) => {
                resizer.classList.remove('selected');
            });
        }
        this.onSelectionChanged(isSelected);
    }

    setEnabled(isEnabled: boolean) {
        if (isEnabled == this.isEnabled) {
            return;
        }

        this.isEnabled = isEnabled;
        this.setSelected(false);

        this.field.style.cursor = isEnabled ? 'move' : 'default';
    }

    updateParams(
        params: {
            color?: string,
            font?: string,
            size?: number,
            alignment?: string,
            style?: string
        }
    ) {
        this._color = params.color ?? this._color;
        this._font = params.font ?? this._font;
        this._size = params.size ?? this._size;
        this._alignment = params.alignment ?? this._alignment;
        this._style = params.style ?? this._style;

        this.element.style.minHeight = `${this.lineHeight + 32}px`;
        this.element.style.textAlign = this._alignment;

        this.field.style.color = this._color;
        this.field.style.fontFamily = this._font;
        this.field.style.fontSize = `${this._size}px`;
        this.field.style.webkitTextStroke = this._style == 'outlined' ? `${this.strokeSize}px ${this.strokeColor}` : '';
        this.field.style.backgroundColor = this._style == 'filled' ? this.backgroundColor : 'transparent';
        this.field.style.paddingTop = this.field.style.paddingBottom = `${this.textVerticalPadding}px`;
        this.field.style.lineHeight = `${this.lineHeight}px`;

        this.updateFocus();
    }

    private updateFocus() {
        this.field.focus();
        
        if (!this.value) {
            return;
        }

        const range = document.createRange();
        range.selectNodeContents(this.field);
        range.collapse(false);
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);
    }

    isOwnerOf(element: HTMLElement): boolean {
        return element === this.element || element === this.field;
    }

    static isFromEditableField(element: HTMLElement): boolean {
        return element.dataset.editableFieldTag == this.TAG;
    }

}