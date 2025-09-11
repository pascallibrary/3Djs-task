import React, { useRef, useReducer, useCallback, useEffect } from 'react';
import * as THREE from 'three';
import { Upload, RotateCcw, Focus, MapPin, Trash2, Eye, EyeOff, Settings } from 'lucide-react';
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
  showStats: false
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
  
  // Three.js scene hook - UPDATED to match new hook signature
  const {
    sceneRef,
    cameraRef,
    controlsRef,
    addModelToScene,
    resetCamera,
    focusOnModel,
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

    // Validate file size (50MB limit)
    const maxSize = 50 * 1024 * 1024; // 50MB in bytes
    if (file.size > maxSize) {
      dispatch({ 
        type: 'SET_ERROR', 
        payload: `File size (${(file.size / 1024 / 1024).toFixed(1)}MB) exceeds 50MB limit` 
      });
      event.target.value = '';
      return;
    }

    dispatch({ type: 'SET_LOADING' });

    try {
      console.log('Loading GLB file:', file.name, `(${(file.size / 1024 / 1024).toFixed(2)}MB)`);
      
      // Load the model
      const loadedModel = await modelLoaderRef.current.loadGLB(file);
      console.log('Model loaded successfully:', loadedModel);
      
      // Prepare model for display with consistent settings
      const preparedModel = modelLoaderRef.current.prepareModel(loadedModel, {
        center: true,
        scale: true,
        targetSize: 4,
        enableShadows: true
      });

      // Add to scene (the hook handles centering and camera positioning)
      const sceneModel = addModelToScene(preparedModel);
      
      // Update state
      dispatch({ type: 'SET_MODEL_LOADED', payload: sceneModel });
      
      console.log('Model added to scene and centered:', sceneModel);

    } catch (error) {
      console.error('Error loading model:', error);
      dispatch({ type: 'SET_ERROR', payload: `Failed to load model: ${error.message}` });
    }

    // Reset file input
    event.target.value = '';
  }, [addModelToScene]);

  // === HOTSPOT HANDLING ===
  
  const handleCanvasClick = useCallback((event) => {
    if (!canvasRef.current || !state.isAddingHotspot || !state.newHotspotLabel.trim()) return;

    const currentModel = getCurrentModel();
    if (!currentModel) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    // Convert to normalized coordinates
    mouseRef.current.x = ((x / rect.width) * 2) - 1;
    mouseRef.current.y = -((y / rect.height) * 2) + 1;

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
        screenPosition: { x, y },
        createdAt: new Date().toISOString()
      };

      dispatch({ type: 'ADD_HOTSPOT', payload: newHotspot });
    }
  }, [getCurrentModel, state.isAddingHotspot, state.newHotspotLabel]);

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

  // === EVENT LISTENERS ===
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.addEventListener('click', handleCanvasClick);

    return () => {
      canvas.removeEventListener('click', handleCanvasClick);
    };
  }, [handleCanvasClick]);

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

              <button onClick={focusOnModel} className="btn-secondary">
                <Focus size={18} />
                Focus Model
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
              <span><strong>Hotspots:</strong> Click on model to place</span>
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
          className="w-full h-full cursor-pointer"
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
                  <p className="text-sm text-gray-400">Upload GLB/GLTF files up to 50MB</p>
                </div>
                
                <div className="p-6 bg-gray-800 bg-opacity-50 rounded-lg border border-gray-700">
                  <RotateCcw size={32} className="mx-auto mb-3 text-green-400" />
                  <h3 className="font-semibold text-white mb-2">2. Navigate</h3>
                  <p className="text-sm text-gray-400">Use OrbitControls to rotate, pan, and zoom</p>
                </div>
                
                <div className="p-6 bg-gray-800 bg-opacity-50 rounded-lg border border-gray-700">
                  <MapPin size={32} className="mx-auto mb-3 text-red-400" />
                  <h3 className="font-semibold text-white mb-2">3. Label</h3>
                  <p className="text-sm text-gray-400">Click to add hotspot annotations</p>
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
                  <div>Position: {model.position.x.toFixed(2)}, {model.position.y.toFixed(2)}, {model.position.z.toFixed(2)}</div>
                  <div>Scale: {model.scale.x.toFixed(2)}</div>
                  <div>Hotspots: {state.hotspots.length}</div>
                  <div>Scene Objects: {sceneRef.current?.children.length || 0}</div>
                  <div>Camera Distance: {cameraRef.current ? cameraRef.current.position.distanceTo(controlsRef.current?.target || new THREE.Vector3(0,0,0)).toFixed(2) : 'N/A'}</div>
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