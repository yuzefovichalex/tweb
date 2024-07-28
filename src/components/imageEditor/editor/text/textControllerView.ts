import {ColorPicker} from '../../components/colorPicker';
import {EditableField} from '../../components/editableField';
import {IconSelectableButton, SelectableButton} from '../../components/selectableButton';
import {Slider} from '../../components/slider';
import {CanvasController} from '../canvasController';
import {Editor} from '../editor';

type TextParam = { icon: Icon, value: string };

export class TextControllerView implements Editor {
  private readonly canvasController: CanvasController;

  private colorPicker: ColorPicker | null = null;

  private availableTextAlignments: Array<TextParam> = new Array<TextParam>(
    {icon: 'text_align_left', value: 'left'},
    {icon: 'text_align_center', value: 'center'},
    {icon: 'text_align_right', value: 'right'}
  )
  private alignmentButtons: Array<SelectableButton<TextParam>> = new Array<SelectableButton<TextParam>>();
  private selectedAlignmentButton: SelectableButton<TextParam> | null = null;

  private availableTextStyles: Array<TextParam> = new Array<TextParam>(
    {icon: 'text_style_default', value: 'default'},
    {icon: 'text_style_outlined', value: 'outlined'},
    {icon: 'text_style_filled', value: 'filled'}
  )
  private styleButtons: Array<SelectableButton<TextParam>> = new Array<SelectableButton<TextParam>>();
  private selectedStyleButton: SelectableButton<TextParam> | null = null;

  private availableFonts: Array<string> = new Array<string>(
    'Roboto',
    'Typewriter',
    'Avenir Next',
    'Courier New',
    'Noteworthy',
    'Georgia',
    'Papyrus',
    'Snell Roundhand'
  )

  private sizeSlider: Slider | null = null;

  private fontButtons: Array<SelectableButton<string>> = new Array<SelectableButton<string>>();
  private selectedFontButton: SelectableButton<string> | null = null;

  private selectedColor: string = '#FFFFFF';
  private selectedAlignment: string = 'left';
  private selectedStyle: string = 'default';
  private selectedSize: number = 24;
  private selectedFont: string = this.availableFonts[0];

  private addedFields: Array<EditableField> = [];
  private addEditableFieldAction: (e: MouseEvent) => any = (e: MouseEvent) => { this.addTextField(e) };
  private focusedEditableField: EditableField | null = null;
  private isAnyFieldInTransformMode: boolean = false;

  readonly icon: Icon = 'text';;

  readonly useOriginalRatio: boolean = false;

  readonly showCanvasOnly: boolean = false;

  readonly element: HTMLElement;

  constructor(
    canvasController: CanvasController
  ) {
    this.canvasController = canvasController;
    this.element = this.build();
    this.selectAlignment(this.alignmentButtons[0]);
    this.selectStyle(this.styleButtons[0]);
    this.selectFont(this.fontButtons[0]);
  }

  private build(): HTMLElement {
    this.fillTextAlignmentButtons();
    this.fillTextStyleButtons();
    this.fillFontButtons();

    const container = document.createElement('div');
    container.classList.add('edit-controls', 'text-controls');

    const colorPicker = new ColorPicker((color) => { this.selectColor(color) });
    container.appendChild(colorPicker.element);
    this.colorPicker = colorPicker;

    const aligmentAndStyleContainer = document.createElement('div');
    aligmentAndStyleContainer.classList.add('text-controls-alignment-and-style-container');
    container.appendChild(aligmentAndStyleContainer);

    const alignmentContainer = document.createElement('div');
    alignmentContainer.classList.add('text-controls-style-container');
    aligmentAndStyleContainer.appendChild(alignmentContainer);

    for(const alignmentButton of this.alignmentButtons) {
      alignmentContainer.appendChild(alignmentButton.element);
    }

    const styleContainer = document.createElement('div');
    styleContainer.classList.add('text-controls-style-container');
    aligmentAndStyleContainer.appendChild(styleContainer);

    for(const styleButton of this.styleButtons) {
      styleContainer.appendChild(styleButton.element);
    }

    const sizeSlider = new Slider(
      'Size',
      8, 64, 24,
      (value) => { this.selectSize(value) },
      {hintColor: '#AAAAAA', valueColor: '#AAAAAA'}
    );
    sizeSlider.element.style.marginTop = '12px';
    container.appendChild(sizeSlider.element);
    this.sizeSlider = sizeSlider;

    const fontCaptionElement = document.createElement('div');
    fontCaptionElement.classList.add('image-editor-caption');
    fontCaptionElement.style.margin = '12px 16px'
    fontCaptionElement.innerText = 'Font'
    container.appendChild(fontCaptionElement);

    this.fontButtons.forEach((fontButton, idx) => {
      container.appendChild(fontButton.element);
    });

    return container;
  }

  private fillTextAlignmentButtons() {
    this.availableTextAlignments.forEach((alignment, idx) => {
      const alignmentButton = new IconSelectableButton<TextParam>(
        alignment.icon,
        null,
        false,
        () => { this.selectAlignment(alignmentButton) }
      );
      alignmentButton.tag = alignment;
      this.alignmentButtons[idx] = alignmentButton;
    });
  }

  private fillTextStyleButtons() {
    this.availableTextStyles.forEach((style, idx) => {
      const styleButton = new IconSelectableButton<TextParam>(
        style.icon,
        null,
        false,
        () => { this.selectStyle(styleButton) }
      );
      styleButton.tag = style;
      this.styleButtons[idx] = styleButton;
    });
  }

  private fillFontButtons() {
    this.availableFonts.forEach((font, idx) => {
      const fontButton = new IconSelectableButton<string>(
        null,
        font,
        false,
        () => { this.selectFont(fontButton) },
        {verticalPadding: 14}
      );
      fontButton.tag = font;
      fontButton.element.style.fontFamily = font;
      this.fontButtons[idx] = fontButton;
    });
  }

  private selectColor(color: string) {
    this.selectedColor = color;
    this.sizeSlider?.setColor(color);
    this.focusedEditableField?.updateParams({color: color});
  }

  private selectAlignment(newSelection: SelectableButton<TextParam>) {
    const newAlignment = newSelection.tag?.value;
    if(!newAlignment || newAlignment === this.selectedAlignment && newSelection === this.selectedAlignmentButton) {
      return;
    }

    this.selectedAlignment = newAlignment;

    this.selectedAlignmentButton?.setSelected(false);
    newSelection.setSelected(true);
    this.selectedAlignmentButton = newSelection;

    this.focusedEditableField?.updateParams({alignment: newAlignment});
  }

  private selectStyle(newSelection: SelectableButton<TextParam>) {
    const newStyle = newSelection.tag?.value;
    if(!newStyle || newStyle === this.selectedStyle && newSelection === this.selectedStyleButton) {
      return;
    }

    this.selectedStyle = newStyle;

    this.selectedStyleButton?.setSelected(false);
    newSelection.setSelected(true);
    this.selectedStyleButton = newSelection;

    this.focusedEditableField?.updateParams({style: newStyle});
  }

  private selectSize(newSize: number) {
    const sizeSlider = this.sizeSlider;
    if(!sizeSlider || newSize == this.selectedSize) {
      return;
    }

    this.selectedSize = newSize;
    sizeSlider.setValue(newSize);

    this.focusedEditableField?.updateParams({size: newSize});
  }

  private selectFont(newSelection: SelectableButton<string>) {
    const newFont = newSelection.tag;
    if(!newFont || newFont === this.selectedFont && newSelection === this.selectedFontButton) {
      return;
    }

    this.selectedFont = newFont;

    this.selectedFontButton?.setSelected(false);
    newSelection.setSelected(true);
    this.selectedFontButton = newSelection;

    this.focusedEditableField?.updateParams({font: newFont});
  }

  private addTextField(e: MouseEvent) {
    if(e.target instanceof HTMLElement &&
            EditableField.isFromEditableField(e.target)
    ) {
      if(!this.focusedEditableField?.isOwnerOf(e.target)) {
        this.focusedEditableField?.setSelected(false);
        this.focusedEditableField = null;
      }
      return;
    }

    // Click is caused by the pointer that is outside of transforming field,
    // so just skip it.
    if(this.isAnyFieldInTransformMode) {
      this.isAnyFieldInTransformMode = false;
      return;
    }

    const editingImageContainer = this.canvasController.getEditingImageContainer();
    const editableField = new EditableField(
      this.selectedColor,
      this.selectedFont,
      this.selectedSize,
      this.selectedAlignment,
      this.selectedStyle,
      (isSelected: boolean) => {
        if(isSelected) {
          this.selectEditableField(editableField)
        } else if(!editableField.value.trim()) {
          editingImageContainer.removeChild(editableField.element);
          this.addedFields.forEach((field, idx) => {
            if(field === editableField) {
              this.addedFields.splice(idx, 1);
            }
          });
        }
      },
      () => { this.isAnyFieldInTransformMode = true }
    );
    editableField.element.style.left = `${e.pageX}px`;
    editableField.element.style.top = `${e.pageY}px`;
    editingImageContainer.appendChild(editableField.element);
    this.addedFields.push(editableField);
    this.selectEditableField(editableField);

    this.canvasController.saveEditorAction(this, null);
  }

  private selectEditableField(field: EditableField) {
    if(field === this.focusedEditableField) {
      return;
    }

    this.focusedEditableField?.setSelected(false);
    field.setSelected(true);
    this.focusedEditableField = field;
    this.fillParamsFromField(field);
  }

  private fillParamsFromField(field: EditableField) {
    this.colorPicker?.setColorHex(field.color);

    const targetAlignmentButton = this.alignmentButtons.find((button) => button.tag?.value == field.alignment);
    if(targetAlignmentButton) {
      this.selectAlignment(targetAlignmentButton);
    }

    const targetStyleButton = this.styleButtons.find((button) => button.tag?.value == field.style);
    if(targetStyleButton) {
      this.selectStyle(targetStyleButton);
    }

    this.selectSize(field.size);

    const targetFontButton = this.fontButtons.find((button) => button.tag == field.font);
    if(targetFontButton) {
      this.selectFont(targetFontButton);
    }
  }

  onImageLoad(ratio: number): void { }

  onCanvasResize(width: number, height: number): void { }

  onRestoreLastState(extra: any): void {
    const removingField = this.addedFields.pop();
    this.canvasController.getEditingImageContainer().removeChild(removingField.element);
  }

  onOverlayCanvasInvalidate(isCanvasEmpty: boolean): boolean {
    return false;
  }

  onOpen(): void {
    const editingImageContainer = this.canvasController.getEditingImageContainer();
    editingImageContainer.addEventListener('click', this.addEditableFieldAction);

    for(const field of this.addedFields) {
      field.setEnabled(true);
    }
  }

  onClose(): void {
    const editingImageContainer = this.canvasController.getEditingImageContainer();
    editingImageContainer.removeEventListener('click', this.addEditableFieldAction);

    this.focusedEditableField?.setSelected(false);
    for(const field of this.addedFields) {
      field.setEnabled(false);
    }
  }

  onCompose(resultCanvas: HTMLCanvasElement) {
    const context = resultCanvas.getContext('2d');
    if(!context) {
      return;
    }

    const overlayCanvas = this.canvasController.getOverlayCanvas();
    const devicePixelRatio = window.devicePixelRatio || 1;
    for(const field of this.addedFields) {
      const x = (field.textScaledOffsetLeft - overlayCanvas.offsetLeft) * devicePixelRatio;
      const y = (field.textScaledOffsetTop - overlayCanvas.offsetTop) * devicePixelRatio;
      const maxWidth = field.maxTextWidth;

      context.save();

      context.font = `${field.size}px ${field.font}`;
      context.textAlign = <CanvasTextAlign> field.alignment;
      context.textBaseline = 'top'

      context.translate(x, y);
      context.rotate(field.rotation);
      context.scale(field.scale, field.scale);
      context.translate(-x, -y);

      const lines = field.value.split('\n');
      const lineHeight = field.lineHeight;
      for(let i = 0, n = lines.length; i < n; i++) {
        const line = lines[i];
        if(i == n - 1 && !line.trim()) {
          continue;
        }

        let dx;
        switch(field.alignment) {
          case 'left':
            dx = x;
            break;
          case 'center':
            dx = x + maxWidth / 2;
            break;
          case 'right':
            dx = x + maxWidth;
            break;
          default:
            dx = x;
            break;
        }
        const dy = y + lineHeight * i;

        if(field.style == 'filled') {
          context.fillStyle = field.backgroundColor;
          const bgW =context.measureText(line).width + field.textHorizontalPadding * 2;
          let bgX;
          switch(field.alignment) {
            case 'left':
              bgX = dx - field.textHorizontalPadding;
              break;
            case 'center':
              bgX = dx - bgW / 2;
              break;
            case 'right':
              bgX = dx - bgW + field.textHorizontalPadding;
              break;
            default:
              bgX = dx - field.textHorizontalPadding;
              break;
          }
          const bgY = dy - field.textVerticalPadding - i;
          context.fillRect(bgX, bgY, bgW, lineHeight)
        }

        context.fillStyle = field.color;
        context.fillText(line, dx, dy, maxWidth);

        if(field.style == 'outlined') {
          context.strokeStyle = field.strokeColor;
          context.lineWidth = field.strokeSize;
          context.strokeText(line, dx, dy, maxWidth);
        }
      }

      context.restore();
    }
  }
}
