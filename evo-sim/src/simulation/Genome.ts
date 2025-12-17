/**
 * Complete genome combining body structure and brain (GRU) genes
 */

import { Gene, BodyPartGene } from './Gene';
import { getGRUGeneSize } from './gru';
import type { GRUConfig } from './gru';

// Reduced max segments to keep brain size manageable
const MAX_BODY_SEGMENTS = 8;

export class Genome {
  // Body structure genes
  bodyGene: Gene;

  // Brain genes (flat Float32Array containing all GRU parameters)
  brainGene: Float32Array;

  // Brain configuration (fixed for all creatures)
  brainConfig: GRUConfig;

  constructor(bodyGene: Gene, brainGene: Float32Array, brainConfig: GRUConfig) {
    this.bodyGene = bodyGene;
    this.brainGene = brainGene;
    this.brainConfig = brainConfig;
  }

  /**
   * Calculate brain I/O sizes based on body structure
   */
  static calculateBrainConfig(bodyGene: Gene): GRUConfig {
    const activeSegments = bodyGene.countSegments();
    const numJoints = Math.max(0, activeSegments - 1); // Root has no joint

    // Inputs: clock (1) + joint angles (numJoints) + body velocities (activeSegments * 2)
    const inputSize = 1 + numJoints + activeSegments * 2;

    // Outputs: joint torques (numJoints) + friction controls (activeSegments)
    const outputSize = numJoints + activeSegments;

    // Hidden size: scale with complexity but keep reasonable
    const hiddenSize = Math.min(16, 4 + activeSegments * 2);

    return {
      inputSize,
      hiddenSize,
      outputSize,
    };
  }

  /**
   * Create a random genome
   */
  static createRandom(): Genome {
    // Create random body with reduced max segments
    const originalMaxSegments = Gene.MAX_SEGMENT_COUNT;
    Gene.MAX_SEGMENT_COUNT = MAX_BODY_SEGMENTS;
    const bodyGene = Gene.createRandom();
    Gene.MAX_SEGMENT_COUNT = originalMaxSegments; // Restore

    // Calculate brain config based on body
    const brainConfig = Genome.calculateBrainConfig(bodyGene);

    // Create and randomize brain gene
    const brainGeneSize = getGRUGeneSize(brainConfig);
    const brainGene = new Float32Array(brainGeneSize);

    // Initialize with larger random values for more expressive initial behavior
    for (let i = 0; i < brainGene.length; i++) {
      brainGene[i] = (Math.random() * 2 - 1) * 0.5;
    }

    return new Genome(bodyGene, brainGene, brainConfig);
  }

  /**
   * Create a default simple genome for testing
   */
  static createDefault(): Genome {
    const bodyGene = Gene.createDefault();
    const brainConfig = Genome.calculateBrainConfig(bodyGene);

    const brainGeneSize = getGRUGeneSize(brainConfig);
    const brainGene = new Float32Array(brainGeneSize);

    // Initialize with larger random values for more expressive initial behavior
    for (let i = 0; i < brainGene.length; i++) {
      brainGene[i] = (Math.random() * 2 - 1) * 0.5;
    }

    return new Genome(bodyGene, brainGene, brainConfig);
  }

  /**
   * Create a copy of this genome
   */
  clone(): Genome {
    // Deep clone body gene
    const bodyGeneClone = new Gene();
    for (const partGene of this.bodyGene.BodyPartGenes) {
      bodyGeneClone.BodyPartGenes.push(
        new BodyPartGene(
          partGene.normalizedWidth,
          partGene.normalizedHeight,
          partGene.parentIndex,
          partGene.active,
          partGene.attachmentSide,
          partGene.attachmentPosition,
          partGene.angleRange
        )
      );
    }

    // Clone brain gene
    const brainGeneClone = new Float32Array(this.brainGene);

    // Clone config
    const brainConfigClone = { ...this.brainConfig };

    return new Genome(bodyGeneClone, brainGeneClone, brainConfigClone);
  }

  /**
   * Mutate this genome in place
   *
   * @param mutationRate - Probability of mutating each gene (0.1 = 10% chance per gene)
   * @param mutationStrength - How much to change mutated genes (0.2 = ±20% of range)
   */
  mutate(mutationRate: number = 0.15, mutationStrength: number = 0.2): void {
    // Mutate body genes
    this.mutateBody(mutationRate, mutationStrength);

    // Mutate brain genes
    this.mutateBrain(mutationRate, mutationStrength);
  }

  /**
   * Mutate body structure
   */
  private mutateBody(mutationRate: number, mutationStrength: number): void {
    for (const partGene of this.bodyGene.BodyPartGenes) {
      // Mutate dimensions
      if (Math.random() < mutationRate) {
        partGene.normalizedWidth += (Math.random() * 2 - 1) * mutationStrength;
        partGene.normalizedWidth = Math.max(0.05, Math.min(1.0, partGene.normalizedWidth));
      }

      if (Math.random() < mutationRate) {
        partGene.normalizedHeight += (Math.random() * 2 - 1) * mutationStrength;
        partGene.normalizedHeight = Math.max(0.05, Math.min(1.0, partGene.normalizedHeight));
      }

      // Mutate attachment position
      if (partGene.parentIndex !== null && Math.random() < mutationRate) {
        partGene.attachmentPosition += (Math.random() * 2 - 1) * mutationStrength;
        partGene.attachmentPosition = Math.max(0, Math.min(1, partGene.attachmentPosition));
      }

      // Mutate angle range
      if (partGene.parentIndex !== null && Math.random() < mutationRate) {
        partGene.angleRange += (Math.random() * 2 - 1) * mutationStrength;
        partGene.angleRange = Math.max(0, Math.min(1, partGene.angleRange));
      }
    }

    // Structural mutations (rare)
    const structuralMutationRate = mutationRate * 0.1; // 10x less frequent

    // Add a new body part (if under limit)
    if (Math.random() < structuralMutationRate && this.bodyGene.countSegments() < MAX_BODY_SEGMENTS) {
      this.addRandomBodyPart();
    }

    // Remove a body part (rare, keep at least root)
    if (Math.random() < structuralMutationRate * 0.5 && this.bodyGene.countSegments() > 1) {
      this.removeRandomBodyPart();
    }
  }

  /**
   * Add a random body part to a random parent
   */
  private addRandomBodyPart(): void {
    const activeParts = this.bodyGene.BodyPartGenes
      .map((gene, index) => ({ gene, index }))
      .filter(p => p.gene.active);

    if (activeParts.length === 0) return;

    const parent = activeParts[Math.floor(Math.random() * activeParts.length)];
    const isRoot = parent.index === 0;

    const sides = isRoot
      ? ['top', 'bottom', 'left', 'right'] as const
      : ['top', 'bottom', 'right'] as const;

    const side = sides[Math.floor(Math.random() * sides.length)];
    const position = 0.3 + Math.random() * 0.4;
    const angleRange = 0.5 + Math.random() * 0.5;
    const width = 0.2 + Math.random() * 0.4;
    const height = 0.2 + Math.random() * 0.4;

    this.bodyGene.addBodyPartGene(width, height, parent.index, side, position, angleRange);

    // Rebuild brain config and gene for new body structure
    this.rebuildBrainForNewBody();
  }

  /**
   * Remove a random non-root body part
   */
  private removeRandomBodyPart(): void {
    const nonRootActive = this.bodyGene.BodyPartGenes
      .map((gene, index) => ({ gene, index }))
      .filter(p => p.index !== 0 && p.gene.active);

    if (nonRootActive.length === 0) return;

    const toRemove = nonRootActive[Math.floor(Math.random() * nonRootActive.length)];
    toRemove.gene.active = false;

    // Also deactivate all descendants
    this.deactivateDescendants(toRemove.index);

    // Rebuild brain config and gene for new body structure
    this.rebuildBrainForNewBody();
  }

  /**
   * Recursively deactivate all descendants of a body part
   */
  private deactivateDescendants(parentIndex: number): void {
    for (let i = 0; i < this.bodyGene.BodyPartGenes.length; i++) {
      const gene = this.bodyGene.BodyPartGenes[i];
      if (gene.active && gene.parentIndex === parentIndex) {
        gene.active = false;
        this.deactivateDescendants(i);
      }
    }
  }

  /**
   * Rebuild brain when body structure changes
   * Tries to preserve as many existing weights as possible
   */
  private rebuildBrainForNewBody(): void {
    const newBrainConfig = Genome.calculateBrainConfig(this.bodyGene);
    const newBrainGeneSize = getGRUGeneSize(newBrainConfig);
    const newBrainGene = new Float32Array(newBrainGeneSize);

    // Copy over as many weights as we can from old brain
    const copySize = Math.min(this.brainGene.length, newBrainGene.length);
    for (let i = 0; i < copySize; i++) {
      newBrainGene[i] = this.brainGene[i];
    }

    // Initialize any new weights with larger random values
    for (let i = copySize; i < newBrainGene.length; i++) {
      newBrainGene[i] = (Math.random() * 2 - 1) * 0.5;
    }

    this.brainGene = newBrainGene;
    this.brainConfig = newBrainConfig;
  }

  /**
   * Mutate brain weights
   */
  private mutateBrain(mutationRate: number, mutationStrength: number): void {
    for (let i = 0; i < this.brainGene.length; i++) {
      if (Math.random() < mutationRate) {
        this.brainGene[i] += (Math.random() * 2 - 1) * mutationStrength;

        // Clamp to reasonable range to prevent explosion
        this.brainGene[i] = Math.max(-5, Math.min(5, this.brainGene[i]));
      }
    }
  }

  /**
   * Get info about this genome
   */
  getInfo(): string {
    const segments = this.bodyGene.countSegments();
    const maxDepth = this.bodyGene.getMaxDepth();
    const brainParams = this.brainGene.length;

    return `Body: ${segments} segments (depth ${maxDepth}) | Brain: ${this.brainConfig.inputSize}→${this.brainConfig.hiddenSize}→${this.brainConfig.outputSize} (${brainParams} params)`;
  }
}
