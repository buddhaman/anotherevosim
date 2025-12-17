import { useState, useEffect } from 'react';
import { SimulationCanvas } from './components/SimulationCanvas';
import { Gene } from './simulation/Gene';
import './App.css';

export type Tool = 'create' | 'select';

function App() {
  const [canvasSize, setCanvasSize] = useState({
    width: window.innerWidth - 250,
    height: window.innerHeight
  });
  const [gravity] = useState(0); // Top-down view, no gravity
  const [speedup, setSpeedup] = useState(1);
  const [fps, setFps] = useState(0);
  const [creatureCount, setCreatureCount] = useState(0);
  const [jointAngleDegrees, setJointAngleDegrees] = useState(10);
  const [currentTool, setCurrentTool] = useState<Tool>('create');
  const [selectedBodyPartInfo, setSelectedBodyPartInfo] = useState<any>(null);

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

  // Update global joint angle deviation when slider changes
  useEffect(() => {
    Gene.JOINT_ANGLE_DEVIATION = jointAngleDegrees * (Math.PI / 180);
  }, [jointAngleDegrees]);

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
            <li><strong>Left Click:</strong> {currentTool === 'create' ? 'Spawn creature' : 'Select body part'}</li>
            <li><strong>Right Click + Drag:</strong> Pan camera</li>
            <li><strong>Mouse Wheel:</strong> Zoom in/out</li>
          </ul>
        </div>

        <div style={{ marginTop: '30px' }}>
          <h3 style={{ fontSize: '14px', color: '#aaa', marginBottom: '10px' }}>Tools</h3>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
            <button
              onClick={() => setCurrentTool('create')}
              style={{
                flex: 1,
                padding: '8px',
                backgroundColor: currentTool === 'create' ? '#4a7a4a' : '#2a4a2a',
                color: '#fff',
                border: currentTool === 'create' ? '2px solid #6a9a6a' : 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              Create
            </button>
            <button
              onClick={() => setCurrentTool('select')}
              style={{
                flex: 1,
                padding: '8px',
                backgroundColor: currentTool === 'select' ? '#4a6a7a' : '#2a4a5a',
                color: '#fff',
                border: currentTool === 'select' ? '2px solid #6a8a9a' : 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              Select
            </button>
          </div>
        </div>

        <div style={{ marginTop: '30px' }}>
          <h3 style={{ fontSize: '14px', color: '#aaa', marginBottom: '10px' }}>Settings</h3>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ fontSize: '12px', display: 'block', marginBottom: '5px' }}>
              Speedup: {speedup}x
            </label>
            <input
              type="range"
              min="1"
              max="10"
              step="1"
              value={speedup}
              onChange={(e) => setSpeedup(parseInt(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ fontSize: '12px', display: 'block', marginBottom: '5px' }}>
              Joint Angle Range: {jointAngleDegrees}°
            </label>
            <input
              type="range"
              min="0"
              max="90"
              step="5"
              value={jointAngleDegrees}
              onChange={(e) => setJointAngleDegrees(parseInt(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>
        </div>

        {selectedBodyPartInfo && (
          <div style={{ marginTop: '30px' }}>
            <h3 style={{ fontSize: '14px', color: '#aaa', marginBottom: '10px' }}>Selected Body Part</h3>
            <div style={{
              padding: '10px',
              backgroundColor: '#1a1a1a',
              borderRadius: '4px',
              fontSize: '11px',
              maxHeight: '300px',
              overflowY: 'auto'
            }}>
              <div style={{ marginBottom: '8px' }}>
                <strong>Depth:</strong> {selectedBodyPartInfo.depth}
              </div>
              <div style={{ marginBottom: '8px' }}>
                <strong>Size:</strong> {selectedBodyPartInfo.actualWidth.toFixed(2)} × {selectedBodyPartInfo.actualHeight.toFixed(2)}
              </div>
              <div style={{ marginBottom: '8px' }}>
                <strong>Position:</strong> ({selectedBodyPartInfo.position.x.toFixed(1)}, {selectedBodyPartInfo.position.y.toFixed(1)})
              </div>
              <div style={{ marginBottom: '8px' }}>
                <strong>Angle:</strong> {(selectedBodyPartInfo.angle * 180 / Math.PI).toFixed(1)}°
              </div>
              {selectedBodyPartInfo.attachmentSide && (
                <>
                  <div style={{ marginBottom: '8px' }}>
                    <strong>Attached to:</strong> {selectedBodyPartInfo.attachmentSide}
                  </div>
                  <div style={{ marginBottom: '8px' }}>
                    <strong>Attachment pos:</strong> {selectedBodyPartInfo.attachmentPosition.toFixed(2)}
                  </div>
                </>
              )}
              <div style={{ marginBottom: '8px' }}>
                <strong>Friction:</strong> {selectedBodyPartInfo.currentFriction.toFixed(2)}
              </div>
              <div style={{ marginBottom: '8px' }}>
                <strong>Actuation:</strong> {selectedBodyPartInfo.actuation.toFixed(2)}
              </div>
              <div style={{ marginBottom: '8px' }}>
                <strong>Gene width:</strong> {selectedBodyPartInfo.geneWidth.toFixed(2)}
              </div>
              <div style={{ marginBottom: '8px' }}>
                <strong>Gene height:</strong> {selectedBodyPartInfo.geneHeight.toFixed(2)}
              </div>
              {selectedBodyPartInfo.hasJoint && (
                <div style={{ marginBottom: '8px' }}>
                  <strong>Joint range:</strong> {selectedBodyPartInfo.jointAngleRange.toFixed(2)}°
                </div>
              )}
            </div>
          </div>
        )}

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
            <strong>Creatures:</strong> {creatureCount}
          </div>
          <div>
            <strong>FPS:</strong> {fps}
          </div>
        </div>
      </div>

      {/* Canvas */}
      <div style={{ flex: 1, backgroundColor: '#000' }}>
        <SimulationCanvas
          width={canvasSize.width}
          height={canvasSize.height}
          gravity={gravity}
          speedup={speedup}
          currentTool={currentTool}
          onStatsUpdate={(fps, count) => {
            setFps(fps);
            setCreatureCount(count);
          }}
          onBodyPartSelected={(info) => setSelectedBodyPartInfo(info)}
        />
      </div>
    </div>
  );
}

export default App;
