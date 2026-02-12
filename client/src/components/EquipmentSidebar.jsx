import React from 'react';
import EquipmentBlock from './EquipmentBlock';

const EquipmentSidebar = ({ equipment, lockedSets, onToggleLock, viewMode }) => {
  const equipmentSets = equipment.reduce((acc, item) => {
    if (!acc[item.set_id]) {
      acc[item.set_id] = [];
    }
    acc[item.set_id].push(item);
    return acc;
  }, {});

  return (
    <div className="bg-white p-4 rounded-lg shadow-md h-full overflow-y-auto">
      <h2 className="text-xl font-bold mb-4">Equipment Sets</h2>
      <div className="space-y-3">
        {Object.entries(equipmentSets).map(([setId, items]) => (
          <EquipmentBlock
            key={setId}
            equipment={items}
            isLocked={lockedSets.includes(setId)}
            onToggleLock={() => onToggleLock(setId)}
            viewMode={viewMode}
          />
        ))}
      </div>
    </div>
  );
};

export default EquipmentSidebar;