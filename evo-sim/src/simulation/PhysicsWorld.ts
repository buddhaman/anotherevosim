import { World, Vec2, Box, Body, RevoluteJoint } from 'planck';
import { Entity } from './Entity';

export type SimulationParams = {
  gravity: number;
  timeStep: number;
};

export class PhysicsWorld {
  world: World;
  params: SimulationParams;
  bodies: Body[] = [];
  entities: Map<string, Entity> = new Map();
  speedup: number = 1; // How many steps to run per frame

  constructor(params: SimulationParams = { gravity: -10, timeStep: 1/60 }) {
    this.params = params;
    this.world = new World(new Vec2(0, this.params.gravity));
  }

  step() {
    // Run multiple steps for speedup (dt stays the same)
    for (let i = 0; i < this.speedup; i++) {
      for (const entity of this.entities.values()) {
        entity.update(this.params.timeStep);
      }

      this.world.step(this.params.timeStep);
    }

    // Render once after all steps
    for (const entity of this.entities.values()) {
      entity.render();
    }
  }

  createBox(x: number, y: number, width: number, height: number, dynamic: boolean = true): Body {
    const body = this.world.createBody({
      type: dynamic ? 'dynamic' : 'static',
      position: new Vec2(x, y)
    });
    body.createFixture({
      shape: Box(width / 2, height / 2),
      density: 1.0,
      friction: 0.3
    });
    this.bodies.push(body);
    return body;
  }

  createRevoluteJoint(bodyA: Body, bodyB: Body, anchorX: number, anchorY: number): RevoluteJoint {
    const joint = this.world.createJoint(new RevoluteJoint({
      bodyA,
      bodyB,
      localAnchorA: new Vec2(0, 0),
      localAnchorB: new Vec2(anchorX, anchorY),
      enableLimit: true,
      lowerAngle: -Math.PI / 4,
      upperAngle: Math.PI / 4,
      maxMotorTorque: 10
    }));
    return joint as RevoluteJoint;
  }

  addEntity(entity: Entity): void {
    this.entities.set(entity.id, entity);
  }

  removeEntity(id: string): void {
    const entity = this.entities.get(id);
    if (entity) {
      entity.destroy();
      this.entities.delete(id);
    }
  }

  clearEntities(): void {
    for (const entity of this.entities.values()) {
      entity.destroy();
    }
    this.entities.clear();
  }

  updateParams(params: Partial<SimulationParams>) {
    if (params.gravity !== undefined) {
      this.params.gravity = params.gravity;
      this.world.setGravity(new Vec2(0, params.gravity));
    }
    if (params.timeStep !== undefined) {
      this.params.timeStep = params.timeStep;
    }
  }
}
