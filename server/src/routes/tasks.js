const router = require('express').Router();
const { body, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const { authenticate, requireProjectAdmin, requireProjectMember } = require('../middleware/auth');

const prisma = new PrismaClient();

// Middleware to load task and attach projectId to req.params
async function loadTask(req, res, next) {
  const task = await prisma.task.findUnique({
    where: { id: req.params.taskId },
    select: { id: true, projectId: true, creatorId: true },
  });
  if (!task) return res.status(404).json({ error: 'Task not found' });
  req.task = task;
  req.params.projectId = task.projectId;
  next();
}

// GET /api/tasks/project/:projectId
router.get('/project/:projectId', authenticate, requireProjectMember, async (req, res) => {
  try {
    const { status, priority, assigneeId } = req.query;
    const where = {
      projectId: req.params.projectId,
      ...(status && { status }),
      ...(priority && { priority }),
      ...(assigneeId && { assigneeId }),
    };

    const tasks = await prisma.task.findMany({
      where,
      include: {
        assignee: { select: { id: true, name: true, email: true } },
        creator: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(tasks);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

// POST /api/tasks/project/:projectId
router.post(
  '/project/:projectId',
  authenticate,
  requireProjectMember,
  [
    body('title').trim().notEmpty().withMessage('Title required'),
    body('description').optional().trim(),
    body('status').optional().isIn(['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE']),
    body('priority').optional().isIn(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
    body('dueDate').optional().isISO8601().withMessage('Invalid date'),
    body('assigneeId').optional().isString(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { title, description, status, priority, dueDate, assigneeId } = req.body;
    try {
      const task = await prisma.task.create({
        data: {
          title,
          description,
          status: status || 'TODO',
          priority: priority || 'MEDIUM',
          dueDate: dueDate ? new Date(dueDate) : null,
          projectId: req.params.projectId,
          creatorId: req.user.id,
          assigneeId: assigneeId || null,
        },
        include: {
          assignee: { select: { id: true, name: true, email: true } },
          creator: { select: { id: true, name: true, email: true } },
        },
      });
      res.status(201).json(task);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to create task' });
    }
  }
);

// GET /api/tasks/:taskId
router.get('/:taskId', authenticate, loadTask, requireProjectMember, async (req, res) => {
  try {
    const task = await prisma.task.findUnique({
      where: { id: req.params.taskId },
      include: {
        assignee: { select: { id: true, name: true, email: true } },
        creator: { select: { id: true, name: true, email: true } },
        project: { select: { id: true, name: true } },
      },
    });
    res.json(task);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch task' });
  }
});

// PUT /api/tasks/:taskId — admin can update all fields; member can only update status if assigned
router.put(
  '/:taskId',
  authenticate,
  loadTask,
  async (req, res) => {
    const { projectId, taskId } = req.params;
    const userId = req.user.id;

    // Check project membership
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    const member = await prisma.projectMember.findUnique({
      where: { userId_projectId: { userId, projectId } },
    });
    const isAdmin = project?.ownerId === userId || member?.role === 'ADMIN';
    const isAssignee = req.task.creatorId === userId || (
      await prisma.task.findUnique({ where: { id: taskId }, select: { assigneeId: true } })
    )?.assigneeId === userId;

    if (!isAdmin && !isAssignee)
      return res.status(403).json({ error: 'Not authorized to update this task' });

    const { title, description, status, priority, dueDate, assigneeId } = req.body;

    // Members can only update status
    const data = isAdmin
      ? {
          ...(title && { title }),
          ...(description !== undefined && { description }),
          ...(status && { status }),
          ...(priority && { priority }),
          ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
          ...(assigneeId !== undefined && { assigneeId: assigneeId || null }),
        }
      : { ...(status && { status }) };

    try {
      const task = await prisma.task.update({
        where: { id: taskId },
        data,
        include: {
          assignee: { select: { id: true, name: true, email: true } },
          creator: { select: { id: true, name: true, email: true } },
        },
      });
      res.json(task);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to update task' });
    }
  }
);

// DELETE /api/tasks/:taskId
router.delete('/:taskId', authenticate, loadTask, requireProjectAdmin, async (req, res) => {
  try {
    await prisma.task.delete({ where: { id: req.params.taskId } });
    res.json({ message: 'Task deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

module.exports = router;
