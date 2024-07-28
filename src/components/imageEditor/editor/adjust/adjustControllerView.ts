import { Slider } from "../../components/slider";
import { CanvasController } from "../canvasController";
import { Editor } from "../editor";

export class AdjustParams {
    enhancement: number = 0;
    brightness: number = 0;
    contrast: number = 0;
    saturation: number = 0;
    warmth: number = 0;
    fade: number = 0;
    highlights: number = 0;
    shadows: number = 0;
    vignette: number = 0;
}

export interface AdjustListener {
    onColoringParamsUpdate(params: AdjustParams): void
}

export class AdjustControllerView implements Editor {

    private canvasController: CanvasController;

    private coloringParams: AdjustParams = new AdjustParams();
    private coloringListener: AdjustListener;

    private sliders: Array<Slider> = new Array(
        new Slider('Enhance', 0, 100, 0, (value) => this.updateParams({ enhancement: value }), { color: '#4E8EE5', hintColor: '#FFFFFF', isBidirectional: false }),
        new Slider('Brightness', -100, 100, 0, (value) => this.updateParams({ brightness: value }), { color: '#4E8EE5', hintColor: '#FFFFFF', isBidirectional: true }),
        new Slider('Contrast', -100, 100, 0, (value) => this.updateParams({ contrast: value }), { color: '#4E8EE5', hintColor: '#FFFFFF', isBidirectional: true }),
        new Slider('Saturation', -100, 100, 0, (value) => this.updateParams({ saturation: value }), { color: '#4E8EE5', hintColor: '#FFFFFF', isBidirectional: true }),
        new Slider('Warmth', -100, 100, 0, (value) => this.updateParams({ warmth: value }), { color: '#4E8EE5', hintColor: '#FFFFFF', isBidirectional: true }),
        new Slider('Fade', 0, 100, 0, (value) => this.updateParams({ fade: value }), { color: '#4E8EE5', hintColor: '#FFFFFF', isBidirectional: false }),
        new Slider('Highlights', -100, 100, 0, (value) => this.updateParams({ highlights: value }), { color: '#4E8EE5', hintColor: '#FFFFFF', isBidirectional: true }),
        new Slider('Shadows', -100, 100, 0, (value) => this.updateParams({ shadows: value }), { color: '#4E8EE5', hintColor: '#FFFFFF', isBidirectional: true }),
        new Slider('Vignette', -100, 100, 0, (value) => this.updateParams({ vignette: value }), { color: '#4E8EE5', hintColor: '#FFFFFF', isBidirectional: true })
    );

    readonly icon: Icon = 'enhance';
    
    readonly useOriginalRatio: boolean = false;

    readonly showCanvasOnly: boolean = false;

    readonly element: HTMLDivElement;

    constructor(
        canvasController: CanvasController,
        adjustListener: AdjustListener
    ) {
        this.canvasController = canvasController;
        this.coloringListener = adjustListener;
        this.element = this.build();
    }

    private build(): HTMLDivElement {
        const container = document.createElement('div');
        container.classList.add('edit-controls');
        for (let slider of this.sliders) {
            container.appendChild(slider.element);
        }
        return container;
    }

    private updateParams(
        params: { 
            enhancement?: number,
            brightness?: number,
            contrast?: number,
            saturation?: number,
            warmth?: number,
            fade?: number,
            highlights?: number,
            shadows?: number,
            vignette?: number
        }
    ) {
        this.coloringParams.enhancement = params.enhancement ?? this.coloringParams.enhancement;
        this.coloringParams.brightness = params.brightness ?? this.coloringParams.brightness;
        this.coloringParams.contrast = params.contrast ?? this.coloringParams.contrast;
        this.coloringParams.saturation = params.saturation ?? this.coloringParams.saturation;
        this.coloringParams.warmth = params.warmth ?? this.coloringParams.warmth;
        this.coloringParams.fade = params.fade ?? this.coloringParams.fade;
        this.coloringParams.highlights = params.highlights ?? this.coloringParams.highlights;
        this.coloringParams.shadows = params.shadows ?? this.coloringParams.shadows;
        this.coloringParams.vignette = params.vignette ?? this.coloringParams.vignette;
        
        this.coloringListener.onColoringParamsUpdate(this.coloringParams);
    }

    onCanvasResize(width: number, height: number): void { }

    onOverlayCanvasInvalidate(isCanvasEmpty: boolean): boolean {
        return false;
    }

    onOpen(): void { }

    onClose(): void { }

    onCompose(resultCanvas: HTMLCanvasElement) { }

}