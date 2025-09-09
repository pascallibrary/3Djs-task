import * as THREE from 'three';
// Import GLTFLoader from examples
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

/**
 * ModelLoader Utility Class
 * 
 * Handles GLB/GLTF file loading and processing for the 3D editor.
 * This utility provides methods to load, validate, and process 3D models.
 */
export class ModelLoader {
  constructor() {
    this.supportedFormats = ['.glb', '.gltf'];
    this.gltfLoader = new GLTFLoader();
    this.dracoLoader = new DRACOLoader();
    
    // Setup DRACO decoder for compressed models
    this.dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
    this.gltfLoader.setDRACOLoader(this.dracoLoader);
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
   * Loads a GLB/GLTF file and returns a Three.js model
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
            const arrayBuffer = event.target.result;
            
            // Use GLTFLoader to parse the file
            this.gltfLoader.parse(
              arrayBuffer, 
              '', // resource path
              (gltf) => {
                // Successfully loaded GLTF
                console.log('GLTF loaded successfully:', gltf);
                
                // Extract the scene from GLTF
                const model = gltf.scene.clone(); // Clone to avoid issues
                
                // Ensure model is visible
                model.visible = true;
                
                // Force update all materials and geometries
                model.traverse((child) => {
                  if (child.isMesh) {
                    child.visible = true;
                    
                    if (child.geometry) {
                      child.geometry.computeBoundingBox();
                      child.geometry.computeBoundingSphere();
                    }
                    
                    if (child.material) {
                      const materials = Array.isArray(child.material) ? child.material : [child.material];
                      materials.forEach(mat => {
                        mat.needsUpdate = true;
                      });
                    }
                  }
                });
                
                // Add metadata
                model.userData = {
                  ...model.userData,
                  fileName: file.name,
                  fileSize: file.size,
                  animations: gltf.animations || [],
                  isGLTFModel: true
                };
                
                resolve(model);
              },
              (error) => {
                console.error('GLTF parsing error:', error);
                reject(new Error(`Failed to parse GLB file: ${error.message || 'Unknown error'}`));
              }
            );

          } catch (error) {
            reject(new Error(`Failed to process GLB file: ${error.message}`));
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
    if (bounds.maxDimension > 0) {
      const scale = targetSize / bounds.maxDimension;
      model.scale.multiplyScalar(scale);
    }
  }

  /**
   * Enables shadows for all meshes in the model
   * @param {THREE.Object3D} model - The Three.js model
   */
  enableShadows(model) {
    model.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        
        // Ensure materials are properly configured
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach(mat => {
              mat.needsUpdate = true;
            });
          } else {
            child.material.needsUpdate = true;
          }
        }
      }
    });
  }

  /**
   * Fixes common issues with loaded models
   * @param {THREE.Object3D} model - The Three.js model
   */
  fixModelIssues(model) {
    model.traverse((child) => {
      if (child.isMesh) {
        // Fix materials that might not render properly
        if (child.material) {
          const materials = Array.isArray(child.material) ? child.material : [child.material];
          
          materials.forEach(material => {
            // Ensure proper color space for textures
            if (material.map) {
              material.map.colorSpace = THREE.SRGBColorSpace;
            }
            if (material.normalMap) {
              material.normalMap.colorSpace = THREE.LinearSRGBColorSpace;
            }
            
            // Fix transparency issues
            if (material.transparent || material.opacity < 1) {
              material.transparent = true;
              material.alphaTest = 0.01;
            }
            
            material.needsUpdate = true;
          });
        }

        // Fix geometry issues
        if (child.geometry) {
          // Compute normals if missing
          if (!child.geometry.attributes.normal) {
            child.geometry.computeVertexNormals();
          }
          
          // Compute bounding box and sphere
          child.geometry.computeBoundingBox();
          child.geometry.computeBoundingSphere();
        }
      }
    });
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
      enableShadows = true,
      fixIssues = true
    } = options;

    // Fix common model issues first
    if (fixIssues) {
      this.fixModelIssues(model);
    }

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
      this.enableShadows(model);
    }

    // Log model information
    console.log('Model prepared:', {
      bounds: this.getModelBounds(model),
      children: model.children.length,
      animations: model.userData.animations?.length || 0
    });

    return model;
  }

  /**
   * Dispose of model resources to free memory
   * @param {THREE.Object3D} model - The model to dispose
   */
  dispose(model) {
    if (!model) return;

    model.traverse((child) => {
      if (child.isMesh) {
        // Dispose geometry
        if (child.geometry) {
          child.geometry.dispose();
        }

        // Dispose materials and textures
        if (child.material) {
          const materials = Array.isArray(child.material) ? child.material : [child.material];
          
          materials.forEach(material => {
            // Dispose textures
            Object.values(material).forEach(value => {
              if (value && value.isTexture) {
                value.dispose();
              }
            });
            
            // Dispose material
            material.dispose();
          });
        }
      }
    });

    // Remove from parent if it has one
    if (model.parent) {
      model.parent.remove(model);
    }
  }

  /**
   * Get model statistics
   * @param {THREE.Object3D} model - The model to analyze
   * @returns {Object} - Model statistics
   */
  getModelStats(model) {
    let meshCount = 0;
    let vertexCount = 0;
    let faceCount = 0;
    let materialCount = 0;
    let textureCount = 0;

    const materials = new Set();
    const textures = new Set();

    model.traverse((child) => {
      if (child.isMesh) {
        meshCount++;
        
        if (child.geometry) {
          const positions = child.geometry.attributes.position;
          if (positions) {
            vertexCount += positions.count;
          }
          
          const index = child.geometry.index;
          if (index) {
            faceCount += index.count / 3;
          } else if (positions) {
            faceCount += positions.count / 3;
          }
        }

        if (child.material) {
          const mats = Array.isArray(child.material) ? child.material : [child.material];
          mats.forEach(mat => {
            materials.add(mat);
            
            // Count textures
            Object.values(mat).forEach(value => {
              if (value && value.isTexture) {
                textures.add(value);
              }
            });
          });
        }
      }
    });

    return {
      meshes: meshCount,
      vertices: Math.round(vertexCount),
      faces: Math.round(faceCount),
      materials: materials.size,
      textures: textures.size,
      animations: model.userData.animations?.length || 0,
      fileSize: model.userData.fileSize || 0,
      fileName: model.userData.fileName || 'Unknown'
    };
  }
}