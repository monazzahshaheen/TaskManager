const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');

const prisma = new PrismaClient();

// GET /api/users/search?email=... — find users to add to project
router.get('/search', authenticate, async (req, res) => {
  const { email } = req.query;
  if (!email) return res.status(400).json({ error: 'Email query required' });

  try {
    const users = await prisma.user.findMany({
      where: {
        email: { contains: email, mode: 'insensitive' },
        NOT: { id: req.user.id },
      },
      select: { id: true, name: true, email: true },
      take: 10,
    });
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Search failed' });
  }
});

module.exports = router;
