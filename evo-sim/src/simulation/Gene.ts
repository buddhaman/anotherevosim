// Genotype: The genetic blueprint for a creature's body

export type AttachmentSide = 'top' | 'bottom' | 'left' | 'right';

export class BodyPartGene {
  // Body segment properties
  normalizedWidth: number;  // [0.25, 1.0]
  normalizedHeight: number; // [0.25, 1.0]

  // Attachment properties (only used if this is NOT the root)
  active: boolean;
  parentIndex: number | null;  // null for root, index of parent in flat list
  attachmentSide: AttachmentSide | null;  // null for root
  attachmentPosition: number; // [0, 1] fraction along the side
  angleRange: number; // [0, 1] normalized angle range

  constructor(
    normalizedWidth: number,
    normalizedHeight: number,
    parentIndex: number | null = null,
    active: boolean = true,
    attachmentSide: AttachmentSide | null = null,
    attachmentPosition: number = 0.5,
    angleRange: number = 1.0
  ) {
    this.normalizedWidth = Math.max(0.05, Math.min(1.0, normalizedWidth));
    this.normalizedHeight = Math.max(0.05, Math.min(1.0, normalizedHeight));
    this.parentIndex = parentIndex;
    this.active = active;
    this.attachmentSide = attachmentSide;
    this.attachmentPosition = Math.max(0, Math.min(1, attachmentPosition));
    this.angleRange = Math.max(0, Math.min(1, angleRange));
  }
}

export class Gene {
  BodyPartGenes: BodyPartGene[] = [];

  // Global hyperparameters
  static SCALE_FACTOR: number = 0.9;  // Slower shrinking = more uniform sizes
  static MAX_DEPTH: number = 4;
  static MAX_SEGMENT_COUNT: number = 20;
  static JOINT_ANGLE_DEVIATION: number = 10 * (Math.PI / 180);  // 10 degrees in radians

  constructor(rootSegment?: BodyPartGene) {
    if (rootSegment) {
      this.BodyPartGenes.push(rootSegment);
    }
  }

  // Helper: Count total active segments
  countSegments(): number {
    return this.BodyPartGenes.filter(g => g.active).length;
  }

  // Helper: Get maximum depth
  getMaxDepth(): number {
    if (this.BodyPartGenes.length === 0) return 0;
    
    let maxDepth = 0;
    for (let i = 0; i < this.BodyPartGenes.length; i++) {
      if (!this.BodyPartGenes[i].active) continue;
      
      let depth = 0;
      let currentIndex: number | null = i;
      while (currentIndex !== null) {
        depth++;
        currentIndex = this.BodyPartGenes[currentIndex].parentIndex;
      }
      maxDepth = Math.max(maxDepth, depth);
    }
    return maxDepth;
  }

  // Create a simple default gene (similar to old hard-coded creature)
  static createDefault(): Gene {
    const gene = new Gene();
    
    // Root body (index 0)
    const mainBody = new BodyPartGene(1.0, 0.5, null);
    gene.BodyPartGenes.push(mainBody);
    
    // Left limb (index 1)
    const leftLimb = new BodyPartGene(1.0, 0.4, 0, true, 'left', 0.5, 1.0);
    gene.BodyPartGenes.push(leftLimb);
    
    // Right limb (index 2)
    const rightLimb = new BodyPartGene(1.0, 0.4, 0, true, 'right', 0.5, 1.0);
    gene.BodyPartGenes.push(rightLimb);

    return gene;
  }

  // Add a body part gene to the flat list
  public addBodyPartGene(
    normalizedWidth: number,
    normalizedHeight: number,
    parentIndex: number | null,
    attachmentSide: AttachmentSide | null = null,
    attachmentPosition: number = 0.5,
    angleRange: number = 1.0
  ): number {
    const newIndex = this.BodyPartGenes.length;
    const bodyPartGene = new BodyPartGene(
      normalizedWidth,
      normalizedHeight,
      parentIndex,
      true,
      attachmentSide,
      attachmentPosition,
      angleRange
    );
    this.BodyPartGenes.push(bodyPartGene);
    return newIndex;
  }

  // Create a random gene
  static createRandom(): Gene {
    const gene = new Gene();
    
    // Create root segment (index 0)
    const rootWidth = 0.15 + Math.random() * 0.5;
    const rootHeight = 0.15 + Math.random() * 0.5;
    const rootSegment = new BodyPartGene(rootWidth, rootHeight, null);
    gene.BodyPartGenes.push(rootSegment);
    
    // Build tree by adding children to existing segments
    const maxDepth = Gene.MAX_DEPTH;
    
    // Process segments level by level
    let currentLevelIndices = [0]; // Start with root
    
    for (let depth = 0; depth < maxDepth && currentLevelIndices.length > 0; depth++) {
      const nextLevelIndices: number[] = [];
      
      for (const parentIndex of currentLevelIndices) {
        const isRoot = parentIndex === 0;
        
        // For non-root segments, 'left' is forbidden (that's the back where it connects to parent)
        const sides: AttachmentSide[] = isRoot
          ? ['top', 'bottom', 'left', 'right']
          : ['top', 'bottom', 'right'];  // Exclude 'left' - that's the back

        // Determine how many children to try to create based on depth
        const maxChildAttempts = Math.max(1, 4 - depth);
        const minChildAttempts = Math.max(0, 2 - depth);
        const childAttempts = minChildAttempts + Math.floor(Math.random() * (maxChildAttempts - minChildAttempts + 1));

        // Probability of each child existing decreases with depth
        const childProbability = Math.max(0.3, 1.0 - depth * 0.2);

        // Track which sides we've used to avoid duplicates
        const usedSides = new Set<AttachmentSide>();

        for (let i = 0; i < childAttempts; i++) {
          // Check if we've hit max segment count
          if (gene.countSegments() >= Gene.MAX_SEGMENT_COUNT) {
            break;
          }

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

          // Random size
          const width = 0.15 + Math.random() * 0.5;
          const height = 0.15 + Math.random() * 0.5;

          // Add child to flat list
          const childIndex = gene.addBodyPartGene(
            width,
            height,
            parentIndex,
            side,
            position,
            angleRange
          );
          
          nextLevelIndices.push(childIndex);
        }
      }
      
      currentLevelIndices = nextLevelIndices;
    }

    return gene;
  }
}
