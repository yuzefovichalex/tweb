export interface Editor {
    readonly icon: Icon;
    readonly element: HTMLElement;

    /**
     * Display the image on WebGL canvas in original image ratio
     * ignoring any override if set.
     */
    readonly useOriginalRatio: boolean;

    readonly showCanvasOnly: boolean;

    onImageLoad(ratio: number): void;
    onOpen(): void;
    onCanvasResize(width: number, height: number): void;

    /**
     * Called when overlay canvas should be redrawn,
     * for example after changing it's display type).
     * The method should return true if the canvas is not
     * empty during the call to prevent its clear by the
     * next editor.
     */
    onOverlayCanvasInvalidate(isCanvasEmpty: boolean): boolean;
    onClose(): void;

    /**
     * Called when editor is requested to draw its overlay content.
     * The result canvas contains image and elements from other
     * editor (if there are any), so the clearRect must not be
     * called before drawing.
     */
    onCompose(resultCanvas: HTMLCanvasElement): void;
}
