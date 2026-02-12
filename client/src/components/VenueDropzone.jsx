import { useDrop } from 'react-dnd';
import { useDrag } from 'react-dnd';
import { useState } from 'react';

const VenueDropzone = ({ venue, equipment, onDrop, venuePositions, viewMode }) => {
  const [{ isOver }, drop] = useDrop(() => ({
    accept: ['EQUIPMENT_SET', 'EQUIPMENT_PIECE'],
    drop: (item) => onDrop(item, venue.id),
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  }));

  const position = venuePositions[venue.id];

  // Group equipment by set
  const equipmentSets = equipment.reduce((acc, item) => {
    if (!acc[item.set_id]) {
      acc[item.set_id] = {
        setId: item.set_id,
        color: item.color,
        pieces: []
      };
    }
    acc[item.set_id].pieces.push(item);
    return acc;
  }, {});

  return (
    <div
      ref={drop}
      style={{
        position: 'absolute',
        left: `${position.position_x}%`,
        top: `${position.position_y}%`,
        transform: 'translate(-50%, -50%)',
        backgroundColor: isOver ? '#DBEAFE' : 'white',
        minWidth: '11%',
        maxWidth: '11%',
        border: venue.is_home_base ? '2px dashed #3B82F6' : '2px solid #D1D5DB',
      }}
      className="p-2 rounded-lg shadow-lg hover:shadow-xl transition-shadow"
    >
      <h3 className="font-bold text-xs mb-1 text-center border-b pb-1 text-gray-700">
        {venue.name}
      </h3>
      <div className="text-xs text-gray-500 text-center mb-2">
        {Object.keys(equipmentSets).length} set{Object.keys(equipmentSets).length !== 1 ? 's' : ''}
      </div>
      <div className="space-y-2 max-h-40 overflow-y-auto">
        {Object.values(equipmentSets).map(set => (
          <EquipmentSetBlock key={set.setId} set={set} viewMode={viewMode} />
        ))}
      </div>
    </div>
  );
};

const EquipmentSetBlock = ({ set, viewMode }) => {
  const [expanded, setExpanded] = useState(false);
  
  const hasMismatch = viewMode === 'current' && set.pieces.some(
    p => p.current_location !== p.planned_location
  );
  
  const [{ isDragging }, dragSet] = useDrag(() => ({
    type: 'EQUIPMENT_SET',
    item: { setId: set.setId },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }));
  
  return (
    <div>
      {/* Draggable Set Header */}
      <div
        ref={dragSet}
        onClick={() => setExpanded(!expanded)}
        style={{ 
          backgroundColor: set.color,
          border: hasMismatch ? '4px solid #EF4444' : 'none',  // Changed to red and thicker
          boxShadow: hasMismatch ? '0 0 10px rgba(239, 68, 68, 0.5)' : 'none', // Added glow effect
          opacity: isDragging ? 0.5 : 1,
          cursor: 'move'
        }}
        className="text-white text-xs px-2 py-1.5 rounded font-semibold text-center hover:opacity-80 transition-opacity flex justify-between items-center"
      >
        <span>Set {set.setId}</span>
        <span className="text-[10px]">{expanded ? '▼' : '▶'}</span>
      </div>

      {/* Individual Pieces (expandable) */}
      {expanded && (
        <div className="ml-2 mt-1 space-y-1">
          {set.pieces.map(piece => (
            <DraggablePiece key={piece.id} piece={piece} color={set.color} viewMode={viewMode} />
          ))}
        </div>
      )}
    </div>
  );
};


const DraggablePiece = ({ piece, color, viewMode }) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'EQUIPMENT_PIECE',
    item: { 
      id: piece.id,
      type: piece.type 
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }));

  const hasMismatch = viewMode === 'current' && piece.current_location !== piece.planned_location;

  const typeLabels = {
    camera: '📷 Camera',
    body: '🎥 Body', 
    tripod: '📐 Tripod'
  };

  return (
    <div
      ref={drag}
      style={{ 
        backgroundColor: color,
        opacity: isDragging ? 0.5 : 1,
        border: hasMismatch ? '5px solid #EF4444' : 'none',  // Red border
        boxShadow: hasMismatch ? '0 0 8px rgba(239, 68, 68, 0.4)' : 'none', // Glow
        cursor: 'move'
      }}
      className="text-white text-[11px] px-2 py-1 rounded hover:opacity-80 transition-opacity"
    >
      {typeLabels[piece.type]}
    </div>
  );
};


export default VenueDropzone;