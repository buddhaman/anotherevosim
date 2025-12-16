// Phenotype: The physical expression of a body part gene

import { World, Body, Vec2, Box, RevoluteJoint } from 'planck';
import { Graphics } from 'pixi.js';
import { BodyPartGene, JointGene, Gene } from './Gene';
import type { AttachmentSide } from './Gene';

export class BodyPart {
  gene: BodyPartGene;
  depth: number;
  actualWidth: number;
  actualHeight: number;

  body: Body;
  joint: RevoluteJoint | null;
  graphics: Graphics;

  parent: BodyPart | null;
  children: BodyPart[];

  currentFriction: number;

  // Actuation parameters (unique per body part)
  phaseOffset: number;  // Random phase offset for sine wave
  frequencyMultiplier: number; // Random frequency multiplier

  constructor(
    gene: BodyPartGene,
    world: World,
    depth: number,
    parent: BodyPart | null,
    parentJointGene: JointGene | null,
    initialPosition?: Vec2,
    collisionGroup?: number
  ) {
    this.gene = gene;
    this.depth = depth;
    this.parent = parent;
    this.children = [];
    this.joint = null;
    this.currentFriction = 0.5;

    // Random actuation parameters for this body part
    this.phaseOffset = Math.random() * Math.PI * 2;
    this.frequencyMultiplier = 0.5 + Math.random() * 1.5; // [0.5, 2.0]

    // Calculate actual size based on depth
    // size = normalized_size × (scale ^ depth)
    const scaleFactor = Math.pow(Gene.SCALE_FACTOR, depth);
    this.actualWidth = gene.normalizedWidth * scaleFactor;
    this.actualHeight = gene.normalizedHeight * scaleFactor;

    // Determine position
    let position: Vec2;
    if (parent === null) {
      // Root segment uses provided position or origin
      position = initialPosition || new Vec2(0, 0);
    } else {
      // Child segment - calculate position based on attachment
      position = this.calculateAttachmentPosition(parent, parentJointGene!);
    }

    // Create physics body
    this.body = world.createBody({
      type: 'dynamic',
      position: position,
      angle: 0,
      linearDamping: 0.0,
      angularDamping: parent === null ? 0.5 : 1.0 // Main body spins less
    });

    this.body.createFixture({
      shape: Box(this.actualWidth, this.actualHeight),
      density: parent === null ? 1.0 : 0.8,
      friction: 0.0,
      filterGroupIndex: collisionGroup || 0
    });

    // Create joint if this is not root
    if (parent !== null && parentJointGene !== null) {
      const localAnchorA = this.getLocalAnchor(parent, parentJointGene);
      const localAnchorB = this.getOwnAnchor(parentJointGene.attachmentSide);

      this.joint = world.createJoint(new RevoluteJoint({
        bodyA: parent.body,
        bodyB: this.body,
        localAnchorA: localAnchorA,
        localAnchorB: localAnchorB,
        enableLimit: true,
        lowerAngle: parentJointGene.minAngle,
        upperAngle: parentJointGene.maxAngle,
        enableMotor: true,
        maxMotorTorque: 60.0
      })) as RevoluteJoint;
    }

    // Create graphics
    this.graphics = new Graphics();

    // Create children recursively (safety check: depth must be less than MAX_DEPTH)
    if (depth >= Gene.MAX_DEPTH) {
      return;
    }

    for (const childJointGene of gene.children) {
      if (childJointGene.active && depth + 1 <= Gene.MAX_DEPTH) {
        const childPart = new BodyPart(
          childJointGene.childSegment,
          world,
          depth + 1,
          this,
          childJointGene,
          undefined,
          collisionGroup
        );
        this.children.push(childPart);
      }
    }
  }

  // Calculate world position for attachment point on parent
  calculateAttachmentPosition(parent: BodyPart, jointGene: JointGene): Vec2 {
    const anchor = this.getLocalAnchor(parent, jointGene);
    return parent.body.getWorldPoint(anchor);
  }

  // Get local anchor point on parent body
  getLocalAnchor(parent: BodyPart, jointGene: JointGene): Vec2 {
    const t = jointGene.attachmentPosition;
    const pw = parent.actualWidth;
    const ph = parent.actualHeight;

    switch (jointGene.attachmentSide) {
      case 'top':
        return new Vec2((t - 0.5) * 2 * pw, -ph);
      case 'bottom':
        return new Vec2((t - 0.5) * 2 * pw, ph);
      case 'left':
        return new Vec2(-pw, (t - 0.5) * 2 * ph);
      case 'right':
        return new Vec2(pw, (t - 0.5) * 2 * ph);
    }
  }

  // Get local anchor point on own body (opposite side of attachment)
  getOwnAnchor(parentAttachmentSide: AttachmentSide): Vec2 {
    const w = this.actualWidth;
    const h = this.actualHeight;

    switch (parentAttachmentSide) {
      case 'top':
        return new Vec2(0, h); // Attach at bottom
      case 'bottom':
        return new Vec2(0, -h); // Attach at top
      case 'left':
        return new Vec2(w, 0); // Attach at right
      case 'right':
        return new Vec2(-w, 0); // Attach at left
    }
  }

  // Recursively collect all bodies in this subtree
  getAllBodies(): Body[] {
    const bodies: Body[] = [this.body];
    for (const child of this.children) {
      bodies.push(...child.getAllBodies());
    }
    return bodies;
  }

  // Recursively collect all graphics in this subtree
  getAllGraphics(): Graphics[] {
    const graphics: Graphics[] = [this.graphics];
    for (const child of this.children) {
      graphics.push(...child.getAllGraphics());
    }
    return graphics;
  }

  // Recursively collect all joints in this subtree
  getAllJoints(): RevoluteJoint[] {
    const joints: RevoluteJoint[] = [];
    if (this.joint !== null) {
      joints.push(this.joint);
    }
    for (const child of this.children) {
      joints.push(...child.getAllJoints());
    }
    return joints;
  }

  // Calculate actuation value (0 to 1) based on time
  calculateActuation(time: number): number {
    const wave = Math.sin(time * this.frequencyMultiplier + this.phaseOffset);
    // Convert from [-1, 1] to [0, 1]
    return (wave + 1) * 0.5;
  }

  // Apply friction damping to this body part
  applyGroundFriction(frictionScaling: number, dt: number): void {
    const mu = this.currentFriction;
    const alpha = 1.0 - Math.exp(-mu * frictionScaling * dt);
    const clampedAlpha = Math.max(0, Math.min(1, alpha));

    // Linear friction
    const v = this.body.getLinearVelocity();
    const vPrimeX = v.x * (1.0 - clampedAlpha);
    const vPrimeY = v.y * (1.0 - clampedAlpha);

    const m = this.body.getMass();
    const impulseX = m * (vPrimeX - v.x);
    const impulseY = m * (vPrimeY - v.y);

    this.body.applyLinearImpulse(new Vec2(impulseX, impulseY), this.body.getWorldCenter(), true);

    // Angular friction
    const w = this.body.getAngularVelocity();
    const I = this.body.getInertia();

    const wPrime = w * (1.0 - clampedAlpha);
    const dw = wPrime - w;
    const angularImpulse = I * dw;

    this.body.applyAngularImpulse(angularImpulse, true);
  }

  // Render this body part
  render(): void {
    const pos = this.body.getPosition();
    const angle = this.body.getAngle();

    this.graphics.clear();
    this.graphics.position.set(pos.x, pos.y);
    this.graphics.rotation = angle;

    // Color based on friction (blue = low, red = high)
    const color = this.interpolateColor(0x2244aa, 0xff3333, this.currentFriction);

    this.graphics
      .rect(-this.actualWidth, -this.actualHeight, this.actualWidth * 2, this.actualHeight * 2)
      .fill({ color: color, alpha: 0.9 })
      .stroke({ width: 0.05, color: 0xffffff });
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

  // Recursively destroy this body part and all children
  destroy(world: World): void {
    // Destroy children first
    for (const child of this.children) {
      child.destroy(world);
    }

    // Destroy joint
    if (this.joint !== null) {
      world.destroyJoint(this.joint);
    }

    // Destroy body
    world.destroyBody(this.body);
  }
}
