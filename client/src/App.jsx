import { useState, useEffect, useRef } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import MapView from './components/MapView';

const API_URL = 'http://localhost:3001/api';

function App() {
  const [equipment, setEquipment] = useState([]);
  const [venues, setVenues] = useState([]);
  const [viewMode, setViewMode] = useState('current');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  
  const viewModeRef = useRef(viewMode);
  
  useEffect(() => {
    viewModeRef.current = viewMode;
  }, [viewMode]);

  useEffect(() => {
    fetchData();
    
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchData = async () => {
    try {
      const [equipRes, venueRes] = await Promise.all([
        fetch(`${API_URL}/equipment`),
        fetch(`${API_URL}/venues`)
      ]);
      
      const equipData = await equipRes.json();
      const venueData = await venueRes.json();
      
      setEquipment(equipData);
      setVenues(venueData);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };
    
const handleDrop = async (item, venueId, slotNum) => {
  const mode = viewModeRef.current;
  
  try {
    if (item.setId) {
      // Only update the field for the current view mode
      const payload = mode === 'current' 
        ? { current_location: venueId, current_slot: slotNum }
        : { planned_location: venueId, planned_slot: slotNum };

      await fetch(`${API_URL}/equipment-set/${item.setId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } 
    else if (item.id) {
      // Only update the field for the current view mode
      const payload = mode === 'current'
        ? { current_location: venueId, current_slot: slotNum }
        : { planned_location: venueId, planned_slot: slotNum };

      await fetch(`${API_URL}/equipment/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    }
    
    await fetchData();
  } catch (error) {
    console.error('Error updating equipment:', error);
  }
};

const handleSyncToPlanned = async () => {
  if (!confirm('Copy all current locations to planned locations?')) return;
  
  try {
    // Get all equipment
    const response = await fetch(`${API_URL}/equipment`);
    const allEquipment = await response.json();
    
    // Update each piece
    for (const piece of allEquipment) {
      await fetch(`${API_URL}/equipment/${piece.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planned_location: piece.current_location,
          planned_slot: piece.current_slot
        })
      });
    }
    
    await fetchData();
  } catch (error) {
    console.error('Error syncing:', error);
    alert('Error syncing locations');
  }
};



  const handleUndo = async () => {
    try {
      await fetch(`${API_URL}/undo`, { method: 'POST' });
      fetchData();
    } catch (error) {
      console.error('Error undoing:', error);
    }
  };

  if (isMobile) {
    return <MobileView equipment={equipment} venues={venues} viewMode={viewMode} />;
  }

  return (
    <DndProvider backend={HTML5Backend}>
    <div className="min-h-screen bg-gray-900 p-6">
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-white mb-4">12th Man Productions Camera Tracker</h1>
          <div className="flex gap-4">
            <button
              onClick={() => setViewMode('current')}
              className={`px-4 py-2 rounded-lg font-semibold transition ${
                viewMode === 'current' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Current Locations
            </button>
            <button
              onClick={() => setViewMode('planned')}
              className={`px-4 py-2 rounded-lg font-semibold transition ${
                viewMode === 'planned' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Planned Locations
            </button>
            {/* NEW SYNC BUTTON */}
            <button
              onClick={handleSyncToPlanned}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
            >
              Sync Planned
            </button>
            <button
              onClick={handleUndo}
              className="ml-auto px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
            >
              ↶ Undo Last Change
            </button>
          </div>
        </header>

        <MapView 
          venues={venues}
          equipment={equipment}
          onDrop={handleDrop}
          viewMode={viewMode}
        />
      </div>
    </DndProvider>
  );
}

const MobileView = ({ equipment, venues, viewMode }) => {
  const groupedByVenue = venues.map(venue => ({
    ...venue,
    equipment: equipment.filter(e => 
      viewMode === 'current' 
        ? e.current_location === venue.id 
        : e.planned_location === venue.id
    )
  }));

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <h1 className="text-2xl font-bold mb-4">Camera Tracker (View Only)</h1>
      <div className="space-y-4">
        {groupedByVenue.map(venue => (
          <div key={venue.id} className="bg-white p-4 rounded-lg shadow">
            <h2 className="font-bold text-lg mb-2">{venue.name}</h2>
            {venue.equipment.length === 0 ? (
              <p className="text-gray-500 text-sm">No equipment</p>
            ) : (
              <ul className="space-y-1">
                {venue.equipment.map(e => (
                  <li 
                    key={e.id}
                    style={{ backgroundColor: e.color }}
                    className="text-white px-3 py-2 rounded text-sm"
                  >
                    {e.name}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default App;