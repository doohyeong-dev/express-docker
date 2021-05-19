import { ensureAuthenticate, isAdmin } from '../services/AuthService';
import { Log } from '../models';

const router = require('express').Router();

/**
 * @param  {middleware} ensureAuthenticate
 */
router.use('/log', ensureAuthenticate);

/**
 * @swagger
 * /api/log:
 *  get:
 *    summary: Login isAdmin
 *    description: 로그 리스트
 *    responses:
 *      '200':
 *         description: logs
 */
router.get('/', isAdmin, async (req, res, next) => {
  try {
    const logs = await Log.findAll({ order: [['createdAt', 'DESC']] });
    return res.send(logs);
  } catch (error) {
    console.error(error);
    return next(error);
  }
});

module.exports = router;
