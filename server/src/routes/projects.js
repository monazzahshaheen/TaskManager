const router = require('express').Router();
const { body, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const { authenticate, requireProjectAdmin, requireProjectMember } = require('../middleware/auth');

const prisma = new PrismaClient();

// GET /api/projects — projects the user owns or is a member of
router.get('/', authenticate, async (req, res) => {
  try {
    const projects = await prisma.project.findMany({
      where: {
        OR: [
          { ownerId: req.user.id },
          { members: { some: { userId: req.user.id } } },
        ],
      },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        _count: { select: { tasks: true, members: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
    res.json(projects);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

// POST /api/projects
router.post(
  '/',
  authenticate,
  [
    body('name').trim().notEmpty().withMessage('Project name required'),
    body('description').optional().trim(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { name, description } = req.body;
    try {
      const project = await prisma.project.create({
        data: {
          name,
          description,
          ownerId: req.user.id,
          members: {
            create: { userId: req.user.id, role: 'ADMIN' },
          },
        },
        include: {
          owner: { select: { id: true, name: true, email: true } },
          _count: { select: { tasks: true, members: true } },
        },
      });
      res.status(201).json(project);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to create project' });
    }
  }
);

// GET /api/projects/:projectId
router.get('/:projectId', authenticate, requireProjectMember, async (req, res) => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: req.params.projectId },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        members: {
          include: { user: { select: { id: true, name: true, email: true } } },
        },
        tasks: {
          include: {
            assignee: { select: { id: true, name: true, email: true } },
            creator: { select: { id: true, name: true, email: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!project) return res.status(404).json({ error: 'Project not found' });
    res.json(project);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch project' });
  }
});

// PUT /api/projects/:projectId
router.put(
  '/:projectId',
  authenticate,
  requireProjectAdmin,
  [
    body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
    body('description').optional().trim(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { name, description } = req.body;
    try {
      const project = await prisma.project.update({
        where: { id: req.params.projectId },
        data: { ...(name && { name }), ...(description !== undefined && { description }) },
        include: {
          owner: { select: { id: true, name: true, email: true } },
          _count: { select: { tasks: true, members: true } },
        },
      });
      res.json(project);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to update project' });
    }
  }
);

// DELETE /api/projects/:projectId
router.delete('/:projectId', authenticate, requireProjectAdmin, async (req, res) => {
  try {
    const project = await prisma.project.findUnique({ where: { id: req.params.projectId } });
    if (project.ownerId !== req.user.id)
      return res.status(403).json({ error: 'Only project owner can delete' });

    await prisma.project.delete({ where: { id: req.params.projectId } });
    res.json({ message: 'Project deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

// POST /api/projects/:projectId/members — add member (admin only)
router.post('/:projectId/members', authenticate, requireProjectAdmin, async (req, res) => {
  const { email, role } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });

  try {
    const userToAdd = await prisma.user.findUnique({ where: { email } });
    if (!userToAdd) return res.status(404).json({ error: 'User not found' });

    const member = await prisma.projectMember.upsert({
      where: {
        userId_projectId: { userId: userToAdd.id, projectId: req.params.projectId },
      },
      update: { role: role || 'MEMBER' },
      create: {
        userId: userToAdd.id,
        projectId: req.params.projectId,
        role: role || 'MEMBER',
      },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
    res.status(201).json(member);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to add member' });
  }
});

// DELETE /api/projects/:projectId/members/:userId
router.delete('/:projectId/members/:userId', authenticate, requireProjectAdmin, async (req, res) => {
  const { projectId, userId } = req.params;
  try {
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (project.ownerId === userId)
      return res.status(400).json({ error: 'Cannot remove project owner' });

    await prisma.projectMember.delete({
      where: { userId_projectId: { userId, projectId } },
    });
    res.json({ message: 'Member removed' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to remove member' });
  }
});

// PATCH /api/projects/:projectId/members/:userId — update member role
router.patch('/:projectId/members/:userId', authenticate, requireProjectAdmin, async (req, res) => {
  const { projectId, userId } = req.params;
  const { role } = req.body;
  if (!['ADMIN', 'MEMBER'].includes(role))
    return res.status(400).json({ error: 'Invalid role' });

  try {
    const member = await prisma.projectMember.update({
      where: { userId_projectId: { userId, projectId } },
      data: { role },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
    res.json(member);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update member role' });
  }
});

module.exports = router;
