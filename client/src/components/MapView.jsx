import VenueDropzone from './VenueDropzone';

const MapView = ({ venues, equipment, onDrop, viewMode }) => {
  const venuePositions = venues.reduce((acc, v) => {
    acc[v.id] = v;
    return acc;
  }, {});

  console.log('MapView rendering with viewMode:', viewMode);
  console.log('Total equipment:', equipment.length);

  return (
    <div className="relative">
      {/* Background Image Layer */}
      <div 
        className="absolute inset-0 rounded-lg border-2 border-gray-700"         
        style={{ 
          height: '70vh', 
          minHeight: '500px',
          backgroundImage: 'url(/images/campus-map.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          backgroundColor: '#1F2937',  // Add dark background color
          opacity: 0.3
        }}
      />
      
      {/* Venues Layer */}
      <div 
        className="relative rounded-lg" 
        style={{ height: '70vh', minHeight: '500px' }}
      >
        {venues.map(venue => {
          const venueEquipment = equipment.filter(e => {
            const matches = viewMode === 'current' 
              ? e.current_location === venue.id
              : e.planned_location === venue.id;
            
            if (matches) {
              console.log(`Equipment ${e.id} at venue ${venue.id} in ${viewMode} mode`);
            }
            
            return matches;
          });

          console.log(`Venue ${venue.id}: ${venueEquipment.length} items in ${viewMode} mode`);

          return (
            <VenueDropzone
              key={venue.id}
              venue={venue}
              equipment={venueEquipment}
              onDrop={onDrop}
              venuePositions={venuePositions}
              viewMode={viewMode}
            />
          );
        })}
      </div>
    </div>
  );
};

export default MapView;