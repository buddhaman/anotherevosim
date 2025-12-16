// Genotype: The genetic blueprint for a creature's body

export type AttachmentSide = 'top' | 'bottom' | 'left' | 'right';

export class JointGene {
  active: boolean;
  attachmentSide: AttachmentSide;
  attachmentPosition: number; // [0, 1] fraction along the side
  minAngle: number; // radians
  maxAngle: number; // radians
  childSegment: BodyPartGene;

  constructor(
    active: boolean,
    attachmentSide: AttachmentSide,
    attachmentPosition: number,
    minAngle: number,
    maxAngle: number,
    childSegment: BodyPartGene
  ) {
    this.active = active;
    this.attachmentSide = attachmentSide;
    this.attachmentPosition = Math.max(0, Math.min(1, attachmentPosition));
    this.minAngle = minAngle;
    this.maxAngle = maxAngle;
    this.childSegment = childSegment;
  }
}

export class BodyPartGene {
  normalizedWidth: number;  // [0.25, 1.0]
  normalizedHeight: number; // [0.25, 1.0]
  children: JointGene[];

  constructor(
    normalizedWidth: number,
    normalizedHeight: number,
    children: JointGene[] = []
  ) {
    this.normalizedWidth = Math.max(0.25, Math.min(1.0, normalizedWidth));
    this.normalizedHeight = Math.max(0.25, Math.min(1.0, normalizedHeight));
    this.children = children;
  }
}

export class Gene {
  rootSegment: BodyPartGene;

  // Global hyperparameters
  static SCALE_FACTOR: number = 0.8;
  static MAX_DEPTH: number = 3;
  static MAX_SEGMENT_COUNT: number = 20;

  constructor(rootSegment: BodyPartGene) {
    this.rootSegment = rootSegment;
  }

  // Helper: Count total segments in the tree
  countSegments(): number {
    return this.countSegmentsRecursive(this.rootSegment);
  }

  countSegmentsRecursive(segment: BodyPartGene): number {
    let count = 1;
    for (const joint of segment.children) {
      count += this.countSegmentsRecursive(joint.childSegment);
    }
    return count;
  }

  // Helper: Get maximum depth
  getMaxDepth(): number {
    return this.getMaxDepthRecursive(this.rootSegment, 0);
  }

  getMaxDepthRecursive(segment: BodyPartGene, currentDepth: number): number {
    let maxDepth = currentDepth;
    for (const joint of segment.children) {
      const childDepth = this.getMaxDepthRecursive(joint.childSegment, currentDepth + 1);
      maxDepth = Math.max(maxDepth, childDepth);
    }
    return maxDepth;
  }

  // Create a simple default gene (similar to old hard-coded creature)
  static createDefault(): Gene {
    // Create left limb
    const leftLimb = new BodyPartGene(1.0, 0.4);

    // Create right limb
    const rightLimb = new BodyPartGene(1.0, 0.4);

    // Create main body with two limbs attached to left and right sides
    const mainBody = new BodyPartGene(1.0, 0.5, [
      new JointGene(
        true,
        'left',
        0.5, // middle of left side
        -Math.PI / 3,
        Math.PI / 3,
        leftLimb
      ),
      new JointGene(
        true,
        'right',
        0.5, // middle of right side
        -Math.PI / 3,
        Math.PI / 3,
        rightLimb
      )
    ]);

    return new Gene(mainBody);
  }

  // Create a random gene
  static createRandom(): Gene {
    const rootSegment = Gene.createRandomSegment(0);
    return new Gene(rootSegment);
  }

  // Recursively create a random body part with random children
  static createRandomSegment(depth: number): BodyPartGene {
    // Random size
    const width = 0.25 + Math.random() * 0.75;  // [0.25, 1.0]
    const height = 0.25 + Math.random() * 0.75; // [0.25, 1.0]

    const children: JointGene[] = [];

    // Don't add children if at max depth
    if (depth >= Gene.MAX_DEPTH) {
      return new BodyPartGene(width, height, children);
    }

    // Randomly decide how many children (0 to 4, one per side)
    const numChildren = Math.floor(Math.random() * 5); // 0-4

    const sides: AttachmentSide[] = ['top', 'bottom', 'left', 'right'];
    const availableSides = [...sides];

    for (let i = 0; i < numChildren && availableSides.length > 0; i++) {
      // Pick a random side
      const sideIndex = Math.floor(Math.random() * availableSides.length);
      const side = availableSides[sideIndex];
      availableSides.splice(sideIndex, 1); // Remove so we don't use it twice

      // Random attachment position along the side
      const position = 0.2 + Math.random() * 0.6; // [0.2, 0.8] - avoid edges

      // Random joint angles
      const angleRange = Math.PI / 6 + Math.random() * (Math.PI / 3); // [30°, 90°]
      const minAngle = -angleRange;
      const maxAngle = angleRange;

      // Create child segment recursively
      const childSegment = Gene.createRandomSegment(depth + 1);

      children.push(new JointGene(
        true,
        side,
        position,
        minAngle,
        maxAngle,
        childSegment
      ));
    }

    return new BodyPartGene(width, height, children);
  }
}
