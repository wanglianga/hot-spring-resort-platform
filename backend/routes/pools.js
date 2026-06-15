const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../database');

const router = express.Router();

router.get('/', (req, res) => {
  const { zone, status } = req.query;
  let query = 'SELECT * FROM pools WHERE 1=1';
  const params = [];
  if (zone) {
    query += ' AND zone = ?';
    params.push(zone);
  }
  if (status) {
    query += ' AND status = ?';
    params.push(status);
  }
  query += ' ORDER BY zone, name';
  const pools = db.prepare(query).all(...params);
  res.json(pools);
});

router.get('/:id', (req, res) => {
  const pool = db.prepare('SELECT * FROM pools WHERE id = ?').get(req.params.id);
  if (!pool) {
    return res.status(404).json({ error: '汤池不存在' });
  }
  res.json(pool);
});

router.post('/', (req, res) => {
  const { name, zone, temperature, capacity, minerals, description } = req.body;
  if (!name || !zone) {
    return res.status(400).json({ error: '汤池名称和区域为必填项' });
  }
  const id = uuidv4();
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO pools (id, name, zone, status, temperature, capacity, minerals, description, created_at, updated_at)
    VALUES (?, ?, ?, 'open', ?, ?, ?, ?, ?, ?)
  `).run(id, name, zone, temperature || 40, capacity || 20, minerals || '', description || '', now, now);
  const pool = db.prepare('SELECT * FROM pools WHERE id = ?').get(id);
  res.status(201).json(pool);
});

router.put('/:id', (req, res) => {
  const { name, zone, status, temperature, capacity, minerals, description } = req.body;
  const pool = db.prepare('SELECT * FROM pools WHERE id = ?').get(req.params.id);
  if (!pool) {
    return res.status(404).json({ error: '汤池不存在' });
  }
  const now = new Date().toISOString();
  db.prepare(`
    UPDATE pools SET
      name = COALESCE(?, name),
      zone = COALESCE(?, zone),
      status = COALESCE(?, status),
      temperature = COALESCE(?, temperature),
      capacity = COALESCE(?, capacity),
      minerals = COALESCE(?, minerals),
      description = COALESCE(?, description),
      updated_at = ?
    WHERE id = ?
  `).run(name, zone, status, temperature, capacity, minerals, description, now, req.params.id);
  const updated = db.prepare('SELECT * FROM pools WHERE id = ?').get(req.params.id);
  res.json(updated);
});

router.post('/:id/status', (req, res) => {
  const { status, temperature, operatorId, operatorName, notes } = req.body;
  if (!status || !operatorId || !operatorName) {
    return res.status(400).json({ error: '状态、操作人信息为必填项' });
  }
  const pool = db.prepare('SELECT * FROM pools WHERE id = ?').get(req.params.id);
  if (!pool) {
    return res.status(404).json({ error: '汤池不存在' });
  }
  const id = uuidv4();
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO pool_status_logs (id, pool_id, status, temperature, operator_id, operator_name, notes, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, req.params.id, status, temperature, operatorId, operatorName, notes || '', now);
  db.prepare(`
    UPDATE pools SET status = ?, temperature = COALESCE(?, temperature), updated_at = ? WHERE id = ?
  `).run(status, temperature, now, req.params.id);
  const updated = db.prepare('SELECT * FROM pools WHERE id = ?').get(req.params.id);
  res.json({ pool: updated, log: { id, pool_id: req.params.id, status, temperature, operator_id: operatorId, operator_name: operatorName, notes, created_at: now } });
});

router.get('/:id/logs', (req, res) => {
  const logs = db.prepare(`
    SELECT * FROM pool_status_logs WHERE pool_id = ? ORDER BY created_at DESC LIMIT 50
  `).all(req.params.id);
  res.json(logs);
});

module.exports = router;
