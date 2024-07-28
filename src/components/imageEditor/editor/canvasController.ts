import {Editor} from './editor';

export interface CanvasController {
    getEditingImageContainer(): HTMLDivElement;
    getBottomControlsContainer(): HTMLDivElement;
    getOverlayCanvas(): HTMLCanvasElement;
    showBottomControls(): void;
    hideBottomControllers(): void;
    saveEditorAction(editor: Editor, extra: any): void;
}
