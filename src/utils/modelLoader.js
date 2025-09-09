import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

export class ModelLoader {
    constructor() {
        this.suportedFormats = ['.glb', 'gltf'];
    }

    /**
     * 
     * validates if the file is a supported 3D model format
     * @params {file}
     * @returns {boolean} 
     */ 

    validateFile(file) {
        if(!file) {
            throw new Error('No file provided');
        }

        const fileName = file.name.toLowercase();
        const isValidFormat = this.supportedFormats.some(format => fileName.endsWith(format))
    }

    if (!isValidFormat) {
        throw new Error('Unsuppoted file format. Please use: $this july')

        
    }
}