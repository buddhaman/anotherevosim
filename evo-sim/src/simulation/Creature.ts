import { World, Body, Vec2, Box, RevoluteJoint } from 'planck';
import { Graphics } from 'pixi.js';
import { Entity } from './Entity';

export class Creature extends Entity {
  world: World;
  mainBody: Body;
  leftLimb: Body;
  rightLimb: Body;
  leftJoint: RevoluteJoint;
  rightJoint: RevoluteJoint;

  mainGraphics: Graphics;
  leftLimbGraphics: Graphics;
  rightLimbGraphics: Graphics;

  flapTime: number = 0;
  flapSpeed: number = 4; // Twice as fast

  // Ground friction parameters
  baseFriction: number = 0.05;  // Very low - main body glides freely
  highFriction: number = 1.0;   // Maximum drag - fully gripping
  lowFriction: number = 0.0;    // No drag - free sliding
  frictionScaling: number = 40.0; // k constant for damping - doubled for bigger forces

  // Current friction per body part (0 to 1)
  mainCurrentFriction: number = 0.5;
  leftCurrentFriction: number = 0.5;
  rightCurrentFriction: number = 0.5;

  constructor(id: string, world: World, x: number, y: number) {
    super(id);
    this.world = world;

    // Create main body
    this.mainBody = world.createBody({
      type: 'dynamic',
      position: new Vec2(x, y),
      angle: 0,
      linearDamping: 0.0,  // No built-in damping, we handle it manually
      angularDamping: 0.5
    });
    this.mainBody.createFixture({
      shape: Box(1.0, 0.5),
      density: 1.0,
      friction: 0.0  // Contact friction not used in top-down
    });
    this.bodies.push(this.mainBody);

    // Create left limb - larger and heavier for more push
    const leftAttachWorld = this.mainBody.getWorldPoint(new Vec2(-1.0, 0));

    this.leftLimb = world.createBody({
      type: 'dynamic',
      position: leftAttachWorld,
      angle: 0,
      linearDamping: 0.0,
      angularDamping: 1.0
    });
    this.leftLimb.createFixture({
      shape: Box(1.0, 0.4), // Bigger limbs
      density: 0.8,
      friction: 0.0
    });
    this.bodies.push(this.leftLimb);

    // Create right limb - larger and heavier for more push
    const rightAttachWorld = this.mainBody.getWorldPoint(new Vec2(1.0, 0));

    this.rightLimb = world.createBody({
      type: 'dynamic',
      position: rightAttachWorld,
      angle: 0,
      linearDamping: 0.0,
      angularDamping: 1.0
    });
    this.rightLimb.createFixture({
      shape: Box(1.0, 0.4), // Bigger limbs
      density: 0.8,
      friction: 0.0
    });
    this.bodies.push(this.rightLimb);

    // Create joints
    this.leftJoint = world.createJoint(new RevoluteJoint({
      bodyA: this.mainBody,
      bodyB: this.leftLimb,
      localAnchorA: new Vec2(-1.0, 0),
      localAnchorB: new Vec2(1.0, 0), // Adjusted for bigger limbs
      enableLimit: true,
      lowerAngle: -Math.PI / 3,
      upperAngle: Math.PI / 3,
      enableMotor: true,
      maxMotorTorque: 60.0 // Much stronger motors
    })) as RevoluteJoint;

    this.rightJoint = world.createJoint(new RevoluteJoint({
      bodyA: this.mainBody,
      bodyB: this.rightLimb,
      localAnchorA: new Vec2(1.0, 0),
      localAnchorB: new Vec2(-1.0, 0), // Adjusted for bigger limbs
      enableLimit: true,
      lowerAngle: -Math.PI / 3,
      upperAngle: Math.PI / 3,
      enableMotor: true,
      maxMotorTorque: 60.0 // Much stronger motors
    })) as RevoluteJoint;

    // Create graphics
    this.mainGraphics = new Graphics();
    this.leftLimbGraphics = new Graphics();
    this.rightLimbGraphics = new Graphics();
    this.graphics.push(this.mainGraphics, this.leftLimbGraphics, this.rightLimbGraphics);

    this.render();
  }

  update(deltaTime: number): void {
    // Update flapping motion - both limbs in unison (symmetric)
    this.flapTime += deltaTime;
    const flapPhase = Math.sin(this.flapTime * this.flapSpeed);
    const flapVelocity = Math.cos(this.flapTime * this.flapSpeed); // Derivative - direction of movement

    // For symmetric movement in top-down view:
    // Left limb sweeps with negative angle (counter-clockwise when backward)
    // Right limb sweeps with positive angle (clockwise when backward)
    // This makes them mirror each other symmetrically
    const leftTargetAngle = -flapPhase * (Math.PI / 4); // Flap backward when negative
    const rightTargetAngle = flapPhase * (Math.PI / 4);  // Flap backward when positive

    const leftCurrentAngle = this.leftJoint.getJointAngle();
    const leftAngleError = leftTargetAngle - leftCurrentAngle;
    this.leftJoint.setMotorSpeed(leftAngleError * 10.0); // Faster response

    const rightCurrentAngle = this.rightJoint.getJointAngle();
    const rightAngleError = rightTargetAngle - rightCurrentAngle;
    this.rightJoint.setMotorSpeed(rightAngleError * 10.0); // Faster response

    // Modulate friction based on VELOCITY (direction of movement), not position:
    // HIGH friction when limbs moving forward (positive velocity) - grip and pull body forward
    // LOW friction when limbs moving backward (negative velocity) - slide freely without resistance
    const limbFriction = flapVelocity > 0 ? this.highFriction : this.lowFriction;

    this.mainCurrentFriction = this.baseFriction;
    this.leftCurrentFriction = limbFriction;
    this.rightCurrentFriction = limbFriction;

    // Apply ground friction damping to each body part
    this.applyGroundFriction(this.mainBody, this.mainCurrentFriction, deltaTime);
    this.applyGroundFriction(this.leftLimb, this.leftCurrentFriction, deltaTime);
    this.applyGroundFriction(this.rightLimb, this.rightCurrentFriction, deltaTime);
  }

  applyGroundFriction(body: Body, mu: number, dt: number): void {
    // Compute damping alpha from friction coefficient
    // α = 1 - exp(-μ * k * dt)
    const alpha = 1.0 - Math.exp(-mu * this.frictionScaling * dt);
    const clampedAlpha = Math.max(0, Math.min(1, alpha));

    // Linear friction
    const v = body.getLinearVelocity();
    const vPrimeX = v.x * (1.0 - clampedAlpha);
    const vPrimeY = v.y * (1.0 - clampedAlpha);

    const m = body.getMass();
    const impulseX = m * (vPrimeX - v.x);
    const impulseY = m * (vPrimeY - v.y);

    body.applyLinearImpulse(new Vec2(impulseX, impulseY), body.getWorldCenter(), true);

    // Angular friction (prevent spinning forever)
    const w = body.getAngularVelocity();
    const I = body.getInertia();

    const wPrime = w * (1.0 - clampedAlpha);
    const dw = wPrime - w;
    const angularImpulse = I * dw;

    body.applyAngularImpulse(angularImpulse, true);
  }

  interpolateColor(color1: number, color2: number, t: number): number {
    t = Math.max(0, Math.min(1, t));

    const r1 = (color1 >> 16) & 0xff;
    const g1 = (color1 >> 8) & 0xff;
    const b1 = color1 & 0xff;

    const r2 = (color2 >> 16) & 0xff;
    const g2 = (color2 >> 8) & 0xff;
    const b2 = color2 & 0xff;

    const r = Math.round(r1 + (r2 - r1) * t);
    const g = Math.round(g1 + (g2 - g1) * t);
    const b = Math.round(b1 + (b2 - b1) * t);

    return (r << 16) | (g << 8) | b;
  }

  render(): void {
    const mainPos = this.mainBody.getPosition();
    const mainAngle = this.mainBody.getAngle();

    this.mainGraphics.clear();
    this.mainGraphics.position.set(mainPos.x, mainPos.y);
    this.mainGraphics.rotation = mainAngle;

    // Main body color based on friction
    const mainFrictionNorm = this.mainCurrentFriction;
    const mainColor = this.interpolateColor(0x2244aa, 0xff3333, mainFrictionNorm);

    this.mainGraphics
      .rect(-1.0, -0.5, 2.0, 1.0)
      .fill({ color: mainColor, alpha: 0.9 })
      .stroke({ width: 0.05, color: 0x88bbff });

    const leftPos = this.leftLimb.getPosition();
    const leftAngle = this.leftLimb.getAngle();

    const leftFrictionNorm = this.leftCurrentFriction;
    const leftColor = this.interpolateColor(0x2244aa, 0xff3333, leftFrictionNorm);

    this.leftLimbGraphics.clear();
    this.leftLimbGraphics.position.set(leftPos.x, leftPos.y);
    this.leftLimbGraphics.rotation = leftAngle;

    this.leftLimbGraphics
      .rect(-1.0, -0.4, 2.0, 0.8)
      .fill({ color: leftColor, alpha: 0.9 })
      .stroke({ width: 0.05, color: 0xffffff });

    const rightPos = this.rightLimb.getPosition();
    const rightAngle = this.rightLimb.getAngle();

    const rightFrictionNorm = this.rightCurrentFriction;
    const rightColor = this.interpolateColor(0x2244aa, 0xff3333, rightFrictionNorm);

    this.rightLimbGraphics.clear();
    this.rightLimbGraphics.position.set(rightPos.x, rightPos.y);
    this.rightLimbGraphics.rotation = rightAngle;

    this.rightLimbGraphics
      .rect(-1.0, -0.4, 2.0, 0.8)
      .fill({ color: rightColor, alpha: 0.9 })
      .stroke({ width: 0.05, color: 0xffffff });
  }

  destroy(): void {
    if (this.leftJoint) {
      this.world.destroyJoint(this.leftJoint);
    }
    if (this.rightJoint) {
      this.world.destroyJoint(this.rightJoint);
    }

    for (const body of this.bodies) {
      this.world.destroyBody(body);
    }
    this.bodies = [];
    this.graphics = [];
  }
}
