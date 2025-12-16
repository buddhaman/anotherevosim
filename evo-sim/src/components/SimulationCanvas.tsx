import { useEffect, useRef } from 'react';
import { Application, Container, Graphics } from 'pixi.js';
import { Camera } from '../utils/Camera';
import { PhysicsWorld } from '../simulation/PhysicsWorld';
import { Creature } from '../simulation/Creature';
import { Gene } from '../simulation/Gene';

interface SimulationCanvasProps {
  width: number;
  height: number;
  gravity: number;
  speedup: number;
  onStatsUpdate?: (fps: number, creatureCount: number) => void;
}

export function SimulationCanvas({ width, height, gravity, speedup, onStatsUpdate }: SimulationCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const appRef = useRef<Application | null>(null);
  const cameraRef = useRef<Camera | null>(null);
  const worldContainerRef = useRef<Container | null>(null);
  const physicsWorldRef = useRef<PhysicsWorld | null>(null);
  const initRef = useRef(false);
  const fpsRef = useRef(0);
  const lastTimeRef = useRef(performance.now());
  const frameCountRef = useRef(0);
  const runningRef = useRef(true);

  // Initialize once
  useEffect(() => {
    if (!canvasRef.current || initRef.current) return;
    initRef.current = true;

    const canvas = canvasRef.current;

    const initPixi = async () => {
      try {
        const app = new Application();

        await app.init({
          canvas: canvas,
          width,
          height,
          backgroundColor: 0x1a1a1a,
          antialias: true,
          preference: 'webgl',
          resizeTo: undefined // Don't auto-resize, we'll handle it manually
        });

        appRef.current = app;

        // Create world container for camera
        const worldContainer = new Container();
        app.stage.addChild(worldContainer);
        worldContainerRef.current = worldContainer;

        // Initialize camera
        const camera = new Camera(worldContainer);
        camera.setPosition(width / 2, height / 2);
        camera.setZoom(10); // Start with 10 pixels per meter
        cameraRef.current = camera;

        // Initialize physics world (top-down, no gravity)
        const physicsWorld = new PhysicsWorld({ gravity: 0, timeStep: 1/60 });
        physicsWorldRef.current = physicsWorld;

        // Draw grid for visual reference (top-down plane)
        drawGrid(worldContainer);

        // Add bounds graphics to container
        worldContainer.addChild(physicsWorld.boundsGraphics);

        // Spawn 10 creatures randomly across the world
        spawnInitialCreatures(physicsWorld, worldContainer);

        // Simulation loop
        runningRef.current = true;
        const loop = () => {
          if (!runningRef.current || !appRef.current) return;

          // Step physics and update/render entities
          physicsWorld.step();

          if (appRef.current && appRef.current.renderer) {
            appRef.current.renderer.render(appRef.current.stage);
          }

          // Calculate FPS
          frameCountRef.current++;
          const now = performance.now();
          const elapsed = now - lastTimeRef.current;
          if (elapsed >= 1000) {
            fpsRef.current = Math.round((frameCountRef.current * 1000) / elapsed);
            frameCountRef.current = 0;
            lastTimeRef.current = now;

            // Update stats
            if (onStatsUpdate) {
              onStatsUpdate(fpsRef.current, physicsWorld.entities.size);
            }
          }

          requestAnimationFrame(loop);
        };

        loop();

        console.log('Canvas initialized successfully with WebGL');

      } catch (error) {
        console.error('Error during initialization:', error);
      }
    };

    // Native wheel event listener to allow preventDefault
    const handleWheelNative = (e: WheelEvent) => {
      e.preventDefault();
      if (!cameraRef.current) return;

      const delta = -e.deltaY * 0.001;
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      cameraRef.current.zoomBy(delta, mouseX, mouseY);
    };

    canvas.addEventListener('wheel', handleWheelNative, { passive: false });

    initPixi();

    return () => {
      runningRef.current = false;
      canvas.removeEventListener('wheel', handleWheelNative);
      if (physicsWorldRef.current) {
        physicsWorldRef.current.clearEntities();
      }
      if (appRef.current) {
        appRef.current.destroy();
        appRef.current = null;
      }
    };
  }, []); // Only run once on mount

  // Update gravity when it changes
  useEffect(() => {
    if (physicsWorldRef.current) {
      physicsWorldRef.current.updateParams({ gravity });
    }
  }, [gravity]);

  // Update speedup when it changes
  useEffect(() => {
    if (physicsWorldRef.current) {
      physicsWorldRef.current.speedup = speedup;
    }
  }, [speedup]);

  // Handle window resize
  useEffect(() => {
    if (!appRef.current || !appRef.current.renderer || !cameraRef.current) return;

    // Update renderer size
    appRef.current.renderer.resize(width, height);
    
    // Adjust camera position to center
    cameraRef.current.setPosition(width / 2, height / 2);
  }, [width, height]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!cameraRef.current) return;

    if (e.button === 2) {
      // Right mouse button - start dragging
      e.preventDefault();
      const rect = canvasRef.current!.getBoundingClientRect();
      cameraRef.current.startDrag(e.clientX - rect.left, e.clientY - rect.top);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!cameraRef.current) return;

    const rect = canvasRef.current!.getBoundingClientRect();
    cameraRef.current.updateDrag(e.clientX - rect.left, e.clientY - rect.top);
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!cameraRef.current || !worldContainerRef.current || !physicsWorldRef.current) return;

    if (e.button === 2) {
      // Right mouse button - end dragging
      cameraRef.current.endDrag();
    } else if (e.button === 0) {
      // Left mouse button - spawn creature
      const rect = canvasRef.current!.getBoundingClientRect();
      const screenX = e.clientX - rect.left;
      const screenY = e.clientY - rect.top;

      const worldPos = cameraRef.current.screenToWorld(screenX, screenY);
      spawnCreature(worldPos.x, worldPos.y);
    }
  };

  const handleContextMenu = (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault(); // Prevent context menu on right click
  };

  const drawGrid = (container: Container) => {
    const gridGraphics = new Graphics();
    const gridSize = 5; // 5 meter grid
    const gridExtent = 100;

    // Draw grid lines
    for (let x = -gridExtent; x <= gridExtent; x += gridSize) {
      const color = x === 0 ? 0x444444 : 0x222222;
      const width = x === 0 ? 0.1 : 0.05;

      gridGraphics
        .moveTo(x, -gridExtent)
        .lineTo(x, gridExtent)
        .stroke({ width, color });
    }

    for (let y = -gridExtent; y <= gridExtent; y += gridSize) {
      const color = y === 0 ? 0x444444 : 0x222222;
      const width = y === 0 ? 0.1 : 0.05;

      gridGraphics
        .moveTo(-gridExtent, y)
        .lineTo(gridExtent, y)
        .stroke({ width, color });
    }

    container.addChild(gridGraphics);
  };

  const spawnInitialCreatures = (physicsWorld: PhysicsWorld, container: Container) => {
    const numCreatures = 10;
    const padding = 5; // Keep creatures away from walls

    for (let i = 0; i < numCreatures; i++) {
      const x = physicsWorld.bounds.minX + padding + Math.random() * (physicsWorld.bounds.maxX - physicsWorld.bounds.minX - 2 * padding);
      const y = physicsWorld.bounds.minY + padding + Math.random() * (physicsWorld.bounds.maxY - physicsWorld.bounds.minY - 2 * padding);

      const id = `creature-${i}-${Date.now()}`;
      const gene = Gene.createRandom();
      const creature = new Creature(id, physicsWorld.world, x, y, gene);

      physicsWorld.addEntity(creature);

      for (const graphics of creature.graphics) {
        container.addChild(graphics);
      }
    }

    if (onStatsUpdate) {
      onStatsUpdate(fpsRef.current, physicsWorld.entities.size);
    }
  };

  const spawnCreature = (x: number, y: number) => {
    if (!worldContainerRef.current || !physicsWorldRef.current) return;

    // Clamp spawn position to world bounds
    const clampedX = Math.max(physicsWorldRef.current.bounds.minX + 2, Math.min(physicsWorldRef.current.bounds.maxX - 2, x));
    const clampedY = Math.max(physicsWorldRef.current.bounds.minY + 2, Math.min(physicsWorldRef.current.bounds.maxY - 2, y));

    const id = `creature-${Date.now()}-${Math.random()}`;
    const gene = Gene.createRandom();
    const creature = new Creature(id, physicsWorldRef.current.world, clampedX, clampedY, gene);

    physicsWorldRef.current.addEntity(creature);

    for (const graphics of creature.graphics) {
      worldContainerRef.current.addChild(graphics);
    }

    if (onStatsUpdate) {
      onStatsUpdate(fpsRef.current, physicsWorldRef.current.entities.size);
    }
  };

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onContextMenu={handleContextMenu}
      style={{ 
        display: 'block', 
        cursor: 'crosshair',
        width: `${width}px`,
        height: `${height}px`
      }}
    />
  );
}
