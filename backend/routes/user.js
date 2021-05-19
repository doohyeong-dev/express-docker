import bcrypt from 'bcrypt-nodejs';
import { ensureAuthenticate, isAdmin } from '../services/AuthService';
import {
  User, Lang, Country,
} from '../models';
import log from '../services/LogService';

const router = require('express').Router();

/**
 * @description /api/user ===> ensureAuthenticate middleware
 * @param {middleware} ensureAuthenticate
 */
router.use('/', ensureAuthenticate);

/**
* @swagger
* /api/user/{id}:
*  patch:
*    summary: Login
*    description: 유저 정보 변경
*    parameters:
*      - in: path
*        name: id
*        type: string
*        required: true
*      - in: body
*        name: user
*        schema:
*          type: object
*          properties:
*            password:
*              type: string
*            hostpital:
*              type: string
*            name:
*              type: string
*            contact:
*              type: string
*    responses:
*      '200':
*         description: { ok: true }
*/
router.patch('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { data } = req.body;

    // if data.password, encrypt password
    if (data.password) data.password = bcrypt.hashSync(data.password);

    await User.update(data, {
      where: { id },
    }); // update User

    log({
      req, type: 'UPDATE USER', action: `"${id} 계정 UPDATE"`, data,
    }); // Logging

    return res.send({ ok: true });
  } catch (error) {
    return next(error);
  }
});

/**
 * @swagger
 * /api/user/list:
 *  get:
 *    summary: Login isAdmin
 *    description: 유저 리스트
 *    responses:
 *      '200':
 *         description: user
 */
router.get('/list', isAdmin, async (req, res, next) => {
  try {
    const users = await User.findAll({
      attributes: ['id', 'name', 'hospital', 'email', 'contact', 'position', 'verified', 'createdAt'],
      include: [Country, Lang],
      order: [['createdAt', 'DESC']],
    });
    return res.send(users);
  } catch (error) {
    return next(error);
  }
});

/**
 * @swagger
 * /api/user:
 *  get:
 *    summary: Login
 *    description: 현재 로그인 상태의 유저 정보
 *    responses:
 *      '200':
 *         description: user
 */
router.get('/', async (req, res, next) => {
  try {
    const { id } = req.user;
    const user = await User.findOne(
      {
        where: { id },
        include: [Country, Lang],
        attributes: ['id', 'hospital', 'email', 'contact', 'position', 'name', 'uploadCount'],
      },
    );
    return res.send(user);
  } catch (error) {
    return next(error);
  }
});

/**
 * @swagger
 * /api/user/{id}:
 *  delete:
 *    summary: Login isAdmin
 *    description: 계정삭제
 *    responses:
 *      '200':
 *         description: { ok : true }
 */
router.delete('/:id', isAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    await User.destroy({ where: { id } });
    log({ req, type: 'DELETE USER', action: `"${id} 회원 삭제"` });
    return res.send({ ok: true });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
