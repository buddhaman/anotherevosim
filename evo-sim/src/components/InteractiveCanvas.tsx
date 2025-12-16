import { useEffect, useRef, useState } from 'react';
import { Application, Graphics, Container } from 'pixi.js';
import { Camera } from '../utils/Camera';

interface InteractiveCanvasProps {
  width: number;
  height: number;
}

export function InteractiveCanvas({ width, height }: InteractiveCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const appRef = useRef<Application | null>(null);
  const cameraRef = useRef<Camera | null>(null);
  const worldContainerRef = useRef<Container | null>(null);
  const initRef = useRef(false);

  const [circleCount, setCircleCount] = useState(0);

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
        cameraRef.current = camera;

        // Draw grid for reference
        drawGrid(worldContainer);

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
      if (appRef.current) {
        appRef.current.destroy();
      }
    };
  }, [width, height]);

  const drawGrid = (container: Container) => {
    const gridGraphics = new Graphics();
    const gridSize = 50;
    const gridExtent = 2000;

    // Draw grid lines
    for (let x = -gridExtent; x <= gridExtent; x += gridSize) {
      gridGraphics
        .moveTo(x, -gridExtent)
        .lineTo(x, gridExtent)
        .stroke({ width: 1, color: 0x333333 });
    }

    for (let y = -gridExtent; y <= gridExtent; y += gridSize) {
      gridGraphics
        .moveTo(-gridExtent, y)
        .lineTo(gridExtent, y)
        .stroke({ width: 1, color: 0x333333 });
    }

    // Draw axes
    gridGraphics
      .moveTo(-gridExtent, 0)
      .lineTo(gridExtent, 0)
      .stroke({ width: 2, color: 0x666666 });

    gridGraphics
      .moveTo(0, -gridExtent)
      .lineTo(0, gridExtent)
      .stroke({ width: 2, color: 0x666666 });

    container.addChild(gridGraphics);
  };

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
    if (!cameraRef.current || !worldContainerRef.current) return;

    if (e.button === 2) {
      // Right mouse button - end dragging
      cameraRef.current.endDrag();
    } else if (e.button === 0) {
      // Left mouse button - spawn circle
      const rect = canvasRef.current!.getBoundingClientRect();
      const screenX = e.clientX - rect.left;
      const screenY = e.clientY - rect.top;

      const worldPos = cameraRef.current.screenToWorld(screenX, screenY);
      spawnCircle(worldPos.x, worldPos.y);
    }
  };

  const handleContextMenu = (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault(); // Prevent context menu on right click
  };

  const spawnCircle = (x: number, y: number) => {
    if (!worldContainerRef.current) return;

    const radius = 20;
    const circle = new Graphics();
    circle
      .circle(0, 0, radius)
      .fill({ color: Math.random() * 0xffffff })
      .stroke({ width: 2, color: 0xffffff });

    circle.position.set(x, y);
    worldContainerRef.current.addChild(circle);
    setCircleCount(prev => prev + 1);
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
