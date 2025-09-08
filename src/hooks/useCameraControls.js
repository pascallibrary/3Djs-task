import { useCallback, useState } from "react";
import * as THREE from 'three';

export const useCameraControls = (camera) => {
    const [controls, setControls] = useState({
        isRotating: false,
        isPanning: false,
        lastMouse: { x: 0, y: 0 },
        cameraDistance: 10,
        cameraRotation: { x: 0, y: 0 }
    });


    const handleMouseDown = useCallback((event) => {
        const x = event.clientX;
        const y = event.clientY;

        setControls(prev => ({
            ...prev,
            isRotating: event.button === 0,
            isPanning: event.button === 2,
            lastMouse: { x, y }
        }));
    }, []);

    return {
        controls,
        handleMouseDown,
    }
};