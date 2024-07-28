import {MathUtils} from './mathUtils';

export class ColorUtils {
  static isLight(hex: string): boolean {
    const rgb = this.hexToRgb(hex);
    const luma = 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
    return luma > 50;
  }

  static setOpacity(color: string, opacity: number): string {
    const correctOpacity = MathUtils.clamp(opacity);
    let colorHex = color;
    if(colorHex.length > 7) {
      colorHex = colorHex.substring(0, 7);
    }

    const denormalizedOpacity = Math.round(correctOpacity * 255);
    let opacityHex = denormalizedOpacity.toString(16).toUpperCase();
    if(opacityHex.length == 1) {
      opacityHex = `0${opacityHex}`;
    }

    return `${colorHex}${opacityHex}`;
  }

  static rgbToHsv(r: number, g: number, b: number) {
    r /= 255, g /= 255, b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const d = max - min;
    let h = max;
    const v = max;
    const s = max === 0 ? 0 : d / max;

    if(max === min) {
      h = 0;
    } else {
      switch(max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }

    return [h * 360, s * 100, v * 100];
  }

  static hsvToRgb(h: number, s: number, v: number) {
    let r, g, b;
    h = h / 360;
    s = s / 100;
    v = v / 100;
    const i = Math.floor(h * 6);
    const f = h * 6 - i;
    const p = v * (1 - s);
    const q = v * (1 - f * s);
    const t = v * (1 - (1 - f) * s);
    switch(i % 6) {
      case 0: r = v, g = t, b = p; break;
      case 1: r = q, g = v, b = p; break;
      case 2: r = p, g = v, b = t; break;
      case 3: r = p, g = q, b = v; break;
      case 4: r = t, g = p, b = v; break;
      case 5: r = v, g = p, b = q; break;
      default: r = 0, g = 0, b = 0; break;
    }
    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
  }

  static rgbToHex(r: number, g: number, b: number): string {
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
  }

  static hexToRgb(hex: string): Array<number> {
    const bigint = parseInt(hex.slice(1), 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return [r, g, b];
  }
}
