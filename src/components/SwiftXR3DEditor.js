import React, { useRef, useState, useCallback, useEffect } from 'react';
import * as THREE from 'three';
import { Upload, RotateCcw, Move3D, MapPin, Trash2, Eye, EyeOff, Settings, Download } from 'lucide-react';
import { useThreeScene } from '../hooks/useThreeScene';
import { ModelLoader } from '../utils/modelLoader';
import HotspotOverlay, { HotspotList, HotspotStats } from './HotspotOverlay';

/**
 * SwiftXR3DEditor - Main 3D Editor Component
 * 
 * This is the primary component that orchestrates the entire 3D editing experience.
 * It manages model loading, camera controls, hotspot functionality, and UI interactions.
 */
const SwiftXR3DEditor = () => {
  // Canvas reference for Three.js
  const canvasRef = useRef(null);
  
  // Model loading utility
  const modelLoader = useRef(new ModelLoader());
  
  // Raycaster for 3D interaction
  const raycasterRef = useRef(new THREE.Raycaster());
  const mouseRef = useRef(new THREE.Vector2());
  
  // Three.js scene management via custom hook
  const {
    sceneRef,
    rendererRef,
    cameraRef,
    rotateCameraBy,
    panCameraBy,
    zoomCameraBy,
    resetCamera,
    addModelToScene,
    getCurrentModel
  } = useThreeScene(canvasRef);

  // === STATE MANAGEMENT ===
  
  // Model state
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentModel, setCurrentModel] = useState(null);

  // Hotspot state
  const [hotspots, setHotspots] = useState([]);
  const [isAddingHotspot, setIsAddingHotspot] = useState(false);
  const [selectedHotspotId, setSelectedHotspotId] = useState(null);
  const [newHotspotLabel, setNewHotspotLabel] = useState('');
  const [hotspotsVisible, setHotspotsVisible] = useState(true);

  // Camera control state
  const [mouseState, setMouseState] = useState({
    isDown: false,
    lastX: 0,
    lastY: 0,
    button: null
  });

  // UI state
  const [showStats, setShowStats] = useState(false);

  // === FILE HANDLING ===

  /**
   * Handle GLB file upload and loading
   */
  const handleFileUpload = useCallback(async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setIsLoading(true);
    setError('');

    try {
      // Validate and load the model
      const loadedModel = await modelLoader.current.loadGLB(file);
      
      // Prepare model for display
      const preparedModel = modelLoader.current.prepareModel(loadedModel, {
        center: true,
        scale: true,
        targetSize: 4,
        enableShadows: true
      });

      // Add to scene and update state
      const sceneModel = addModelToScene(preparedModel);
      setCurrentModel(sceneModel);
      setIsModelLoaded(true);
      
      // Clear any existing hotspots when loading new model
      setHotspots([]);
      setSelectedHotspotId(null);

    } catch (err) {
      setError(err.message || 'Failed to load 3D model. Please try again.');
      console.error('Model loading error:', err);
    } finally {
      setIsLoading(false);
      // Reset file input
      event.target.value = '';
    }
  }, [addModelToScene]);

  // === CAMERA CONTROLS ===

  /**
   * Mouse down handler for camera controls and hotspot placement
   */
  const handleMouseDown = useCallback((event) => {
    if (!canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Handle hotspot placement
    if (isAddingHotspot && isModelLoaded && newHotspotLabel.trim()) {
      addHotspotAtPosition(x, y);
      return;
    }

    // Handle camera controls
    if (isModelLoaded && !isAddingHotspot) {
      setMouseState({
        isDown: true,
        lastX: x,
        lastY: y,
        button: event.button
      });
    }
  }, [isAddingHotspot, isModelLoaded, newHotspotLabel]);

  /**
   * Mouse move handler for camera controls
   */
  const handleMouseMove = useCallback((event) => {
    if (!mouseState.isDown || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const deltaX = x - mouseState.lastX;
    const deltaY = y - mouseState.lastY;

    if (mouseState.button === 0) {
      // Left mouse button - rotate
      rotateCameraBy(deltaX, deltaY);
    } else if (mouseState.button === 2) {
      // Right mouse button - pan
      panCameraBy(deltaX, deltaY);
    }

    setMouseState(prev => ({
      ...prev,
      lastX: x,
      lastY: y
    }));
  }, [mouseState, rotateCameraBy, panCameraBy]);

  /**
   * Mouse up handler
   */
  const handleMouseUp = useCallback(() => {
    setMouseState(prev => ({ ...prev, isDown: false, button: null }));
  }, []);

  /**
   * Mouse wheel handler for zoom
   */
  const handleWheel = useCallback((event) => {
    if (!isModelLoaded) return;
    
    event.preventDefault();
    const delta = event.deltaY > 0 ? 1 : -1;
    zoomCameraBy(delta);
  }, [isModelLoaded, zoomCameraBy]);

  // === HOTSPOT FUNCTIONALITY ===

  /**
   * Add hotspot at specified screen coordinates
   */
  const addHotspotAtPosition = useCallback((screenX, screenY) => {
    if (!currentModel || !newHotspotLabel.trim()) return;

    const rect = canvasRef.current.getBoundingClientRect();
    
    // Convert screen coordinates to normalized device coordinates
    mouseRef.current.x = ((screenX / rect.width) * 2) - 1;
    mouseRef.current.y = -((screenY / rect.height) * 2) + 1;

    // Perform raycasting
    raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);
    const intersects = raycasterRef.current.intersectObject(currentModel, true);

    if (intersects.length > 0) {
      const intersectionPoint = intersects[0].point;
      
      const newHotspot = {
        id: Date.now(),
        label: newHotspotLabel.trim(),
        position: {
          x: intersectionPoint.x,
          y: intersectionPoint.y,
          z: intersectionPoint.z
        },
        screenPosition: { x: screenX, y: screenY },
        createdAt: new Date().toISOString()
      };

      setHotspots(prev => [...prev, newHotspot]);
      setNewHotspotLabel('');
      setIsAddingHotspot(false);
      setSelectedHotspotId(newHotspot.id);
    }
  }, [currentModel, newHotspotLabel]);

  /**
   * Delete hotspot by ID
   */
  const deleteHotspot = useCallback((hotspotId) => {
    setHotspots(prev => prev.filter(h => h.id !== hotspotId));
    if (selectedHotspotId === hotspotId) {
      setSelectedHotspotId(null);
    }
  }, [selectedHotspotId]);

  /**
   * Select hotspot
   */
  const selectHotspot = useCallback((hotspot) => {
    setSelectedHotspotId(hotspot.id);
  }, []);

  /**
   * Toggle hotspot adding mode
   */
  const toggleHotspotMode = useCallback(() => {
    if (isAddingHotspot) {
      setIsAddingHotspot(false);
      setNewHotspotLabel('');
    } else {
      setIsAddingHotspot(true);
    }
  }, [isAddingHotspot]);

  // === EVENT LISTENERS ===

  // Add mouse event listeners
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('wheel', handleWheel);
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    // Global mouse up handler (in case mouse leaves canvas)
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('wheel', handleWheel);
      canvas.removeEventListener('contextmenu', (e) => e.preventDefault());
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseDown, handleMouseMove, handleMouseUp, handleWheel]);

  // === UTILITY FUNCTIONS ===

  /**
   * Get cursor style based on current mode
   */
  const getCursorStyle = useCallback(() => {
    if (isAddingHotspot) return 'canvas-hotspot';
    if (mouseState.isDown) {
      return mouseState.button === 2 ? 'canvas-pan' : 'canvas-rotate';
    }
    return 'canvas-rotate';
  }, [isAddingHotspot, mouseState]);

  /**
   * Clear all hotspots
   */
  const clearAllHotspots = useCallback(() => {
    setHotspots([]);
    setSelectedHotspotId(null);
  }, []);

  // === RENDER ===

  return (
    <div className="w-full h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex flex-col">
      {/* Header */}
      <div className="editor-header">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-white">SwiftXR 3D Editor</h1>
            <p className="text-gray-400 text-sm">Technical Assessment - 3D Model Viewer & Hotspot Editor</p>
          </div>
          
          {/* Stats Toggle */}
          <button
            onClick={() => setShowStats(!showStats)}
            className="btn-secondary text-sm"
          >
            <Settings size={16} />
            {showStats ? 'Hide Stats' : 'Show Stats'}
          </button>
        </div>
        
        {/* Controls */}
        <div className="flex flex-wrap gap-4 items-center">
          {/* File Upload */}
          <label className="file-upload-label">
            <Upload size={18} />
            Upload GLB Model
            <input
              type="file"
              accept=".glb,.gltf"
              onChange={handleFileUpload}
              className="hidden"
              disabled={isLoading}
            />
          </label>

          {/* Camera Controls */}
          {isModelLoaded && (
            <>
              <button onClick={resetCamera} className="btn-secondary">
                <RotateCcw size={18} />
                Reset View
              </button>

              {/* Hotspot Controls */}
              <div className="flex items-center gap-2">
                <button
                  onClick={toggleHotspotMode}
                  className={isAddingHotspot ? "btn-danger" : "btn-success"}
                >
                  <MapPin size={18} />
                  {isAddingHotspot ? 'Cancel Hotspot' : 'Add Hotspot'}
                </button>

                <button
                  onClick={() => setHotspotsVisible(!hotspotsVisible)}
                  className="btn-secondary"
                >
                  {hotspotsVisible ? <Eye size={18} /> : <EyeOff size={18} />}
                  {hotspotsVisible ? 'Hide' : 'Show'} Hotspots
                </button>

                {hotspots.length > 0 && (
                  <button
                    onClick={clearAllHotspots}
                    className="btn-danger text-sm"
                  >
                    <Trash2 size={16} />
                    Clear All
                  </button>
                )}
              </div>

              {/* Hotspot Input */}
              {isAddingHotspot && (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newHotspotLabel}
                    onChange={(e) => setNewHotspotLabel(e.target.value)}
                    placeholder="Enter hotspot label..."
                    className="px-3 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none min-w-48"
                    autoFocus
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && newHotspotLabel.trim()) {
                        // Ready to place hotspot - user needs to click on model
                      }
                    }}
                  />
                  <div className="text-sm text-yellow-400">
                    Enter label, then click on the 3D model
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Instructions */}
        {isModelLoaded && (
          <div className="mt-4 text-sm text-gray-400 space-y-1">
            <div className="flex flex-wrap gap-4">
              <span><strong>Rotate:</strong> Left click + drag</span>
              <span><strong>Pan:</strong> Right click + drag</span>
              <span><strong>Zoom:</strong> Mouse wheel</span>
            </div>
            {isAddingHotspot && newHotspotLabel.trim() && (
              <div className="text-yellow-400">
                <strong>Hotspot Mode:</strong> Click anywhere on the 3D model to place "{newHotspotLabel}"
              </div>
            )}
          </div>
        )}

        {/* Statistics */}
        {showStats && isModelLoaded && (
          <div className="mt-4 p-3 bg-gray-700 rounded-lg">
            <div className="flex items-center justify-between">
              <HotspotStats hotspots={hotspots} />
              <div className="text-sm text-gray-400">
                Model: {currentModel ? 'Loaded' : 'None'} | 
                Hotspots: {hotspots.length}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 relative canvas-container">
        {/* 3D Canvas */}
        <canvas 
          ref={canvasRef}
          className={`w-full h-full ${getCursorStyle()}`}
        />

        {/* Hotspots Overlay */}
        <HotspotOverlay
          hotspots={hotspots}
          visible={hotspotsVisible}
          selectedHotspotId={selectedHotspotId}
          onDeleteHotspot={deleteHotspot}
          onHotspotClick={selectHotspot}
        />

        {/* Loading Overlay */}
        {isLoading && (
          <div className="loading-overlay">
            <div className="loading-content">
              <div className="loading-spinner w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-gray-800 font-medium">Loading 3D model...</p>
              <p className="text-gray-600 text-sm mt-2">Please wait while we process your file</p>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="error-message">
            <div className="flex items-center gap-2">
              <span>{error}</span>
              <button 
                onClick={() => setError('')}
                className="text-red-200 hover:text-white text-lg leading-none"
              >
                ×
              </button>
            </div>
          </div>
        )}

        {/* Welcome Screen */}
        {!isModelLoaded && !isLoading && (
          <div className="welcome-screen">
            <div className="text-center">
              <div className="mb-6">
                <Upload size={64} className="mx-auto mb-4 opacity-50" />
                <h2 className="text-3xl font-bold mb-2 text-white">Welcome to SwiftXR 3D Editor</h2>
                <p className="text-lg text-gray-400">Upload a GLB file to start exploring and labeling</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8 max-w-4xl">
                <div className="p-6 bg-gray-800 bg-opacity-50 rounded-lg border border-gray-700">
                  <Upload size={32} className="mx-auto mb-3 text-blue-400" />
                  <h3 className="font-semibold text-white mb-2">1. Import Model</h3>
                  <p className="text-sm text-gray-400">Upload your GLB/GLTF 3D model file to get started</p>
                </div>
                
                <div className="p-6 bg-gray-800 bg-opacity-50 rounded-lg border border-gray-700">
                  <Move3D size={32} className="mx-auto mb-3 text-green-400" />
                  <h3 className="font-semibold text-white mb-2">2. Navigate</h3>
                  <p className="text-sm text-gray-400">Rotate, pan, and zoom to explore your 3D model</p>
                </div>
                
                <div className="p-6 bg-gray-800 bg-opacity-50 rounded-lg border border-gray-700">
                  <MapPin size={32} className="mx-auto mb-3 text-red-400" />
                  <h3 className="font-semibold text-white mb-2">3. Label</h3>
                  <p className="text-sm text-gray-400">Add hotspots to label important parts of your model</p>
                </div>
              </div>

              <div className="mt-8 text-sm text-gray-500">
                <p><strong>Supported Formats:</strong> GLB, GLTF</p>
                <p><strong>Max File Size:</strong> 50MB</p>
              </div>
            </div>
          </div>
        )}

        {/* Debug Info (remove in production) */}
        {showStats && currentModel && (
          <div className="absolute bottom-4 left-4 bg-black bg-opacity-80 text-white p-3 rounded-lg text-xs font-mono max-w-sm">
            <div className="mb-2 font-bold">Model Debug Info:</div>
            <div>Visible: {currentModel.visible ? 'Yes' : 'No'}</div>
            <div>Position: {`${currentModel.position.x.toFixed(2)}, ${currentModel.position.y.toFixed(2)}, ${currentModel.position.z.toFixed(2)}`}</div>
            <div>Scale: {`${currentModel.scale.x.toFixed(2)}, ${currentModel.scale.y.toFixed(2)}, ${currentModel.scale.z.toFixed(2)}`}</div>
            <div>Children: {currentModel.children.length}</div>
            <div>In Scene: {sceneRef.current && sceneRef.current.children.includes(currentModel) ? 'Yes' : 'No'}</div>
          </div>
        )}
        {isAddingHotspot && (
          <div className="absolute top-4 right-4 bg-yellow-500 text-black px-4 py-2 rounded-lg shadow-lg">
            <div className="flex items-center gap-2">
              <MapPin size={16} />
              <span className="font-medium">Hotspot Mode Active</span>
            </div>
            <div className="text-sm mt-1">
              {newHotspotLabel.trim() ? `Ready to place: "${newHotspotLabel}"` : 'Enter a label first'}
            </div>
          </div>
        )}
      </div>

      {/* Hotspot List Panel */}
      <HotspotList 
        hotspots={hotspots}
        selectedHotspotId={selectedHotspotId}
        onDeleteHotspot={deleteHotspot}
        onHotspotSelect={selectHotspot}
      />
    </div>
  );
};

export default SwiftXR3DEditor;