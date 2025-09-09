import { useRef, useEffect, useCallback, useState } from 'react';
import * as THREE from 'three';

/**
 * Custom React Hook for Three.js Scene Management
 * 
 * This hook encapsulates all Three.js scene setup, camera controls,
 * and rendering logic for the 3D editor.
 */
export const useThreeScene = (canvasRef) => {
  // Three.js core references
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const animationIdRef = useRef(null);

  // Camera control state
  const [cameraControls, setCameraControls] = useState({
    distance: 8,
    rotationX: 0.3,
    rotationY: 0.5,
    targetX: 0,
    targetY: 0,
    targetZ: 0
  });

  /**
   * Initialize the Three.js scene, camera, renderer, and lighting
   */
  const initializeScene = useCallback(() => {
    if (!canvasRef.current) return null;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x2a2a2a);
    scene.fog = new THREE.Fog(0x2a2a2a, 10, 50);

    // Camera setup
    const camera = new THREE.PerspectiveCamera(
      60, // FOV
      canvasRef.current.clientWidth / canvasRef.current.clientHeight, // Aspect ratio
      0.1, // Near plane
      1000 // Far plane
    );
    
    // Set initial camera position
    updateCameraPosition(camera, cameraControls);

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true,
      alpha: true
    });
    
    renderer.setSize(
      canvasRef.current.clientWidth,
      canvasRef.current.clientHeight
    );
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;

    // Lighting setup
    setupLighting(scene);

    // Environment setup
    setupEnvironment(scene);

    // Store references
    sceneRef.current = scene;
    rendererRef.current = renderer;
    cameraRef.current = camera;

    return { scene, camera, renderer };
  }, [canvasRef, cameraControls]);

  /**
   * Update camera position based on spherical coordinates
   */
  const updateCameraPosition = useCallback((camera, controls) => {
    const { distance, rotationX, rotationY, targetX, targetY, targetZ } = controls;
    
    // Convert spherical to cartesian coordinates
    const x = Math.sin(rotationY) * Math.cos(rotationX) * distance;
    const y = Math.sin(rotationX) * distance;
    const z = Math.cos(rotationY) * Math.cos(rotationX) * distance;
    
    camera.position.set(x + targetX, y + targetY, z + targetZ);
    camera.lookAt(targetX, targetY, targetZ);
  }, []);

  /**
   * Setup scene lighting
   */
  const setupLighting = useCallback((scene) => {
    // Ambient light for general illumination
    const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
    scene.add(ambientLight);

    // Main directional light (sun-like)
    const mainLight = new THREE.DirectionalLight(0xffffff, 0.8);
    mainLight.position.set(10, 10, 5);
    mainLight.castShadow = true;
    
    // Shadow camera setup
    mainLight.shadow.mapSize.width = 2048;
    mainLight.shadow.mapSize.height = 2048;
    mainLight.shadow.camera.near = 0.5;
    mainLight.shadow.camera.far = 50;
    mainLight.shadow.camera.left = -10;
    mainLight.shadow.camera.right = 10;
    mainLight.shadow.camera.top = 10;
    mainLight.shadow.camera.bottom = -10;
    scene.add(mainLight);

    // Fill light from the opposite side
    const fillLight = new THREE.DirectionalLight(0x7c4dff, 0.3);
    fillLight.position.set(-5, 3, -5);
    scene.add(fillLight);

    // Rim light for better depth perception
    const rimLight = new THREE.DirectionalLight(0xffffff, 0.2);
    rimLight.position.set(0, 5, -10);
    scene.add(rimLight);
  }, []);

  /**
   * Setup environment elements (grid, etc.)
   */
  const setupEnvironment = useCallback((scene) => {
    // Grid helper for spatial reference
    const gridHelper = new THREE.GridHelper(20, 20, 0x444444, 0x222222);
    scene.add(gridHelper);

    // Ground plane for shadows
    const groundGeometry = new THREE.PlaneGeometry(50, 50);
    const groundMaterial = new THREE.ShadowMaterial({ opacity: 0.3 });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.01;
    ground.receiveShadow = true;
    scene.add(ground);
  }, []);

  /**
   * Animation loop
   */
  const animate = useCallback(() => {
    if (!rendererRef.current || !sceneRef.current || !cameraRef.current) return;

    animationIdRef.current = requestAnimationFrame(animate);
    rendererRef.current.render(sceneRef.current, cameraRef.current);
  }, []);

  /**
   * Handle window resize
   */
  const handleResize = useCallback(() => {
    if (!canvasRef.current || !cameraRef.current || !rendererRef.current) return;

    const width = canvasRef.current.clientWidth;
    const height = canvasRef.current.clientHeight;

    cameraRef.current.aspect = width / height;
    cameraRef.current.updateProjectionMatrix();
    rendererRef.current.setSize(width, height);
  }, []);

  /**
   * Camera control methods
   */
  const rotateCameraBy = useCallback((deltaX, deltaY) => {
    setCameraControls(prev => {
      const newControls = {
        ...prev,
        rotationY: prev.rotationY + deltaX * 0.01,
        rotationX: Math.max(-Math.PI/2 + 0.1, Math.min(Math.PI/2 - 0.1, prev.rotationX + deltaY * 0.01))
      };
      
      if (cameraRef.current) {
        updateCameraPosition(cameraRef.current, newControls);
      }
      
      return newControls;
    });
  }, [updateCameraPosition]);

  const panCameraBy = useCallback((deltaX, deltaY) => {
    setCameraControls(prev => {
      const panSpeed = 0.01;
      const newControls = {
        ...prev,
        targetX: prev.targetX - deltaX * panSpeed,
        targetY: prev.targetY + deltaY * panSpeed
      };
      
      if (cameraRef.current) {
        updateCameraPosition(cameraRef.current, newControls);
      }
      
      return newControls;
    });
  }, [updateCameraPosition]);

  const zoomCameraBy = useCallback((delta) => {
    setCameraControls(prev => {
      const zoomSpeed = 0.1;
      const newDistance = Math.max(2, Math.min(50, prev.distance * (1 + delta * zoomSpeed)));
      const newControls = {
        ...prev,
        distance: newDistance
      };
      
      if (cameraRef.current) {
        updateCameraPosition(cameraRef.current, newControls);
      }
      
      return newControls;
    });
  }, [updateCameraPosition]);

  const resetCamera = useCallback(() => {
    const defaultControls = {
      distance: 8,
      rotationX: 0.3,
      rotationY: 0.5,
      targetX: 0,
      targetY: 0,
      targetZ: 0
    };
    
    setCameraControls(defaultControls);
    
    if (cameraRef.current) {
      updateCameraPosition(cameraRef.current, defaultControls);
    }
  }, [updateCameraPosition]);

  const focusOnModel = useCallback((model) => {
    if (!model || !cameraRef.current) return;

    const box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    
    const newControls = {
      ...cameraControls,
      targetX: center.x,
      targetY: center.y,
      targetZ: center.z,
      distance: maxDim * 2.5
    };
    
    setCameraControls(newControls);
    updateCameraPosition(cameraRef.current, newControls);
  }, [cameraControls, updateCameraPosition]);

  /**
   * Add model to scene
   */
  const addModelToScene = useCallback((model) => {
    if (!sceneRef.current || !model) return;
    
    // Remove any existing models (simple approach for this demo)
    const existingModels = sceneRef.current.children.filter(child => 
      child.userData.isModel
    );
    existingModels.forEach(model => sceneRef.current.remove(model));
    
    // Mark as model and add to scene
    model.userData.isModel = true;
    sceneRef.current.add(model);
    
    // Focus camera on the new model
    focusOnModel(model);
    
    return model;
  }, [focusOnModel]);

  /**
   * Remove model from scene
   */
  const removeModelFromScene = useCallback((model) => {
    if (!sceneRef.current || !model) return;
    sceneRef.current.remove(model);
  }, []);

  /**
   * Get current model in scene
   */
  const getCurrentModel = useCallback(() => {
    if (!sceneRef.current) return null;
    return sceneRef.current.children.find(child => child.userData.isModel) || null;
  }, []);

  // Initialize scene on mount
  useEffect(() => {
    const sceneData = initializeScene();
    if (sceneData) {
      // Start animation loop
      animate();
      
      // Add resize listener
      window.addEventListener('resize', handleResize);
      
      return () => {
        // Cleanup
        if (animationIdRef.current) {
          cancelAnimationFrame(animationIdRef.current);
        }
        window.removeEventListener('resize', handleResize);
        
        if (rendererRef.current) {
          rendererRef.current.dispose();
        }
      };
    }
  }, [initializeScene, animate, handleResize]);

  // Update camera when controls change
  useEffect(() => {
    if (cameraRef.current) {
      updateCameraPosition(cameraRef.current, cameraControls);
    }
  }, [cameraControls, updateCameraPosition]);

  return {
    // References
    sceneRef,
    rendererRef,
    cameraRef,
    
    // Camera controls
    rotateCameraBy,
    panCameraBy,
    zoomCameraBy,
    resetCamera,
    focusOnModel,
    
    // Model management
    addModelToScene,
    removeModelFromScene,
    getCurrentModel,
    
    // Scene state
    cameraControls
  };
};