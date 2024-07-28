import {MathUtils} from '../utils/mathUtils';
import {MatrixUtils} from '../utils/matrixUtils';
import {ShaderUtils} from '../utils/shaderUtils';
import {CanvasController} from './canvasController';
import {AdjustControllerView, AdjustListener, AdjustParams} from './adjust/adjustControllerView';
import {Editor} from './editor';
import {TransformControllerView, TransformListener, TransformParams} from './transform/transformControllerView';
import {TextControllerView} from './text/textControllerView';
import {DrawControllerView} from './draw/drawControllerVIew';
import {StickerControllerView} from './stickers/stickersControllerView';
import Icon from '../../icon';
import ButtonIcon from '../../buttonIcon';

export class ImageEditor implements CanvasController, AdjustListener, TransformListener {
  private parent: HTMLElement | null = null;
  private url: string;
  private onEditDone: (data: Blob) => any;

  private root: HTMLElement;
  private mainCanvas: HTMLCanvasElement;
  private overlayCanvas: HTMLCanvasElement;
  private editingImageZone: HTMLDivElement;
  private bottomControls: HTMLDivElement;
  private editPanel: HTMLDivElement;

  private glContext: WebGLRenderingContext | null;
  private program: WebGLProgram | null = null;

  private imageWidthLocation: WebGLUniformLocation | null = null;
  private imageHeightLocation: WebGLUniformLocation | null = null;

  private positionMatrixLocation: WebGLUniformLocation | null = null;
  private textureMatrixLocation: WebGLUniformLocation | null = null;

  private enhanceLocation: WebGLUniformLocation | null = null;
  private brightnessLocation: WebGLUniformLocation | null = null;
  private contrastLocation: WebGLUniformLocation | null = null;
  private saturationLocation: WebGLUniformLocation | null = null;
  private warmthLocation: WebGLUniformLocation | null = null;
  private fadeLocation: WebGLUniformLocation | null = null;
  private highlightsLocation: WebGLUniformLocation | null = null;
  private shadowsLocation: WebGLUniformLocation | null = null;
  private vignetteLocation: WebGLUniformLocation | null = null;

  private image = new Image();

  private originalRatio: number = 1;
  private ratio: number = 1;
  private useOriginalRatio = true;
  private rotation: number = 0;

  private editors: Array<Editor> = new Array<Editor>(
    new AdjustControllerView(this, this),
    new TransformControllerView(3 / 4, this, this),
    new TextControllerView(this),
    new DrawControllerView(this),
    new StickerControllerView()
  );
  private selectedEditor: Editor | null = null;

  constructor(
    url: string,
    onEditDone: (data: Blob) => any
  ) {
    this.url = url;
    this.onEditDone = onEditDone;

    this.mainCanvas = this.createMainCanvas();
    this.glContext = this.mainCanvas.getContext('webgl', {preserveDrawingBuffer: true});
    this.overlayCanvas = this.createOverlayCanvas();
    this.editingImageZone = this.createEditingImageZone();
    this.bottomControls = this.createBottomControls();
    this.editPanel = this.createEditPanel();

    this.root = this.build(
      this.mainCanvas,
      this.overlayCanvas,
      this.editingImageZone,
      this.bottomControls,
      this.editPanel
    );
    this.init();
    this.selectEditor(0);
  }

  private build(
    mainCanvas: HTMLCanvasElement,
    overlayCanvas: HTMLCanvasElement,
    editingImageZone: HTMLDivElement,
    bottomControls: HTMLDivElement,
    editPanel: HTMLDivElement
  ): HTMLElement {
    const container = document.createElement('div');
    container.classList.add('image-editor-container');

    const workingZone = document.createElement('div');
    workingZone.classList.add('working-zone');
    container.appendChild(workingZone);

    const topControls = document.createElement('div');
    topControls.classList.add('top-controls');
    workingZone.appendChild(topControls);

    editingImageZone.appendChild(mainCanvas);
    editingImageZone.appendChild(overlayCanvas);
    workingZone.appendChild(editingImageZone);

    workingZone.appendChild(bottomControls);

    container.appendChild(editPanel);

    const editPanelAppBar = document.createElement('div');
    editPanelAppBar.classList.add('edit-panel-app-bar');
    editPanel.appendChild(editPanelAppBar);

    const editPanelNavBar = document.createElement('div');
    editPanelNavBar.classList.add('edit-panel-navbar');
    editPanelAppBar.appendChild(editPanelNavBar);

    const backButton = ButtonIcon('close edit-panel-icon-button');
    backButton.addEventListener('click', () => { this.close() });
    editPanelNavBar.appendChild(backButton)

    const navBarTitle = document.createElement('div');
    navBarTitle.classList.add('edit-panel-navbar-title');
    navBarTitle.innerText = 'Edit';
    editPanelNavBar.appendChild(navBarTitle);

    const undoButton = ButtonIcon('undo edit-panel-icon-button');
    editPanelNavBar.appendChild(undoButton);

    const redoButton = ButtonIcon('redo edit-panel-icon-button')
    editPanelNavBar.appendChild(redoButton);

    const editPanelTabs = document.createElement('div');
    editPanelTabs.classList.add('edit-panel-tabs');
    editPanelAppBar.appendChild(editPanelTabs);

    this.editors.forEach((editor, idx) => {
      const editorTab = ButtonIcon(`${editor.icon} edit-panel-icon-button`);
      editorTab.addEventListener('click', () => { this.selectEditor(idx) });
      editPanelTabs.appendChild(editorTab);
    });

    const saveMediaButton = document.createElement('button');
    saveMediaButton.classList.add('save-media-button');
    saveMediaButton.addEventListener('click', () => { this.composeFinalImage() });
    editPanel.appendChild(saveMediaButton);

    const saveMediaButtonIcon = Icon('apply');
    saveMediaButtonIcon.classList.add('save-media-button-icon');
    saveMediaButton.appendChild(saveMediaButtonIcon);

    return container;
  }

  private createMainCanvas(): HTMLCanvasElement {
    const mainCanvas = document.createElement('canvas');
    mainCanvas.classList.add('editing-image');
    return mainCanvas;
  }

  private createOverlayCanvas(): HTMLCanvasElement {
    const overlayCanvas = document.createElement('canvas');
    overlayCanvas.classList.add('overlay-canvas');
    return overlayCanvas;
  }

  private createEditingImageZone(): HTMLDivElement {
    const editingImageZone = document.createElement('div');
    editingImageZone.classList.add('editing-image-zone');
    return editingImageZone;
  }

  private createBottomControls(): HTMLDivElement {
    const bottomControls = document.createElement('div');
    bottomControls.classList.add('image-editor-bottom-controls');
    return bottomControls;
  }

  private createEditPanel(): HTMLDivElement {
    const editPanel = document.createElement('div');
    editPanel.classList.add('edit-panel');
    return editPanel;
  }

  private async init() {
    const gl = this.glContext;
    if(!gl) {
      return;
    }

    const canvasResizeObserver = new ResizeObserver(() => {this.resize()});
    canvasResizeObserver.observe(<HTMLCanvasElement> gl.canvas);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    gl.clearColor(0, 0, 0, 0);

    const program = await ShaderUtils.createProgram(gl, 'assets/shaders/image_editor_vert.glsl', 'assets/shaders/image_editor_frag.glsl');
    gl.useProgram(program);
    this.program = program;

    if(program != null) {
      this.imageWidthLocation = gl.getUniformLocation(program, 'u_ImageWidth');
      this.imageHeightLocation = gl.getUniformLocation(program, 'u_ImageHeight');
      this.positionMatrixLocation = gl.getUniformLocation(program, 'u_PositionMatrix');
      this.textureMatrixLocation = gl.getUniformLocation(program, 'u_TextureMatrix');
      this.enhanceLocation = gl.getUniformLocation(program, 'u_Enhance');
      this.brightnessLocation = gl.getUniformLocation(program, 'u_Brightness');
      this.contrastLocation = gl.getUniformLocation(program, 'u_Contrast');
      this.saturationLocation = gl.getUniformLocation(program, 'u_Saturation');
      this.warmthLocation = gl.getUniformLocation(program, 'u_Warmth');
      this.fadeLocation = gl.getUniformLocation(program, 'u_Fade');
      this.highlightsLocation = gl.getUniformLocation(program, 'u_Highlights');
      this.shadowsLocation = gl.getUniformLocation(program, 'u_Shadows');
      this.vignetteLocation = gl.getUniformLocation(program, 'u_Vignette');
    }

    this.loadImage();
  }

  private loadImage() {
    this.image.addEventListener('load', () => {
      this.originalRatio = this.image.width / this.image.height;
      this.ratio = this.originalRatio;
      this.resize();
      this.loadTexture(this.image);
      this.draw();
    });
    this.image.src = this.url;
  }

  private selectEditor(idx: number) {
    const newEditor = this.editors[idx];
    const prevEditor = this.selectedEditor;

    if(newEditor === prevEditor) {
      return;
    }

    if(prevEditor) {
      prevEditor.onClose();
      this.editPanel.removeChild(prevEditor.element);
    }

    this.useOriginalRatio = newEditor.useOriginalRatio;

    this.getEditingImageContainer().childNodes.forEach((child) => {
      if(child instanceof HTMLElement && child !== this.glContext?.canvas) {
        child.style.visibility = newEditor.showCanvasOnly ? 'hidden' : 'visible';
      }
    });

    this.invalidateOverlayCanvas();

    this.editPanel.appendChild(newEditor.element);
    newEditor.onOpen();
    this.selectedEditor = newEditor;
  }

  private loadTexture(image: HTMLImageElement) {
    const gl = this.glContext;
    const program = this.program;
    if(!gl || !program) {
      console.log('Unable to load texture.')
      return;
    }

    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);

    const textureLocation = gl.getUniformLocation(program, 'u_Texture');
    gl.uniform1i(textureLocation, 0);

    this.positionTexture(image);
  }

  private positionTexture(image: HTMLImageElement) {
    const gl = this.glContext;
    const program = this.program;
    if(!gl || !program) {
      return;
    }

    const canvasWidth = gl.canvas.width;
    const canvasHeight = gl.canvas.height;

    const imageRatio = this.useOriginalRatio ? this.originalRatio : this.ratio;
    const resizedImageParams = MathUtils.calculateRectanleRelativeDimensions(
      canvasWidth,
      canvasHeight,
      canvasWidth / canvasHeight,
      imageRatio
    );
    const resizedWidth = resizedImageParams.width;
    const resizedHeight = resizedImageParams.height;

    gl.uniform1f(this.imageWidthLocation, image.width);
    gl.uniform1f(this.imageHeightLocation, image.height);

    const left = (canvasWidth - resizedWidth) / 2;
    const right = canvasWidth - left;
    const top = (canvasHeight - resizedHeight) / 2;
    const bottom = canvasHeight - top;
    const vertices = new Float32Array([
      left,  top,
      left, bottom,
      right,  top,
      right, bottom
    ]);

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    const positionLocation = gl.getAttribLocation(program, 'a_Position');
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    const overlayCanvas = this.getOverlayCanvas();
    const overlayCanvasScaleFactor = window.devicePixelRatio || 1;
    overlayCanvas.width = resizedWidth;
    overlayCanvas.height = resizedHeight;
    overlayCanvas.style.width = `${resizedWidth / overlayCanvasScaleFactor}px`;
    overlayCanvas.style.height = `${resizedHeight / overlayCanvasScaleFactor}px`;
    overlayCanvas.style.left = `${left / overlayCanvasScaleFactor}px`;
    overlayCanvas.style.top = `${top / overlayCanvasScaleFactor}px`;
  }

  private draw() {
    const gl = this.glContext;
    if(!gl) {
      return;
    }

    const angleRad = MathUtils.toRadians(Math.abs(this.rotation));
    const scale = Math.cos(angleRad) + 1 / this.ratio * Math.sin(angleRad);
    console.log(scale);

    let transformMatrix = MatrixUtils.vertexProjectionM(gl.canvas.width, gl.canvas.height);
    if(this.useOriginalRatio) {
      transformMatrix = MatrixUtils.translate(transformMatrix, gl.canvas.width / 2, gl.canvas.height / 2);
      transformMatrix = MatrixUtils.rotate(transformMatrix, this.rotation);
      transformMatrix = MatrixUtils.scale(transformMatrix, scale, scale);
      transformMatrix = MatrixUtils.translate(transformMatrix, -gl.canvas.width / 2, -gl.canvas.height / 2);
    }
    gl.uniformMatrix3fv(this.positionMatrixLocation, false, transformMatrix);

    const resizedImageParams = MathUtils.calculateRectanleRelativeDimensions(
      gl.canvas.width,
      gl.canvas.height,
      gl.canvas.width / gl.canvas.height,
      this.originalRatio
    );
    const offsetX = (gl.canvas.width - resizedImageParams.width) / 2;
    const offsetY = (gl.canvas.height - resizedImageParams.height) / 2;

    let transformTexMatrix = MatrixUtils.fragmentProjectionM(resizedImageParams.width, resizedImageParams.height);
    if(!this.useOriginalRatio) {
      const centerX = resizedImageParams.width / 2;
      const centerY = resizedImageParams.height / 2;
      let croppedScale = 1;
      if(this.ratio > this.originalRatio) {
        croppedScale = this.originalRatio / this.ratio;
      }
      // TODO: re-check scale calculation since it may be a little bit bigger than needed for
      // when originalRatio < 1 and ratio > 1 + angle is big
      const rotatedScale = croppedScale / scale;
      transformTexMatrix = MatrixUtils.translate(transformTexMatrix, centerX, centerY);
      transformTexMatrix = MatrixUtils.rotate(transformTexMatrix, -this.rotation);
      transformTexMatrix = MatrixUtils.scale(transformTexMatrix, rotatedScale, rotatedScale);
      transformTexMatrix = MatrixUtils.translate(transformTexMatrix, -centerX, -centerY);
    }
    transformTexMatrix = MatrixUtils.translate(transformTexMatrix, -offsetX, -offsetY);
    gl.uniformMatrix3fv(this.textureMatrixLocation, false, transformTexMatrix);

    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  onColoringParamsUpdate(params: AdjustParams) {
    const gl = this.glContext;
    if(!gl) {
      return;
    }

    gl.uniform1f(this.enhanceLocation, params.enhancement);
    gl.uniform1f(this.brightnessLocation, params.brightness);
    gl.uniform1f(this.contrastLocation, params.contrast);
    gl.uniform1f(this.saturationLocation, params.saturation);
    gl.uniform1f(this.warmthLocation, params.warmth);
    gl.uniform1f(this.fadeLocation, params.fade);
    gl.uniform1f(this.highlightsLocation, params.highlights);
    gl.uniform1f(this.shadowsLocation, params.shadows);
    gl.uniform1f(this.vignetteLocation, params.vignette);

    this.draw();
  }

  onTransformParamsUpdate(params: TransformParams): void {
    this.ratio = params.ratio;
    this.rotation = params.rotation;

    this.draw();
  }

  private resize() {
    const gl = this.glContext;
    if(!gl) {
      return;
    }

    this.resizeCanvasToDisplaySize(gl);
    this.positionTexture(this.image);
    this.draw();

    for(const editor of this.editors) {
      editor.onCanvasResize(this.mainCanvas.clientWidth, this.mainCanvas.clientHeight);
    }

    this.invalidateOverlayCanvas();
  }

  private resizeCanvasToDisplaySize(gl: WebGLRenderingContext) {
    // Lookup the size the browser is displaying the canvas in CSS pixels.
    const canvas = <HTMLCanvasElement> gl.canvas;
    const scaleFactor = window.devicePixelRatio || 1;

    const displayWidth  = Math.floor(canvas.clientWidth * scaleFactor);
    const displayHeight = Math.floor(canvas.clientHeight * scaleFactor);

    const needResize = canvas.width  !== displayWidth ||
                           canvas.height !== displayHeight;

    if(needResize) {
      canvas.width  = displayWidth;
      canvas.height = displayHeight;
    }

    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  }

  private invalidateOverlayCanvas() {
    const shouldInvalidate = !(this.selectedEditor?.showCanvasOnly ?? false);
    if(shouldInvalidate) {
      let isCanvasEmpty = true;
      for(const editor of this.editors) {
        const wasCanvasDrawn = editor.onOverlayCanvasInvalidate(isCanvasEmpty);
        if(wasCanvasDrawn) {
          isCanvasEmpty = false;
        }
      }
    }
  }

  private composeFinalImage() {
    const resultCanvas = document.createElement('canvas');
    const context = resultCanvas.getContext('2d');
    if(!context) {
      return;
    }

    resultCanvas.width = this.overlayCanvas.width;
    resultCanvas.height = this.overlayCanvas.height;

    context.drawImage(
      this.mainCanvas,
      this.overlayCanvas.offsetLeft * devicePixelRatio, this.overlayCanvas.offsetTop * devicePixelRatio,
      this.overlayCanvas.width, this.overlayCanvas.height,
      0, 0,
      resultCanvas.width, resultCanvas.height
    );

    const resultOverlayCanvas = document.createElement('canvas');
    resultOverlayCanvas.width = resultCanvas.width;
    resultOverlayCanvas.height = resultCanvas.height;
    for(const editor of this.editors) {
      editor.onCompose(resultOverlayCanvas);
    }
    context.drawImage(resultOverlayCanvas, 0, 0);

    resultCanvas.toBlob((blob: Blob) => { this.onEditDone(blob) });
  }

  open(parent: HTMLElement) {
    parent.appendChild(this.root);
    this.parent = parent;
  }

  close() {
    const parent = this.parent;
    if(!parent) {
      return;
    }

    parent.removeChild(this.root);
    this.parent = null;
  }

  getEditingImageContainer(): HTMLDivElement {
    return this.editingImageZone;
  }

  getBottomControlsContainer(): HTMLDivElement {
    return this.bottomControls;
  }

  getOverlayCanvas(): HTMLCanvasElement {
    return this.overlayCanvas;
  }

  showBottomControls(): void {
    const editingImageContainer = this.getEditingImageContainer();
    editingImageContainer.style.height = 'calc(100% - 192px)'
    editingImageContainer.style.top = '64px';
    this.getBottomControlsContainer().style.display = 'block';
  }

  hideBottomControllers(): void {
    const editingImageContainer = this.getEditingImageContainer();
    editingImageContainer.style.height = '100%'
    editingImageContainer.style.top = '0';
    this.getBottomControlsContainer().style.display = 'none';
  }
}
