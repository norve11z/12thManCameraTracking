import { useDrop } from 'react-dnd';
import { useDrag } from 'react-dnd';
import { useState } from 'react';
import { createPortal } from 'react-dom';

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
        backgroundColor: isOver ? '#1E3A8A' : '#1F2937',
        minWidth: '11%',
        maxWidth: '11%',
        border: venue.is_home_base ? '2px dashed #60A5FA' : '2px solid #4B5563',
      }}
      className="p-2 rounded-lg shadow-lg hover:shadow-xl transition-shadow"
    >
      <h3 className="font-bold text-xs mb-1 text-center border-b border-gray-600 pb-1 text-gray-200">
        {venue.name}
      </h3>
      <div className="text-xs text-gray-400 text-center mb-2">
        {Object.keys(equipmentSets).length} set{Object.keys(equipmentSets).length !== 1 ? 's' : ''}
      </div>
      <div 
        className="space-y-2 scroll-smooth" 
        style={{ 
          maxHeight: Object.keys(equipmentSets).length > 5 ? '240px' : 'auto',
          overflowY: Object.keys(equipmentSets).length > 5 ? 'auto' : 'visible',
          scrollBehavior: 'smooth' 
        }}
        onWheel={(e) => {
          if (Object.keys(equipmentSets).length > 5) {
            e.currentTarget.scrollTop += e.deltaY * 0.3;
            e.preventDefault();
          }
        }}
      >
        {Object.values(equipmentSets).map(set => (
          <EquipmentSetBlock key={set.setId} set={set} viewMode={viewMode} />
        ))}
      </div>
    </div>
  );
};

const EquipmentSetBlock = ({ set, viewMode }) => {
  const [expanded, setExpanded] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  
  const hasMismatch = viewMode === 'current' && set.pieces.some(
    p => p.current_location !== p.planned_location
  );

  const [{ isDragging }, dragSet] = useDrag(() => ({
    type: 'EQUIPMENT_SET',
    item: { setId: set.setId },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }), [set.setId]);
  
  return (
    <div>
      {/* Draggable Set Header */}
      <div
        ref={dragSet}
        style={{ 
          backgroundColor: set.color,
          border: hasMismatch ? '5px solid #EF4444' : 'none',
          boxShadow: hasMismatch ? '0 0 10px rgba(239, 68, 68, 0.5)' : 'none',
          opacity: isDragging ? 0.5 : 1,
          cursor: 'move',
          position: 'relative',
          zIndex: isDragging ? 1000 : 1
        }}
        className="text-white text-base px-3 py-2 rounded-lg font-semibold text-center hover:opacity-80 transition-opacity flex justify-between items-center"
      >
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowInfo(true);
            }}
            className="hover:bg-white hover:bg-opacity-20 rounded-full w-5 h-5 flex items-center justify-center text-xs"
          >
            <svg xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" width="100" height="100" viewBox="0 0 50 50" fill="white">
              <path d="M 25 2 C 12.264481 2 2 12.264481 2 25 C 2 37.735519 12.264481 48 25 48 C 37.735519 48 48 37.735519 48 25 C 48 12.264481 37.735519 2 25 2 z M 25 4 C 36.664481 4 46 13.335519 46 25 C 46 36.664481 36.664481 46 25 46 C 13.335519 46 4 36.664481 4 25 C 4 13.335519 13.335519 4 25 4 z M 25 11 A 3 3 0 0 0 25 17 A 3 3 0 0 0 25 11 z M 21 21 L 21 23 L 23 23 L 23 36 L 21 36 L 21 38 L 29 38 L 29 36 L 27 36 L 27 21 L 21 21 z"></path>
            </svg>
          </button>
          <span>Set {set.setId}</span>
        </div>
        <span 
          className="text-[10px] cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            setExpanded(!expanded);
          }}
        >
          {expanded ? '▼' : '▶'}
        </span>
      </div>

      {/* Info Popup - Using Portal */}
      {showInfo && createPortal(
        <InfoPopup 
          set={set} 
          onClose={() => setShowInfo(false)}
          viewMode={viewMode}
        />,
        document.body
      )}

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

const InfoPopup = ({ set, onClose, viewMode }) => {
  const [editedSet, setEditedSet] = useState({
    ip_address: set.pieces[0].ip_address || '',
    serial_number: set.pieces[0].serial_number || '',
    notes: set.pieces[0].notes || ''
  });

  const isEditable = viewMode === 'planned';

  const handleSave = async () => {
    if (!isEditable) return;
    
    try {
      for (const piece of set.pieces) {
        await fetch(`http://localhost:3001/api/equipment/${piece.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            notes: editedSet.notes,
            ip_address: editedSet.ip_address,
            serial_number: editedSet.serial_number
          })
        });
      }
      onClose();
      window.location.reload();
    } catch (error) {
      console.error('Error saving:', error);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-[9998]"
        onClick={onClose}
      />
      
      {/* Popup */}
      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-gray-800 border-2 border-gray-600 rounded-lg p-4 z-[9999] w-80">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-xl font-bold text-white">Camera Set {set.setId}</h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl leading-none"
          >
            ×
          </button>
        </div>

        {isEditable ? (
          // EDITABLE VIEW (Planned Mode)
          <>
            <div className="bg-gray-700 p-3 rounded-lg space-y-2">
              <div>
                <label className="text-gray-400 text-xs block mb-1">IP Address</label>
                <input
                  type="text"
                  value={editedSet.ip_address}
                  onChange={(e) => setEditedSet({...editedSet, ip_address: e.target.value})}
                  className="w-full bg-gray-600 text-white text-sm px-2 py-1.5 rounded"
                  placeholder="192.168.1.1"
                />
              </div>

              <div>
                <label className="text-gray-400 text-xs block mb-1">Serial Number</label>
                <input
                  type="text"
                  value={editedSet.serial_number}
                  onChange={(e) => setEditedSet({...editedSet, serial_number: e.target.value})}
                  className="w-full bg-gray-600 text-white text-sm px-2 py-1.5 rounded"
                  placeholder="SN12345"
                />
              </div>

              <div>
                <label className="text-gray-400 text-xs block mb-1">Notes</label>
                <textarea
                  value={editedSet.notes}
                  onChange={(e) => setEditedSet({...editedSet, notes: e.target.value})}
                  className="w-full bg-gray-600 text-white text-sm px-2 py-1.5 rounded resize-none"
                  rows="2"
                  placeholder="Add notes..."
                />
              </div>
            </div>

            <div className="flex gap-2 mt-3">
              <button
                onClick={handleSave}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg text-sm"
              >
                Save
              </button>
              <button
                onClick={onClose}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 rounded-lg text-sm"
              >
                Cancel
              </button>
            </div>
          </>
        ) : (
          // READ-ONLY VIEW (Current Mode)
          <>
            <div className="bg-gray-700 p-3 rounded-lg">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">IP Address:</span>
                  <span className="text-white">{editedSet.ip_address || 'Not set'}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-400">Serial Number:</span>
                  <span className="text-white">{editedSet.serial_number || 'Not set'}</span>
                </div>

                <div className="border-t border-gray-600 pt-2 mt-2">
                  <div className="text-gray-400 text-xs mb-1">Notes:</div>
                  <div className="text-white text-xs">{editedSet.notes || 'No notes'}</div>
                </div>

                <div className="border-t border-gray-600 pt-2 mt-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">Current:</span>
                    <span className="text-white">{set.pieces[0].current_location}</span>
                  </div>
                  <div className="flex justify-between text-xs mt-1">
                    <span className="text-gray-400">Planned:</span>
                    <span className="text-white">{set.pieces[0].planned_location}</span>
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-full mt-3 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg text-sm"
            >
              Close
            </button>
          </>
        )}
      </div>
    </>
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
        border: hasMismatch ? '5px solid #EF4444' : 'none',
        boxShadow: hasMismatch ? '0 0 8px rgba(239, 68, 68, 0.4)' : 'none',
        cursor: 'move'
      }}
      className="text-white text-sm px-2 py-1 rounded-lg hover:opacity-80 transition-opacity"
    >
      {typeLabels[piece.type]}
    </div>
  );
};

export default VenueDropzone;