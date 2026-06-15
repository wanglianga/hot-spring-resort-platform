const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../database');

const router = express.Router();

router.get('/', (req, res) => {
  const { serviceType } = req.query;
  let query = 'SELECT * FROM front_desk_records WHERE 1=1';
  const params = [];
  if (serviceType) {
    query += ' AND service_type = ?';
    params.push(serviceType);
  }
  query += ' ORDER BY created_at DESC LIMIT 100';
  const records = db.prepare(query).all(...params);
  res.json(records);
});

router.post('/', (req, res) => {
  const {
    serviceType, customerName, customerPhone, ticketType,
    poolId, fromPoolId, toPoolId, startTime, endTime,
    peopleCount, operatorId, operatorName, notes
  } = req.body;
  if (!serviceType || !operatorId || !operatorName) {
    return res.status(400).json({ error: '服务类型和操作人信息为必填项' });
  }
  const id = uuidv4();
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO front_desk_records (
      id, service_type, customer_name, customer_phone, ticket_type,
      pool_id, from_pool_id, to_pool_id, start_time, end_time,
      people_count, operator_id, operator_name, notes, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, serviceType, customerName || '', customerPhone || '', ticketType || '',
    poolId || null, fromPoolId || null, toPoolId || null, startTime || null, endTime || null,
    peopleCount || 1, operatorId, operatorName, notes || '', now
  );
  const record = db.prepare('SELECT * FROM front_desk_records WHERE id = ?').get(id);
  res.status(201).json(record);
});

module.exports = router;
