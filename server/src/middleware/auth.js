const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function authenticate(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
    if (!user) return res.status(401).json({ error: 'User not found' });
    req.user = user;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

// Checks if user is ADMIN of the given project (projectId from req.params)
async function requireProjectAdmin(req, res, next) {
  const { projectId } = req.params;
  const userId = req.user.id;

  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) return res.status(404).json({ error: 'Project not found' });

  if (project.ownerId === userId) return next();

  const member = await prisma.projectMember.findUnique({
    where: { userId_projectId: { userId, projectId } },
  });
  if (member?.role === 'ADMIN') return next();

  res.status(403).json({ error: 'Project admin access required' });
}

// Checks if user is a member (any role) of the project
async function requireProjectMember(req, res, next) {
  const { projectId } = req.params;
  const userId = req.user.id;

  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) return res.status(404).json({ error: 'Project not found' });

  if (project.ownerId === userId) return next();

  const member = await prisma.projectMember.findUnique({
    where: { userId_projectId: { userId, projectId } },
  });
  if (member) return next();

  res.status(403).json({ error: 'Project membership required' });
}

module.exports = { authenticate, requireProjectAdmin, requireProjectMember };
