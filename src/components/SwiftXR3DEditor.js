import React, { useRef, useReducer, useCallback, useEffect } from 'react';
import * as THREE from 'three';
import { Upload, RotateCcw, Move3D, MapPin, Trash2, Eye, EyeOff, Settings } from 'lucide-react';
import { useThreeScene } from '../hooks/useThreeScene';
import { ModelLoader } from '../utils/modelLoader';
import HotspotOverlay, { HotspotList, HotspotStats } from './HotspotOverlay';

// Initial state for useReducer
const initialState = {
  // Model state
  isModelLoaded: false,
  isLoading: false,
  error: '',
  currentModel: null,

  // Hotspot state
  hotspots: [],
  isAddingHotspot: false,
  selectedHotspotId: null,
  newHotspotLabel: '',
  hotspotsVisible: true,

  // UI state
  showStats: false,

  // Mouse state
  mouseState: {
    isDown: false,
    lastX: 0,
    lastY: 0,
    button: null
  }
};

// Reducer function
function editorReducer(state, action) {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: true, error: '' };
    
    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false };
    
    case 'SET_MODEL_LOADED':
      return { 
        ...state, 
        isModelLoaded: true, 
        isLoading: false, 
        currentModel: action.payload,
        hotspots: [],
        selectedHotspotId: null,
        error: ''
      };
    
    case 'CLEAR_MODEL':
      return { 
        ...state, 
        isModelLoaded: false, 
        currentModel: null,
        hotspots: [],
        selectedHotspotId: null
      };

    case 'ADD_HOTSPOT':
      return { 
        ...state, 
        hotspots: [...state.hotspots, action.payload],
        selectedHotspotId: action.payload.id,
        newHotspotLabel: '',
        isAddingHotspot: false
      };
    
    case 'DELETE_HOTSPOT':
      return { 
        ...state, 
        hotspots: state.hotspots.filter(h => h.id !== action.payload),
        selectedHotspotId: state.selectedHotspotId === action.payload ? null : state.selectedHotspotId
      };
    
    case 'SELECT_HOTSPOT':
      return { ...state, selectedHotspotId: action.payload };
    
    case 'SET_HOTSPOT_LABEL':
      return { ...state, newHotspotLabel: action.payload };
    
    case 'TOGGLE_ADDING_HOTSPOT':
      return { 
        ...state, 
        isAddingHotspot: !state.isAddingHotspot,
        newHotspotLabel: !state.isAddingHotspot ? state.newHotspotLabel : ''
      };
    
    case 'SET_HOTSPOTS_VISIBLE':
      return { ...state, hotspotsVisible: action.payload };
    
    case 'CLEAR_ALL_HOTSPOTS':
      return { ...state, hotspots: [], selectedHotspotId: null };

    case 'TOGGLE_STATS':
      return { ...state, showStats: !state.showStats };

    case 'SET_MOUSE_STATE':
      return { ...state, mouseState: action.payload };

    default:
      return state;
  }
}

/**
 * SwiftXR 3D Editor - Main Component
 * Handles GLB model loading, 3D navigation, and hotspot management
 */
const SwiftXR3DEditor = () => {
  // Refs
  const canvasRef = useRef(null);
  const modelLoaderRef = useRef(new ModelLoader());
  const raycasterRef = useRef(new THREE.Raycaster());
  const mouseRef = useRef(new THREE.Vector2());
  
  // State management
  const [state, dispatch] = useReducer(editorReducer, initialState);
  
  // Three.js scene hook
  const {
    sceneRef,
    cameraRef,
    rotateCameraBy,
    panCameraBy,
    zoomCameraBy,
    resetCamera,
    addModelToScene,
    currentModel: hookCurrentModel
  } = useThreeScene(canvasRef);

  // Get the current model (from state or hook)
  const getCurrentModel = useCallback(() => {
    return state.currentModel || hookCurrentModel;
  }, [state.currentModel, hookCurrentModel]);

  // === FILE HANDLING ===
  
  const handleFileUpload = useCallback(async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    dispatch({ type: 'SET_LOADING' });

    try {
      console.log('Loading GLB file:', file.name);
      
      // Load the model
      const loadedModel = await modelLoaderRef.current.loadGLB(file);
      console.log('Model loaded successfully:', loadedModel);
      
      // Prepare model for display
      const preparedModel = modelLoaderRef.current.prepareModel(loadedModel, {
        center: true,
        scale: true,
        targetSize: 4,
        enableShadows: true
      });

      // Add to scene
      const sceneModel = addModelToScene(preparedModel);
      
      // Update state
      dispatch({ type: 'SET_MODEL_LOADED', payload: sceneModel });
      
      console.log('Model added to scene:', sceneModel);

    } catch (error) {
      console.error('Error loading model:', error);
      dispatch({ type: 'SET_ERROR', payload: error.message });
    }

    // Reset file input
    event.target.value = '';
  }, [addModelToScene]);

  // === MOUSE HANDLING ===
  
  const handleMouseDown = useCallback((event) => {
    if (!canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Handle hotspot placement
    if (state.isAddingHotspot && state.isModelLoaded && state.newHotspotLabel.trim()) {
      handleHotspotPlacement(x, y);
      return;
    }

    // Handle camera controls
    if (state.isModelLoaded && !state.isAddingHotspot) {
      dispatch({ 
        type: 'SET_MOUSE_STATE', 
        payload: {
          isDown: true,
          lastX: x,
          lastY: y,
          button: event.button
        }
      });
    }
  }, [state.isAddingHotspot, state.isModelLoaded, state.newHotspotLabel]);

  const handleMouseMove = useCallback((event) => {
    if (!state.mouseState.isDown || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const deltaX = x - state.mouseState.lastX;
    const deltaY = y - state.mouseState.lastY;

    if (state.mouseState.button === 0) {
      // Left mouse - rotate
      rotateCameraBy(deltaX, deltaY);
    } else if (state.mouseState.button === 2) {
      // Right mouse - pan
      panCameraBy(deltaX, deltaY);
    }

    dispatch({ 
      type: 'SET_MOUSE_STATE', 
      payload: {
        ...state.mouseState,
        lastX: x,
        lastY: y
      }
    });
  }, [state.mouseState, rotateCameraBy, panCameraBy]);

  const handleMouseUp = useCallback(() => {
    dispatch({ 
      type: 'SET_MOUSE_STATE', 
      payload: {
        ...state.mouseState,
        isDown: false,
        button: null
      }
    });
  }, [state.mouseState]);

  const handleWheel = useCallback((event) => {
    if (!state.isModelLoaded) return;
    
    event.preventDefault();
    const delta = event.deltaY > 0 ? 1 : -1;
    zoomCameraBy(delta);
  }, [state.isModelLoaded, zoomCameraBy]);

  // === HOTSPOT HANDLING ===
  
  const handleHotspotPlacement = useCallback((screenX, screenY) => {
    const currentModel = getCurrentModel();
    if (!currentModel || !state.newHotspotLabel.trim()) return;

    const rect = canvasRef.current.getBoundingClientRect();
    
    // Convert to normalized coordinates
    mouseRef.current.x = ((screenX / rect.width) * 2) - 1;
    mouseRef.current.y = -((screenY / rect.height) * 2) + 1;

    // Raycast
    raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);
    const intersects = raycasterRef.current.intersectObject(currentModel, true);

    if (intersects.length > 0) {
      const point = intersects[0].point;
      
      const newHotspot = {
        id: Date.now(),
        label: state.newHotspotLabel.trim(),
        position: {
          x: point.x,
          y: point.y,
          z: point.z
        },
        screenPosition: { x: screenX, y: screenY },
        createdAt: new Date().toISOString()
      };

      dispatch({ type: 'ADD_HOTSPOT', payload: newHotspot });
    }
  }, [getCurrentModel, state.newHotspotLabel]);

  // === EVENT HANDLERS ===
  
  const deleteHotspot = useCallback((id) => {
    dispatch({ type: 'DELETE_HOTSPOT', payload: id });
  }, []);

  const selectHotspot = useCallback((hotspot) => {
    dispatch({ type: 'SELECT_HOTSPOT', payload: hotspot.id });
  }, []);

  const toggleHotspotMode = useCallback(() => {
    dispatch({ type: 'TOGGLE_ADDING_HOTSPOT' });
  }, []);

  const clearAllHotspots = useCallback(() => {
    dispatch({ type: 'CLEAR_ALL_HOTSPOTS' });
  }, []);

  const getCursorStyle = useCallback(() => {
    if (state.isAddingHotspot) return 'canvas-hotspot';
    if (state.mouseState.isDown) {
      return state.mouseState.button === 2 ? 'canvas-pan' : 'canvas-rotate';
    }
    return 'canvas-rotate';
  }, [state.isAddingHotspot, state.mouseState]);

  // === EVENT LISTENERS ===
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('wheel', handleWheel);
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());

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

  // === RENDER ===
  
  return (
    <div className="w-full h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex flex-col">
      {/* Header */}
      <div className="editor-header">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-white">SwiftXR 3D Editor</h1>
            <p className="text-gray-400 text-sm">Technical Assessment - GLB Model Viewer & Hotspot Editor</p>
          </div>
          
          <button
            onClick={() => dispatch({ type: 'TOGGLE_STATS' })}
            className="btn-secondary text-sm"
          >
            <Settings size={16} />
            {state.showStats ? 'Hide Stats' : 'Show Stats'}
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
              disabled={state.isLoading}
            />
          </label>

          {/* Model Controls */}
          {state.isModelLoaded && (
            <>
              <button onClick={resetCamera} className="btn-secondary">
                <RotateCcw size={18} />
                Reset View
              </button>

              {/* Hotspot Controls */}
              <div className="flex items-center gap-2">
                <button
                  onClick={toggleHotspotMode}
                  className={state.isAddingHotspot ? "btn-danger" : "btn-success"}
                >
                  <MapPin size={18} />
                  {state.isAddingHotspot ? 'Cancel Hotspot' : 'Add Hotspot'}
                </button>

                <button
                  onClick={() => dispatch({ type: 'SET_HOTSPOTS_VISIBLE', payload: !state.hotspotsVisible })}
                  className="btn-secondary"
                >
                  {state.hotspotsVisible ? <Eye size={18} /> : <EyeOff size={18} />}
                  {state.hotspotsVisible ? 'Hide' : 'Show'} Hotspots
                </button>

                {state.hotspots.length > 0 && (
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
              {state.isAddingHotspot && (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={state.newHotspotLabel}
                    onChange={(e) => dispatch({ type: 'SET_HOTSPOT_LABEL', payload: e.target.value })}
                    placeholder="Enter hotspot label..."
                    className="px-3 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none min-w-48"
                    autoFocus
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
        {state.isModelLoaded && (
          <div className="mt-4 text-sm text-gray-400 space-y-1">
            <div className="flex flex-wrap gap-4">
              <span><strong>Rotate:</strong> Left click + drag</span>
              <span><strong>Pan:</strong> Right click + drag</span>
              <span><strong>Zoom:</strong> Mouse wheel</span>
            </div>
            {state.isAddingHotspot && state.newHotspotLabel.trim() && (
              <div className="text-yellow-400">
                <strong>Hotspot Mode:</strong> Click on the 3D model to place "{state.newHotspotLabel}"
              </div>
            )}
          </div>
        )}

        {/* Statistics */}
        {state.showStats && state.isModelLoaded && (
          <div className="mt-4 p-3 bg-gray-700 rounded-lg">
            <div className="flex items-center justify-between">
              <HotspotStats hotspots={state.hotspots} />
              <div className="text-sm text-gray-400">
                Model: {getCurrentModel() ? 'Loaded' : 'None'} | 
                Hotspots: {state.hotspots.length}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main 3D Canvas Area */}
      <div className="flex-1 relative canvas-container">
        <canvas 
          ref={canvasRef}
          className={`w-full h-full ${getCursorStyle()}`}
        />

        {/* Overlays */}
        <HotspotOverlay
          hotspots={state.hotspots}
          visible={state.hotspotsVisible}
          selectedHotspotId={state.selectedHotspotId}
          onDeleteHotspot={deleteHotspot}
          onHotspotClick={selectHotspot}
        />

        {/* Loading Overlay */}
        {state.isLoading && (
          <div className="loading-overlay">
            <div className="loading-content">
              <div className="loading-spinner w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-gray-800 font-medium">Loading 3D Model...</p>
              <p className="text-gray-600 text-sm mt-2">Processing GLB file...</p>
            </div>
          </div>
        )}

        {/* Error Message */}
        {state.error && (
          <div className="error-message">
            <div className="flex items-center gap-2">
              <span>{state.error}</span>
              <button 
                onClick={() => dispatch({ type: 'SET_ERROR', payload: '' })}
                className="text-red-200 hover:text-white text-lg leading-none"
              >
                ×
              </button>
            </div>
          </div>
        )}

        {/* Welcome Screen */}
        {!state.isModelLoaded && !state.isLoading && (
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
                  <p className="text-sm text-gray-400">Upload GLB/GLTF 3D model files</p>
                </div>
                
                <div className="p-6 bg-gray-800 bg-opacity-50 rounded-lg border border-gray-700">
                  <Move3D size={32} className="mx-auto mb-3 text-green-400" />
                  <h3 className="font-semibold text-white mb-2">2. Navigate</h3>
                  <p className="text-sm text-gray-400">Rotate, pan, and zoom to explore</p>
                </div>
                
                <div className="p-6 bg-gray-800 bg-opacity-50 rounded-lg border border-gray-700">
                  <MapPin size={32} className="mx-auto mb-3 text-red-400" />
                  <h3 className="font-semibold text-white mb-2">3. Label</h3>
                  <p className="text-sm text-gray-400">Add hotspots to label parts</p>
                </div>
              </div>

              <div className="mt-8 text-sm text-gray-500">
                <p><strong>Supported:</strong> GLB, GLTF • <strong>Max Size:</strong> 50MB</p>
              </div>
            </div>
          </div>
        )}

        {/* Hotspot Mode Indicator */}
        {state.isAddingHotspot && (
          <div className="absolute top-4 right-4 bg-yellow-500 text-black px-4 py-2 rounded-lg shadow-lg">
            <div className="flex items-center gap-2">
              <MapPin size={16} />
              <span className="font-medium">Hotspot Mode Active</span>
            </div>
            <div className="text-sm mt-1">
              {state.newHotspotLabel.trim() ? `Ready: "${state.newHotspotLabel}"` : 'Enter a label first'}
            </div>
          </div>
        )}

        {/* Debug Panel */}
        {state.showStats && getCurrentModel() && (
          <div className="absolute bottom-4 left-4 bg-black bg-opacity-80 text-white p-3 rounded-lg text-xs font-mono max-w-sm">
            <div className="mb-2 font-bold">Debug Info:</div>
            {(() => {
              const model = getCurrentModel();
              const inScene = sceneRef.current?.getObjectByProperty('uuid', model.uuid);
              return (
                <>
                  <div>Model Loaded: {state.isModelLoaded ? 'Yes' : 'No'}</div>
                  <div>Visible: {model.visible ? 'Yes' : 'No'}</div>
                  <div>In Scene: {inScene ? 'Yes' : 'No'}</div>
                  <div>Children: {model.children.length}</div>
                  <div>Hotspots: {state.hotspots.length}</div>
                  <div>Scene Objects: {sceneRef.current?.children.length || 0}</div>
                </>
              );
            })()}
          </div>
        )}
      </div>

      {/* Bottom Panel */}
      <HotspotList 
        hotspots={state.hotspots}
        selectedHotspotId={state.selectedHotspotId}
        onDeleteHotspot={deleteHotspot}
        onHotspotSelect={selectHotspot}
      />
    </div>
  );
};

export default SwiftXR3DEditor;