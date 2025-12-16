import { useState, useEffect } from 'react';
import { InteractiveCanvas } from './components/InteractiveCanvas';
import './App.css';

function App() {
  const [canvasSize, setCanvasSize] = useState({
    width: window.innerWidth - 250,
    height: window.innerHeight
  });

  useEffect(() => {
    const handleResize = () => {
      setCanvasSize({
        width: window.innerWidth - 250,
        height: window.innerHeight
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div style={{
      display: 'flex',
      width: '100vw',
      height: '100vh',
      overflow: 'hidden',
      margin: 0,
      padding: 0
    }}>
      {/* Sidebar */}
      <div style={{
        width: '250px',
        height: '100vh',
        backgroundColor: '#0f0f0f',
        borderRight: '1px solid #333',
        padding: '20px',
        boxSizing: 'border-box',
        overflowY: 'auto',
        color: '#e0e0e0',
        fontFamily: 'system-ui, sans-serif'
      }}>
        <h2 style={{ marginTop: 0, fontSize: '18px', color: '#fff' }}>Evolution Simulator</h2>

        <div style={{ marginTop: '20px' }}>
          <h3 style={{ fontSize: '14px', color: '#aaa', marginBottom: '10px' }}>Controls</h3>
          <ul style={{ fontSize: '12px', lineHeight: '1.6', paddingLeft: '20px', margin: 0 }}>
            <li><strong>Left Click:</strong> Spawn circle</li>
            <li><strong>Right Click + Drag:</strong> Pan camera</li>
            <li><strong>Mouse Wheel:</strong> Zoom in/out</li>
          </ul>
        </div>

        <div style={{ marginTop: '30px' }}>
          <h3 style={{ fontSize: '14px', color: '#aaa', marginBottom: '10px' }}>Settings</h3>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ fontSize: '12px', display: 'block', marginBottom: '5px' }}>
              Gravity: -10
            </label>
            <input
              type="range"
              min="-20"
              max="0"
              step="0.5"
              defaultValue="-10"
              style={{ width: '100%' }}
            />
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ fontSize: '12px', display: 'block', marginBottom: '5px' }}>
              Mutation Rate: 0.1
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              defaultValue="0.1"
              style={{ width: '100%' }}
            />
          </div>
        </div>

        <div style={{ marginTop: '30px' }}>
          <button style={{
            width: '100%',
            padding: '10px',
            backgroundColor: '#2a5a2a',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
            marginBottom: '10px'
          }}>
            Start Simulation
          </button>

          <button style={{
            width: '100%',
            padding: '10px',
            backgroundColor: '#5a2a2a',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px'
          }}>
            Clear All
          </button>
        </div>

        <div style={{
          marginTop: '30px',
          padding: '10px',
          backgroundColor: '#1a1a1a',
          borderRadius: '4px',
          fontSize: '12px'
        }}>
          <div style={{ marginBottom: '5px' }}>
            <strong>Status:</strong> Ready
          </div>
          <div style={{ marginBottom: '5px' }}>
            <strong>Objects:</strong> 0
          </div>
          <div>
            <strong>FPS:</strong> 60
          </div>
        </div>
      </div>

      {/* Canvas */}
      <div style={{ flex: 1, backgroundColor: '#000' }}>
        <InteractiveCanvas width={canvasSize.width} height={canvasSize.height} />
      </div>
    </div>
  );
}

export default App;
