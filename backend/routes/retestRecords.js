const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../database');

const router = express.Router();

router.get('/', (req, res) => {
  const { reportId, poolId, result } = req.query;
  let query = 'SELECT * FROM retest_records WHERE 1=1';
  const params = [];
  if (reportId) {
    query += ' AND report_id = ?';
    params.push(reportId);
  }
  if (poolId) {
    query += ' AND pool_id = ?';
    params.push(poolId);
  }
  if (result) {
    query += ' AND result = ?';
    params.push(result);
  }
  query += ' ORDER BY created_at DESC LIMIT 100';
  const records = db.prepare(query).all(...params);
  res.json(records);
});

router.post('/', (req, res) => {
  const {
    reportId, poolId, temperature, waterLevel, mineralLevel, foamLevel,
    readingData, photoUrl, result, operatorId, operatorName, notes
  } = req.body;
  if (!reportId || !poolId || !result || !operatorId || !operatorName) {
    return res.status(400).json({ error: '报告ID、汤池ID、复测结果和操作人信息为必填项' });
  }
  const id = uuidv4();
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO retest_records (
      id, report_id, pool_id, temperature, water_level, mineral_level,
      foam_level, reading_data, photo_url, result, operator_id, operator_name,
      notes, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, reportId, poolId, temperature || null, waterLevel || null, mineralLevel || null,
    foamLevel || '', readingData || '', photoUrl || '', result, operatorId, operatorName,
    notes || '', now
  );

  if (result === 'pass') {
    db.prepare('UPDATE pool_abnormal_reports SET status = ?, updated_at = ? WHERE id = ?').run('resolved', now, reportId);
    db.prepare("UPDATE pools SET status = 'open', updated_at = ? WHERE id = ?").run(now, poolId);
    const activeClosure = db.prepare('SELECT * FROM pool_closures WHERE pool_id = ? AND reopened_at IS NULL').get(poolId);
    if (activeClosure) {
      db.prepare('UPDATE pool_closures SET reopened_at = ? WHERE id = ?').run(now, activeClosure.id);
    }
  }

  const record = db.prepare('SELECT * FROM retest_records WHERE id = ?').get(id);
  res.status(201).json(record);
});

module.exports = router;
