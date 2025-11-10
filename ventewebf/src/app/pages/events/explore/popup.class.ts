import { importLibrary } from "@googlemaps/js-api-loader";

export async function createPopupClass() {
  const { OverlayView } = await importLibrary("maps");

  const Popup = class extends (OverlayView as any) {
    position: { lat: number; lng: number };
    container: HTMLElement;
    offsetY: number = 20; // Desplazamiento vertical hacia arriba

    constructor(position: { lat: number; lng: number }, content: HTMLElement) {
      super();
      this.position = position;

      this.container = document.createElement("div");
      this.container.className = "popup-container";
      this.container.style.position = "absolute";
      this.container.style.transform = "translate(-50%, -100%)"; // Centrar horizontal y arriba
      this.container.style.pointerEvents = "auto";
      this.container.appendChild(content);
    }

    onAdd() {
      const panes = this["getPanes"]?.();
      if (!panes) return;

      if (panes.floatPane) {
        panes.floatPane.appendChild(this.container);
      } else {
        panes.overlayMouseTarget.appendChild(this.container);
      }
    }

    onRemove() {
      if (this.container.parentElement) {
        this.container.parentElement.removeChild(this.container);
      }
    }

    draw() {
      const projection = this["getProjection"]?.();
      if (!projection) return;

      const g = (window as any).google?.maps;
      const latLng = g
        ? new g.LatLng(this.position.lat, this.position.lng)
        : { lat: this.position.lat, lng: this.position.lng };

      const point = projection.fromLatLngToDivPixel(latLng);
      if (!point) return;

      // Aplicamos desplazamiento vertical para que aparezca un poco más arriba
      this.container.style.left = `${point.x}px`;
      this.container.style.top = `${point.y - this.offsetY}px`;
    }

    setContent(content: HTMLElement) {
      this.container.innerHTML = "";
      this.container.appendChild(content);
    }

    setPosition(position: { lat: number; lng: number }) {
      this.position = position;
      this.draw();
    }
  };

  return Popup;
}
