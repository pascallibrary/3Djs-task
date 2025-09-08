import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

export class ModelLoader {
    constructor() {
        this.loader = new GLTFLoader();
    }

    async loadGLB(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (event) => {
                const arrayBuffer = event.target.result;
                this.loader.parse(arrayBuffer, '', resolve, reject);
            };
            reader.onerror = reject;
            reader.readAsArrayBuffer(file);
        });
    }
}