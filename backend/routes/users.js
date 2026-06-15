const express = require('express');
const db = require('../database');

const router = express.Router();

router.get('/', (req, res) => {
  const { role } = req.query;
  let query = 'SELECT id, username, name, role, created_at FROM users WHERE 1=1';
  const params = [];
  if (role) {
    query += ' AND role = ?';
    params.push(role);
  }
  query += ' ORDER BY name';
  const users = db.prepare(query).all(...params);
  res.json(users);
});

router.get('/:username', (req, res) => {
  const user = db.prepare('SELECT id, username, name, role, created_at FROM users WHERE username = ?').get(req.params.username);
  if (!user) {
    return res.status(404).json({ error: '用户不存在' });
  }
  res.json(user);
});

module.exports = router;
