import { ColorUtils } from "../utils/colorUtils";
import { MathUtils } from "../utils/mathUtils";

type SliderParams = { 
    color?: string,
    hintColor?: string,
    valueColor?: string,
    isBidirectional?: boolean
}

export class Slider {

    private static DEFAULT_COLOR = '#FFFFFF';

    private text: string;
    private min: number;
    private max: number;
    private initial: number;
    private onChange: (value: number) => any;

    private color: string;
    private hintColor: string;
    private valueColor: string;
    private isBidirectional: boolean;

    private infoValueElement: HTMLDivElement;
    private inputElement: HTMLInputElement;
    
    element: HTMLDivElement;

    get value(): number {
        return this.inputElement.valueAsNumber;
    }
    
    constructor(
        text: string,
        min: number,
        max: number,
        initial: number,
        onChange: (value: number) => any,
        params: SliderParams = { }
    ) {
        this.text = text;
        this.min = min;
        this.max = max;
        this.initial = initial;
        this.onChange = onChange;

        this.color = params.color ?? Slider.DEFAULT_COLOR;
        this.hintColor = params.hintColor ?? this.color;
        this.valueColor = params.valueColor ?? this.color;
        this.isBidirectional = params.isBidirectional ?? false;

        this.element = this.buildElement();
    }

    private buildElement(): HTMLDivElement {
        const infoNameElement = document.createElement('div');
        infoNameElement.classList.add('control-slider-info-name');
        infoNameElement.style.setProperty('--slider-hint-color', this.hintColor);
        infoNameElement.textContent = this.text;

        const infoValueElement = document.createElement('div');
        infoValueElement.classList.add('control-slider-info-value');
        infoValueElement.style.setProperty('--slider-value-color', this.valueColor);
        this.infoValueElement = infoValueElement;

        const infoRowElement = document.createElement('div');
        infoRowElement.classList.add('control-slider-info');
        infoRowElement.appendChild(infoNameElement);
        infoRowElement.appendChild(infoValueElement);

        const inputElement = document.createElement('input');
        inputElement.classList.add('control-slider-input');
        inputElement.style.setProperty('--slider-color', this.color);
        inputElement.style.setProperty('--slider-shadow-color', ColorUtils.setOpacity(this.color, 0.1));
        inputElement.style.setProperty('--start', '50%');
        inputElement.style.setProperty('--end', '50%');
        inputElement.type = 'range';
        inputElement.min = this.min.toString();
        inputElement.max = this.max.toString();
        inputElement.value = this.initial.toString();
        inputElement.addEventListener('input', () => {
            this.onValueChanged();
            this.onChange(inputElement.valueAsNumber);
        });
        this.inputElement = inputElement;
        this.onValueChanged();

        const rootElement = document.createElement('div');
        rootElement.classList.add('control-slider');
        rootElement.appendChild(infoRowElement);
        rootElement.appendChild(inputElement);

        return rootElement;
    }

    private onValueChanged() {
        this.infoValueElement.textContent = this.inputElement.value;

        const currentValue = this.inputElement.valueAsNumber;
        const range = this.max - this.min;
        const percentage = (currentValue - this.min) / range * 100;
        let startPercentage: number;
        let endPercentage: number;
        if (this.isBidirectional) {
            if (percentage > 50) {
                startPercentage = 50;
                endPercentage = percentage;
            } else {
                startPercentage = percentage;
                endPercentage = 50;
            }
        } else {
            startPercentage = 0;
            endPercentage = percentage;
        }        
        this.inputElement.style.setProperty('--start', `${startPercentage}%`);
        this.inputElement.style.setProperty('--end', `${endPercentage}%`)
        const valueColor = currentValue != 0 ? this.valueColor : '#717579';
        this.infoValueElement.style.setProperty('--slider-value-color', valueColor);
    }

    setColor(color: string) {
        this.color = color;
        this.inputElement.style.setProperty('--slider-color', this.color);
    }

    setValue(value: number) {
        const validValue = MathUtils.clamp(
            value,
            parseInt(this.inputElement.min),
            parseInt(this.inputElement.max)
        );
        if (validValue != this.inputElement.valueAsNumber) {
            this.inputElement.value = validValue.toString();
            this.onValueChanged();
        }
    }

}