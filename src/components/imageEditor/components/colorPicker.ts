import {ColorUtils} from '../utils/colorUtils';

abstract class ColorToggle {
  readonly color: string;
  private onClick: () => any;

  private isSelected: boolean = false;

  readonly element: HTMLElement;

  constructor(
    color: string,
    onClick: () => any
  ) {
    this.color = color;
    this.onClick = onClick;
    this.element = this.build();
  }

    protected abstract createElement(): HTMLElement

    private build(): HTMLElement {
      const element = this.createElement();
      element.classList.add('color-picker-toggle');
      element.style.setProperty('--color-picker-toggle-color', this.color);
      element.style.setProperty('--color-picker-toggle-shadow-color', ColorUtils.setOpacity(this.color, 0.1));
      element.addEventListener('click', () => { this.onClick() });
      return element;
    }

    setSelected(isSelected: boolean) {
      if(isSelected == this.isSelected) {
        return;
      }

      this.isSelected = isSelected;
      if(isSelected) {
        this.element.classList.add('selected');
      } else {
        this.element.classList.remove('selected');
      }
    }
}

class DefaultColorToggle extends ColorToggle {
  constructor(
    color: string,
    onClick: () => any
  ) {
    super(color, onClick);
  }

  protected createElement(): HTMLElement {
    return document.createElement('div');
  }
}

class PaletteColorToggle extends ColorToggle {
  constructor(
    color: string,
    onClick: () => any
  ) {
    super(color, onClick);
  }

  protected createElement(): HTMLElement {
    const element = document.createElement('img');
    element.src = 'assets/img/color_picker.png';
    return element;
  }
}

export class ColorPicker {
  private isPaletteExpanded: boolean = false;

  private hue: number = 0;
  private saturation: number = 100;
  private value: number = 100;

  private onSelect: (color: string) => any;

  private quickColors: Array<string> = new Array<string>(
    '#FFFFFF',
    '#FE4438',
    '#FF8901',
    '#FFD60A',
    '#33C759',
    '#62E5E0',
    '#0A84FF',
    '#BD5CF3'
  )
  private colorToggles: Array<DefaultColorToggle> = new Array<DefaultColorToggle>();
  private selectedColorToggle: ColorToggle | null = null;
  private paletteToggle: ColorToggle | null = null;

  private hueSlider: HTMLElement | null = null;
  private hueSliderIndicator: HTMLElement | null = null;
  private moveHueAction: (e: MouseEvent) => any = (e) => { this.moveHue(e) };
  private endHueDragAction: () => any = () => { this.endHueDrag() };

  private paletteContainer: HTMLElement | null = null;

  private saturationSlider: HTMLElement | null = null;
  private saturationSliderIndicator: HTMLElement | null = null;
  private moveSaturationAction: (e: MouseEvent) => any = (e) => { this.moveSaturation(e) };
  private endSaturationDragAction: () => any = () => { this.endSaturationDrag() };

  private hexInput: HTMLInputElement | null = null;
  private rgbInput: HTMLInputElement | null = null;

  private lastValidHexValue: string = '#FFFFFF';
  private lastValidRgbValue: string = '255,255,255';

  readonly element: HTMLElement;

  constructor(
    onSelect: (color: string) => any
  ) {
    this.onSelect = onSelect;
    this.element = this.build();
    this.toggleColor(this.colorToggles[0]);
  }

  private build(): HTMLElement {
    this.fillColorToggles();

    const container = document.createElement('div');

    const toggleContainer = document.createElement('div');
    toggleContainer.classList.add('color-picker-toggle-container');
    container.appendChild(toggleContainer);

    for(const colorToggle of this.colorToggles) {
      toggleContainer.appendChild(colorToggle.element);
    }

    const hueSlider = document.createElement('div');
    hueSlider.classList.add('color-picker-hue-slider');
    hueSlider.style.display = 'none';
    hueSlider.addEventListener('mousedown', (e) => { this.startHueDrag(e) });
    toggleContainer.appendChild(hueSlider);
    this.hueSlider = hueSlider;

    const hueSliderIndicator = document.createElement('div');
    hueSliderIndicator.classList.add('color-picker-slider-indicator', 'hue');
    hueSlider.appendChild(hueSliderIndicator);
    this.hueSliderIndicator = hueSliderIndicator;

    const paletteToggle = new PaletteColorToggle('#FFFFFF', () => { this.togglePalette() });
    toggleContainer.appendChild(paletteToggle.element);
    this.paletteToggle = paletteToggle;

    const paletteContainer = document.createElement('div');
    paletteContainer.classList.add('color-picker-palette-container');
    paletteContainer.style.display = 'none';
    container.appendChild(paletteContainer);
    this.paletteContainer = paletteContainer;

    const saturationSlider = document.createElement('div');
    saturationSlider.classList.add('color-picker-saturation-slider');
    saturationSlider.addEventListener('mousedown', (e) => { this.starSaturationDrag(e) });
    paletteContainer.appendChild(saturationSlider);
    this.saturationSlider = saturationSlider;

    const saturationSliderIndicator = document.createElement('div');
    saturationSliderIndicator.classList.add('color-picker-slider-indicator', 'saturation');
    saturationSlider.appendChild(saturationSliderIndicator);
    this.saturationSliderIndicator = saturationSliderIndicator;

    const inputsContainer = document.createElement('div');
    inputsContainer.classList.add('color-picker-inputs-container');
    paletteContainer.appendChild(inputsContainer);

    const hexInput = document.createElement('input');
    hexInput.classList.add('color-picker-input');
    hexInput.addEventListener('input', () => { this.handleHexInput(false) });
    hexInput.addEventListener('blur', () => { this.handleHexInput(true) });
    inputsContainer.appendChild(hexInput);
    this.hexInput = hexInput;

    const rgbInput = document.createElement('input');
    rgbInput.classList.add('color-picker-input');
    rgbInput.addEventListener('input', () => { this.handleRgbInput(false) });
    rgbInput.addEventListener('blur', () => { this.handleRgbInput(true) });
    inputsContainer.appendChild(rgbInput);
    this.rgbInput = rgbInput;

    return container;
  }

  private fillColorToggles() {
    this.quickColors.forEach((color, idx) => {
      const colorToggle = new DefaultColorToggle(color, () => { this.toggleColor(colorToggle) });
      this.colorToggles[idx] = colorToggle;
    });
  }

  private startHueDrag(e: MouseEvent) {
    e.preventDefault();
    document.addEventListener('mousemove', this.moveHueAction);
    document.addEventListener('mouseup', this.endHueDragAction);
    this.moveHue(e);
  }

  private moveHue(e: MouseEvent) {
    const hueSlider = this.hueSlider;
    if(!hueSlider) {
      return;
    }

    e.preventDefault();

    const rect = hueSlider.getBoundingClientRect();
    const hue = Math.min(360, Math.max(0, ((e.clientX - rect.left) / rect.width) * 360));
    this.setColor({hue: hue});
  }

  private endHueDrag() {
    document.removeEventListener('mousemove', this.moveHueAction);
    document.removeEventListener('mouseup', this.endHueDragAction);
  }

  private starSaturationDrag(e: MouseEvent) {
    e.preventDefault();
    document.addEventListener('mousemove', this.moveSaturationAction);
    document.addEventListener('mouseup', this.endSaturationDragAction);
    this.moveSaturation(e);
  }

  private moveSaturation(e: MouseEvent) {
    const saturationSlider = this.saturationSlider;
    if(!saturationSlider) {
      return;
    }

    e.preventDefault();

    const rect = saturationSlider.getBoundingClientRect();
    const saturation = Math.min(100, Math.max(0, ((e.clientX - rect.left) / rect.width) * 100));
    const value = 100 - Math.min(100, Math.max(0, ((e.clientY - rect.top) / rect.height) * 100));
    this.setColor({saturation: saturation, value: value});
  }

  private endSaturationDrag() {
    document.removeEventListener('mousemove', this.moveSaturationAction);
    document.removeEventListener('mouseup', this.endSaturationDragAction);
  }

  private handleHexInput(setLastValidOnError: boolean) {
    const hexInput = this.hexInput;
    if(!hexInput || hexInput.value == this.lastValidHexValue) {
      return;
    }

    const validHex = this.validateHexInput(hexInput.value);
    if(validHex) {
      this.setColorHex(validHex);
    } else if(setLastValidOnError) {
      hexInput.value = this.lastValidHexValue;
    }
  }

  private validateHexInput(hex: string): string | null {
    return /^#[0-9A-Fa-f]{6}$/i.test(hex) ? hex : null;
  }

  private handleRgbInput(setLastValidOnError: boolean) {
    const rgbInput = this.rgbInput;
    if(!rgbInput || rgbInput.value == this.lastValidRgbValue) {
      return;
    }

    const validRgb = this.validateRgbInput(rgbInput.value);
    if(validRgb) {
      const rgb = validRgb.split(',').map((value) => { return parseInt(value); });
      this.setColorRgb(rgb);
    } else if(setLastValidOnError) {
      rgbInput.value = this.lastValidRgbValue;
    }
  }

  private validateRgbInput(rgb: string): string | null {
    const chunks = rgb.split(',');
    if(chunks.length != 3) {
      return null;
    }

    for(const chunk of chunks) {
      const isNumber = /^[0-9]{1,3}$/i.test(chunk);
      if(!isNumber) {
        return null;
      }

      const value = parseInt(chunk);
      if(value < 0 || value > 255) {
        return null;
      }
    }
    return `${chunks[0]},${chunks[1]},${chunks[2]}`;
  }

  private togglePalette() {
    this.isPaletteExpanded = !this.isPaletteExpanded;
    if(!this.isPaletteExpanded) {
      this.setHueSliderVisibility(false);
      this.setPaletteVisibility(false);
      this.setColorTogglesVisibility(true);
      this.invalidateColorToggles();
    } else {
      this.selectedColorToggle?.setSelected(false);
      this.selectedColorToggle = null;
      this.paletteToggle?.setSelected(true);
      this.setColorTogglesVisibility(false);
      this.setHueSliderVisibility(true);
      this.setPaletteVisibility(true);
      this.invalidateHueSlider();
      this.invalidateSaturationSlider();
    }
  }

  private setColorTogglesVisibility(areVisible: boolean) {
    for(const colorToggle of this.colorToggles) {
      colorToggle.element.style.display = areVisible ? 'block' : 'none';
    }
  }

  private setHueSliderVisibility(isVisible: boolean) {
    const hueSlider = this.hueSlider;
    if(!hueSlider) {
      return;
    }

    hueSlider.style.display = isVisible ? 'block' : 'none';
  }

  private setPaletteVisibility(isVisible: boolean) {
    const paletteContainer = this.paletteContainer;
    if(!paletteContainer) {
      return;
    }

    paletteContainer.style.display = isVisible ? 'flex' : 'none';
  }

  private toggleColor(colorToggle: DefaultColorToggle) {
    if(colorToggle === this.selectedColorToggle) {
      return;
    }

    this.paletteToggle?.setSelected(false);
    this.selectedColorToggle?.setSelected(false);
    colorToggle.setSelected(true);
    this.selectedColorToggle = colorToggle;

    this.setColorHex(colorToggle.color);
  }

  setColorHex(color: string) {
    const rgb = ColorUtils.hexToRgb(color);
    this.setColorRgb(rgb);
  }

  private setColorRgb(rgb: Array<number>) {
    const hsv = ColorUtils.rgbToHsv(rgb[0], rgb[1], rgb[2]);
    this.setColor({hue: hsv[0], saturation: hsv[1], value: hsv[2]});
  }

  private setColor(
    color: {
            hue?: number,
            saturation?: number,
            value?: number
        }
  ) {
    this.hue = color.hue ?? this.hue;
    this.saturation = color.saturation ?? this.saturation;
    this.value = color.value ?? this.value;

    const rgb = ColorUtils.hsvToRgb(this.hue, this.saturation, this.value);
    const hex = ColorUtils.rgbToHex(rgb[0], rgb[1], rgb[2]);

    this.lastValidHexValue = hex;
    this.lastValidRgbValue = `${rgb[0]},${rgb[1]},${rgb[2]}`;

    const hexInput = this.hexInput;
    if(hexInput) {
      hexInput.value = this.lastValidHexValue;
    }

    const rgbInput = this.rgbInput;
    if(rgbInput) {
      rgbInput.value = this.lastValidRgbValue;
    }

    this.invalidateColorToggles();
    this.invalidateHueSlider();
    this.invalidateSaturationSlider();

    this.onSelect(hex);
  }

  private invalidateColorToggles() {
    if(this.isPaletteExpanded) {
      return;
    }

    const existingColorToggle = this.colorToggles.find((value) => value.color == this.lastValidHexValue);
    this.selectedColorToggle?.setSelected(false);
    if(existingColorToggle) {
      this.paletteToggle?.setSelected(false);
      existingColorToggle.setSelected(true);
      this.selectedColorToggle = existingColorToggle;
    } else {
      this.paletteToggle?.setSelected(true);
    }
  }

  private invalidateHueSlider() {
    const hueSlider = this.hueSlider;
    const hueSliderIndicator = this.hueSliderIndicator;
    if(!hueSlider || !hueSliderIndicator) {
      return;
    }

    const translationX = (this.hue / 360) * (hueSlider.clientWidth - hueSliderIndicator.clientWidth) - 1;
    hueSliderIndicator.style.transform = `translate(${translationX}px, -1px`;
  }

  private invalidateSaturationSlider() {
    const saturationSlider = this.saturationSlider;
    const saturationSliderIndicator = this.saturationSliderIndicator;
    if(!saturationSlider || !saturationSliderIndicator) {
      return;
    }

    saturationSlider.style.backgroundColor = `hsl(${this.hue}, 100%, 50%)`;

    const translationX = (this.saturation / 100) * (saturationSlider.clientWidth - saturationSliderIndicator.clientWidth) - 1;
    const translationY = ((100 - this.value) / 100) * (saturationSlider.clientHeight- saturationSliderIndicator.clientHeight) - 1;
    saturationSliderIndicator.style.transform = `translate(${translationX}px, ${translationY}px)`;
  }
}
