import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

export class ModelLoader {
  constructor() {
    this.loader = new GLTFLoader();
  }

  async loadGLB(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (event) => {
        const contents = event.target.result;
        this.loader.parse(
          contents,
          "",
          (gltf) => resolve(gltf.scene),
          (error) => reject(error)
        );
      };

      reader.onerror = (err) => reject(err);
      reader.readAsArrayBuffer(file);
    });
  }

  prepareModel(model, options = {}) {
    const { center = true, scale = true, targetSize = 5, enableShadows = true } = options;
    if (!model) return null;

    if (center) {
      const box = new THREE.Box3().setFromObject(model);
      const centerVec = new THREE.Vector3();
      box.getCenter(centerVec);
      model.position.sub(centerVec);
    }

    if (scale) {
      const box = new THREE.Box3().setFromObject(model);
      const size = new THREE.Vector3();
      box.getSize(size);
      const maxDim = Math.max(size.x, size.y, size.z);
      if (maxDim > 0) {
        const factor = targetSize / maxDim;
        model.scale.multiplyScalar(factor);
      }
    }

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
