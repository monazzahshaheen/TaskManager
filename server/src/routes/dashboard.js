const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');

const prisma = new PrismaClient();

// GET /api/dashboard — summary stats for the current user
router.get('/', authenticate, async (req, res) => {
  const userId = req.user.id;
  const now = new Date();

  try {
    const [
      totalProjects,
      assignedTasks,
      tasksByStatus,
      overdueTasks,
      recentTasks,
    ] = await Promise.all([
      // Projects the user is in
      prisma.project.count({
        where: {
          OR: [{ ownerId: userId }, { members: { some: { userId } } }],
        },
      }),

      // All tasks assigned to user
      prisma.task.count({ where: { assigneeId: userId } }),

      // Task counts by status for user's tasks
      prisma.task.groupBy({
        by: ['status'],
        where: { assigneeId: userId },
        _count: { id: true },
      }),

      // Overdue tasks (dueDate in the past, not DONE)
      prisma.task.findMany({
        where: {
          assigneeId: userId,
          dueDate: { lt: now },
          NOT: { status: 'DONE' },
        },
        include: {
          project: { select: { id: true, name: true } },
        },
        orderBy: { dueDate: 'asc' },
        take: 10,
      }),

      // Recent tasks across all user's projects
      prisma.task.findMany({
        where: {
          project: {
            OR: [{ ownerId: userId }, { members: { some: { userId } } }],
          },
        },
        include: {
          assignee: { select: { id: true, name: true } },
          project: { select: { id: true, name: true } },
        },
        orderBy: { updatedAt: 'desc' },
        take: 10,
      }),
    ]);

    const statusMap = tasksByStatus.reduce((acc, { status, _count }) => {
      acc[status] = _count.id;
      return acc;
    }, { TODO: 0, IN_PROGRESS: 0, REVIEW: 0, DONE: 0 });

    res.json({
      totalProjects,
      assignedTasks,
      tasksByStatus: statusMap,
      overdueTasks,
      recentTasks,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load dashboard' });
  }
});

module.exports = router;
