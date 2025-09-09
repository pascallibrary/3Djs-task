import React from 'react';
import { Trash2, MapPin } from 'lucide-react';

/**
 * HotspotOverlay Component
 * 
 * Renders hotspot markers and labels as an overlay on top of the 3D canvas.
 * Handles hotspot visualization, interaction, and management.
 */
const HotspotOverlay = ({
  hotspots = [],
  visible = true,
  onDeleteHotspot,
  onHotspotClick,
  selectedHotspotId = null
}) => {
  if (!visible || hotspots.length === 0) {
    return null;
  }

  return (
    <div className="absolute inset-0 pointer-events-none">
      {hotspots.map((hotspot) => (
        <HotspotMarker
          key={hotspot.id}
          hotspot={hotspot}
          isSelected={selectedHotspotId === hotspot.id}
          onDelete={() => onDeleteHotspot && onDeleteHotspot(hotspot.id)}
          onClick={() => onHotspotClick && onHotspotClick(hotspot)}
        />
      ))}
    </div>
  );
};

/**
 * Individual Hotspot Marker Component
 */
const HotspotMarker = ({ hotspot, isSelected, onDelete, onClick }) => {
  const { screenPosition, label, id } = hotspot;

  return (
    <div
      className="absolute transform -translate-x-1/2 -translate-y-1/2 pointer-events-auto"
      style={{
        left: screenPosition.x,
        top: screenPosition.y,
        zIndex: isSelected ? 1000 : 100
      }}
    >
      {/* Hotspot Pin */}
      <div
        className={`
          relative w-4 h-4 rounded-full border-2 border-white shadow-lg cursor-pointer
          transition-all duration-200 hover:scale-110
          ${isSelected ? 'bg-blue-500 ring-2 ring-blue-300' : 'bg-red-500'}
          ${isSelected ? 'hotspot-marker animate-pulse' : 'hotspot-marker'}
        `}
        onClick={onClick}
        title={`Hotspot: ${label}`}
      >
        {/* Center dot */}
        <div className="absolute inset-1 bg-white rounded-full opacity-80"></div>
        
        {/* Pulse effect for selected hotspot */}
        {isSelected && (
          <div className="absolute inset-0 bg-blue-500 rounded-full animate-ping opacity-30"></div>
        )}
      </div>

      {/* Label Popup */}
      <div 
        className={`
          absolute left-6 top-1/2 transform -translate-y-1/2 
          bg-black bg-opacity-90 text-white px-3 py-2 rounded-lg text-sm 
          whitespace-nowrap shadow-xl border border-gray-600
          transition-all duration-200
          ${isSelected ? 'opacity-100 scale-100' : 'opacity-90 hover:opacity-100 hover:scale-105'}
        `}
        style={{
          maxWidth: '200px',
          wordWrap: 'break-word',
          whiteSpace: 'normal'
        }}
      >
        {/* Label text */}
        <div className="flex items-center gap-2">
          <MapPin size={12} className="text-red-400 flex-shrink-0" />
          <span className="font-medium">{label}</span>
        </div>
        
        {/* Hotspot ID (for debugging - can be removed) */}
        <div className="text-xs text-gray-400 mt-1">
          ID: {id}
        </div>

        {/* Delete button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="
            absolute -top-1 -right-1 w-5 h-5 bg-red-500 hover:bg-red-600 
            text-white rounded-full flex items-center justify-center text-xs
            transition-colors duration-150 shadow-md
          "
          title="Delete hotspot"
        >
          <Trash2 size={10} />
        </button>

        {/* Arrow pointing to hotspot */}
        <div className="
          absolute right-full top-1/2 transform -translate-y-1/2
          w-0 h-0 border-t-4 border-b-4 border-r-6
          border-t-transparent border-b-transparent border-r-black
        "></div>
      </div>
    </div>
  );
};

/**
 * Hotspot List Component
 * 
 * Displays a list of all hotspots in a compact format
 */
export const HotspotList = ({ 
  hotspots = [], 
  onDeleteHotspot, 
  onHotspotSelect,
  selectedHotspotId 
}) => {
  if (hotspots.length === 0) {
    return null;
  }

  return (
    <div className="bg-gray-800 border-t border-gray-700 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-white font-semibold flex items-center gap-2">
          <MapPin size={16} />
          Hotspots ({hotspots.length})
        </h3>
        
        {hotspots.length > 0 && (
          <div className="text-sm text-gray-400">
            Click to select • Hover over markers to interact
          </div>
        )}
      </div>
      
      <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
        {hotspots.map((hotspot) => (
          <HotspotChip
            key={hotspot.id}
            hotspot={hotspot}
            isSelected={selectedHotspotId === hotspot.id}
            onSelect={() => onHotspotSelect && onHotspotSelect(hotspot)}
            onDelete={() => onDeleteHotspot && onDeleteHotspot(hotspot.id)}
          />
        ))}
      </div>
    </div>
  );
};

/**
 * Individual Hotspot Chip Component
 */
const HotspotChip = ({ hotspot, isSelected, onSelect, onDelete }) => {
  return (
    <div
      className={`
        bg-gray-700 text-white px-3 py-2 rounded-full text-sm 
        flex items-center gap-2 cursor-pointer transition-all duration-200
        hover:bg-gray-600 border
        ${isSelected ? 'border-blue-500 bg-blue-600' : 'border-gray-600'}
      `}
      onClick={onSelect}
    >
      {/* Status indicator */}
      <span className={`
        w-2 h-2 rounded-full flex-shrink-0
        ${isSelected ? 'bg-blue-300' : 'bg-red-500'}
      `}></span>
      
      {/* Label text */}
      <span className="truncate max-w-24">
        {hotspot.label}
      </span>
      
      {/* Delete button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className="
          text-gray-400 hover:text-red-400 ml-1 p-0.5 rounded
          transition-colors duration-150
        "
        title="Delete hotspot"
      >
        <Trash2 size={12} />
      </button>
    </div>
  );
};

/**
 * Hotspot Statistics Component
 */
export const HotspotStats = ({ hotspots = [] }) => {
  const totalHotspots = hotspots.length;
  const recentHotspots = hotspots.filter(h => 
    Date.now() - h.id < 60000 // Created in last minute
  ).length;

  return (
    <div className="flex items-center gap-4 text-sm text-gray-400">
      <div className="flex items-center gap-1">
        <MapPin size={14} />
        <span>Total: {totalHotspots}</span>
      </div>
      
      {recentHotspots > 0 && (
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 bg-green-400 rounded-full"></span>
          <span>Recent: {recentHotspots}</span>
        </div>
      )}
    </div>
  );
};

export default HotspotOverlay;