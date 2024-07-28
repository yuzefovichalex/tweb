import { FileUtils } from "./fileUtils";

export class ShaderUtils {

    static async createProgram(
        gl: WebGLRenderingContext,
        vertexShaderPath: string,
        fragmentShaderPath: string
    ): Promise<WebGLProgram | null> {
        const vertexShaderContent = await FileUtils.loadFileContent(vertexShaderPath);
        const fragmentShaderContent = await FileUtils.loadFileContent(fragmentShaderPath);
    
        const vertexShader = this.compileShader(gl, vertexShaderContent, gl.VERTEX_SHADER);
        const fragmentShader = this.compileShader(gl, fragmentShaderContent, gl.FRAGMENT_SHADER);
    
        const program = gl.createProgram();
        if (!program || !vertexShader || !fragmentShader) {
            return null;
        }

        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);
    
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            console.error('Shader program initialization failure:', gl.getProgramInfoLog(program));
            return null;
        }
    
        return program;
    }

    private static compileShader(
        gl: WebGLRenderingContext,
        source: string,
        type: GLenum
    ): WebGLShader | null {
        const shader = gl.createShader(type);
        if (!shader) {
            return null;
        }

        gl.shaderSource(shader, source);
        gl.compileShader(shader);
    
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.error('Shader compilation failure:', gl.getShaderInfoLog(shader));
            gl.deleteShader(shader);
            return null;
        }
    
        return shader;
    }

}