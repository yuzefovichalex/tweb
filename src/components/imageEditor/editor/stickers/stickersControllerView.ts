import {Editor} from '../editor';

export class StickerControllerView implements Editor {
  readonly icon: Icon = 'emoji';

  readonly useOriginalRatio: boolean = false;

  readonly showCanvasOnly: boolean = false;

  readonly element: HTMLElement;

  constructor() {
    this.element = this.build();
  }

  private build(): HTMLElement {
    const container = document.createElement('div');
    return container
  }

  onImageLoad(ratio: number): void { }

  onRestoreLastState(extra: any): void { }

  onCanvasResize(width: number, height: number): void { }

  onOverlayCanvasInvalidate(isCanvasEmpty: boolean): boolean {
    return false;
  }

  onOpen(): void { }

  onClose(): void { }

  onCompose(resultCanvas: HTMLCanvasElement) {

  }
}
