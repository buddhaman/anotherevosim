// Genotype: The genetic blueprint for a creature's body

export type AttachmentSide = 'top' | 'bottom' | 'left' | 'right';

export class BodyPartGene {
  // Body segment properties
  normalizedWidth: number;  // [0.25, 1.0]
  normalizedHeight: number; // [0.25, 1.0]

  // Attachment properties (only used if this is NOT the root)
  active: boolean;
  attachmentSide: AttachmentSide | null;  // null for root
  attachmentPosition: number; // [0, 1] fraction along the side
  angleRange: number; // [0, 1] normalized angle range

  // Children
  children: BodyPartGene[];

  constructor(
    normalizedWidth: number,
    normalizedHeight: number,
    children: BodyPartGene[] = [],
    active: boolean = true,
    attachmentSide: AttachmentSide | null = null,
    attachmentPosition: number = 0.5,
    angleRange: number = 1.0
  ) {
    this.normalizedWidth = Math.max(0.05, Math.min(1.0, normalizedWidth));
    this.normalizedHeight = Math.max(0.05, Math.min(1.0, normalizedHeight));
    this.children = children;
    this.active = active;
    this.attachmentSide = attachmentSide;
    this.attachmentPosition = Math.max(0, Math.min(1, attachmentPosition));
    this.angleRange = Math.max(0, Math.min(1, angleRange));
  }
}

export class Gene {
  rootSegment: BodyPartGene;

  // Global hyperparameters
  static SCALE_FACTOR: number = 0.9;  // Slower shrinking = more uniform sizes
  static MAX_DEPTH: number = 4;
  static MAX_SEGMENT_COUNT: number = 20;
  static JOINT_ANGLE_DEVIATION: number = 10 * (Math.PI / 180);  // 10 degrees in radians

  constructor(rootSegment: BodyPartGene) {
    this.rootSegment = rootSegment;
  }

  // Helper: Count total segments in the tree
  countSegments(): number {
    return this.countSegmentsRecursive(this.rootSegment);
  }

  countSegmentsRecursive(segment: BodyPartGene): number {
    let count = 1;
    for (const child of segment.children) {
      if (child.active) {
        count += this.countSegmentsRecursive(child);
      }
    }
    return count;
  }

  // Helper: Get maximum depth
  getMaxDepth(): number {
    return this.getMaxDepthRecursive(this.rootSegment, 0);
  }

  getMaxDepthRecursive(segment: BodyPartGene, currentDepth: number): number {
    let maxDepth = currentDepth;
    for (const child of segment.children) {
      if (child.active) {
        const childDepth = this.getMaxDepthRecursive(child, currentDepth + 1);
        maxDepth = Math.max(maxDepth, childDepth);
      }
    }
    return maxDepth;
  }

  // Create a simple default gene (similar to old hard-coded creature)
  static createDefault(): Gene {
    // Create main body with two limbs
    const mainBody = new BodyPartGene(
      1.0, 0.5,
      [
        // Left limb
        new BodyPartGene(1.0, 0.4, [], true, 'left', 0.5, 1.0),
        // Right limb
        new BodyPartGene(1.0, 0.4, [], true, 'right', 0.5, 1.0)
      ]
    );

    return new Gene(mainBody);
  }

  // Create a random gene
  static createRandom(): Gene {
    const rootSegment = Gene.createRandomSegment(0, true);
    return new Gene(rootSegment);
  }

  // Recursively create a random body part with random children
  static createRandomSegment(depth: number, isRoot: boolean): BodyPartGene {
    // Random size
    const width = 0.15 + Math.random() * 0.5;  // [0.5, 1.0]
    const height = 0.15 + Math.random() * 0.5; // [0.5, 1.0]

    const children: BodyPartGene[] = [];

    // Don't add children if at max depth
    if (depth >= Gene.MAX_DEPTH) {
      return new BodyPartGene(width, height, children);
    }

    // For non-root segments, 'left' is forbidden (that's the back where it connects to parent)
    const sides: AttachmentSide[] = isRoot
      ? ['top', 'bottom', 'left', 'right']
      : ['top', 'bottom', 'right'];  // Exclude 'left' - that's the back

    // Determine how many children to try to create based on depth
    // Depth 0 (root): 2-4 children attempts
    // Depth 1: 1-3 children attempts
    // Depth 2: 0-2 children attempts
    // Depth 3+: 0-1 children attempts
    const maxChildAttempts = Math.max(1, 4 - depth);
    const minChildAttempts = Math.max(0, 2 - depth);
    const childAttempts = minChildAttempts + Math.floor(Math.random() * (maxChildAttempts - minChildAttempts + 1));

    // Probability of each child existing decreases with depth
    const childProbability = Math.max(0.3, 1.0 - depth * 0.2);

    // Track which sides we've used to avoid duplicates
    const usedSides = new Set<AttachmentSide>();

    for (let i = 0; i < childAttempts; i++) {
      // Check if this child should exist
      if (Math.random() > childProbability) {
        continue;
      }

      // Find an unused side
      const availableSides = sides.filter(s => !usedSides.has(s));
      if (availableSides.length === 0) {
        break; // No more sides available
      }

      const side = availableSides[Math.floor(Math.random() * availableSides.length)];
      usedSides.add(side);

      // Random attachment position along the side
      const position = 0.3 + Math.random() * 0.4; // [0.3, 0.7]

      // Random normalized angle range [0.5, 1.0]
      const angleRange = 0.5 + Math.random() * 0.5;

      // Create child segment recursively (it's not a root)
      const childSegment = Gene.createRandomSegment(depth + 1, false);

      // Set the child's attachment properties
      childSegment.attachmentSide = side;
      childSegment.attachmentPosition = position;
      childSegment.angleRange = angleRange;

      children.push(childSegment);
    }

    return new BodyPartGene(width, height, children);
  }
}
