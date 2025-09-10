// src/hooks/useThreeScene.js
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

export function useThreeScene(canvasRef) {
  const sceneRef = useRef();
  const cameraRef = useRef();
  const rendererRef = useRef();
  const controlsRef = useRef();
  const currentModelRef = useRef();

  useEffect(() => {
    if (!canvasRef.current) return;

    // === Scene ===
    const scene = new THREE.Scene();
    // Dark background OR transparent
    scene.background = new THREE.Color(0x111827);
    sceneRef.current = scene;

    // === Camera ===
    const camera = new THREE.PerspectiveCamera(
      60,
      canvasRef.current.clientWidth / canvasRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 2, 6);
    cameraRef.current = camera;

    // === Renderer ===
    const renderer = new THREE.WebGLRenderer({ canvas: canvasRef.current, antialias: true });
    renderer.setSize(canvasRef.current.clientWidth, canvasRef.current.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    rendererRef.current = renderer;

    // === Controls ===
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enablePan = true;
    controls.enableZoom = true; // Enable zoom through OrbitControls
    controls.enableRotate = false; // Disable automatic rotation, we'll handle it manually
    controlsRef.current = controls;

    // === Lights ===
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 1.2);
    hemiLight.position.set(0, 20, 0);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1);
    dirLight.position.set(5, 10, 7);
    dirLight.castShadow = true;
    scene.add(dirLight);

    // === Ground ===
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(100, 100),
      new THREE.MeshPhongMaterial({ color: 0x222222, depthWrite: false })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // === Animate Loop ===
    const animate = () => {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // === Handle Resize ===
    const handleResize = () => {
      if (!canvasRef.current) return;
      camera.aspect = canvasRef.current.clientWidth / canvasRef.current.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(canvasRef.current.clientWidth, canvasRef.current.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
    };
  }, [canvasRef]);

  // === Manual Camera Controls ===
  const rotateCameraBy = (dx, dy) => {
    if (!controlsRef.current || !cameraRef.current) return;
    
    const controls = controlsRef.current;
    const camera = cameraRef.current;
    
    // Get current spherical coordinates
    const spherical = new THREE.Spherical();
    const offset = new THREE.Vector3();
    
    // Calculate offset from target
    offset.copy(camera.position).sub(controls.target);
    spherical.setFromVector3(offset);
    
    // Apply rotation deltas
    spherical.theta -= dx * 0.01; // Horizontal rotation
    spherical.phi += dy * 0.01;   // Vertical rotation
    
    // Constrain phi to avoid flipping
    spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, spherical.phi));
    
    // Convert back to cartesian coordinates
    offset.setFromSpherical(spherical);
    camera.position.copy(controls.target).add(offset);
    
    // Update controls
    controls.update();
  };

  const panCameraBy = (dx, dy) => {
    if (!controlsRef.current || !cameraRef.current) return;
    
    const controls = controlsRef.current;
    const camera = cameraRef.current;
    
    // Get camera's right and up vectors
    const cameraDirection = new THREE.Vector3();
    camera.getWorldDirection(cameraDirection);
    
    const right = new THREE.Vector3();
    right.crossVectors(cameraDirection, camera.up).normalize();
    
    const up = new THREE.Vector3();
    up.crossVectors(right, cameraDirection).normalize();
    
    // Calculate pan distance based on camera distance from target
    const distance = camera.position.distanceTo(controls.target);
    const panSpeed = distance * 0.001;
    
    // Apply panning
    const panOffset = new THREE.Vector3();
    panOffset.addScaledVector(right, -dx * panSpeed);
    panOffset.addScaledVector(up, dy * panSpeed);
    
    // Move both camera and target
    camera.position.add(panOffset);
    controls.target.add(panOffset);
    
    controls.update();
  };

  const zoomCameraBy = (delta) => {
    if (!cameraRef.current || !controlsRef.current) return;
    
    const camera = cameraRef.current;
    const controls = controlsRef.current;

    if (camera.isPerspectiveCamera) {
      // Calculate zoom direction (towards/away from target)
      const direction = new THREE.Vector3();
      direction.subVectors(controls.target, camera.position).normalize();
      
      // Calculate zoom distance based on current distance
      const currentDistance = camera.position.distanceTo(controls.target);
      const zoomSpeed = currentDistance * 0.1;
      const zoomDistance = delta > 0 ? -zoomSpeed : zoomSpeed;
      
      // Apply zoom
      camera.position.addScaledVector(direction, zoomDistance);
      
      // Prevent camera from going too close or too far
      const minDistance = 0.1;
      const maxDistance = 100;
      const newDistance = camera.position.distanceTo(controls.target);
      
      if (newDistance < minDistance || newDistance > maxDistance) {
        // Revert if too close or too far
        camera.position.addScaledVector(direction, -zoomDistance);
      }
    } else if (camera.isOrthographicCamera) {
      camera.zoom = Math.max(0.1, camera.zoom + delta * 0.1);
      camera.updateProjectionMatrix();
    }

    controls.update();
  };

  const resetCamera = () => {
    if (controlsRef.current && cameraRef.current) {
      // Reset to initial position
      cameraRef.current.position.set(0, 2, 6);
      controlsRef.current.target.set(0, 0, 0);
      controlsRef.current.update();
    }
  };

  const addModelToScene = (model) => {
    if (!sceneRef.current) return null;

    // Remove old model
    if (currentModelRef.current) {
      sceneRef.current.remove(currentModelRef.current);
    }

    // Center model
    const box = new THREE.Box3().setFromObject(model);
    const center = new THREE.Vector3();
    box.getCenter(center);
    model.position.sub(center);

    sceneRef.current.add(model);
    currentModelRef.current = model;

    // Focus camera on model
    if (controlsRef.current) {
      controlsRef.current.target.set(0, 0, 0);
      controlsRef.current.update();
    }

    return model;
  };

  return {
    sceneRef,
    cameraRef,
    rotateCameraBy,
    panCameraBy,
    zoomCameraBy,
    resetCamera,
    addModelToScene,
    currentModel: currentModelRef.current
  };
}