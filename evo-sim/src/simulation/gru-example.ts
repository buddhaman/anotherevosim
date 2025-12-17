/**
 * Example usage of the GRU implementation
 * Run with: npm run dev (or use in tests)
 */

import { MinimalGatedUnit, getGRUGeneSize, GRUConfig } from './gru';

// Example: Create a simple GRU brain
function createExampleGRU() {
  // Define brain architecture
  const config: GRUConfig = {
    inputSize: 4,    // 4 sensor inputs
    hiddenSize: 8,   // 8 hidden neurons
    outputSize: 3,   // 3 motor outputs
  };

  // Calculate required gene size
  const geneSize = getGRUGeneSize(config);
  console.log(`Gene size needed: ${geneSize} floats`);

  // Create and randomize gene
  const gene = new Float32Array(geneSize);
  MinimalGatedUnit.randomizeGene(gene, 0.1);

  // Create GRU with this gene
  const brain = new MinimalGatedUnit(config, gene);

  return brain;
}

// Example: Use the GRU in a simple control loop
function simulationLoop() {
  const brain = createExampleGRU();

  console.log('\nRunning simulation...\n');

  // Reset state before starting
  brain.reset();

  // Simulate 10 time steps
  for (let t = 0; t < 10; t++) {
    // Example sensor inputs (could be from creature's body/environment)
    const sensorInputs = [
      Math.sin(t * 0.1),      // oscillating signal
      Math.cos(t * 0.1),      // another oscillating signal
      t / 10,                 // ramp
      Math.random() * 0.1,    // noise
    ];

    // Set inputs
    brain.setInput(sensorInputs);

    // Run one step
    brain.step();

    // Get outputs (motor commands)
    const motorOutputs = brain.getOutput();

    console.log(`t=${t}: inputs=[${sensorInputs.map(x => x.toFixed(3)).join(', ')}] outputs=[${motorOutputs.map(x => x.toFixed(3)).join(', ')}]`);
  }
}

// Example: Mutation
function mutationExample() {
  console.log('\n--- Mutation Example ---\n');

  const config: GRUConfig = {
    inputSize: 2,
    hiddenSize: 4,
    outputSize: 2,
  };

  const geneSize = getGRUGeneSize(config);

  // Parent gene
  const parentGene = new Float32Array(geneSize);
  MinimalGatedUnit.randomizeGene(parentGene, 0.1);

  // Create offspring by copying and mutating
  const offspringGene = new Float32Array(parentGene);

  // Mutate: add small random changes to 10% of genes
  const mutationRate = 0.1;
  const mutationStrength = 0.05;

  for (let i = 0; i < offspringGene.length; i++) {
    if (Math.random() < mutationRate) {
      offspringGene[i] += (Math.random() * 2 - 1) * mutationStrength;
    }
  }

  // Create brains
  const parentBrain = new MinimalGatedUnit(config, parentGene);
  const offspringBrain = new MinimalGatedUnit(config, offspringGene);

  // Test both with same input
  const testInput = [1.0, -0.5];

  parentBrain.setInput(testInput);
  parentBrain.step();
  const parentOutput = parentBrain.getOutput();

  offspringBrain.setInput(testInput);
  offspringBrain.step();
  const offspringOutput = offspringBrain.getOutput();

  console.log(`Parent output:    [${parentOutput.map(x => x.toFixed(4)).join(', ')}]`);
  console.log(`Offspring output: [${offspringOutput.map(x => x.toFixed(4)).join(', ')}]`);
  console.log('(Should be similar but not identical due to mutation)');
}

// Run examples if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  simulationLoop();
  mutationExample();
}

export { createExampleGRU, simulationLoop, mutationExample };
