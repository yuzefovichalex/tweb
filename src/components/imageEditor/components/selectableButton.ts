import Icon from "../../icon";

export type SelectableButtonParams = {
    horizontalPadding?: number,
    verticalPadding?: number
}

export abstract class SelectableButton<T> {

    private iconUrl: string | null;
    private text: string | null;
    private isSelected: boolean;
    private onClick: () => any;

    private horizontalPadding: number;
    private verticalPadding: number;

    protected imageElement: HTMLElement | null = null;

    tag: T | null = null;

    readonly element: HTMLElement;

    constructor(
        iconUrl: string | null,
        text: string | null,
        isSelected: boolean,
        onClick: () => any,
        params: SelectableButtonParams = { }
    ) {
        this.iconUrl = iconUrl;
        this.text = text;
        this.isSelected = isSelected;
        this.onClick = onClick;

        this.horizontalPadding = params.horizontalPadding ?? 16;
        this.verticalPadding = params.verticalPadding ?? 12;

        this.element = this.build();
        this.setSelected(isSelected);
    }

    abstract createImageElement(imageUrl: string): HTMLElement

    private build(): HTMLElement {
        const container = document.createElement('div');
        container.classList.add('selectable-button');
        container.style.padding = `${this.verticalPadding}px ${this.horizontalPadding}px`;
        container.addEventListener('click', () => { this.onClick() });

        const iconUrl = this.iconUrl;
        if (iconUrl) {
            const imageElement = this.createImageElement(iconUrl);
            container.appendChild(imageElement);
            this.imageElement = imageElement;
        }

        const text = this.text;
        if (text) {
            const textElement = document.createElement('div');
            textElement.classList.add('selectable-button-text');
            textElement.innerText = text;
            container.appendChild(textElement);
        }

        return container;
    }

    setSelected(isSelected: boolean) {
        if (isSelected == this.isSelected) {
            return;
        }

        this.isSelected = isSelected;
        if (isSelected) {
            this.element.classList.add('selected');
            this.imageElement?.classList.add('selected');
        } else {
            this.element.classList.remove('selected');
            this.imageElement?.classList.remove('selected');
        }
    }

}

export class IconSelectableButton<T> extends SelectableButton<T> {

    override createImageElement(imageUrl: string): HTMLElement {
        const iconElement = Icon(<Icon> imageUrl, 'selectable-button-icon');
        return iconElement;
    }

}