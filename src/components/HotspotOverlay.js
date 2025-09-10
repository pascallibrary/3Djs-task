import React from 'react';
import { Trash2, MapPin } from 'lucide-react';

/**
 * HotspotOverlay Component - Responsive hotspot markers
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
 * Individual Hotspot Marker Component - Mobile responsive
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
      {/* Hotspot Pin - Larger on mobile */}
      <div
        className={`
          relative w-5 h-5 sm:w-4 sm:h-4 rounded-full border-2 border-white shadow-lg cursor-pointer
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

      {/* Label Popup - Responsive sizing */}
      <div 
        className={`
          absolute left-6 sm:left-6 top-1/2 transform -translate-y-1/2 
          bg-black bg-opacity-90 text-white px-2 py-1 sm:px-3 sm:py-2 rounded-lg text-xs sm:text-sm 
          whitespace-nowrap shadow-xl border border-gray-600
          transition-all duration-200 max-w-48 sm:max-w-xs
          ${isSelected ? 'opacity-100 scale-100' : 'opacity-90 hover:opacity-100 hover:scale-105'}
        `}
      >
        {/* Label text */}
        <div className="flex items-center gap-1 sm:gap-2">
          <MapPin size={10} className="text-red-400 flex-shrink-0 sm:hidden" />
          <MapPin size={12} className="text-red-400 flex-shrink-0 hidden sm:block" />
          <span className="font-medium truncate">{label}</span>
        </div>
        
        {/* Hotspot ID (for debugging - smaller on mobile) */}
        <div className="text-xs text-gray-400 mt-1 hidden sm:block">
          ID: {id}
        </div>

        {/* Delete button - Larger touch target on mobile */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="
            absolute -top-1 -right-1 w-5 h-5 sm:w-5 sm:h-5 bg-red-500 hover:bg-red-600 
            text-white rounded-full flex items-center justify-center text-xs
            transition-colors duration-150 shadow-md
          "
          title="Delete hotspot"
        >
          <Trash2 size={8} className="sm:hidden" />
          <Trash2 size={10} className="hidden sm:block" />
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
 * Hotspot List Component - Mobile responsive
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
    <div className="bg-gray-800 border-t border-gray-700 p-2 sm:p-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2 sm:mb-3 gap-2">
        <h3 className="text-white font-semibold flex items-center gap-2 text-sm sm:text-base">
          <MapPin size={14} className="sm:hidden" />
          <MapPin size={16} className="hidden sm:block" />
          Hotspots ({hotspots.length})
        </h3>
        
        {hotspots.length > 0 && (
          <div className="text-xs sm:text-sm text-gray-400">
            Tap to select • Long press to interact
          </div>
        )}
      </div>
      
      <div className="flex flex-wrap gap-1 sm:gap-2 max-h-24 sm:max-h-32 overflow-y-auto">
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
 * Individual Hotspot Chip Component - Mobile responsive
 */
const HotspotChip = ({ hotspot, isSelected, onSelect, onDelete }) => {
  return (
    <div
      className={`
        bg-gray-700 text-white px-2 py-1 sm:px-3 sm:py-2 rounded-full text-xs sm:text-sm 
        flex items-center gap-1 sm:gap-2 cursor-pointer transition-all duration-200
        hover:bg-gray-600 border min-h-8 sm:min-h-auto
        ${isSelected ? 'border-blue-500 bg-blue-600' : 'border-gray-600'}
      `}
      onClick={onSelect}
    >
      {/* Status indicator */}
      <span className={`
        w-2 h-2 rounded-full flex-shrink-0
        ${isSelected ? 'bg-blue-300' : 'bg-red-500'}
      `}></span>
      
      {/* Label text - Truncated properly on mobile */}
      <span className="truncate max-w-16 sm:max-w-24">
        {hotspot.label}
      </span>
      
      {/* Delete button - Larger touch target */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className="
          text-gray-400 hover:text-red-400 ml-1 p-1 rounded
          transition-colors duration-150 flex-shrink-0
        "
        title="Delete hotspot"
      >
        <Trash2 size={10} className="sm:hidden" />
        <Trash2 size={12} className="hidden sm:block" />
      </button>
    </div>
  );
};

/**
 * Hotspot Statistics Component - Mobile responsive
 */
export const HotspotStats = ({ hotspots = [] }) => {
  const totalHotspots = hotspots.length;
  const recentHotspots = hotspots.filter(h => 
    Date.now() - h.id < 60000 // Created in last minute
  ).length;

  return (
    <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-400">
      <div className="flex items-center gap-1">
        <MapPin size={12} className="sm:hidden" />
        <MapPin size={14} className="hidden sm:block" />
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