// Phenotype: The physical expression of a body part gene

import { World, Body, Vec2, Box, RevoluteJoint } from 'planck';
import { Creature } from './Creature';
import { Graphics } from 'pixi.js';
import { BodyPartGene, Gene } from './Gene';
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

  creature: Creature;

  currentFriction: number;
  isSelected: boolean = false;

  // Actuation parameters (unique per body part)
  phaseOffset: number;  // Random phase offset for sine wave
  frequencyMultiplier: number; // Random frequency multiplier

  // Store position and angle explicitly
  initialPosition: Vec2;
  initialAngle: number;

  constructor(
    gene: BodyPartGene,
    creature: Creature,
    depth: number,
    parent: BodyPart | null,
    initialPosition?: Vec2,
    collisionGroup?: number
  ) {
    this.creature = creature;
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

    // Calculate position and orientation
    if (parent === null) {
      // Root: use provided position/angle
      this.initialPosition = initialPosition || new Vec2(0, 0);
      this.initialAngle = 0;
    } else {
      // Child: calculate from parent's edge normal
      const attachmentPoint = parent.getEdgeAttachmentPoint(gene.attachmentSide!, gene.attachmentPosition);
      const normal = parent.getEdgeNormal(gene.attachmentSide!);

      // Child points along the normal
      this.initialAngle = Math.atan2(normal.y, normal.x);

      // Child position: attachment point + distance along normal to align anchors
      const childAnchorOffset = this.getAnchorOffsetInDirection(normal);
      this.initialPosition = new Vec2(
        attachmentPoint.x + childAnchorOffset.x,
        attachmentPoint.y + childAnchorOffset.y
      );
    }

    const world = creature.world.world;
    // Create physics body
    this.body = world.createBody({
      type: 'dynamic',
      position: this.initialPosition,
      angle: this.initialAngle,
      linearDamping: 0.0,
      angularDamping: parent === null ? 0.5 : 1.0 // Main body spins less
    });

    this.body.createFixture({
      shape: new Box(this.actualWidth / 2, this.actualHeight / 2),
      density: parent === null ? 1.0 : 0.8,
      friction: 0.0,
      filterGroupIndex: collisionGroup || 0
    });

    // Create joint if this is not root
    if (parent !== null && gene.attachmentSide !== null) {
      const localAnchorA = this.getLocalAnchor(parent, gene.attachmentSide, gene.attachmentPosition);
      const localAnchorB = this.getOwnAnchor(gene.attachmentSide);

      // Calculate actual angle range from normalized value and global factor
      const maxDeviation = gene.angleRange * Gene.JOINT_ANGLE_DEVIATION;

      this.joint = world.createJoint(new RevoluteJoint({
        bodyA: parent.body,
        bodyB: this.body,
        localAnchorA: localAnchorA,
        localAnchorB: localAnchorB,
        enableLimit: true,
        lowerAngle: -maxDeviation,  // Symmetric around 0 (pointing outward)
        upperAngle: maxDeviation,
        enableMotor: true,
        maxMotorTorque: 60.0
      })) as RevoluteJoint;
    }

    // Create graphics
    this.graphics = new Graphics();
  }

  // Get world position of attachment point on this body's edge
  getEdgeAttachmentPoint(side: AttachmentSide, t: number): Vec2 {
    // t is [0, 1] fraction along the edge
    // Get local position first
    let localX = 0;
    let localY = 0;

    switch (side) {
      case 'right':
        localX = this.actualWidth;
        localY = (t - 0.5) * 2 * this.actualHeight;
        break;
      case 'top':
        localX = (t - 0.5) * 2 * this.actualWidth;
        localY = -this.actualHeight;
        break;
      case 'left':
        localX = -this.actualWidth;
        localY = (t - 0.5) * 2 * this.actualHeight;
        break;
      case 'bottom':
        localX = (t - 0.5) * 2 * this.actualWidth;
        localY = this.actualHeight;
        break;
    }

    // Transform to world space
    const cos = Math.cos(this.initialAngle);
    const sin = Math.sin(this.initialAngle);

    return new Vec2(
      this.initialPosition.x + localX * cos - localY * sin,
      this.initialPosition.y + localX * sin + localY * cos
    );
  }

  // Get world-space normal vector for an edge
  getEdgeNormal(side: AttachmentSide): Vec2 {
    // Local normal (pointing outward)
    let localNormalX = 0;
    let localNormalY = 0;

    switch (side) {
      case 'right':
        localNormalX = 1;
        localNormalY = 0;
        break;
      case 'top':
        localNormalX = 0;
        localNormalY = -1;
        break;
      case 'left':
        localNormalX = -1;
        localNormalY = 0;
        break;
      case 'bottom':
        localNormalX = 0;
        localNormalY = 1;
        break;
    }

    // Rotate by this body's angle
    const cos = Math.cos(this.initialAngle);
    const sin = Math.sin(this.initialAngle);

    return new Vec2(
      localNormalX * cos - localNormalY * sin,
      localNormalX * sin + localNormalY * cos
    );
  }

  // Get how far along a direction vector to place child's center
  // so that child's anchor aligns with parent's anchor
  getAnchorOffsetInDirection(direction: Vec2): Vec2 {
    // Child is oriented along this direction, so its "back" anchor needs offsetting
    // The "back" is the side that connects to parent
    // Since child points along direction, back anchor is at (-width, 0) in child's local space
    const backOffsetLength = this.actualWidth;

    return new Vec2(
      direction.x * backOffsetLength,
      direction.y * backOffsetLength
    );
  }

  // Get local anchor point on parent body for joint
  getLocalAnchor(parent: BodyPart, side: AttachmentSide, t: number): Vec2 {
    const pw = parent.actualWidth;
    const ph = parent.actualHeight;

    switch (side) {
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

  // Get local anchor point on own body
  // Since child is always oriented to point along the normal (away from parent),
  // the attachment point is always at the "back" of the child: (-width, 0)
  getOwnAnchor(_parentAttachmentSide: AttachmentSide): Vec2 {
    return new Vec2(-this.actualWidth, 0);
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

  // Check if a world point is inside this body part or any child
  checkContainsPoint(x: number, y: number): BodyPart | null {
    // First check children (select more specific parts first)
    for (const child of this.children) {
      const found = child.checkContainsPoint(x, y);
      if (found) return found;
    }

    // Transform world point to local space
    const pos = this.body.getPosition();
    const angle = this.body.getAngle();

    const dx = x - pos.x;
    const dy = y - pos.y;

    const cos = Math.cos(-angle);
    const sin = Math.sin(-angle);

    const localX = dx * cos - dy * sin;
    const localY = dx * sin + dy * cos;

    // Check if within rectangle bounds
    if (localX >= -this.actualWidth && localX <= this.actualWidth &&
        localY >= -this.actualHeight && localY <= this.actualHeight) {
      return this;
    }

    return null;
  }

  // Get inspection info for this body part
  getInfo(): any {
    const pos = this.body.getPosition();
    const angle = this.body.getAngle();

    const info: any = {
      depth: this.depth,
      actualWidth: this.actualWidth,
      actualHeight: this.actualHeight,
      position: { x: pos.x, y: pos.y },
      angle: angle,
      currentFriction: this.currentFriction,
      actuation: this.calculateActuation(performance.now() * 0.001),
      geneWidth: this.gene.normalizedWidth,
      geneHeight: this.gene.normalizedHeight,
      hasJoint: this.joint !== null
    };

    if (this.gene.attachmentSide) {
      info.attachmentSide = this.gene.attachmentSide;
      info.attachmentPosition = this.gene.attachmentPosition;
    }

    if (this.joint) {
      const minAngle = this.joint.getLowerLimit();
      const maxAngle = this.joint.getUpperLimit();
      info.jointAngleRange = (maxAngle - minAngle) * (180 / Math.PI);
    }

    return info;
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
      .fill({ color: color, alpha: 0.9 });

    // Highlight if selected
    if (this.isSelected) {
      this.graphics.stroke({ width: 0.15, color: 0xffff00 });
    } else {
      this.graphics.stroke({ width: 0.05, color: 0xffffff });
    }
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
