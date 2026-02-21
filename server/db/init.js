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
    planned_location TEXT,
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
  { id: 'kyle_field', name: 'Kyle Field', x: 82, y: 25, isHome: 0 },
  { id: 'reed_arena', name: 'Reed Arena', x: 30, y: 25, isHome: 0 },
  { id: 'engineering_garage', name: 'Engineering Garage', x: 95, y: 60, isHome: 1 },
  { id: 'bluebell_park', name: 'Bluebell Park', x: 70, y: 50, isHome: 0 },
  { id: 'indoor_track_field', name: 'Indoor Track Field', x: 55, y: 67, isHome: 0 },
  { id: 'outdoor_track_field', name: 'Outdoor Track Field', x: 18, y: 65, isHome: 0 },
  { id: 'ellis_soccer_field', name: 'Ellis Soccer Field', x: 42, y: 50, isHome: 0 },
  { id: 'davis_diamond', name: 'Davis Diamond', x: 6, y: 50, isHome: 0 }
];

const insertVenue = db.prepare(`
  INSERT OR REPLACE INTO venues (id, name, position_x, position_y, is_home_base)
  VALUES (?, ?, ?, ?, ?)
`);

venues.forEach(v => insertVenue.run(v.id, v.name, v.x, v.y, v.isHome));

// Initialize equipment sets A-M
const colors = {
  A: '#2563EB', // Blue
  B: '#059669', // Green
  C: '#7C3AED', // Purple
  D: '#0891B2', // Cyan
  E: '#4F46E5', // Indigo
  F: '#0D9488', // Teal
  G: '#1D4ED8', // Dark Blue
  H: '#047857', // Dark Green
  I: '#6366F1', // Slate Blue
  J: '#0E7490', // Dark Cyan
  K: '#6D28D9', // Deep Purple
  L: '#155E75', // Deep Teal
  M: '#1E40AF'  // Navy Blue
};

const types = ['camera', 'body', 'tripod'];
const sets = Object.keys(colors);

const insertEquipment = db.prepare(`
  INSERT OR IGNORE INTO equipment (id, name, type, set_id, current_location, planned_location, color)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

sets.forEach(setId => {
  types.forEach(type => {
    const id = `${type}_${setId.toLowerCase()}`;
    const name = `${type.charAt(0).toUpperCase() + type.slice(1)} ${setId}`;
    insertEquipment.run(id, name, type, setId, 'engineering_garage', 'engineering_garage', colors[setId]);
  });
});

console.log('✅ Database initialized successfully');

export default db;