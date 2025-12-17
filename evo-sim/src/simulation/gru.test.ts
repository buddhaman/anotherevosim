import { describe, it, expect, beforeEach } from 'vitest';
import { MinimalGatedUnit, getGRUGeneSize, getGRUStateSize } from './gru';
import type { GRUConfig } from './gru';

describe('GRU gene size calculations', () => {
  it('should calculate correct gene size for small GRU', () => {
    const config: GRUConfig = {
      inputSize: 2,
      hiddenSize: 3,
      outputSize: 2,
    };

    // stateSize = outputSize + hiddenSize = 2 + 3 = 5
    // bf: 5, bh: 5
    // Wf: 2*5 = 10, Wh: 2*5 = 10
    // Uf: 5*5 = 25, Uh: 5*5 = 25
    // Total: 5 + 5 + 10 + 10 + 25 + 25 = 80

    expect(getGRUGeneSize(config)).toBe(80);
  });

  it('should calculate correct state size', () => {
    const config: GRUConfig = {
      inputSize: 2,
      hiddenSize: 3,
      outputSize: 2,
    };

    // stateSize = 5
    // x: 2, f: 5, h: 5, hc: 5
    // Total: 2 + 5 + 5 + 5 = 17

    expect(getGRUStateSize(config)).toBe(17);
  });
});

describe('MinimalGatedUnit', () => {
  let config: GRUConfig;
  let gene: Float32Array;
  let gru: MinimalGatedUnit;

  beforeEach(() => {
    config = {
      inputSize: 2,
      hiddenSize: 3,
      outputSize: 2,
    };

    const geneSize = getGRUGeneSize(config);
    gene = new Float32Array(geneSize);
    MinimalGatedUnit.randomizeGene(gene, 0.1);

    gru = new MinimalGatedUnit(config, gene);
  });

  it('should create GRU with correct configuration', () => {
    expect(gru.config.inputSize).toBe(2);
    expect(gru.config.hiddenSize).toBe(3);
    expect(gru.config.outputSize).toBe(2);
    expect(gru.stateSize).toBe(5);
  });

  it('should throw if gene is too small', () => {
    const tooSmallGene = new Float32Array(10);
    expect(() => new MinimalGatedUnit(config, tooSmallGene)).toThrow();
  });

  it('should initialize with all parameters as views into gene', () => {
    // Modify gene and check that parameters reflect changes
    gene[0] = 42;
    expect(gru.bf.get(0)).toBe(42);
  });

  it('should set and get input correctly', () => {
    gru.setInput([1.5, -0.5]);
    expect(gru.x.get(0)).toBe(1.5);
    expect(gru.x.get(1)).toBe(-0.5);
  });

  it('should throw if input size is wrong', () => {
    expect(() => gru.setInput([1, 2, 3])).toThrow();
  });

  it('should get output of correct size', () => {
    const output = gru.getOutput();
    expect(output.length).toBe(config.outputSize);
  });

  it('should reset hidden state to zero', () => {
    // Set some non-zero values
    gru.h.set(0, 5);
    gru.h.set(1, 10);

    gru.reset();

    for (let i = 0; i < gru.stateSize; i++) {
      expect(gru.h.get(i)).toBe(0);
    }
  });

  it('should perform forward pass without crashing', () => {
    gru.setInput([1.0, -1.0]);
    gru.step();

    const output = gru.getOutput();
    expect(output).toHaveLength(2);
    expect(output[0]).toBeDefined();
    expect(output[1]).toBeDefined();
  });

  it('should update hidden state after step', () => {
    gru.reset();
    const initialState = gru.h.get(0);

    gru.setInput([1.0, 0.0]);
    gru.step();

    const newState = gru.h.get(0);

    // State should have changed (unless by extreme coincidence)
    // We can't predict exact values without known weights, but it should be different
    expect(newState).not.toBe(initialState);
  });

  it('should produce bounded output values due to tanh', () => {
    // Initialize with large random values
    MinimalGatedUnit.randomizeGene(gene, 10.0);
    const gruLarge = new MinimalGatedUnit(config, gene);

    gruLarge.setInput([100.0, -100.0]);
    gruLarge.step();

    const output = gruLarge.getOutput();

    // Output should be bounded by tanh(-1 to 1)
    for (const val of output) {
      expect(val).toBeGreaterThanOrEqual(-1.0);
      expect(val).toBeLessThanOrEqual(1.0);
    }
  });

  it('should maintain state across multiple steps', () => {
    gru.reset();

    gru.setInput([1.0, 0.0]);
    gru.step();
    const state1 = gru.h.get(0);

    gru.setInput([0.0, 1.0]);
    gru.step();
    const state2 = gru.h.get(0);

    // State should depend on history
    expect(state2).not.toBe(state1);
  });

  it('should randomize gene values within bounds', () => {
    const testGene = new Float32Array(100);
    MinimalGatedUnit.randomizeGene(testGene, 0.5);

    let allInRange = true;
    for (let i = 0; i < testGene.length; i++) {
      if (testGene[i] < -0.5 || testGene[i] > 0.5) {
        allInRange = false;
        break;
      }
    }

    expect(allInRange).toBe(true);
  });
});

describe('GRU with known weights (deterministic test)', () => {
  it('should produce expected output with identity-like weights', () => {
    const config: GRUConfig = {
      inputSize: 2,
      hiddenSize: 1,
      outputSize: 1,
    };

    const geneSize = getGRUGeneSize(config);
    const gene = new Float32Array(geneSize);

    // Initialize all to zero
    gene.fill(0);

    const gru = new MinimalGatedUnit(config, gene);

    // With all weights zero and biases zero:
    // - forget gate: sigmoid(0) = 0.5
    // - candidate: tanh(0) = 0
    // - new state: 0.5 * 0 + 0.5 * 0 = 0

    gru.setInput([1.0, 1.0]);
    gru.step();

    const output = gru.getOutput();
    expect(output[0]).toBeCloseTo(0, 5);
  });

  it('should handle zero input gracefully', () => {
    const config: GRUConfig = {
      inputSize: 2,
      hiddenSize: 2,
      outputSize: 1,
    };

    const geneSize = getGRUGeneSize(config);
    const gene = new Float32Array(geneSize);
    MinimalGatedUnit.randomizeGene(gene, 0.1);

    const gru = new MinimalGatedUnit(config, gene);

    gru.setInput([0, 0]);
    gru.step();

    const output = gru.getOutput();
    expect(output).toHaveLength(1);
    expect(isNaN(output[0])).toBe(false);
    expect(isFinite(output[0])).toBe(true);
  });
});

describe('GRU sequence processing', () => {
  it('should process a sequence of inputs', () => {
    const config: GRUConfig = {
      inputSize: 1,
      hiddenSize: 2,
      outputSize: 1,
    };

    const geneSize = getGRUGeneSize(config);
    const gene = new Float32Array(geneSize);
    MinimalGatedUnit.randomizeGene(gene, 0.1);

    const gru = new MinimalGatedUnit(config, gene);
    gru.reset();

    const sequence = [
      [1.0],
      [0.5],
      [0.0],
      [-0.5],
      [-1.0],
    ];

    const outputs: number[][] = [];

    for (const input of sequence) {
      gru.setInput(input);
      gru.step();
      outputs.push(gru.getOutput());
    }

    // Check we got outputs for each step
    expect(outputs).toHaveLength(5);

    // Each output should be valid
    for (const output of outputs) {
      expect(output).toHaveLength(1);
      expect(isFinite(output[0])).toBe(true);
    }
  });
});
