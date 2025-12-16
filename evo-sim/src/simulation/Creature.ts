import { World } from 'planck';
import { Entity } from './Entity';
import { Gene } from './Gene';
import { BodyPart } from './BodyPart';

export class Creature extends Entity {
  world: World;
  gene: Gene;
  rootPart: BodyPart;

  flapTime: number = 0;
  flapSpeed: number = 4;

  // Ground friction parameters
  baseFriction: number = 0.05;  // Very low - main body glides freely
  highFriction: number = 1.0;   // Maximum drag - fully gripping
  lowFriction: number = 0.0;    // No drag - free sliding
  frictionScaling: number = 40.0;

  // Unique collision group for this creature (negative = don't collide with same group)
  static nextCollisionGroup: number = -1;
  collisionGroup: number;

  constructor(id: string, world: World, x: number, y: number, gene: Gene) {
    super(id);
    this.world = world;
    this.gene = gene;

    // Assign unique collision group for this creature
    this.collisionGroup = Creature.nextCollisionGroup;
    Creature.nextCollisionGroup--;

    // Build the body tree from the gene with initial position
    this.rootPart = new BodyPart(gene.rootSegment, world, 0, null, null, { x, y }, this.collisionGroup);

    // Collect all bodies and graphics from the tree
    this.bodies = this.rootPart.getAllBodies();
    this.graphics = this.rootPart.getAllGraphics();

    this.render();
  }

  update(deltaTime: number): void {
    // Update time
    this.flapTime += deltaTime;

    // Apply test behavior to all body parts
    this.testBehavior(this.rootPart, this.flapTime);

    // Apply ground friction to all body parts recursively
    this.applyFrictionRecursive(this.rootPart, deltaTime);
  }

  // Test behavior: actuate each body part with its own sine wave
  testBehavior(part: BodyPart, time: number): void {
    // Calculate actuation (0 to 1) for this body part
    const actuation = part.calculateActuation(time * this.flapSpeed);

    // Set friction based on actuation
    // Low actuation = low friction (slide freely)
    // High actuation = high friction (grip ground)
    part.currentFriction = this.lowFriction + actuation * (this.highFriction - this.lowFriction);

    // If this part has a joint, actuate it
    if (part.joint) {
      // Get joint limits
      const minAngle = part.joint.getLowerLimit();
      const maxAngle = part.joint.getUpperLimit();

      // Target angle based on actuation (0 = min, 1 = max)
      const targetAngle = minAngle + actuation * (maxAngle - minAngle);

      // PD control to reach target angle
      const currentAngle = part.joint.getJointAngle();
      const angleError = targetAngle - currentAngle;
      part.joint.setMotorSpeed(angleError * 10.0);
    }

    // Recursively apply to children
    for (const child of part.children) {
      this.testBehavior(child, time);
    }
  }

  applyFrictionRecursive(part: BodyPart, dt: number): void {
    part.applyGroundFriction(this.frictionScaling, dt);
    for (const child of part.children) {
      this.applyFrictionRecursive(child, dt);
    }
  }

  render(): void {
    this.renderRecursive(this.rootPart);
  }

  renderRecursive(part: BodyPart): void {
    part.render();
    for (const child of part.children) {
      this.renderRecursive(child);
    }
  }

  destroy(): void {
    this.rootPart.destroy(this.world);
    this.bodies = [];
    this.graphics = [];
  }
}
