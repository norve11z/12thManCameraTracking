import express from 'express';
import db from '../db/init.js';

const router = express.Router();

// Get all equipment
router.get('/equipment', (req, res) => {
  try {
    const equipment = db.prepare('SELECT * FROM equipment ORDER BY set_id, type').all();
    res.json(equipment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all venues
router.get('/venues', (req, res) => {
  try {
    const venues = db.prepare('SELECT * FROM venues').all();
    res.json(venues);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update equipment location
router.put('/equipment/:id', (req, res) => {
  console.log('=== INDIVIDUAL EQUIPMENT UPDATE ===');
  console.log('Equipment ID:', req.params.id);
  console.log('Body:', req.body);
  
  try {
    const { id } = req.params;
    const { current_location, planned_location, notes, ip_address, serial_number } = req.body;
    
    const current = db.prepare('SELECT * FROM equipment WHERE id = ?').get(id);
    
    console.log('Found equipment:', current);
    
    if (!current) {
      console.error('Equipment not found!');
      return res.status(404).json({ error: 'Equipment not found' });
    }

    // Log change
    if (current_location && current_location !== current.current_location) {
      db.prepare(`
        INSERT INTO change_log (equipment_id, action, from_location, to_location, field_changed)
        VALUES (?, ?, ?, ?, ?)
      `).run(id, 'moved', current.current_location, current_location, 'current_location');
    }

    if (planned_location && planned_location !== current.planned_location) {
      db.prepare(`
        INSERT INTO change_log (equipment_id, action, from_location, to_location, field_changed)
        VALUES (?, ?, ?, ?, ?)
      `).run(id, 'planned', current.planned_location, planned_location, 'planned_location');
    }

    // Update equipment
    const updates = [];
    const values = [];
    
    if (current_location !== undefined) {
      updates.push('current_location = ?');
      values.push(current_location);
    }
    if (planned_location !== undefined) {
      updates.push('planned_location = ?');
      values.push(planned_location);
    }
    if (notes !== undefined) {
      updates.push('notes = ?');
      values.push(notes);
    }
    if (ip_address !== undefined) {
      updates.push('ip_address = ?');
      values.push(ip_address);
    }
    if (serial_number !== undefined) {
      updates.push('serial_number = ?');
      values.push(serial_number);
    }
    
    updates.push("last_modified = strftime('%s', 'now')");
    values.push(id);

    const sql = `UPDATE equipment SET ${updates.join(', ')} WHERE id = ?`;
    console.log('SQL:', sql);
    console.log('Values:', values);

    db.prepare(sql).run(...values);
    
    const updated = db.prepare('SELECT * FROM equipment WHERE id = ?').get(id);
    console.log('Updated equipment:', updated);
    
    res.json(updated);
  } catch (error) {
    console.error('❌ ERROR:', error.message);
    res.status(500).json({ error: error.message });
  }
});
// Update equipment set (all 3 pieces)
router.put('/equipment-set/:setId', (req, res) => {
  console.log('=== EQUIPMENT SET UPDATE ===');
  console.log('Set ID:', req.params.setId);
  console.log('Body:', req.body);
  
  try {
    const { setId } = req.params;
    const { current_location, planned_location } = req.body;
    
    // Get current state before update for logging
    const currentState = db.prepare('SELECT * FROM equipment WHERE set_id = ?').all(setId.toUpperCase());
    
    const updates = [];
    const values = [];
    
    // ONLY update fields that are provided
    if (current_location !== undefined) {
      updates.push('current_location = ?');
      values.push(current_location);
      
      currentState.forEach(piece => {
        if (piece.current_location !== current_location) {
          db.prepare(`
            INSERT INTO change_log (equipment_id, action, from_location, to_location, field_changed)
            VALUES (?, ?, ?, ?, ?)
          `).run(piece.id, 'moved_set', piece.current_location, current_location, 'current_location');
        }
      });
    }
    
    if (planned_location !== undefined) {
      updates.push('planned_location = ?');
      values.push(planned_location);
      
      currentState.forEach(piece => {
        if (piece.planned_location !== planned_location) {
          db.prepare(`
            INSERT INTO change_log (equipment_id, action, from_location, to_location, field_changed)
            VALUES (?, ?, ?, ?, ?)
          `).run(piece.id, 'planned_set', piece.planned_location, planned_location, 'planned_location');
        }
      });
    }
    
    if (updates.length === 0) {
      console.error('No updates provided');
      return res.status(400).json({ error: 'No updates provided' });
    }

    updates.push("last_modified = strftime('%s', 'now')");
    values.push(setId.toUpperCase());

    const sql = `UPDATE equipment SET ${updates.join(', ')} WHERE set_id = ?`;
    console.log('SQL Query:', sql);
    console.log('Values:', values);

    const stmt = db.prepare(sql);
    const result = stmt.run(...values);
    
    console.log('Rows changed:', result.changes);
    
    const updated = db.prepare('SELECT * FROM equipment WHERE set_id = ?').all(setId.toUpperCase());
    console.log('Updated equipment:', updated);
    
    res.json(updated);
  } catch (error) {
    console.error('❌ ERROR in equipment-set update:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Get recent changes (for undo)
router.get('/history', (req, res) => {
  try {
    const history = db.prepare(`
      SELECT * FROM change_log 
      ORDER BY timestamp DESC 
      LIMIT 10
    `).all();
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Undo last change - IMPROVED VERSION
router.post('/undo', (req, res) => {
  try {
    // Get the most recent change
    const lastChange = db.prepare(`
      SELECT * FROM change_log 
      ORDER BY timestamp DESC 
      LIMIT 1
    `).get();

    if (!lastChange) {
      return res.status(404).json({ error: 'No changes to undo' });
    }

    console.log('=== UNDO ===');
    console.log('Last change:', lastChange);

    const field = lastChange.field_changed;
    
    // Check if this was a set move
    if (lastChange.action === 'moved_set' || lastChange.action === 'planned_set') {
      // Get the set_id from the equipment
      const equipment = db.prepare('SELECT set_id FROM equipment WHERE id = ?').get(lastChange.equipment_id);
      
      if (equipment) {
        // Get all changes for this set at the same timestamp
        const setChanges = db.prepare(`
          SELECT * FROM change_log 
          WHERE timestamp = ? AND action = ?
        `).all(lastChange.timestamp, lastChange.action);

        console.log('Undoing set move, reverting', setChanges.length, 'pieces');

        // Revert each piece
        setChanges.forEach(change => {
          db.prepare(`
            UPDATE equipment 
            SET ${field} = ?, last_modified = strftime('%s', 'now')
            WHERE id = ?
          `).run(change.from_location, change.equipment_id);
        });

        // Delete all the set change logs
        db.prepare(`
          DELETE FROM change_log 
          WHERE timestamp = ? AND action = ?
        `).run(lastChange.timestamp, lastChange.action);

        return res.json({ 
          message: 'Set move undone', 
          affected: setChanges.length 
        });
      }
    }

    // Single equipment move
    db.prepare(`
      UPDATE equipment 
      SET ${field} = ?, last_modified = strftime('%s', 'now')
      WHERE id = ?
    `).run(lastChange.from_location, lastChange.equipment_id);

    // Delete the log entry
    db.prepare('DELETE FROM change_log WHERE id = ?').run(lastChange.id);

    const updated = db.prepare('SELECT * FROM equipment WHERE id = ?').get(lastChange.equipment_id);
    
    console.log('Single move undone');
    res.json(updated);
  } catch (error) {
    console.error('❌ UNDO ERROR:', error.message);
    res.status(500).json({ error: error.message });
  }
});
export default router;