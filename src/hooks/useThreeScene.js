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
    controls.enableZoom = false; // we’ll handle zoom manually
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

  // === Camera Controls ===
  const rotateCameraBy = (dx, dy) => {
    if (controlsRef.current) {
      controlsRef.current.rotateLeft(dx * 0.005);
      controlsRef.current.rotateUp(dy * 0.005);
    }
  };

  const panCameraBy = (dx, dy) => {
    if (controlsRef.current) {
      controlsRef.current.pan(dx * 0.01, dy * 0.01);
    }
  };

  const zoomCameraBy = (delta) => {
    if (!cameraRef.current || !controlsRef.current) return;
    const camera = cameraRef.current;
    const controls = controlsRef.current;

    if (camera.isPerspectiveCamera) {
      const zoomFactor = delta > 0 ? 1.1 : 0.9;
      camera.position.addScaledVector(camera.getWorldDirection(new THREE.Vector3()), delta > 0 ? zoomFactor : -zoomFactor);
    } else if (camera.isOrthographicCamera) {
      camera.zoom = Math.max(0.1, camera.zoom + delta * 0.1);
      camera.updateProjectionMatrix();
    }

    controls.update();
  };

  const resetCamera = () => {
    if (controlsRef.current) {
      controlsRef.current.reset();
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
