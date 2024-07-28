import {ColorPicker} from '../../components/colorPicker';
import {SelectableButton} from '../../components/selectableButton';
import {Slider} from '../../components/slider';
import {ColorUtils} from '../../utils/colorUtils';
import {CanvasController} from '../canvasController';
import {Editor} from '../editor';

type BrushType = 'pen' | 'arrow' | 'brush' | 'neon' | 'blur' | 'eraser';

type BrushParams = {
    image: string,
    name: string,
    type: BrushType,
    defaultColor: string | null
};

type Point = { x: number, y: number };

abstract class Line {
  protected points: Array<Point> = [];

  isFinalized: boolean = false;

    abstract draw(context: CanvasRenderingContext2D): void;

    addPoint(x: number, y: number) {
      this.points.push({x, y});
    }
}

class SolidLine extends Line {
  private color: string;
  private size: number;
  private cap: CanvasLineCap
  private shadowColor: string | null;
  private compositeOp: GlobalCompositeOperation;

  constructor(
    color: string,
    size: number,
    cap: CanvasLineCap,
    shadowColor: string | null = null,
    compositeOp: GlobalCompositeOperation = 'source-over'
  ) {
    super();
    this.color = color;
    this.size = size;
    this.cap = cap;
    this.shadowColor = shadowColor;
    this.compositeOp = compositeOp;
  }

  override draw(context: CanvasRenderingContext2D) {
    if(this.points.length == 0) {
      return;
    }

    context.lineWidth = this.size;
    context.lineCap = this.cap;
    context.lineJoin = 'round';
    context.strokeStyle = this.color;
    context.fillStyle = this.color;
    context.globalCompositeOperation = this.compositeOp;
    if(this.shadowColor) {
      context.shadowBlur = 10;
      context.shadowColor = this.shadowColor;
    } else {
      context.shadowBlur = 0;
    }

    if(this.points.length > 2) {
      context.beginPath();
      context.moveTo(this.points[0].x, this.points[0].y);
      for(let i = 1; i < this.points.length; i++) {
        const {x, y} = this.points[i]
        context.lineTo(x, y);
      }
      context.stroke();
      context.closePath();
    } else {
      context.beginPath();
      context.roundRect(
        this.points[0].x - this.size / 2, this.points[0].y - this.size / 2,
        this.size, this.size,
        [this.size / 2]
      );
      context.fill();
    }
  }
}

class ArrowLine extends SolidLine {
  private arrowSize: number;

  constructor(
    color: string,
    size: number,
    arrowSize: number = size * 2
  ) {
    super(color, size, 'round');
    this.arrowSize = arrowSize;
  }

  override draw(context: CanvasRenderingContext2D): void {
    super.draw(context);
    if(this.points.length > 0 && this.isFinalized) {
      const arrowHead = this.points[this.points.length - 1];
      const arrowTail = this.points.length > 10 ? this.points[this.points.length - 9] : this.points[0];
      const angle = Math.atan2(arrowHead.y - arrowTail.y, arrowHead.x - arrowTail.x);
      context.beginPath();
      context.moveTo(arrowHead.x, arrowHead.y);
      context.lineTo(
        arrowHead.x - this.arrowSize * Math.cos(angle - Math.PI / 6),
        arrowHead.y - this.arrowSize * Math.sin(angle - Math.PI / 6)
      );
      context.moveTo(arrowHead.x, arrowHead.y);
      context.lineTo(
        arrowHead.x - this.arrowSize * Math.cos(angle + Math.PI / 6),
        arrowHead.y - this.arrowSize * Math.sin(angle + Math.PI / 6)
      );
      context.stroke();
      context.closePath();
    }
  }
}

class EraserLine extends SolidLine {
  constructor(
    size: number
  ) {
    super('#FFFFFF', size, 'round', null, 'destination-out');
  }
}

class BrushSelectableButton extends SelectableButton<BrushParams> {
  private defaultFillColor: string | null = null;
  private selectedFillColor: string | null = null;

  private brushShadowElement: HTMLElement | null = null;

  constructor(
    imageUrl: string,
    text: string,
    defaultFillColor: string | null,
    onClick: () => any
  ) {
    super(imageUrl, text, false, onClick, {verticalPadding: 9});
    this.defaultFillColor = defaultFillColor;
    this.addBrushImageShadow();
  }

  override createImageElement(imageUrl: string): HTMLElement {
    const imageElement = document.createElement('object');
    imageElement.classList.add('brush-image');
    imageElement.type = 'image/svg+xml';
    imageElement.addEventListener('load', () => { this.updateColor() })
    imageElement.data = imageUrl;
    return imageElement;
  }

  private addBrushImageShadow() {
    const brushShadowElement = document.createElement('div');
    brushShadowElement.classList.add('brush-image-shadow');
    this.element.appendChild(brushShadowElement);
    this.brushShadowElement = brushShadowElement;
  }

  setSelected(isSelected: boolean): void {
    super.setSelected(isSelected);
    this.updateColor();
    this.brushShadowElement?.style.setProperty('--brush-shadow-color', isSelected ? '#2B2B2B' : '#212121')
  }

  setSelectedFillColor(color: string | null) {
    this.selectedFillColor = color;
    this.updateColor();
  }

  private updateColor() {
    const defaultFillColor = this.defaultFillColor;
    const selectedFillColor = this.selectedFillColor ?? defaultFillColor;
    const imageElement = <HTMLObjectElement> this.imageElement;
    const imageContent = imageElement?.contentDocument;
    if(!imageElement || !imageContent || !defaultFillColor || !selectedFillColor) {
      return;
    }

    const currentFillColor = imageElement.classList.contains('selected') ?
            selectedFillColor :
            defaultFillColor;
    const colorChangeableElements = imageContent.getElementsByClassName('color-changeable');
    for(let i = 0, n = colorChangeableElements.length; i < n; i++) {
      const element = colorChangeableElements[i];
      element.setAttribute('fill', currentFillColor);
      element.setAttribute('stop-color', currentFillColor);
    }
  }
}

export class DrawControllerView implements Editor {
  private canvasController: CanvasController;
  private context: CanvasRenderingContext2D | null = null;

  private sizeSlider: Slider | null = null;

  private availableBrushes: Array<BrushParams> = [
    {image: 'assets/img/pen.svg', name: 'Pen', type: 'pen', defaultColor: '#FE4438'},
    {image: 'assets/img/arrow.svg', name: 'Arrow', type: 'arrow', defaultColor: '#FFD60A'},
    {image: 'assets/img/brush.svg', name: 'Brush', type: 'brush', defaultColor: '#FF8901'},
    {image: 'assets/img/neon.svg', name: 'Neon', type: 'neon', defaultColor: '#62E5E0'},
    {image: 'assets/img/blur.svg', name: 'Blur', type: 'blur', defaultColor: null},
    {image: 'assets/img/eraser.svg', name: 'Eraser', type: 'eraser', defaultColor: null}
  ]

  private brushButtons: Array<BrushSelectableButton> = [];
  private selectedBrushButton: BrushSelectableButton | null = null;

  private lines: Array<Line> = [];

  private currentDrawnLine: Line | null = null;

  private startDrawAction: (e: MouseEvent) => any = (e: MouseEvent) => { this.startDraw(e) };
  private drawAction: (e: MouseEvent) => any = (e: MouseEvent) => { this.draw(e) };
  private endDrawAction: (e: MouseEvent) => any = (e: MouseEvent) => { this.endDraw() };

  private selectedColor: string = '#FFFFFF';
  private selectedSize: number = 16;
  private selectedType: BrushType = 'pen';

  readonly icon: Icon = 'draw';

  readonly useOriginalRatio: boolean = false;

  readonly showCanvasOnly: boolean = false;

  readonly element: HTMLElement;

  private get overlayCanvas(): HTMLCanvasElement {
    return this.canvasController.getOverlayCanvas();
  }

  constructor(
    canvasController: CanvasController
  ) {
    this.canvasController = canvasController;
    this.element = this.build();
    this.selectBrush(this.brushButtons[0]);
  }

  private build(): HTMLElement {
    this.fillBrushButtons();

    const container = document.createElement('div');
    container.classList.add('edit-controls', 'draw-controls');

    const colorPicker = new ColorPicker((color) => { this.selectColor(color) });
    container.appendChild(colorPicker.element);

    const sizeSlider = new Slider(
      'Size',
      4, 32, 16,
      (value) => { this.selectSize(value) },
      {hintColor: '#AAAAAA', valueColor: '#AAAAAA'}
    );
    sizeSlider.element.style.marginTop = '12px';
    container.appendChild(sizeSlider.element);
    this.sizeSlider = sizeSlider;

    const brushCaptionElement = document.createElement('div');
    brushCaptionElement.classList.add('image-editor-caption');
    brushCaptionElement.style.margin = '12px 16px'
    brushCaptionElement.innerText = 'Tool'
    container.appendChild(brushCaptionElement);

    for(const brushButton of this.brushButtons) {
      container.appendChild(brushButton.element);
    }

    return container;
  }

  private fillBrushButtons() {
    this.availableBrushes.forEach((brush, idx) => {
      const brushButton = new BrushSelectableButton(
        brush.image,
        brush.name,
        brush.defaultColor,
        () => { this.selectBrush(brushButton) }
      );
      brushButton.tag = brush;
      this.brushButtons[idx] = brushButton;
    });
  }

  private selectColor(color: string) {
    this.selectedColor = color;
    this.sizeSlider?.setColor(color);
    this.selectedBrushButton?.setSelectedFillColor(color);
  }

  private selectSize(size: number) {
    this.selectedSize = size;
  }

  private selectBrush(newSelection: BrushSelectableButton) {
    const newBrushType = newSelection.tag?.type;
    if(!newBrushType || newBrushType === this.selectedType && newSelection === this.selectedBrushButton) {
      return;
    }

    this.selectedType = newBrushType;

    this.selectedBrushButton?.setSelected(false);
    newSelection.setSelectedFillColor(this.selectedColor);
    newSelection.setSelected(true);
    this.selectedBrushButton = newSelection;
  }

  private startDraw(e: MouseEvent) {
    e.preventDefault();

    const overlayCanvasScaleFactor = window.devicePixelRatio || 1;
    const x = (e.clientX - this.overlayCanvas.offsetLeft) * overlayCanvasScaleFactor;
    const y = (e.clientY - this.overlayCanvas.offsetTop) * overlayCanvasScaleFactor;
    const newLine = this.createLineForType(this.selectedType);
    newLine.addPoint(x, y);
    this.currentDrawnLine = newLine;

    this.invalidate();

    document.addEventListener('mousemove', this.drawAction);
    document.addEventListener('mouseup', this.endDrawAction);
  }

  private createLineForType(brushType: BrushType): Line {
    let line;
    switch(brushType) {
      case 'pen':
        line = new SolidLine(this.selectedColor, this.selectedSize, 'round');
        break;
      case 'arrow':
        line = new ArrowLine(this.selectedColor, this.selectedSize);
        break;
      case 'brush':
        line = new SolidLine(ColorUtils.setOpacity(this.selectedColor, 0.5), this.selectedSize * 2, 'square');
        break;
      case 'neon':
        line = new SolidLine('#FFFFFF', this.selectedSize, 'round', this.selectedColor);
        break;
      case 'blur':

        break;
      case 'eraser':
        line = new EraserLine(this.selectedSize);
        break;
      default:
        line = new SolidLine(this.selectedColor, this.selectedSize, 'round');
        break;
    }
    return line;
  }

  private draw(e: MouseEvent) {
    e.preventDefault();

    const overlayCanvasScaleFactor = window.devicePixelRatio || 1;
    const x = (e.clientX - this.overlayCanvas.offsetLeft) * overlayCanvasScaleFactor;
    const y = (e.clientY - this.overlayCanvas.offsetTop) * overlayCanvasScaleFactor;
    this.currentDrawnLine?.addPoint(x, y);

    this.invalidate();
  }

  private endDraw() {
    document.removeEventListener('mousemove', this.drawAction);
    document.removeEventListener('mouseup', this.endDrawAction);

    const currentDrawnLine = this.currentDrawnLine;
    if(currentDrawnLine) {
      currentDrawnLine.isFinalized = true;
      this.lines.push(currentDrawnLine);
      this.currentDrawnLine = null;
      this.invalidate();
    }
  }

  private invalidate(canvas: HTMLCanvasElement = this.overlayCanvas, clearRect: boolean = true) {
    const context = canvas.getContext('2d');
    if(!context) {
      return;
    }

    if(clearRect) {
      context.clearRect(0, 0, canvas.width, canvas.height);
    }

    for(const line of this.lines) {
      line.draw(context);
    }
    this.currentDrawnLine?.draw(context);
  }

  onCanvasResize(width: number, height: number): void { }

  onOverlayCanvasInvalidate(isCanvasEmpty: boolean): boolean {
    this.invalidate(this.overlayCanvas, isCanvasEmpty);
    return true;
  }

  onOpen(): void {
    const overlayCanvas = this.canvasController.getOverlayCanvas();
    this.context = overlayCanvas.getContext('2d');
    overlayCanvas.addEventListener('mousedown', this.startDrawAction);
  }

  onClose(): void {
    const overlayCanvas = this.canvasController.getOverlayCanvas();
    overlayCanvas.removeEventListener('mousedown', this.startDrawAction);
  }

  onCompose(resultCanvas: HTMLCanvasElement) {
    this.invalidate(resultCanvas, false);
  }
}
