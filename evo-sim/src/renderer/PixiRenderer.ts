import { Application, Graphics, Container } from 'pixi.js';
import { Body, Vec2, Fixture } from 'planck';

export class PixiRenderer {
  private app: Application;
  private bodyGraphics: Map<Body, Graphics> = new Map();
  private container: Container;
  private pixelsPerMeter: number = 10;
  private isReady: boolean = false;

  private constructor() {
    this.app = new Application();
    this.container = new Container();
  }

  static async create(canvas: HTMLCanvasElement, width: number, height: number): Promise<PixiRenderer> {
    const renderer = new PixiRenderer();
    await renderer.init(canvas, width, height);
    return renderer;
  }

  private async init(canvas: HTMLCanvasElement, width: number, height: number) {
    await this.app.init({
      canvas,
      width,
      height,
      backgroundColor: 0x1a1a1a,
      antialias: true,
      preference: 'webgl'
    });

    this.app.stage.addChild(this.container);

    // Set up coordinate system: origin at center, y-up
    this.container.position.set(width / 2, height / 2);
    this.container.scale.set(this.pixelsPerMeter, -this.pixelsPerMeter);

    this.isReady = true;
  }

  render(bodies: Body[]) {
    if (!this.isReady) return;

    // Clear old graphics that no longer have bodies
    const currentBodies = new Set(bodies);
    for (const [body, graphics] of this.bodyGraphics.entries()) {
      if (!currentBodies.has(body)) {
        this.container.removeChild(graphics);
        this.bodyGraphics.delete(body);
      }
    }

    // Update or create graphics for each body
    for (const body of bodies) {
      let graphics = this.bodyGraphics.get(body);

      if (!graphics) {
        graphics = new Graphics();
        this.container.addChild(graphics);
        this.bodyGraphics.set(body, graphics);
      }

      this.updateBodyGraphics(body, graphics);
    }
  }

  private updateBodyGraphics(body: Body, graphics: Graphics) {
    graphics.clear();

    const pos = body.getPosition();
    const angle = body.getAngle();

    // Set position and rotation
    graphics.position.set(pos.x, pos.y);
    graphics.rotation = angle;

    // Draw each fixture
    for (let fixture = body.getFixtureList(); fixture; fixture = fixture.getNext()) {
      this.drawFixture(fixture, graphics);
    }
  }

  private drawFixture(fixture: Fixture, graphics: Graphics) {
    const shape = fixture.getShape();
    const type = fixture.getType();

    if (type === 'polygon') {
      const vertices = (shape as any).m_vertices as Vec2[];

      if (vertices && vertices.length > 0) {
        // Build array of coordinates for poly() method
        const points: number[] = [];
        for (const vertex of vertices) {
          points.push(vertex.x, vertex.y);
        }

        // PixiJS v8 API: build shape, then fill/stroke
        graphics
          .poly(points)
          .fill({ color: 0x333333, alpha: 0.8 })
          .stroke({ width: 2 / this.pixelsPerMeter, color: 0x00ff00 });
      }
    }
  }

  setPixelsPerMeter(ppm: number) {
    this.pixelsPerMeter = ppm;
    this.container.scale.set(ppm, -ppm);
  }

  resize(width: number, height: number) {
    this.app.renderer.resize(width, height);
    this.container.position.set(width / 2, height / 2);
  }

  destroy() {
    this.app.destroy();
  }
}
