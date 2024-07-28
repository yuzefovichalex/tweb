export interface CanvasController {
    getEditingImageContainer(): HTMLDivElement;
    getBottomControlsContainer(): HTMLDivElement;
    getOverlayCanvas(): HTMLCanvasElement;
    showBottomControls(): void;
    hideBottomControllers(): void;
}