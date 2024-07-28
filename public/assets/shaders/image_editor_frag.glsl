/*
 * Copyright 2024 Alexander Yuzefovich
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

precision highp float;

varying vec2 v_TexCoord;

uniform sampler2D u_Texture;
uniform float u_ImageWidth;
uniform float u_ImageHeight;
uniform float u_Enhance;
uniform float u_Brightness;
uniform float u_Contrast;
uniform float u_Saturation;
uniform float u_Warmth;
uniform float u_Fade;
uniform float u_Highlights;
uniform float u_Shadows;
uniform float u_Vignette;

float calculateLuminance(vec3 color) {
    vec3 luminanceWeighting = vec3(0.2126, 0.7152, 0.0722);
    return dot(color, luminanceWeighting);
}

vec4 applyHighlightsShadows(vec4 color, float highlightss, float shadowss) {
    vec3 luminanceWeighting = vec3(0.3, 0.3, 0.3);
    float luminance = dot(color.rgb, luminanceWeighting);

    float highlights = (highlightss + 100.0) / 100.0;
    float shadows = (shadowss + 100.0) / 100.0;

    float shadow = clamp((pow(luminance, 1.0 / shadows) + (-0.76) * pow(luminance, 2.0 / shadows)) - luminance, 0.0, 1.0);
    float highlight = clamp((1.0 - (pow(1.0 - luminance, 1.0 / (2.0 - highlights)) + (-0.8) * pow(1.0 - luminance, 2.0 / (2.0 - highlights)))) - luminance, -1.0, 0.0);
    vec3 result = clamp(vec3((luminance + shadow + highlight) * (color.rgb / luminance)), 0.0, 1.0);

    float contrastedLuminance =((luminance - 0.5) * 1.5) + 0.5;
    float whiteInterp = pow(contrastedLuminance, 3.0);
    float whiteTarget = clamp(highlights, 1.0, 2.0) - 1.0;
    result = mix(result, vec3(1.0), whiteInterp * whiteTarget);

    float blackInterp = pow(1.0 - contrastedLuminance, 3.0);
    float blackTarget = 1.0 - clamp(shadows, 0.0, 1.0);
    result = mix(result, vec3(0.0), blackInterp * blackTarget);

    return vec4(result, 1.0);
}

vec4 applyBrightness(vec4 color, float brightness) {
    float factor = brightness / 100.0 * 0.5;
    color.rgb += factor;
    return color;
}

vec4 applyExposure(vec4 color, float exposure) {
    float factor = exposure / 100.0;
    float luminance = calculateLuminance(color.rgb);
    float mult = 1.0 - luminance;
    color.rgb *= pow(5.0, factor * mult);
    return clamp(color, 0.0, 1.0);
}

vec4 applyGamma(vec4 color, float gamma) {
    float factor = mix(1.0, 5.0, gamma / 100.0);
    float luminance = calculateLuminance(color.rgb);
    float mult = 1.0 - luminance;
    color.rgb = pow(color.rgb, vec3(1.0 / factor));
    return color;
}

vec4 applyContrast(vec4 color, float contrast) {
    float factor = (259.0 * (contrast + 255.0)) / (255.0 * (259.0 - contrast));
    color.rgb = (color.rgb - 0.5) * factor + 0.5;
    return color;
}

vec4 applySaturation(vec4 color, float saturation) {
    float factor = (saturation + 100.0) / 100.0;

    float luminanceRed = 0.3086;
    float luminanceGreen = 0.6094;
    float luminanceBlue = 0.0820;

    float az = (1.0 - factor) * luminanceRed + factor;
    float bz = (1.0 - factor) * luminanceGreen;
    float cz = (1.0 - factor) * luminanceBlue;
    float dz = (1.0 - factor) * luminanceRed;
    float ez = (1.0 - factor) * luminanceGreen + factor;
    float fz = (1.0 - factor) * luminanceBlue;
    float gz = (1.0 - factor) * luminanceRed;
    float hz = (1.0 - factor) * luminanceGreen;
    float iz = (1.0 - factor) * luminanceBlue + factor;

    float red = color.r;
    float green = color.g;
    float blue = color.b;

    color.r = az * red + bz * green + cz * blue;
    color.g = dz * red + ez * green + fz * blue;
    color.b = gz * red + hz * green + iz * blue;

    return color;
}

vec4 applyWarmth(vec4 color, float warmth) {
    float factor = warmth / 100.0;

    float kelvinR = 255.0;
    float kelvinG = 161.0;
    float kelvinB = 72.0;

    float dR = kelvinR / 255.0;
    float dG = kelvinG / 255.0;
    float dB = kelvinB / 255.0;

    color.r += dR * factor;
    color.g += dG * factor;
    color.b += dB * factor;

    return color;
}

/*
 * 1. Make colors darker (more dark color - more decrease)
 * 2. Apply gray color mask (more dark color - more effect)
 * 3. Increase overall brightness a bit
 */
vec4 applyFade(vec4 color, float fade) {
    float factor = fade / 100.0;
    float luminance = calculateLuminance(color.rgb);
    float mult = 1.0 - luminance;
    color.rgb -= 0.16 * mult * factor;
    color.rgb = mix(color.rgb, vec3(0.43), 0.57 * mult * factor);
    color.rgb += 0.07 * factor;
    return vec4(clamp(color.rgb, 0.0, 1.0), 1.0);
}

vec3 applyBlur(sampler2D image, float imageWidth, float imageHeight, vec2 coords) {
    vec3 color = vec3(0.0);
    float total = 0.0;
    const float radius = 1.0;

    for (float x = -radius; x <= radius; x++) {
        for (float y = -radius; y <= radius; y++) {
            float weight = exp(-(x * x + y * y) / (2.0 * radius * radius));
            color += texture2D(image, coords + vec2(x, y) / vec2(imageWidth, imageHeight)).rgb * weight;
            total += weight;
        }
    }

    return color / total;
}

vec4 applyClarity(sampler2D image, float imageWidth, float imageHeight, vec2 coords, float clarity) {
    float factor = clarity / 100.0;
    vec3 originalColor = texture2D(image, coords).rgb;
    vec3 blurredColor = applyBlur(image, imageWidth, imageHeight, coords);
    vec3 mask = originalColor - blurredColor;
    vec3 clarityColor = clamp(originalColor + mask * factor, 0.0, 1.0);
    return vec4(clarityColor, 1.0);
}

vec4 applyEnhance(sampler2D image, float imageWidth, float imageHeight, vec2 coords, float enhance) {
    float factor = enhance / 100.0;

    vec4 result = applyClarity(image, imageWidth, imageHeight, coords, 100.0 * factor);

    float luminance = calculateLuminance(result.rgb);
    float mult = 1.0 - luminance;

    result.rgb -= 0.15 * mult * factor;
    result.rgb = mix(result.rgb, vec3(0.3), 0.5 * mult * factor);
    result = applyExposure(result, 35.0 * factor);
    result = applyGamma(result, -5.0 * factor);
    result = applyHighlightsShadows(result, 30.0 * factor, -10.0 * factor);
    
    return result;
}

vec4 applyVignette(vec4 color, vec2 coords, float imageWidth, float imageHeight, float vignette) {
    float factor = abs(vignette) / 100.0;
    bool isLight = vignette > 0.0;

    float minSide = min(imageWidth, imageHeight);
    float maxSide = max(imageWidth, imageHeight);
    float aspectRatio = minSide / maxSide;
    float outerRadius = aspectRatio;
    float innerRadius = minSide / (maxSide * 2.0 * (1.0 + factor));
    float vignetteLength = outerRadius - ((outerRadius - innerRadius) * (0.5 * factor));

    float distance = distance(vec2(0.5), coords);
    float isVignetteDistance = step(innerRadius, distance);
    float vignetteFactor = (distance - innerRadius) / (vignetteLength - innerRadius) * factor * isVignetteDistance;
    float vignetteIntensity = smoothstep(1.0, 0.0, vignetteFactor);

    if (isLight) {
        color.rgb /= vignetteIntensity;
    } else {
        color.rgb *= vignetteIntensity;
    }

    return color;
}

void main() {
    vec4 color = texture2D(u_Texture, v_TexCoord);

    color = applyEnhance(u_Texture, u_ImageWidth, u_ImageHeight, v_TexCoord, u_Enhance);
    color = applyHighlightsShadows(color, u_Highlights, u_Shadows);
    color = applyBrightness(color, u_Brightness);
    color = applySaturation(color, u_Saturation);
    color = applyContrast(color, u_Contrast);
    color = applyWarmth(color, u_Warmth);
    color = applyFade(color, u_Fade);
    color = applyVignette(color, v_TexCoord, u_ImageWidth, u_ImageHeight, u_Vignette);

    gl_FragColor = color;
}