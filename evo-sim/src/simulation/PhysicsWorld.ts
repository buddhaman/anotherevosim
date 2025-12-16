import { World, Vec2, Box, Body, RevoluteJoint } from 'planck';

export interface SimulationParams {
  gravity: number;
  timeStep: number;
}

export class PhysicsWorld {
  private world: World;
  private params: SimulationParams;
  private bodies: Body[] = [];

  constructor(params: SimulationParams = { gravity: -10, timeStep: 1/60 }) {
    this.params = params;
    this.world = new World(new Vec2(0, this.params.gravity));
  }

  step() {
    this.world.step(this.params.timeStep);
  }

  createGround(): Body {
    const ground = this.world.createBody({
      type: 'static',
      position: new Vec2(0, -10)
    });
    ground.createFixture({
      shape: Box(50, 1),
      friction: 0.3
    });
    this.bodies.push(ground);
    return ground;
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

  getBodies(): Body[] {
    return this.bodies;
  }

  getWorld(): World {
    return this.world;
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
