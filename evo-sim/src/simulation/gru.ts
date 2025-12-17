/**
 * Minimal Gated Recurrent Unit (GRU) for creature brains
 * All parameters stored in a single flat gene array
 */

import {
  VecR32,
  MatR32,
  shapeVec,
  shapeMat,
  vecAdd,
  vecMul,
  vecScale,
  vecAddScalar,
  matVecMul,
  sigmoid,
  tanh,
} from './linalg';

export interface GRUConfig {
  inputSize: number;
  hiddenSize: number;
  outputSize: number;
}

/**
 * Calculate the gene size needed for a GRU with given dimensions
 */
export function getGRUGeneSize(config: GRUConfig): number {
  const { inputSize, hiddenSize, outputSize } = config;
  const stateSize = outputSize + hiddenSize;

  // Parameters we need:
  // - bf: forget bias (stateSize)
  // - bh: candidate state bias (stateSize)
  // - Wf: input->forget weights (inputSize × stateSize)
  // - Wh: input->candidate weights (inputSize × stateSize)
  // - Uf: state->forget weights (stateSize × stateSize)
  // - Uh: state->candidate weights (stateSize × stateSize)

  const biasSize = stateSize * 2;
  const inputMatrixSize = inputSize * stateSize * 2;
  const stateMatrixSize = stateSize * stateSize * 2;

  return biasSize + inputMatrixSize + stateMatrixSize;
}

/**
 * Calculate the working memory size needed for GRU state during execution
 */
export function getGRUStateSize(config: GRUConfig): number {
  const { inputSize, outputSize, hiddenSize } = config;
  const stateSize = outputSize + hiddenSize;

  // We need storage for:
  // - x: input (inputSize)
  // - f: forget gate (stateSize)
  // - h: hidden state (stateSize)
  // - hc: candidate state (stateSize)

  return inputSize + stateSize * 3;
}

export class MinimalGatedUnit {
  config: GRUConfig;
  stateSize: number;

  // The gene array (parameters)
  gene: Float32Array;

  // Parameters (views into gene)
  bf: VecR32; // forget bias
  bh: VecR32; // candidate bias
  Wf: MatR32; // input->forget weights
  Wh: MatR32; // input->candidate weights
  Uf: MatR32; // state->forget weights
  Uh: MatR32; // state->candidate weights

  // Working state (separate storage)
  stateStorage: Float32Array;
  x: VecR32; // input
  f: VecR32; // forget gate
  h: VecR32; // hidden state (persists between steps)
  hc: VecR32; // candidate state

  constructor(config: GRUConfig, gene: Float32Array) {
    this.config = config;
    this.stateSize = config.outputSize + config.hiddenSize;
    this.gene = gene;

    // Validate gene size
    const requiredSize = getGRUGeneSize(config);
    if (gene.length < requiredSize) {
      throw new Error(`Gene size ${gene.length} is too small, need ${requiredSize}`);
    }

    // Shape parameters from gene
    let offset = 0;
    this.bf = shapeVec(gene, this.stateSize, offset);
    offset += this.stateSize;

    this.bh = shapeVec(gene, this.stateSize, offset);
    offset += this.stateSize;

    this.Wf = shapeMat(gene, config.inputSize, this.stateSize, offset);
    offset += config.inputSize * this.stateSize;

    this.Wh = shapeMat(gene, config.inputSize, this.stateSize, offset);
    offset += config.inputSize * this.stateSize;

    this.Uf = shapeMat(gene, this.stateSize, this.stateSize, offset);
    offset += this.stateSize * this.stateSize;

    this.Uh = shapeMat(gene, this.stateSize, this.stateSize, offset);
    offset += this.stateSize * this.stateSize;

    // Allocate working state
    const stateSize = getGRUStateSize(config);
    this.stateStorage = new Float32Array(stateSize);

    offset = 0;
    this.x = shapeVec(this.stateStorage, config.inputSize, offset);
    offset += config.inputSize;

    this.f = shapeVec(this.stateStorage, this.stateSize, offset);
    offset += this.stateSize;

    this.h = shapeVec(this.stateStorage, this.stateSize, offset);
    offset += this.stateSize;

    this.hc = shapeVec(this.stateStorage, this.stateSize, offset);
    offset += this.stateSize;

    // Initialize hidden state to zero
    this.h.setAll(0);
  }

  /**
   * Set input values
   */
  setInput(input: number[]): void {
    if (input.length !== this.config.inputSize) {
      throw new Error(`Input size mismatch: expected ${this.config.inputSize}, got ${input.length}`);
    }
    for (let i = 0; i < input.length; i++) {
      this.x.set(i, input[i]);
    }
  }

  /**
   * Get output values (first outputSize elements of hidden state)
   */
  getOutput(): number[] {
    const output: number[] = [];
    for (let i = 0; i < this.config.outputSize; i++) {
      output.push(this.h.get(i));
    }
    return output;
  }

  /**
   * Reset hidden state to zero
   */
  reset(): void {
    this.h.setAll(0);
  }

  /**
   * Forward pass: update hidden state based on current input
   */
  step(): void {
    // Allocate temporary vectors
    const temp0 = new VecR32(this.stateSize, new Float32Array(this.stateSize));
    const temp1 = new VecR32(this.stateSize, new Float32Array(this.stateSize));
    const temp2 = new VecR32(this.stateSize, new Float32Array(this.stateSize));

    // Forget gate: f = sigmoid(Wf*x + Uf*h + bf)
    matVecMul(temp0, this.Wf, this.x);
    matVecMul(temp1, this.Uf, this.h);
    vecAdd(this.f, temp0, temp1);
    vecAdd(this.f, this.f, this.bf);
    this.f.apply(sigmoid);

    // Candidate state: hc = tanh(Wh*x + Uh*(f*h) + bh)
    matVecMul(temp0, this.Wh, this.x);
    vecMul(temp2, this.f, this.h); // f * h (element-wise)
    matVecMul(temp1, this.Uh, temp2);
    vecAdd(this.hc, temp0, temp1);
    vecAdd(this.hc, this.hc, this.bh);
    this.hc.apply(tanh);

    // New state: h = (1-f)*h + f*hc
    //   = h - f*h + f*hc
    //   = h + f*(hc - h)
    vecScale(temp0, this.f, -1.0);
    vecAddScalar(temp0, temp0, 1.0); // temp0 = (1-f)
    vecMul(temp1, temp0, this.h); // temp1 = (1-f)*h
    vecMul(temp2, this.f, this.hc); // temp2 = f*hc
    vecAdd(this.h, temp1, temp2); // h = (1-f)*h + f*hc
  }

  /**
   * Initialize gene with random values
   */
  static randomizeGene(gene: Float32Array, scale: number = 0.1): void {
    for (let i = 0; i < gene.length; i++) {
      gene[i] = (Math.random() * 2 - 1) * scale;
    }
  }
}
