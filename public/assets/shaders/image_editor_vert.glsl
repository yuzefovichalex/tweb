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

uniform mat3 u_PositionMatrix;
uniform mat3 u_TextureMatrix;

attribute vec2 a_Position;

varying vec2 v_TexCoord;

void main() {
    v_TexCoord = (u_TextureMatrix * vec3(a_Position, 1.0)).xy;
    gl_Position = vec4(u_PositionMatrix * vec3(a_Position, 1.0), 1.0);
}