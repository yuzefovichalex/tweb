import { MathUtils } from "../../utils/mathUtils";

export interface Filter {
    apply(data: Uint8ClampedArray, width: number, height: number, value: number): any
}

export class EnhanceFilter implements Filter {
    apply(data: Uint8ClampedArray, width: number, height: number, value: number) {
        
    }
}

export class BrightnessFilter implements Filter {
    apply(data: Uint8ClampedArray, width: number, height: number, value: number) {
        const factor = value / 100;
        for (let i = 0; i < data.length; i += 4) {
            data[i] += 255 * factor;     // Red
            data[i + 1] += 255 * factor; // Green
            data[i + 2] += 255 * factor; // Blue
        }
    }
}

export class ContrastFilter implements Filter {
    apply(data: Uint8ClampedArray, width: number, height: number, value: number) {
        const factor = (259 * (value + 255)) / (255 * (259 - value));
        for (let i = 0; i < data.length; i += 4) {
            data[i] = factor * (data[i] - 128) + 128;     // Red
            data[i + 1] = factor * (data[i + 1] - 128) + 128; // Green
            data[i + 2] = factor * (data[i + 2] - 128) + 128; // Blue
        }
    }
}

/**
 * Matrix multiplication of special weights:
 * (a, b, c, 0.0,
 *  d, e, f, 0.0,
 *  g, h, i, 0.0,
 *  0.0, 0.0, 0.0, 1.0).
 * 
 * Link: https://www.graficaobscura.com/matrix/index.html
 */
export class SaturationFilter implements Filter {
    apply(data: Uint8ClampedArray, width: number, height: number, value: number) {
        const factor = (value + 100) / 100;

        const luminanceRed = 0.3086;
        const luminanceGreen = 0.6094;
        const luminanceBlue = 0.0820;

        const az = (1 - factor) * luminanceRed + factor;
        const bz = (1 - factor) * luminanceGreen;
        const cz = (1 - factor) * luminanceBlue;
        const dz = (1 - factor) * luminanceRed;
        const ez = (1 - factor) * luminanceGreen + factor;
        const fz = (1 - factor) * luminanceBlue;
        const gz = (1 - factor) * luminanceRed;
        const hz = (1 - factor) * luminanceGreen;
        const iz = (1 - factor) * luminanceBlue + factor;

        for(let i = 0; i < data.length; i += 4) {
            const red = data[i];
            const green = data[i + 1];
            const blue = data[i + 2];

            data[i] = az * red + bz * green + cz * blue;
            data[i + 1] = dz * red + ez * green + fz * blue;
            data[i + 2] = gz * red + hz * green + iz * blue;
        }
    }
}

/**
 * Matrix multiplication of 2500K (Kelvin) temperature:
 * (r / 255.0, 0.0, 0.0, 0.0,
 *  0.0, g / 255.0, 0.0, 0.0,
 *  0.0, 0.0, b / 255.0, 0.0), where r = 255, g = 161, b = 72.
 * 
 * Link: https://en.wikipedia.org/wiki/Color_temperature
 */
export class WarmthFilter implements Filter {
    apply(data: Uint8ClampedArray, width: number, height: number, value: number) {
        const kelvinR = 255;
        const kelvinG = 161;
        const kelvinB = 72;

        const dR = kelvinR / 255;
        const dG = kelvinG / 255;
        const dB = kelvinB / 255;

        for (let i = 0; i < data.length; i += 4) {
            data[i] += dR * value;
            data[i + 1] += dG * value;
            data[i + 2] += dB  * value;
        }
    }
}

export class FadeFilter implements Filter {
    apply(data: Uint8ClampedArray, width: number, height: number, value: number) {
        
    }
}

export class HighlightsFilter implements Filter {
    apply(data: Uint8ClampedArray, width: number, height: number, value: number) {
        
    }
}

export class ShadowsFilter implements Filter {
    apply(data: Uint8ClampedArray, width: number, height: number, value: number) {
        
    }
}

/**
 * Apply white (values > 0) or black (values < 0) vignette filter.
 * It decreases both outer and inner radius along with value decrease as well as
 * changes vignette intensity.
 */
export class VignetteFilter implements Filter {
    apply(data: Uint8ClampedArray, width: number, height: number, value: number) {
        const factor = Math.abs(value) / 100;
        const isLight = value > 0;

        const centerX = width / 2;
        const centerY = height / 2;
        const outerRadius = Math.sqrt(centerX * centerX + centerY * centerY);
        const innerRadius = Math.min(width, height) / (2 * (1 + factor));
        const vignetteLength = outerRadius - ((outerRadius - innerRadius) * (0.5 * factor))
        const aspectRatio = Math.min(width, height) / Math.max(width, height);
        const xMult = width > height ? aspectRatio : 1;
        const yMult = height > width ? aspectRatio : 1;

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const index = (y * width + x) * 4;
                const dx = (x - centerX) * xMult;
                const dy = (y - centerY) * yMult;
                const distance = Math.sqrt(dx * dx + dy * dy);
                let vignetteIntensity = 1

                if (distance > innerRadius) {
                    const vignetteFactor = (distance - innerRadius) / (vignetteLength - innerRadius) * factor;
                    vignetteIntensity = MathUtils.smoothstep(1, 0, vignetteFactor);
                }
                
                // Draws debug ellipse for vignette border
                // if (distance > radius - 1 && distance < radius + 1) {
                //     vignetteIntensity = 0;
                // }

                for (let i = 0; i < 3; i++) {
                    if (isLight) {
                        data[index + i] = data[index + i] + (255 - data[index + i]) * (1 - vignetteIntensity);
                    } else {
                        data[index + i] = data[index + i] * vignetteIntensity;
                    }
                }
            }
        }
    }
}