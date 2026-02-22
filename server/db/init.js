import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const db = new Database(join(__dirname, 'database.sqlite'));

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS equipment (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    set_id TEXT NOT NULL,
    current_location TEXT NOT NULL,
    current_slot TEXT DEFAULT 'other',
    planned_location TEXT,
    planned_slot TEXT DEFAULT 'other',
    notes TEXT,
    color TEXT NOT NULL,
    ip_address TEXT,
    serial_number TEXT,
    last_modified INTEGER DEFAULT (strftime('%s', 'now'))
  );

  CREATE TABLE IF NOT EXISTS venues (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    position_x REAL NOT NULL,
    position_y REAL NOT NULL,
    is_home_base INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS change_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp INTEGER DEFAULT (strftime('%s', 'now')),
    equipment_id TEXT NOT NULL,
    action TEXT NOT NULL,
    from_location TEXT,
    to_location TEXT,
    field_changed TEXT
  );
`);

// Initialize venues
const venues = [
  { id: 'kyle_field', name: 'Kyle Field', x: 81, y: 40, isHome: 0 },
  { id: 'reed_arena', name: 'Reed Arena', x: 30, y: 50, isHome: 0 },
  { id: 'engineering_garage', name: 'Engineering Garage', x: 93, y: 65, isHome: 1 },
  { id: 'bluebell_park', name: 'Bluebell Park', x: 68, y: 50, isHome: 0 },
  { id: 'indoor_track_field', name: 'Indoor Track Field', x: 55, y: 67, isHome: 0 },
  { id: 'outdoor_track_field', name: 'Outdoor Track Field', x: 18, y: 65, isHome: 0 },
  { id: 'ellis_soccer_field', name: 'Ellis Soccer Field', x: 43, y: 50, isHome: 0 },
  { id: 'davis_diamond', name: 'Davis Diamond', x: 6, y: 50, isHome: 0 }
];

const insertVenue = db.prepare(`
  INSERT OR REPLACE INTO venues (id, name, position_x, position_y, is_home_base)
  VALUES (?, ?, ?, ?, ?)
`);

venues.forEach(v => insertVenue.run(v.id, v.name, v.x, v.y, v.isHome));

// Initialize equipment sets A-M
// Initialize equipment sets A-M + WX1-WX5
const colors = {
  A: '#500000', B: '#500000', C: '#500000', D: '#500000',
  E: '#500000', F: '#500000', G: '#500000', H: '#500000',
  I: '#500000', J: '#500000', K: '#500000', L: '#500000', M: '#500000', N: '#500000',
  WX1: '#3E3E3E', // Red
  WX2: '#3E3E3E', // Orange  
  WX3: '#3E3E3E', // Amber
  WX4: '#3E3E3E', // Yellow
  WX5: '#3E3E3E'  // Lime
};

const types = ['camera', 'body', 'tripod'];
const sets = Object.keys(colors);

const insertEquipment = db.prepare(`
  INSERT OR IGNORE INTO equipment (id, name, type, set_id, current_location, current_slot, planned_location, planned_slot, color)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

sets.forEach(setId => {
  types.forEach(type => {
    const id = `${type}_${setId.toLowerCase()}`;
    const name = `${type.charAt(0).toUpperCase() + type.slice(1)} ${setId}`;
    insertEquipment.run(
      id, name, type, setId, 
      'engineering_garage', 'other',
      'engineering_garage', 'other',
      colors[setId]
    );
  });
});
console.log('✅ Database initialized successfully');

export default db;