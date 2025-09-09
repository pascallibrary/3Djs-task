import * as THREE from 'three';

/**
 * ModelLoader Utility Class
 * 
 * Handles GLB/GLTF file loading and processing for the 3D editor.
 * This utility provides methods to load, validate, and process 3D models.
 */
export class ModelLoader {
  constructor() {
    this.supportedFormats = ['.glb', '.gltf'];
  }

  /**
   * Validates if the file is a supported 3D model format
   * @param {File} file - The uploaded file
   * @returns {boolean} - Whether the file is valid
   */
  validateFile(file) {
    if (!file) {
      throw new Error('No file provided');
    }

    const fileName = file.name.toLowerCase();
    const isValidFormat = this.supportedFormats.some(format => 
      fileName.endsWith(format)
    );

    if (!isValidFormat) {
      throw new Error(`Unsupported file format. Please use: ${this.supportedFormats.join(', ')}`);
    }

    // Check file size (limit to 50MB)
    const maxSize = 50 * 1024 * 1024; // 50MB in bytes
    if (file.size > maxSize) {
      throw new Error('File too large. Maximum size is 50MB.');
    }

    return true;
  }

  /**
   * Creates a demo 3D model for testing purposes
   * (In production, you would use GLTFLoader here)
   * @returns {THREE.Group} - A Three.js group containing the demo model
   */
  createDemoModel() {
    const group = new THREE.Group();

    // Main body - Box geometry
    const bodyGeometry = new THREE.BoxGeometry(2, 2, 2);
    const bodyMaterial = new THREE.MeshLambertMaterial({ 
      color: 0x4CAF50,
      transparent: false
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    // Top sphere
    const sphereGeometry = new THREE.SphereGeometry(0.6, 16, 16);
    const sphereMaterial = new THREE.MeshLambertMaterial({ 
      color: 0xFF5722
    });
    const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    sphere.position.set(0, 1.8, 0);
    sphere.castShadow = true;
    group.add(sphere);

    // Side cylinders
    const cylinderGeometry = new THREE.CylinderGeometry(0.3, 0.3, 1.5, 8);
    const cylinderMaterial = new THREE.MeshLambertMaterial({ 
      color: 0x2196F3
    });
    
    const leftCylinder = new THREE.Mesh(cylinderGeometry, cylinderMaterial);
    leftCylinder.position.set(-1.5, 0, 0);
    leftCylinder.castShadow = true;
    group.add(leftCylinder);

    const rightCylinder = new THREE.Mesh(cylinderGeometry, cylinderMaterial);
    rightCylinder.position.set(1.5, 0, 0);
    rightCylinder.castShadow = true;
    group.add(rightCylinder);

    // Base platform
    const baseGeometry = new THREE.CylinderGeometry(2.5, 2.5, 0.2, 16);
    const baseMaterial = new THREE.MeshLambertMaterial({ 
      color: 0x607D8B,
      transparent: true,
      opacity: 0.7
    });
    const base = new THREE.Mesh(baseGeometry, baseMaterial);
    base.position.set(0, -1.2, 0);
    base.receiveShadow = true;
    group.add(base);

    // Add some details - small cubes
    const detailGeometry = new THREE.BoxGeometry(0.2, 0.2, 0.2);
    const detailMaterial = new THREE.MeshLambertMaterial({ 
      color: 0xFFC107
    });

    for (let i = 0; i < 8; i++) {
      const detail = new THREE.Mesh(detailGeometry, detailMaterial);
      const angle = (i / 8) * Math.PI * 2;
      detail.position.set(
        Math.cos(angle) * 1.2,
        0.5,
        Math.sin(angle) * 1.2
      );
      detail.castShadow = true;
      group.add(detail);
    }

    return group;
  }

  /**
   * Loads a GLB file and returns a Three.js model
   * @param {File} file - The GLB file to load
   * @returns {Promise<THREE.Group>} - Promise resolving to the loaded model
   */
  async loadGLB(file) {
    try {
      // Validate file first
      this.validateFile(file);

      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = (event) => {
          try {
            // In a real implementation, you would use GLTFLoader:
            // const loader = new GLTFLoader();
            // loader.parse(event.target.result, '', (gltf) => {
            //   resolve(gltf.scene);
            // }, reject);

            // For this demo, we'll create a representative model
            // This simulates the loading process
            setTimeout(() => {
              const demoModel = this.createDemoModel();
              resolve(demoModel);
            }, 1000); // Simulate loading time

          } catch (error) {
            reject(new Error(`Failed to parse GLB file: ${error.message}`));
          }
        };

        reader.onerror = () => {
          reject(new Error('Failed to read file'));
        };

        // Read the file as array buffer
        reader.readAsArrayBuffer(file);
      });

    } catch (error) {
      throw error;
    }
  }

  /**
   * Calculates the bounding box and center of a model
   * @param {THREE.Object3D} model - The Three.js model
   * @returns {Object} - Object containing center, size, and boundingBox
   */
  getModelBounds(model) {
    const box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    
    return {
      center,
      size,
      boundingBox: box,
      maxDimension: Math.max(size.x, size.y, size.z)
    };
  }

  /**
   * Centers a model at the origin
   * @param {THREE.Object3D} model - The Three.js model to center
   */
  centerModel(model) {
    const bounds = this.getModelBounds(model);
    model.position.sub(bounds.center);
  }

  /**
   * Scales a model to fit within a specified size
   * @param {THREE.Object3D} model - The Three.js model to scale
   * @param {number} targetSize - The target maximum dimension
   */
  scaleModelToSize(model, targetSize = 4) {
    const bounds = this.getModelBounds(model);
    const scale = targetSize / bounds.maxDimension;
    model.scale.multiplyScalar(scale);
  }

  /**
   * Prepares a loaded model for display in the scene
   * @param {THREE.Object3D} model - The loaded model
   * @param {Object} options - Preparation options
   */
  prepareModel(model, options = {}) {
    const {
      center = true,
      scale = true,
      targetSize = 4,
      enableShadows = true
    } = options;

    // Center the model
    if (center) {
      this.centerModel(model);
    }

    // Scale the model
    if (scale) {
      this.scaleModelToSize(model, targetSize);
    }

    // Enable shadows
    if (enableShadows) {
      model.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });
    }

    return model;
  }
}