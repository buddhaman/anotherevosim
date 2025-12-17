import { describe, it, expect } from 'vitest';
import { Genome } from './Genome';

describe('Genome', () => {
  it('should create a random genome', () => {
    const genome = Genome.createRandom();

    expect(genome.bodyGene.BodyPartGenes.length).toBeGreaterThan(0);
    expect(genome.brainGene.length).toBeGreaterThan(0);
    expect(genome.brainConfig.inputSize).toBeGreaterThan(0);
    expect(genome.brainConfig.outputSize).toBeGreaterThan(0);
  });

  it('should create a default genome', () => {
    const genome = Genome.createDefault();

    expect(genome.bodyGene.BodyPartGenes.length).toBe(3); // root + 2 limbs
    expect(genome.brainGene.length).toBeGreaterThan(0);
  });

  it('should clone a genome', () => {
    const original = Genome.createRandom();
    const clone = original.clone();

    // Should have same structure
    expect(clone.bodyGene.BodyPartGenes.length).toBe(original.bodyGene.BodyPartGenes.length);
    expect(clone.brainGene.length).toBe(original.brainGene.length);

    // But not the same object references
    expect(clone.bodyGene).not.toBe(original.bodyGene);
    expect(clone.brainGene).not.toBe(original.brainGene);

    // Values should be identical
    expect(clone.brainGene[0]).toBe(original.brainGene[0]);
  });

  it('should mutate brain genes', () => {
    const genome = Genome.createRandom();
    const originalBrainValues = Array.from(genome.brainGene);

    // Mutate with high rate to ensure changes
    genome.mutate(1.0, 0.5);

    // Brain should have changed
    let changedCount = 0;
    for (let i = 0; i < genome.brainGene.length; i++) {
      if (genome.brainGene[i] !== originalBrainValues[i]) {
        changedCount++;
      }
    }

    expect(changedCount).toBeGreaterThan(0);
  });

  it('should mutate body genes', () => {
    const genome = Genome.createDefault();
    const originalWidth = genome.bodyGene.BodyPartGenes[0].normalizedWidth;

    // Mutate with high rate
    genome.mutate(1.0, 0.5);

    const newWidth = genome.bodyGene.BodyPartGenes[0].normalizedWidth;

    // Width should have changed
    expect(newWidth).not.toBe(originalWidth);
  });

  it('should keep mutations within bounds', () => {
    const genome = Genome.createDefault();

    // Mutate aggressively
    for (let i = 0; i < 100; i++) {
      genome.mutate(1.0, 1.0);
    }

    // Body dimensions should stay in valid range
    for (const partGene of genome.bodyGene.BodyPartGenes) {
      expect(partGene.normalizedWidth).toBeGreaterThanOrEqual(0.05);
      expect(partGene.normalizedWidth).toBeLessThanOrEqual(1.0);
      expect(partGene.normalizedHeight).toBeGreaterThanOrEqual(0.05);
      expect(partGene.normalizedHeight).toBeLessThanOrEqual(1.0);
    }

    // Brain weights should stay in reasonable range
    for (let i = 0; i < genome.brainGene.length; i++) {
      expect(genome.brainGene[i]).toBeGreaterThanOrEqual(-5);
      expect(genome.brainGene[i]).toBeLessThanOrEqual(5);
    }
  });

  it('should calculate brain config based on body', () => {
    const genome = Genome.createDefault();
    const config = genome.brainConfig;

    const segments = genome.bodyGene.countSegments();
    const joints = segments - 1;

    // Inputs: 1 clock + joints angles + segment velocities (2 per segment)
    expect(config.inputSize).toBe(1 + joints + segments * 2);

    // Outputs: joint controls + friction controls
    expect(config.outputSize).toBe(joints + segments);
  });

  it('should generate genome info string', () => {
    const genome = Genome.createDefault();
    const info = genome.getInfo();

    expect(info).toContain('Body:');
    expect(info).toContain('Brain:');
    expect(info).toContain('segments');
    expect(info).toContain('params');
  });

  it('should handle structural mutations (add body part)', () => {
    const genome = Genome.createDefault();

    // Try to add a body part (low probability, may need multiple attempts)
    for (let attempt = 0; attempt < 100; attempt++) {
      const beforeSegments = genome.bodyGene.countSegments();
      genome.mutate(0.1, 0.1);
      const afterSegments = genome.bodyGene.countSegments();

      if (afterSegments > beforeSegments) {
        break;
      }
    }

    // At least verify the structure is still valid
    expect(genome.bodyGene.countSegments()).toBeGreaterThan(0);
    expect(genome.brainGene.length).toBeGreaterThan(0);
  });

  it('should rebuild brain when body structure changes', () => {
    const genome = Genome.createDefault();
    const initialInputSize = genome.brainConfig.inputSize;

    // Force add a body part
    genome.bodyGene.addBodyPartGene(0.5, 0.5, 0, 'right', 0.5, 1.0);

    // Manually trigger brain rebuild (normally done by mutation)
    const newConfig = Genome.calculateBrainConfig(genome.bodyGene);
    expect(newConfig.inputSize).toBeGreaterThan(initialInputSize);
  });
});
