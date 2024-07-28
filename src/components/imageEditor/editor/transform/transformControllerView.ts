import {AngleScroller} from '../../components/angleScroller';
import {IconSelectableButton, SelectableButton} from '../../components/selectableButton';
import {MathUtils} from '../../utils/mathUtils';
import {CanvasController} from '../canvasController';
import {Editor} from '../editor';

export class TransformParams {
  ratio: number = -1;
  rotation: number = 0;
}

export interface TransformListener {
    onTransformParamsUpdate(params: TransformParams): void
}

class Ratio {
  readonly icon: Icon;
  readonly width: number;
  readonly height: number;

  get text() {
    return `${this.width}:${this.height}`;
  }

  get value(): number {
    return this.width / this.height;
  }

  constructor(
    icon: Icon,
    width: number,
    height: number
  ) {
    this.icon = icon;
    this.width = width;
    this.height = height;
  }
}

export class TransformControllerView implements Editor {
  private readonly availableRatios: Array<Ratio> = new Array(
    new Ratio('ratio_3_2', 3, 2),
    new Ratio('ratio_2_3', 2, 3),
    new Ratio('ratio_4_3', 4, 3),
    new Ratio('ratio_3_4', 3, 4),
    new Ratio('ratio_5_4', 5, 4),
    new Ratio('ratio_4_5', 4, 5),
    new Ratio('ratio_7_5', 7, 5),
    new Ratio('ratio_5_7', 5, 7),
    new Ratio('ratio_16_9', 16, 9),
    new Ratio('ratio_9_16', 9, 16)
  );

  private primaryRatioButtons: Array<SelectableButton<number>> = new Array<SelectableButton<number>>();
  private secondaryRatioButtons: Array<SelectableButton<number>> = new Array<SelectableButton<number>>()

  private readonly minRatio: number = 9 / 16;
  private readonly maxRatio: number = 16 / 9;

  private readonly originalRatio: number;
  private selectedRatio: number = -1;

  private canvasController: CanvasController;

  private currentSelectedButton: SelectableButton<number> | null = null;

  private transformParams: TransformParams = new TransformParams();
  private transformListener: TransformListener;

  private cropFrame: HTMLDivElement | null = null;
  private angleScrollerContainer: HTMLDivElement | null = null;
  private angleScroller: AngleScroller | null = null;

  private canvasWidth: number = -1;
  private canvasHeight: number = -1;

  private isOpen: boolean = false;

  readonly icon: Icon = 'crop';

  readonly useOriginalRatio: boolean = true;

  readonly showCanvasOnly: boolean = true;

  readonly element: HTMLElement;

  constructor(
    originalRatio: number,
    canvasController: CanvasController,
    transformListener: TransformListener
  ) {
    this.originalRatio = originalRatio;
    this.canvasController = canvasController;
    this.transformListener = transformListener;
    this.element = this.build();
    this.select(this.primaryRatioButtons[0]);
  }

  private build(): HTMLElement {
    this.fillPrimaryRatioButtons();
    this.fillSecondaryRatioButtons();

    const container = document.createElement('div');
    container.classList.add('edit-controls', 'transform-controls');

    const captionElement = document.createElement('div');
    captionElement.classList.add('image-editor-caption');
    captionElement.style.margin = '0px 16px 12px 16px'
    captionElement.innerText = 'Aspect ratio'
    container.appendChild(captionElement);

    for(const ratioButton of this.primaryRatioButtons) {
      container.appendChild(ratioButton.element);
    }

    const ratiosGridElement = document.createElement('div');
    ratiosGridElement.classList.add('transform-controls-grid');
    container.appendChild(ratiosGridElement);

    for(const ratioButton of this.secondaryRatioButtons) {
      ratiosGridElement.appendChild(ratioButton.element);
    }

    return container;
  }

  private fillPrimaryRatioButtons() {
    this.primaryRatioButtons[0] = this.createRatioSelectableButton(
      this.originalRatio,
      'ratio_free',
      'Free'
    );
    this.primaryRatioButtons[1] = this.createRatioSelectableButton(
      this.originalRatio,
      'ratio_original',
      'Original'
    );
    this.primaryRatioButtons[2] = this.createRatioSelectableButton(
      1,
      'ratio_square',
      'Square'
    );
  }

  private fillSecondaryRatioButtons() {
    this.availableRatios.forEach((ratio, idx) => {
      const ratioButton = this.createRatioSelectableButton(
        ratio.value,
        ratio.icon,
        ratio.text,
        'transform-controls-grid-item'
      );
      this.secondaryRatioButtons[idx] = ratioButton;
    });
  }

  private createRatioSelectableButton(
    ratio: number,
    icon: Icon,
    text: string,
    customStyle: string | null = null
  ): SelectableButton<number> {
    const ratioButtonElement = new IconSelectableButton<number>(
      icon,
      text,
      false,
      () => { this.select(ratioButtonElement) }
    );
    ratioButtonElement.tag = ratio;

    if(customStyle !== null) {
      ratioButtonElement.element.classList.add(customStyle);
    }

    return ratioButtonElement;
  }

  private select(newSelection: SelectableButton<number>) {
    const newRatio = newSelection.tag;
    if(!newRatio || newRatio === this.selectedRatio && newSelection === this.currentSelectedButton) {
      return;
    }

    this.selectedRatio = newRatio;

    this.currentSelectedButton?.setSelected(false);
    newSelection.setSelected(true);
    this.currentSelectedButton = newSelection;

    this.invalidateWorkingZoneControllers();

    this.updateParams({ratio: newRatio});
  }

  private updateParams(
    params: {
            ratio?: number,
            rotation?: number
        }
  ) {
    this.transformParams.ratio = params?.ratio ?? this.transformParams.ratio;
    this.transformParams.rotation = params?.rotation ?? this.transformParams.rotation;

    this.transformListener.onTransformParamsUpdate(this.transformParams);
  }

  onCanvasResize(width: number, height: number) {
    this.canvasWidth = width;
    this.canvasHeight = height;
    this.invalidateWorkingZoneControllers();
  }

  private invalidateWorkingZoneControllers() {
    if(!this.isOpen) {
      return;
    }

    const canvasWidth = this.canvasWidth;
    const canvasHeight = this.canvasHeight;
    if(canvasWidth == -1 || canvasHeight == -1) {
      return;
    }

    const editingImageContainer = this.canvasController.getEditingImageContainer();

    let cropFrame = this.cropFrame;
    if(!cropFrame) {
      cropFrame = this.createCropFrame();
      this.cropFrame = cropFrame;
    }

    if(!editingImageContainer.contains(cropFrame)) {
      editingImageContainer.appendChild(cropFrame);
    }

    const imageParams = MathUtils.calculateRectanleRelativeDimensions(
      canvasWidth,
      canvasHeight,
      canvasWidth / canvasHeight,
      3 / 4
    );
    const cropFrameParams = MathUtils.calculateRectanleRelativeDimensions(
      imageParams.width,
      imageParams.height,
      3 / 4,
      this.selectedRatio
    );
    const cropFrameWidth = cropFrameParams.width;
    const cropFrameHeight = cropFrameParams.height;
    const left = canvasWidth / 2 - cropFrameWidth / 2;
    const top = canvasHeight / 2 - cropFrameHeight / 2;
    cropFrame.style.left = `${left}px`;
    cropFrame.style.top = `${top}px`;
    cropFrame.style.width = `${cropFrameWidth}px`;
    cropFrame.style.height = `${cropFrameHeight - 1}px`;

    const bottomControlsContainer = this.canvasController.getBottomControlsContainer();

    let angleScrollerContainer = this.angleScrollerContainer;
    let angleScroller = this.angleScroller;
    if(!angleScrollerContainer || !angleScroller) {
      angleScrollerContainer = document.createElement('div');
      angleScrollerContainer.classList.add('transform-angle-scroller-container');
      this.angleScrollerContainer = angleScrollerContainer

      angleScroller = this.createAngleScroller();
      angleScroller.onUpdate = (value) => {
        this.updateParams({rotation: value});
      };
      this.angleScroller = angleScroller;
      angleScrollerContainer.appendChild(angleScroller.element);
    }

    if(!bottomControlsContainer.contains(angleScrollerContainer)) {
      bottomControlsContainer.appendChild(angleScrollerContainer);
    }

    angleScroller.invalidate(this.transformParams.rotation);
  }

  private createCropFrame(): HTMLDivElement {
    const cropFrame = document.createElement('div');
    cropFrame.classList.add('crop-frame');
    return cropFrame;
  }

  private createAngleScroller(): AngleScroller {
    const angleScroller = new AngleScroller();
    angleScroller.element.classList.add('transform-angle-scroller');
    return angleScroller;
  }

  onOverlayCanvasInvalidate(isCanvasEmpty: boolean): boolean {
    return false;
  }

  onOpen(): void {
    this.isOpen = true;
    this.canvasController.showBottomControls();
    this.invalidateWorkingZoneControllers();
  }

  onClose(): void {
    this.isOpen = false;

    const cropFrame = this.cropFrame;
    if(cropFrame) {
      this.canvasController.getEditingImageContainer().removeChild(cropFrame);
      this.cropFrame = null;
    }

    const angleScrollerContainer = this.angleScrollerContainer;
    if(angleScrollerContainer) {
      this.canvasController.getBottomControlsContainer().removeChild(angleScrollerContainer);
      this.angleScrollerContainer = null;
      this.angleScroller = null;
    }

    this.canvasController.hideBottomControllers();
  }

  onCompose(resultCanvas: HTMLCanvasElement) { }
}
