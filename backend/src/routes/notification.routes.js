/**
 * SasyaVahini — Notifications Routes
 */

const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const { authenticate } = require('../middleware/auth');
const { sendSuccess } = require('../utils/apiResponse');

router.get('/', authenticate, async (req, res, next) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      take: 20
    });
    return sendSuccess(res, notifications);
  } catch (err) {
    next(err);
  }
});

router.put('/:id/read', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    await prisma.notification.updateMany({
      where: { id, userId: req.user.id },
      data: { isRead: true, readAt: new Date() }
    });
    return sendSuccess(res, { success: true });
  } catch (err) {
    next(err);
  }
});

router.post('/read', authenticate, async (req, res, next) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user.id, isRead: false },
      data: { isRead: true, readAt: new Date() }
    });
    return sendSuccess(res, { success: true });
  } catch (err) {
    next(err);
  }
});

router.put('/read-all', authenticate, async (req, res, next) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user.id, isRead: false },
      data: { isRead: true, readAt: new Date() }
    });
    return sendSuccess(res, { success: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;