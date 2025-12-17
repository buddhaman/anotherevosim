import { Vec2, World } from 'planck';
import { Entity } from './Entity';
import { PhysicsWorld } from './PhysicsWorld';
import { Gene, BodyPartGene } from './Gene';
import { BodyPart } from './BodyPart';

export class Creature extends Entity {
  gene: Gene;

  // Bodypart at index 0 is the root part
  bodyParts: BodyPart[] = [];
  rootPart!: BodyPart; // Definitely assigned in buildBodyFromGenes

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

  constructor(id: string, physicsWorld: PhysicsWorld, x: number, y: number, gene: Gene) {
    super(id, physicsWorld);
    this.gene = gene;

    // Assign unique collision group for this creature
    this.collisionGroup = Creature.nextCollisionGroup;
    Creature.nextCollisionGroup--;

    // Build body parts from flat list
    this.buildBodyFromGenes(x, y);

    // Collect all bodies and graphics
    this.bodies = [];
    this.graphics = [];
    for (const part of this.bodyParts) {
      this.bodies.push(part.body);
      this.graphics.push(part.graphics);
    }

    this.render();
  }

  // Build body parts from the flat gene list
  private buildBodyFromGenes(x: number, y: number): void {

    // First, create all body parts (without joints)
    for (let i = 0; i < this.gene.BodyPartGenes.length; i++) {
      const gene = this.gene.BodyPartGenes[i];
      if (!gene.active) continue;

      const parentIndex = gene.parentIndex;
      const parent = parentIndex !== null ? this.bodyParts[parentIndex] : null;
      
      // Calculate depth
      let depth = 0;
      let currentIndex: number | null = i;
      while (currentIndex !== null) {
        depth++;
        currentIndex = this.gene.BodyPartGenes[currentIndex].parentIndex;
      }
      depth--; // Subtract 1 because we count from 0

      // Initial position for root, undefined for children (will be calculated)
      const initialPosition = parent === null ? new Vec2(x, y) : undefined;

      const bodyPart = new BodyPart(
        gene,
        this,
        depth,
        parent,
        initialPosition,
        this.collisionGroup
      );

      this.bodyParts.push(bodyPart);

      // Link parent and child
      if (parent) {
        parent.children.push(bodyPart);
      }
    }

    // Root part is at index 0
    this.rootPart = this.bodyParts[0];
  }

  update(deltaTime: number): void {
    // Update time
    this.flapTime += deltaTime;

    // Apply test behavior to all body parts (simple iteration)
    for (const part of this.bodyParts) {
      if (!part.gene.active) continue;

      // Calculate actuation (0 to 1) for this body part
      const actuation = part.calculateActuation(this.flapTime * this.flapSpeed);

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
    }

    // Apply ground friction to all body parts
    for (const part of this.bodyParts) {
      if (!part.gene.active) continue;
      part.applyGroundFriction(this.frictionScaling, deltaTime);
    }
  }

  render(): void {
    // Simple iteration over all body parts
    for (const part of this.bodyParts) {
      if (!part.gene.active) continue;
      part.render();
    }
  }

  destroy(): void {
    const world = this.world.world; // Get World from PhysicsWorld
    // Destroy all body parts (iterate in reverse to handle parent-child relationships)
    for (let i = this.bodyParts.length - 1; i >= 0; i--) {
      this.bodyParts[i].destroy(world);
    }
    this.bodyParts = [];
    this.bodies = [];
    this.graphics = [];
  }

  getBodyPartAt(x: number, y: number): any {
    // Check all body parts, prefer deeper ones (children first)
    // Sort by depth descending to check children before parents
    const sortedParts = [...this.bodyParts].sort((a, b) => b.depth - a.depth);
    
    for (const part of sortedParts) {
      if (!part.gene.active) continue;
      const found = part.checkContainsPoint(x, y);
      if (found) return found;
    }
    return null;
  }
}
