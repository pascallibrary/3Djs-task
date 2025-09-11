import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

export function useThreeScene(canvasRef) {
  const sceneRef = useRef();
  const cameraRef = useRef();
  const rendererRef = useRef();
  const controlsRef = useRef();
  const currentModelRef = useRef();
  const animationIdRef = useRef();

  useEffect(() => {
    if (!canvasRef.current) return;

    // === Scene ===
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x111827);
    sceneRef.current = scene;

    // === Camera ===
    const camera = new THREE.PerspectiveCamera(
      60,
      canvasRef.current.clientWidth / canvasRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 2, 8);
    cameraRef.current = camera;

    // === Renderer ===
    const renderer = new THREE.WebGLRenderer({ 
      canvas: canvasRef.current, 
      antialias: true,
      alpha: false
    });
    renderer.setSize(canvasRef.current.clientWidth, canvasRef.current.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1;
    rendererRef.current = renderer;

    // === Controls - Use OrbitControls properly ===
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enablePan = true;
    controls.enableZoom = true;
    controls.enableRotate = true; // Enable proper rotation
    
    // Set reasonable bounds
    controls.minDistance = 1;
    controls.maxDistance = 50;
    controls.maxPolarAngle = Math.PI; // Allow full rotation
    controls.minPolarAngle = 0;
    
    // Target stays at origin
    controls.target.set(0, 0, 0);
    controlsRef.current = controls;

    // === Enhanced Lighting ===
    // Hemisphere light for overall illumination
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.8);
    hemiLight.position.set(0, 20, 0);
    scene.add(hemiLight);

    // Main directional light with shadows
    const dirLight = new THREE.DirectionalLight(0xffffff, 1);
    dirLight.position.set(10, 10, 5);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 0.1;
    dirLight.shadow.camera.far = 50;
    dirLight.shadow.camera.left = -10;
    dirLight.shadow.camera.right = 10;
    dirLight.shadow.camera.top = 10;
    dirLight.shadow.camera.bottom = -10;
    scene.add(dirLight);

    // Fill light
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
    fillLight.position.set(-5, 5, -5);
    scene.add(fillLight);

    // === Ground ===
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(100, 100),
      new THREE.MeshLambertMaterial({ 
        color: 0x333333, 
        transparent: true,
        opacity: 0.8
      })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.01; // Slightly below origin
    ground.receiveShadow = true;
    scene.add(ground);

    // === Animate Loop ===
    const animate = () => {
      animationIdRef.current = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // === Handle Resize ===
    const handleResize = () => {
      if (!canvasRef.current) return;
      
      const width = canvasRef.current.clientWidth;
      const height = canvasRef.current.clientHeight;
      
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      // Cleanup
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
      window.removeEventListener('resize', handleResize);
      
      // Dispose Three.js resources
      scene.traverse((child) => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach(mat => mat.dispose());
          } else {
            child.material.dispose();
          }
        }
      });
      
      renderer.dispose();
      controls.dispose();
    };
  }, [canvasRef]);

  // === Model Management ===
  const addModelToScene = (model) => {
    if (!sceneRef.current) return null;

    // Remove old model with proper cleanup
    if (currentModelRef.current) {
      const oldModel = currentModelRef.current;
      sceneRef.current.remove(oldModel);
      
      // Dispose old model resources
      oldModel.traverse((child) => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach(mat => mat.dispose());
          } else {
            child.material.dispose();
          }
        }
      });
    }

    // Calculate model bounds
    const box = new THREE.Box3().setFromObject(model);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    
    box.getSize(size);
    box.getCenter(center);

    // Center the model at origin
    model.position.sub(center);

    // Scale model to fit in view (target size of 4 units)
    const maxDim = Math.max(size.x, size.y, size.z);
    const targetSize = 4; // FIXED: Define targetSize before using it
    
    if (maxDim > 0) {
      const scale = targetSize / maxDim;
      model.scale.multiplyScalar(scale);
    }

    // Add to scene
    sceneRef.current.add(model);
    currentModelRef.current = model;

    // Position camera for optimal viewing
    if (controlsRef.current && cameraRef.current) {
      const controls = controlsRef.current;
      const camera = cameraRef.current;
      
      // Reset target to origin
      controls.target.set(0, 0, 0);
      
      // Position camera based on model size (using targetSize, not scaledSize)
      const distance = targetSize * 2.5; // Good viewing distance
      
      camera.position.set(distance * 0.7, distance * 0.5, distance);
      camera.lookAt(0, 0, 0);
      
      // Update camera bounds based on model size
      controls.minDistance = targetSize * 0.5;
      controls.maxDistance = targetSize * 10;
      
      controls.update();
    }

    // Enable shadows on model
    model.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        
        // Ensure materials are properly configured
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach(mat => {
              if (mat.map) mat.map.flipY = false; // Fix texture orientation
            });
          } else {
            if (child.material.map) child.material.map.flipY = false;
          }
        }
      }
    });

    return model;
  };

  const resetCamera = () => {
    if (!controlsRef.current || !cameraRef.current) return;
    
    const controls = controlsRef.current;
    const camera = cameraRef.current;
    
    // Reset to a good default position
    const distance = controls.maxDistance * 0.3;
    camera.position.set(distance * 0.7, distance * 0.5, distance);
    controls.target.set(0, 0, 0);
    controls.update();
  };

  const focusOnModel = () => {
    if (!currentModelRef.current || !controlsRef.current || !cameraRef.current) return;
    
    const model = currentModelRef.current;
    const controls = controlsRef.current;
    const camera = cameraRef.current;
    
    // Calculate optimal camera position
    const box = new THREE.Box3().setFromObject(model);
    const size = new THREE.Vector3();
    box.getSize(size);
    
    const maxDim = Math.max(size.x, size.y, size.z);
    const distance = maxDim * 2.5;
    
    camera.position.set(distance * 0.7, distance * 0.5, distance);
    controls.target.set(0, 0, 0);
    controls.update();
  };

  return {
    sceneRef,
    cameraRef,
    controlsRef,
    addModelToScene,
    resetCamera,
    focusOnModel,
    currentModel: currentModelRef.current
  };
}