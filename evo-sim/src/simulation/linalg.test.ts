import { describe, it, expect } from 'vitest';
import {
  VecR32,
  MatR32,
  vecAdd,
  vecMul,
  vecScale,
  vecAddScalar,
  matVecMul,
  sigmoid,
  tanh,
  relu,
  shapeVec,
  shapeMat,
  getVecSize,
  getMatSize,
} from './linalg';

describe('VecR32', () => {
  it('should create a vector with correct size', () => {
    const data = new Float32Array([1, 2, 3, 4, 5]);
    const vec = new VecR32(5, data);
    expect(vec.n).toBe(5);
  });

  it('should get and set values correctly', () => {
    const data = new Float32Array([1, 2, 3]);
    const vec = new VecR32(3, data);

    expect(vec.get(0)).toBe(1);
    expect(vec.get(1)).toBe(2);
    expect(vec.get(2)).toBe(3);

    vec.set(1, 42);
    expect(vec.get(1)).toBe(42);
  });

  it('should work with offset', () => {
    const data = new Float32Array([1, 2, 3, 4, 5]);
    const vec = new VecR32(3, data, 2); // Start at index 2

    expect(vec.get(0)).toBe(3);
    expect(vec.get(1)).toBe(4);
    expect(vec.get(2)).toBe(5);
  });

  it('should setAll values', () => {
    const data = new Float32Array(3);
    const vec = new VecR32(3, data);
    vec.setAll(7);

    expect(vec.get(0)).toBe(7);
    expect(vec.get(1)).toBe(7);
    expect(vec.get(2)).toBe(7);
  });

  it('should calculate sum', () => {
    const data = new Float32Array([1, 2, 3, 4]);
    const vec = new VecR32(4, data);
    expect(vec.sum()).toBe(10);
  });

  it('should calculate average', () => {
    const data = new Float32Array([2, 4, 6, 8]);
    const vec = new VecR32(4, data);
    expect(vec.avg()).toBe(5);
  });

  it('should apply function to all elements', () => {
    const data = new Float32Array([1, 2, 3]);
    const vec = new VecR32(3, data);
    vec.apply((x) => x * 2);

    expect(vec.get(0)).toBe(2);
    expect(vec.get(1)).toBe(4);
    expect(vec.get(2)).toBe(6);
  });

  it('should copyFrom another vector', () => {
    const data1 = new Float32Array([1, 2, 3]);
    const data2 = new Float32Array([4, 5, 6]);
    const vec1 = new VecR32(3, data1);
    const vec2 = new VecR32(3, data2);

    vec1.copyFrom(vec2);
    expect(vec1.get(0)).toBe(4);
    expect(vec1.get(1)).toBe(5);
    expect(vec1.get(2)).toBe(6);
  });

  it('should throw on out of bounds access', () => {
    const data = new Float32Array([1, 2, 3]);
    const vec = new VecR32(3, data);

    expect(() => vec.get(-1)).toThrow();
    expect(() => vec.get(3)).toThrow();
    expect(() => vec.set(-1, 0)).toThrow();
    expect(() => vec.set(3, 0)).toThrow();
  });
});

describe('MatR32', () => {
  it('should create a matrix with correct dimensions', () => {
    const data = new Float32Array(6);
    const mat = new MatR32(3, 2, data); // 3 columns, 2 rows
    expect(mat.w).toBe(3);
    expect(mat.h).toBe(2);
  });

  it('should get and set values correctly', () => {
    const data = new Float32Array([
      1, 2, 3,
      4, 5, 6
    ]);
    const mat = new MatR32(3, 2, data);

    expect(mat.get(0, 0)).toBe(1);
    expect(mat.get(1, 0)).toBe(2);
    expect(mat.get(2, 0)).toBe(3);
    expect(mat.get(0, 1)).toBe(4);
    expect(mat.get(1, 1)).toBe(5);
    expect(mat.get(2, 1)).toBe(6);

    mat.set(1, 1, 42);
    expect(mat.get(1, 1)).toBe(42);
  });

  it('should work with offset', () => {
    const data = new Float32Array([0, 0, 1, 2, 3, 4]);
    const mat = new MatR32(2, 2, data, 2); // Start at index 2

    expect(mat.get(0, 0)).toBe(1);
    expect(mat.get(1, 0)).toBe(2);
    expect(mat.get(0, 1)).toBe(3);
    expect(mat.get(1, 1)).toBe(4);
  });

  it('should setAll values', () => {
    const data = new Float32Array(6);
    const mat = new MatR32(3, 2, data);
    mat.setAll(9);

    for (let y = 0; y < 2; y++) {
      for (let x = 0; x < 3; x++) {
        expect(mat.get(x, y)).toBe(9);
      }
    }
  });

  it('should throw on out of bounds access', () => {
    const data = new Float32Array(6);
    const mat = new MatR32(3, 2, data);

    expect(() => mat.get(-1, 0)).toThrow();
    expect(() => mat.get(3, 0)).toThrow();
    expect(() => mat.get(0, -1)).toThrow();
    expect(() => mat.get(0, 2)).toThrow();
  });
});

describe('Vector operations', () => {
  it('should add two vectors', () => {
    const data1 = new Float32Array([1, 2, 3]);
    const data2 = new Float32Array([4, 5, 6]);
    const result = new Float32Array(3);

    const vec1 = new VecR32(3, data1);
    const vec2 = new VecR32(3, data2);
    const vecResult = new VecR32(3, result);

    vecAdd(vecResult, vec1, vec2);

    expect(vecResult.get(0)).toBe(5);
    expect(vecResult.get(1)).toBe(7);
    expect(vecResult.get(2)).toBe(9);
  });

  it('should multiply two vectors element-wise', () => {
    const data1 = new Float32Array([2, 3, 4]);
    const data2 = new Float32Array([5, 6, 7]);
    const result = new Float32Array(3);

    const vec1 = new VecR32(3, data1);
    const vec2 = new VecR32(3, data2);
    const vecResult = new VecR32(3, result);

    vecMul(vecResult, vec1, vec2);

    expect(vecResult.get(0)).toBe(10);
    expect(vecResult.get(1)).toBe(18);
    expect(vecResult.get(2)).toBe(28);
  });

  it('should scale a vector', () => {
    const data = new Float32Array([1, 2, 3]);
    const result = new Float32Array(3);

    const vec = new VecR32(3, data);
    const vecResult = new VecR32(3, result);

    vecScale(vecResult, vec, 2.5);

    expect(vecResult.get(0)).toBe(2.5);
    expect(vecResult.get(1)).toBe(5.0);
    expect(vecResult.get(2)).toBe(7.5);
  });

  it('should add scalar to vector', () => {
    const data = new Float32Array([1, 2, 3]);
    const result = new Float32Array(3);

    const vec = new VecR32(3, data);
    const vecResult = new VecR32(3, result);

    vecAddScalar(vecResult, vec, 10);

    expect(vecResult.get(0)).toBe(11);
    expect(vecResult.get(1)).toBe(12);
    expect(vecResult.get(2)).toBe(13);
  });
});

describe('Matrix-vector operations', () => {
  it('should multiply matrix by vector', () => {
    // Matrix: 2x3 (2 cols, 3 rows)
    // [1 2]
    // [3 4]
    // [5 6]
    const matData = new Float32Array([
      1, 2,
      3, 4,
      5, 6
    ]);

    // Vector: [10, 20]
    const vecData = new Float32Array([10, 20]);

    // Result should be: [50, 110, 170]
    const resultData = new Float32Array(3);

    const mat = new MatR32(2, 3, matData);
    const vec = new VecR32(2, vecData);
    const result = new VecR32(3, resultData);

    matVecMul(result, mat, vec);

    expect(result.get(0)).toBe(50);  // 1*10 + 2*20
    expect(result.get(1)).toBe(110); // 3*10 + 4*20
    expect(result.get(2)).toBe(170); // 5*10 + 6*20
  });

  it('should handle identity matrix', () => {
    const matData = new Float32Array([
      1, 0, 0,
      0, 1, 0,
      0, 0, 1
    ]);
    const vecData = new Float32Array([5, 7, 9]);
    const resultData = new Float32Array(3);

    const mat = new MatR32(3, 3, matData);
    const vec = new VecR32(3, vecData);
    const result = new VecR32(3, resultData);

    matVecMul(result, mat, vec);

    expect(result.get(0)).toBe(5);
    expect(result.get(1)).toBe(7);
    expect(result.get(2)).toBe(9);
  });
});

describe('Activation functions', () => {
  it('should compute sigmoid correctly', () => {
    expect(sigmoid(0)).toBeCloseTo(0.5, 5);
    expect(sigmoid(100)).toBeCloseTo(1.0, 5);
    expect(sigmoid(-100)).toBeCloseTo(0.0, 5);
    expect(sigmoid(2)).toBeCloseTo(0.8807970779778823, 5);
  });

  it('should compute tanh correctly', () => {
    expect(tanh(0)).toBeCloseTo(0, 5);
    expect(tanh(100)).toBeCloseTo(1.0, 5);
    expect(tanh(-100)).toBeCloseTo(-1.0, 5);
    expect(tanh(1)).toBeCloseTo(0.7615941559557649, 5);
  });

  it('should compute relu correctly', () => {
    expect(relu(-5)).toBe(0);
    expect(relu(0)).toBe(0);
    expect(relu(5)).toBe(5);
    expect(relu(100)).toBe(100);
  });
});

describe('Gene shaping', () => {
  it('should shape vector from gene', () => {
    const gene = new Float32Array([1, 2, 3, 4, 5, 6, 7, 8]);
    const vec = shapeVec(gene, 3, 2);

    expect(vec.n).toBe(3);
    expect(vec.get(0)).toBe(3);
    expect(vec.get(1)).toBe(4);
    expect(vec.get(2)).toBe(5);
  });

  it('should shape matrix from gene', () => {
    const gene = new Float32Array([1, 2, 3, 4, 5, 6, 7, 8]);
    const mat = shapeMat(gene, 2, 3, 1);

    expect(mat.w).toBe(2);
    expect(mat.h).toBe(3);
    expect(mat.get(0, 0)).toBe(2);
    expect(mat.get(1, 0)).toBe(3);
    expect(mat.get(0, 1)).toBe(4);
    expect(mat.get(1, 1)).toBe(5);
    expect(mat.get(0, 2)).toBe(6);
    expect(mat.get(1, 2)).toBe(7);
  });

  it('should calculate sizes correctly', () => {
    expect(getVecSize(5)).toBe(5);
    expect(getMatSize(3, 4)).toBe(12);
  });

  it('should throw if not enough gene data', () => {
    const gene = new Float32Array([1, 2, 3]);

    expect(() => shapeVec(gene, 5, 0)).toThrow();
    expect(() => shapeMat(gene, 2, 2, 0)).toThrow();
  });
});
