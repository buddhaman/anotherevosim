import { useEffect, useRef, useState } from 'react';
import { Application, Container, Graphics } from 'pixi.js';
import { Camera } from '../utils/Camera';
import { PhysicsWorld } from '../simulation/PhysicsWorld';
import { Creature } from '../simulation/Creature';

interface SimulationCanvasProps {
  width: number;
  height: number;
  gravity: number;
}

export function SimulationCanvas({ width, height, gravity }: SimulationCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const appRef = useRef<Application | null>(null);
  const cameraRef = useRef<Camera | null>(null);
  const worldContainerRef = useRef<Container | null>(null);
  const physicsWorldRef = useRef<PhysicsWorld | null>(null);
  const initRef = useRef(false);

  const [entityCount, setEntityCount] = useState(0);

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
          preference: 'webgl'
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

        // Simulation loop
        let running = true;
        const loop = () => {
          if (!running) return;

          // Step physics and update/render entities
          physicsWorld.step();

          app.renderer.render(app.stage);
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
      canvas.removeEventListener('wheel', handleWheelNative);
      if (physicsWorldRef.current) {
        physicsWorldRef.current.clearEntities();
      }
      if (appRef.current) {
        appRef.current.destroy();
      }
    };
  }, [width, height]);

  // Update gravity when it changes
  useEffect(() => {
    if (physicsWorldRef.current) {
      physicsWorldRef.current.updateParams({ gravity });
    }
  }, [gravity]);

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

  const spawnCreature = (x: number, y: number) => {
    if (!worldContainerRef.current || !physicsWorldRef.current) return;

    const id = `creature-${Date.now()}-${Math.random()}`;
    const creature = new Creature(id, physicsWorldRef.current.world, x, y);

    physicsWorldRef.current.addEntity(creature);

    for (const graphics of creature.graphics) {
      worldContainerRef.current.addChild(graphics);
    }

    setEntityCount(physicsWorldRef.current.entities.size);
  };

  return (
    <canvas
      ref={canvasRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onContextMenu={handleContextMenu}
      style={{ display: 'block', cursor: 'crosshair' }}
    />
  );
}
