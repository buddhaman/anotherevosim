/**
 * Simple linear algebra for brain genes
 * All matrices and vectors can be views into a single flat array (the genome)
 */

export class VecR32 {
  n: number;
  data: Float32Array;
  offset: number;

  constructor(n: number, data: Float32Array, offset: number = 0) {
    this.n = n;
    this.data = data;
    this.offset = offset;
  }

  get(i: number): number {
    if (i < 0 || i >= this.n) throw new Error(`Index ${i} out of bounds [0, ${this.n})`);
    return this.data[this.offset + i];
  }

  set(i: number, value: number): void {
    if (i < 0 || i >= this.n) throw new Error(`Index ${i} out of bounds [0, ${this.n})`);
    this.data[this.offset + i] = value;
  }

  setAll(value: number): void {
    for (let i = 0; i < this.n; i++) {
      this.data[this.offset + i] = value;
    }
  }

  copyFrom(other: VecR32): void {
    if (this.n !== other.n) throw new Error('Vector size mismatch');
    for (let i = 0; i < this.n; i++) {
      this.set(i, other.get(i));
    }
  }

  sum(): number {
    let s = 0;
    for (let i = 0; i < this.n; i++) {
      s += this.get(i);
    }
    return s;
  }

  avg(): number {
    return this.sum() / this.n;
  }

  apply(f: (x: number) => number): void {
    for (let i = 0; i < this.n; i++) {
      this.set(i, f(this.get(i)));
    }
  }
}

export class MatR32 {
  w: number; // width (columns)
  h: number; // height (rows)
  data: Float32Array;
  offset: number;

  constructor(w: number, h: number, data: Float32Array, offset: number = 0) {
    this.w = w;
    this.h = h;
    this.data = data;
    this.offset = offset;
  }

  get(x: number, y: number): number {
    if (x < 0 || x >= this.w || y < 0 || y >= this.h) {
      throw new Error(`Index (${x}, ${y}) out of bounds`);
    }
    return this.data[this.offset + x + y * this.w];
  }

  set(x: number, y: number, value: number): void {
    if (x < 0 || x >= this.w || y < 0 || y >= this.h) {
      throw new Error(`Index (${x}, ${y}) out of bounds`);
    }
    this.data[this.offset + x + y * this.w] = value;
  }

  setAll(value: number): void {
    for (let i = 0; i < this.w * this.h; i++) {
      this.data[this.offset + i] = value;
    }
  }
}

// Vector operations

export function vecAdd(result: VecR32, a: VecR32, b: VecR32): void {
  if (result.n !== a.n || result.n !== b.n) {
    throw new Error('Vector size mismatch');
  }
  for (let i = 0; i < a.n; i++) {
    result.set(i, a.get(i) + b.get(i));
  }
}

export function vecMul(result: VecR32, a: VecR32, b: VecR32): void {
  if (result.n !== a.n || result.n !== b.n) {
    throw new Error('Vector size mismatch');
  }
  for (let i = 0; i < a.n; i++) {
    result.set(i, a.get(i) * b.get(i));
  }
}

export function vecScale(result: VecR32, a: VecR32, scalar: number): void {
  if (result.n !== a.n) {
    throw new Error('Vector size mismatch');
  }
  for (let i = 0; i < a.n; i++) {
    result.set(i, a.get(i) * scalar);
  }
}

export function vecAddScalar(result: VecR32, a: VecR32, scalar: number): void {
  if (result.n !== a.n) {
    throw new Error('Vector size mismatch');
  }
  for (let i = 0; i < a.n; i++) {
    result.set(i, a.get(i) + scalar);
  }
}

// Matrix operations

export function matVecMul(result: VecR32, mat: MatR32, vec: VecR32): void {
  if (mat.w !== vec.n) {
    throw new Error(`Matrix width ${mat.w} must match vector size ${vec.n}`);
  }
  if (result.n !== mat.h) {
    throw new Error(`Result size ${result.n} must match matrix height ${mat.h}`);
  }

  for (let i = 0; i < mat.h; i++) {
    let sum = 0;
    for (let j = 0; j < mat.w; j++) {
      sum += mat.get(j, i) * vec.get(j);
    }
    result.set(i, sum);
  }
}

// Activation functions

export function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

export function tanh(x: number): number {
  return Math.tanh(x);
}

export function relu(x: number): number {
  return Math.max(0, x);
}

// Helper to create vectors/matrices from a gene array

export function shapeVec(gene: Float32Array, n: number, offset: number): VecR32 {
  if (offset + n > gene.length) {
    throw new Error(`Not enough data in gene: need ${offset + n}, have ${gene.length}`);
  }
  return new VecR32(n, gene, offset);
}

export function shapeMat(gene: Float32Array, w: number, h: number, offset: number): MatR32 {
  if (offset + w * h > gene.length) {
    throw new Error(`Not enough data in gene: need ${offset + w * h}, have ${gene.length}`);
  }
  return new MatR32(w, h, gene, offset);
}

// Calculate sizes

export function getVecSize(n: number): number {
  return n;
}

export function getMatSize(w: number, h: number): number {
  return w * h;
}
