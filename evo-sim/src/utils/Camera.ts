import { Container } from 'pixi.js';

export class Camera {
  private container: Container;
  private isDragging: boolean = false;
  private dragStart: { x: number; y: number } = { x: 0, y: 0 };
  private zoom: number = 1;

  constructor(container: Container) {
    this.container = container;
  }

  setPosition(x: number, y: number) {
    this.container.position.set(x, y);
  }

  getPosition() {
    return { x: this.container.position.x, y: this.container.position.y };
  }

  setZoom(zoom: number) {
    this.zoom = Math.max(0.1, Math.min(5, zoom)); // Clamp between 0.1 and 5
    this.container.scale.set(this.zoom, this.zoom);
  }

  getZoom() {
    return this.zoom;
  }

  zoomBy(delta: number, centerX: number, centerY: number) {
    const oldZoom = this.zoom;
    const newZoom = Math.max(0.1, Math.min(5, oldZoom * (1 + delta)));

    // Zoom towards mouse position
    const worldPosBefore = this.screenToWorld(centerX, centerY);
    this.setZoom(newZoom);
    const worldPosAfter = this.screenToWorld(centerX, centerY);

    // Adjust position to keep the same world point under the cursor
    this.container.position.x += (worldPosAfter.x - worldPosBefore.x) * this.zoom;
    this.container.position.y += (worldPosAfter.y - worldPosBefore.y) * this.zoom;
  }

  startDrag(screenX: number, screenY: number) {
    this.isDragging = true;
    this.dragStart = { x: screenX, y: screenY };
  }

  updateDrag(screenX: number, screenY: number) {
    if (!this.isDragging) return;

    const dx = screenX - this.dragStart.x;
    const dy = screenY - this.dragStart.y;

    this.container.position.x += dx;
    this.container.position.y += dy;

    this.dragStart = { x: screenX, y: screenY };
  }

  endDrag() {
    this.isDragging = false;
  }

  screenToWorld(screenX: number, screenY: number) {
    return {
      x: (screenX - this.container.position.x) / this.zoom,
      y: (screenY - this.container.position.y) / this.zoom
    };
  }

  worldToScreen(worldX: number, worldY: number) {
    return {
      x: worldX * this.zoom + this.container.position.x,
      y: worldY * this.zoom + this.container.position.y
    };
  }
}
