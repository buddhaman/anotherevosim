import { Vec2 } from 'planck';
import { Entity } from './Entity';
import { PhysicsWorld } from './PhysicsWorld';
import { Gene } from './Gene';
import { BodyPart } from './BodyPart';
import { Genome } from './Genome';
import { MinimalGatedUnit } from './gru';

export class Creature extends Entity {
  genome: Genome;
  gene: Gene; // For backward compatibility

  // Bodypart at index 0 is the root part
  bodyParts: BodyPart[] = [];
  rootPart!: BodyPart; // Definitely assigned in buildBodyFromGenes

  // Brain
  brain: MinimalGatedUnit;

  // Simulation time
  simulationTime: number = 0;

  // Ground friction parameters
  baseFriction: number = 0.05;  // Very low - main body glides freely
  highFriction: number = 1.0;   // Maximum drag - fully gripping
  lowFriction: number = 0.0;    // No drag - free sliding
  frictionScaling: number = 40.0;

  // Unique collision group for this creature (negative = don't collide with same group)
  static nextCollisionGroup: number = -1;
  collisionGroup: number;

  constructor(id: string, physicsWorld: PhysicsWorld, x: number, y: number, genome: Genome) {
    super(id, physicsWorld);
    this.genome = genome;
    this.gene = genome.bodyGene; // For backward compatibility

    // Create brain
    this.brain = new MinimalGatedUnit(genome.brainConfig, genome.brainGene);

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
    // Update simulation time
    this.simulationTime += deltaTime;

    // Gather inputs for brain
    const inputs = this.gatherBrainInputs();

    // Run brain forward pass
    this.brain.setInput(inputs);
    this.brain.step();

    // Get brain outputs
    const outputs = this.brain.getOutput();

    // Apply brain outputs to body
    this.applyBrainOutputs(outputs);

    // Apply ground friction to all body parts
    for (const part of this.bodyParts) {
      if (!part.gene.active) continue;
      part.applyGroundFriction(this.frictionScaling, deltaTime);
    }
  }

  /**
   * Gather sensory inputs for the brain
   * Input structure: [clock, joint_angles..., body_velocities...]
   */
  private gatherBrainInputs(): number[] {
    const inputs: number[] = [];

    // Clock input: oscillating signal
    const clockFrequency = 2.0; // Hz
    inputs.push(Math.sin(this.simulationTime * clockFrequency * 2 * Math.PI));

    // Joint angles (normalized to [-1, 1])
    for (const part of this.bodyParts) {
      if (!part.gene.active) continue;
      if (part.joint) {
        const minAngle = part.joint.getLowerLimit();
        const maxAngle = part.joint.getUpperLimit();
        const currentAngle = part.joint.getJointAngle();
        const normalizedAngle = maxAngle !== minAngle
          ? ((currentAngle - minAngle) / (maxAngle - minAngle)) * 2 - 1
          : 0;
        inputs.push(normalizedAngle);
      }
    }

    // Body velocities (x and y for each segment)
    for (const part of this.bodyParts) {
      if (!part.gene.active) continue;
      const velocity = part.body.getLinearVelocity();
      // Normalize velocities (typical range is -10 to 10)
      inputs.push(Math.tanh(velocity.x / 5.0));
      inputs.push(Math.tanh(velocity.y / 5.0));
    }

    return inputs;
  }

  /**
   * Apply brain outputs to control joints and friction
   * Output structure: [joint_torques..., friction_controls...]
   */
  private applyBrainOutputs(outputs: number[]): void {
    let outputIdx = 0;
    const activeSegments = this.bodyParts.filter(p => p.gene.active).length;
    const numJoints = activeSegments - 1;

    // Apply joint torques (first numJoints outputs)
    for (const part of this.bodyParts) {
      if (!part.gene.active) continue;
      if (part.joint && outputIdx < numJoints) {
        const torqueControl = outputs[outputIdx];
        outputIdx++;

        // Get joint limits
        const minAngle = part.joint.getLowerLimit();
        const maxAngle = part.joint.getUpperLimit();

        // Target angle based on control signal (output is in [-1, 1] from tanh)
        const targetAngle = minAngle + ((torqueControl + 1) / 2) * (maxAngle - minAngle);

        // PD control to reach target angle
        const currentAngle = part.joint.getJointAngle();
        const angleError = targetAngle - currentAngle;
        part.joint.setMotorSpeed(angleError * 10.0);
      }
    }

    // Apply friction controls (next activeSegments outputs)
    for (const part of this.bodyParts) {
      if (!part.gene.active) continue;
      if (outputIdx < outputs.length) {
        const frictionControl = outputs[outputIdx];
        outputIdx++;

        // Map control signal [-1, 1] to friction range [low, high]
        const normalizedControl = (frictionControl + 1) / 2; // Map to [0, 1]
        part.currentFriction = this.lowFriction + normalizedControl * (this.highFriction - this.lowFriction);
      }
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
