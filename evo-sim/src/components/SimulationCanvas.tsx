import { useEffect, useRef } from 'react';
import { PhysicsWorld } from '../simulation/PhysicsWorld';
import { PixiRenderer } from '../renderer/PixiRenderer';

interface SimulationCanvasProps {
  width: number;
  height: number;
  gravity: number;
  onSimulationReady?: (world: PhysicsWorld) => void;
}

export function SimulationCanvas({
  width,
  height,
  gravity,
  onSimulationReady
}: SimulationCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const worldRef = useRef<PhysicsWorld | null>(null);
  const rendererRef = useRef<PixiRenderer | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    let running = true;

    // Async initialization
    const initSimulation = async () => {
      if (!canvasRef.current) return;

      // Initialize physics world
      const world = new PhysicsWorld({ gravity, timeStep: 1/60 });
      worldRef.current = world;

      // Initialize renderer (async)
      const renderer = await PixiRenderer.create(canvasRef.current, width, height);
      rendererRef.current = renderer;

      // Notify parent that simulation is ready
      if (onSimulationReady) {
        onSimulationReady(world);
      }

      // Simulation loop
      const loop = () => {
        if (!running) return;

        world.step();
        renderer.render(world.getBodies());

        animationFrameRef.current = requestAnimationFrame(loop);
      };

      loop();
    };

    initSimulation();

    // Cleanup
    return () => {
      running = false;
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (rendererRef.current) {
        rendererRef.current.destroy();
      }
    };
  }, [width, height, onSimulationReady]);

  // Update gravity when it changes
  useEffect(() => {
    if (worldRef.current) {
      worldRef.current.updateParams({ gravity });
    }
  }, [gravity]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        border: '1px solid #444',
        display: 'block'
      }}
    />
  );
}
