import React from 'react';
import { useDrag } from 'react-dnd';

const EquipmentBlock = ({ equipment, isLocked, onToggleLock, viewMode }) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: isLocked ? 'EQUIPMENT_SET' : 'EQUIPMENT_PIECE',
    item: { 
      id: equipment[0].id,
      setId: equipment[0].set_id,
      isLocked 
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }));

  const camera = equipment.find(e => e.type === 'camera');
  const body = equipment.find(e => e.type === 'body');
  const tripod = equipment.find(e => e.type === 'tripod');

  const needsMove = viewMode === 'current' && equipment.some(
    e => e.current_location !== e.planned_location
  );

  const borderColor = needsMove ? '#FCD34D' : camera.color;

  return (
    <div className="mb-2">
      <div
        ref={drag}
        style={{
          opacity: isDragging ? 0.5 : 1,
          borderColor: borderColor,
          backgroundColor: camera.color + '20',
        }}
        className="border-5 rounded-lg overflow-hidden cursor-move hover:shadow-lg transition-shadow"
      >
        <div className="bg-gray-800 text-white text-center py-1 text-sm font-bold">
          Set {camera.set_id}
        </div>
        <div className="flex">
          <Piece equipment={camera} color={camera.color} />
          <Piece equipment={body} color={camera.color} />
          <Piece equipment={tripod} color={camera.color} />
        </div>
      </div>
      <button
        onClick={onToggleLock}
        className="mt-1 text-xs px-2 py-1 bg-gray-200 rounded hover:bg-gray-300 w-full"
      >
        {isLocked ? '🔒 Locked' : '🔓 Unlocked'}
      </button>
    </div>
  );
};

const Piece = ({ equipment, color }) => (
  <div
    style={{ backgroundColor: color }}
    className="flex-1 p-2 text-white text-center text-xs font-semibold border-r last:border-r-0 border-white"
  >
    {equipment.type.charAt(0).toUpperCase()}
  </div>
);

export default EquipmentBlock;