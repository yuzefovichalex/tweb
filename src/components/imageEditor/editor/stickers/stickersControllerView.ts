import {Editor} from '../editor';

export class StickerControllerView implements Editor {
  readonly icon: Icon = 'emoji';

  readonly useOriginalRatio: boolean = false;

  readonly showCanvasOnly: boolean = false;

  readonly element: HTMLElement;

  onCanvasResize(width: number, height: number): void { }

  onOverlayCanvasInvalidate(isCanvasEmpty: boolean): boolean {
    return false;
  }

  onOpen(): void { }

  onClose(): void { }

  onCompose(resultCanvas: HTMLCanvasElement) {

  }
}
