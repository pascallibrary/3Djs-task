import React from 'react';
import SwiftXR3DEditor from './components/SwiftXR3DEditor';
import './App.css';


function App() {
  return (
    <div className="App">
      {/* Header Comment */}
      <div className="hidden">
        {/* SwiftXR 3D Editor - Technical Assessment */}
        {/* Features: GLB Import, 3D Navigation, Hotspot Labeling */}
      </div>
      
      {/* Main 3D Editor Component */}
      <SwiftXR3DEditor />
    </div>
  );
}

export default App;