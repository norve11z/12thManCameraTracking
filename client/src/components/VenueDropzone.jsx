import { useDrop } from 'react-dnd';
import { useDrag } from 'react-dnd';
import { useState } from 'react';
import { createPortal } from 'react-dom';

const SLOTS = ['1', '2', '3', '4', '5', '6', 'other'];
const VenueDropzone = ({ venue, equipment, onDrop, venuePositions, viewMode }) => {
  const position = venuePositions[venue.id];
  const isHomeBase = venue.is_home_base === 1;

  // Group equipment by slot (only for non-home venues)
  const equipmentBySlot = equipment.reduce((acc, item) => {
    const slot = viewMode === 'current' ? item.current_slot : item.planned_slot;
    if (!acc[slot]) acc[slot] = [];
    acc[slot].push(item);
    return acc;
  }, {});

  return (
    <div
      style={{
        position: 'absolute',
        left: `${position.position_x}%`,
        top: `${position.position_y}%`,
        transform: 'translate(-50%, -50%)',
        backgroundColor: '#1F2937',
        minWidth: '11%',
        maxWidth: '11%',
        border: venue.is_home_base ? '2px dashed #60A5FA' : '2px solid #4B5563',
      }}
      className="p-2 rounded-lg shadow-lg hover:shadow-xl transition-shadow"
    >
      <h3 className="font-bold text-xs mb-1 text-center border-b border-gray-600 pb-1 text-gray-200">
        {venue.name}
      </h3>

      {isHomeBase ? (
        // NO SLOTS for Engineering Garage
        <NoSlotDropzone 
          venueId={venue.id}
          equipment={equipment}
          onDrop={onDrop}
          viewMode={viewMode}
        />
      ) : (
        // SLOTS for all other venues
        <div className="space-y-1 mt-2">
          {SLOTS.map(slotNum => {
            const slotEquipment = equipmentBySlot[slotNum] || [];
            return (
              <SlotDropzone
                key={slotNum}
                venueId={venue.id}
                slotNum={slotNum}
                equipment={slotEquipment}
                onDrop={onDrop}
                viewMode={viewMode}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};

const SlotDropzone = ({ venueId, slotNum, equipment, onDrop, viewMode }) => {
  const [{ isOver }, drop] = useDrop(() => ({
    accept: ['EQUIPMENT_SET', 'EQUIPMENT_PIECE'],
    drop: (item) => onDrop(item, venueId, slotNum),
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  }));

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
        backgroundColor: isOver ? '#1E3A8A' : '#374151',
        minHeight: '30px',
      }}
      className="p-0.5 rounded border border-gray-600"
    >
      <div className="text-[10px] text-gray-400 mb-0.5">
        Cam Pos {slotNum === 'other' ? 'Other' : slotNum}
      </div>
      <div className="space-y-1">
        {Object.values(equipmentSets).map(set => (
          <EquipmentSetBlock key={set.setId} set={set} viewMode={viewMode} />
        ))}
      </div>
    </div>
  );
};

const NoSlotDropzone = ({ venueId, equipment, onDrop, viewMode }) => {
  const [{ isOver }, drop] = useDrop(() => ({
    accept: ['EQUIPMENT_SET', 'EQUIPMENT_PIECE'],
    drop: (item) => onDrop(item, venueId, 'other'),
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  }));

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
        backgroundColor: isOver ? '#1E3A8A' : 'transparent',
        minHeight: '60px',
      }}
      className="p-1 rounded mt-2"
    >
      <div className="space-y-1">
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
    p => p.current_location !== p.planned_location || p.current_slot !== p.planned_slot
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
          border: hasMismatch ? '3px solid #EF4444' : '0.5px solid #FFFFFF',
          boxShadow: hasMismatch ? '0 0 8px rgba(239, 68, 68, 0.4)' : 'none',
          opacity: isDragging ? 0.5 : 1,
          cursor: 'move',
          position: 'relative',
          zIndex: isDragging ? 1000 : 1
        }}
        className="text-white text-xs px-2 py-1 rounded-lg font-semibold text-center hover:opacity-80 transition-opacity flex justify-between items-center"
      >
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowInfo(true);
            }}
            className="hover:bg-white hover:bg-opacity-20 rounded-full w-4 h-4 flex items-center justify-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 50 50" fill="white" className="w-3 h-3">
              <path d="M 25 2 C 12.264481 2 2 12.264481 2 25 C 2 37.735519 12.264481 48 25 48 C 37.735519 48 48 37.735519 48 25 C 48 12.264481 37.735519 2 25 2 z M 25 4 C 36.664481 4 46 13.335519 46 25 C 46 36.664481 36.664481 46 25 46 C 13.335519 46 4 36.664481 4 25 C 4 13.335519 13.335519 4 25 4 z M 25 11 A 3 3 0 0 0 25 17 A 3 3 0 0 0 25 11 z M 21 21 L 21 23 L 23 23 L 23 36 L 21 36 L 21 38 L 29 38 L 29 36 L 27 36 L 27 21 L 21 21 z"></path>
            </svg>
          </button>
          <span className="text-[11px]">CAM {set.setId}</span>
        </div>
        <span 
          className="text-[9px] cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            setExpanded(!expanded);
          }}
        >
          {expanded ? '▼' : '▶'}
        </span>
      </div>

      {/* Info Popup */}
      {showInfo && createPortal(
        <InfoPopup 
          set={set} 
          onClose={() => setShowInfo(false)}
          viewMode={viewMode}
        />,
        document.body
      )}

      {/* Individual Pieces */}
      {expanded && (
        <div className="ml-1 mt-1 space-y-1">
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
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-[9998]"
        onClick={onClose}
      />
      
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
                    <span className="text-white">{set.pieces[0].current_location} / Cam Pos {set.pieces[0].current_slot}</span>
                  </div>
                  <div className="flex justify-between text-xs mt-1">
                    <span className="text-gray-400">Planned:</span>
                    <span className="text-white">{set.pieces[0].planned_location} / Cam Pos {set.pieces[0].planned_slot}</span>
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

  const hasMismatch = viewMode === 'current' && (
    piece.current_location !== piece.planned_location || 
    piece.current_slot !== piece.planned_slot
  );

  const typeLabels = {
    camera: '📷 Lens',
    body: '🎥 Body', 
    tripod: '📐 Tri'
  };

  return (
    <div
      ref={drag}
      style={{ 
        backgroundColor: color,
        opacity: isDragging ? 0.5 : 1,
        border: hasMismatch ? '2px solid #EF4444' : 'none',
        boxShadow: hasMismatch ? '0 0 6px rgba(239, 68, 68, 0.4)' : 'none',
        cursor: 'move'
      }}
      className="text-white text-[10px] px-1 py-0.5 rounded hover:opacity-80 transition-opacity"
    >
      {typeLabels[piece.type]}
    </div>
  );
};

export default VenueDropzone;