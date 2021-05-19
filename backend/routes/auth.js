/* eslint-disable no-shadow */
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import passport from 'passport';
import Joi from 'joi';
import bcrypt from 'bcrypt-nodejs';
import rimraf from 'rimraf';
import {
  User, Auth, Sequelize, Lang, Storage,
} from '../models';
import { HOST, TIME } from '../config/const';
import {
  mail,
  buildPasswordMail,
  buildSignupMail,
} from '../services/MailService';
import { ensureAuthenticate, isAdmin } from '../services/AuthService';
import log from '../services/LogService';
import { store } from '../app';
import { emptyS3Directory } from '../services/S3Service';

const { recaptcha } = process.env;
const router = require('express').Router();

/**
 * @description google-recaptcha verification url
 * @param {string} secretkey server key - env
 * @param {string} captchaToken client key
 * @returns captchaURL
 */
const captchaURL = (secretkey, captchaToken) => `https://www.google.com/recaptcha/api/siteverify?secret=${secretkey}&response=${captchaToken}`;

/**
 * @swagger
 * /api/auth/login:
 *  post:
 *    description: 로그인
 *    parameters:
 *      - in: body
 *        name: user
 *        schema:
 *          type: object
 *          required:
 *            - email
 *            - password
 *            - failCount
 *          properties:
 *            email:
 *              type: string
 *              example: doohyeong.dev@gmail.com
 *            password:
 *              type: string
 *              example: 1234
 *            failCount:
 *              type: integer
 *            captchaToken:
 *              type: string
 *    responses:
 *      '200':
 *         description: Successfully authenticated.
 */
router.post('/login', async (req, res, next) => {
  const data = req.body;
  const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

  const schema = Joi.object().keys({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
    captchaToken: Joi.string().allow('').optional(),
    failCount: Joi.number().required(),
  }); // login schema

  const result = schema.validate(data); // validate schema

  if (result.error) {
    const { message } = result.error.details[0];
    return next(message);
  } // if error ===> return

  /*
   * if failCount >=5, verify google-recaptcha
   */
  if (data.failCount >= 5) {
    const { captchaToken } = data;
    if (!captchaToken) return next('No captchaToken');

    const captchaResult = await axios.post(
      captchaURL(recaptcha, captchaToken),
      { remoteip: ip },
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8',
        },
      },
    );

    if (!captchaResult.data.success) return next('captcha fail');
  }

  /*
   * passport authenticate
   */
  return passport.authenticate('local', async (err, user) => {
    if (err) {
      return next(err);
    }
    if (!user) {
      // login fail
      await Promise.all([
        User.increment('failCount', { where: { email: data.email } }), // increase failCount
        log({ req, type: 'LOGIN', action: `"${data.email} 로그인 실패"` }), // log login fail
      ]);
      return res.send({ ok: false });
    }

    return req.logIn(user, async (err) => {
      if (err) {
        return next(err);
      }

      req.user = req.session.passport.user; // save in req.user

      store.all((_, sessions) => {
        sessions.forEach((e) => {
          const { user } = e.passport;
          // 세션에 사용자 정보가 담겨있고, 담겨있는 사용자의 아이디와 현재 세션의 사용자 아이디가 같지만
          // 세션의 ID가 다른 경우 다른 디바이스에서 접속한걸로 간주하고 이전에 등록된 세션을 파괴한다.
          if (user && user.id === req.user.id && e.id !== req.user.id) {
            // eslint-disable-next-line no-console
            store.destroy(e.id, (err) => { console.error(err); /* 오류로 인한 에러 핸들링 */ });
          }
        });
      });

      // update user ip
      await Promise.all([
        User.update({ ip, failCount: 0 }, { where: { email: data.email } }), // update ip, failcount
        log({ req, type: 'LOGIN', action: `"${data.email} 로그인 성공"` }), // log login success
      ]);

      return res.send({ ok: !!user, data: user });
    });
  })(req, res, next);
});

/**
 * @param  {} '/login'
 * @param  {} req
 * @param  {} res
 * @returns  {json} => { ok: true }
 */
router.options('/login', (req, res) => res.send({ ok: true }));


/**
 * @swagger
 * /api/auth/signup:
 *  post:
 *    description: 회원가입
 *    parameters:
 *      - in: body
 *        name: user
 *        schema:
 *          type: object
 *          required:
 *            - hospital
 *            - email
 *            - contact
 *            - CountryId
 *            - LangId
 *          properties:
 *            hospital:
 *              type: string
 *              example: hospital
 *            email:
 *              type: string
 *              example: doohyeong.dev@gmail.com
 *            name:
 *              type: string
 *              example: username
 *            contact:
 *              type: string
 *              example: conatct
 *            CountryId:
 *              type: integer
 *              example: 1
 *            LangId:
 *              type: integer
 *              example: 1
 *    responses:
 *      '200':
 *         description: Successfully signup.
 */
router.post('/signup', async (req, res, next) => {
  try {
    const data = req.body;
    const {
      email,
    } = data;

    const schema = {
      hospital: Joi.string().required(),
      email: Joi.string().email().required(),
      name: Joi.string().required(),
      contact: Joi.string().required(),
      CountryId: Joi.number().required(),
      LangId: Joi.number().required(),
    }; // signup schema

    const result = Joi.validate(data, schema); // validate schema

    if (result.error) {
      const { message } = result.error.details[0];
      return next(message);
    } // if error ===> return

    // find user if exist
    const user = await User.findOne({ where: { email } });
    if (user) return next('Already exist');

    // create user
    const createdUser = await User.create(data);
    const token = uuidv4();
    const UserId = createdUser.id;

    await Promise.all([
      // create email validation token
      Auth.create({
        id: token,
        dueDate: Date.now() + 7 * TIME.DAY,
        UserId,
      }),
      // email
      mail({
        req,
        to: email,
        subject: 'Sign up',
        html: buildSignupMail({ title: 'Sign Up' }),
      }),
      // log
      log({
        req, type: 'SIGN UP', action: `"${email} 회원가입 성공"`,
      }),
    ]);

    return res.send({ ok: true });
  } catch (error) {
    return next(error);
  }
});

/**
 * @swagger
 * /api/auth/forceSignup:
 *  post:
 *    summary: Login isAdmin
 *    description: 관리자 회원가입
 *    parameters:
 *      - in: body
 *        name: user
 *        schema:
 *          type: object
 *          required:
 *            - hospital
 *            - email
 *            - contact
 *            - password
 *            - position
 *            - verified
 *            - CountryId
 *            - LangId
 *          properties:
 *            hospital:
 *              type: string
 *              example: hospital
 *            email:
 *              type: string
 *              example: doohyeong.dev@gmail.com
 *            name:
 *              type: string
 *              example: username
 *            password:
 *              type: string
 *            position:
 *              type: string
 *              example: user
 *            contact:
 *              type: string
 *              example: conatct
 *            verified:
 *               type: boolean
 *               example: true
 *            CountryId:
 *              type: integer
 *              example: 1
 *            LangId:
 *              type: integer
 *              example: 1
 *    responses:
 *      '200':
 *         description: { ok : true }
 */
router.post('/forceSignup', isAdmin, ensureAuthenticate, async (req, res, next) => {
  try {
    if (req.session.passport.user.position !== 'admin') return next('unauthroized');

    const data = req.body;
    const {
      hospital, email, name, contact, password, position, LangId, CountryId,
    } = data;

    const schema = {
      hospital: Joi.string().required(),
      email: Joi.string().email().required(),
      name: Joi.string().required(),
      contact: Joi.string().required(),
      password: Joi.string().required(),
      position: Joi.string().required(),
      verified: Joi.boolean().required(),
      CountryId: Joi.number().required(),
      LangId: Joi.number().required(),
    }; // forceSignup schema

    const result = Joi.validate(data, schema); // validate schema

    if (result.error) {
      const { message } = result.error.details[0];
      return next(message);
    } // if error ===> return

    const user = await User.findOne({ where: { email } });
    if (user) return next('Already exist');

    await User.create({
      hospital,
      email,
      password: bcrypt.hashSync(password),
      name,
      contact,
      position,
      verified: true,
      LangId,
      CountryId,
    });

    log({
      req, type: 'SIGN UP', action: `"${email} 회원가입 성공(관리자)"`,
    });

    return res.send({ ok: true });
  } catch (error) {
    return next(error);
  }
});

/**
 * @swagger
 * /api/auth/check/token/{id}:
 *  get:
 *    description: auth model (duedate) 확인, 회원가입 & 비밀번호 변경 등 이메일 발송시 발급
 *    parameters:
 *    - in: path
 *      name: id
 *      type: string
 *      required: true
 *  responses:
 *    '200':
 *       description: { ok: true }
 */
router.get('/check/token/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const schema = {
      id: Joi.string().required(),
    }; // check token schema

    const result = Joi.validate({ id }, schema); // validate schema

    if (result.error) {
      const { message } = result.error.details[0];
      return next(message);
    }// if error ===> return

    const auth = await Auth.findOne({
      where: { id },
    });

    if (!auth) return next('Expired or invalid token');

    await Auth.destroy({
      where: {
        dueDate: {
          [Sequelize.Op.lt]: Date.now(),
        },
        id,
      },
    }); // delete expired token

    const valid = await Auth.findOne({
      where: { id },
    }); // find token

    if (!valid) return next('Expired or invalid token'); // if token not exist error

    return res.send({ ok: true });
  } catch (error) {
    return next(error);
  }
});

/**
 * @swagger
 * /api/auth/resetPassword:
 *  post:
 *    summary: Login
 *    description: 패스워드 변경 이메일 전송
 *    responses:
 *      '200':
 *         description: { ok : true }
 */
router.post('/resetPassword', ensureAuthenticate, async (req, res, next) => {
  try {
    const { id: UserId, email } = req.user;

    const token = uuidv4(); // create token with uuid

    await Auth.destroy({
      where: {
        UserId,
      },
    }); // delete auth

    await Auth.create({
      id: token,
      dueDate: Date.now() + 7 * TIME.DAY,
      UserId,
    }); // create auth

    const changePasswordURL = `${HOST}/password/change/${token}`; // password reset url

    mail({
      req,
      subject: 'Password Change',
      html: buildPasswordMail({
        title: 'Password Change',
        subtitle: `${email}, Your password change request has been approved`,
        changePasswordURL,
      }),
      to: email,
    }); // password reset mail

    log({
      req, type: 'RESET PASSWORD', action: `"${email} 비밀번호 변경"`,
    }); // password reset log

    return res.send({ ok: true });
  } catch (error) {
    return next(error);
  }
});

/**
 * @swagger
 * /api/auth/password/forgot:
 *  post:
 *    description: 비밀번호 초기화/찾기
 *    parameters:
 *      - in: body
 *        name: email
 *        schema:
 *          type: object
 *          required:
 *            - email
 *          properties:
 *            email:
 *              type: string
 *              example: doohyeong.dev@gmail.com
 *    responses:
 *      '200':
 *         description: { ok: true }
 */
router.post('/password/forgot', async (req, res, next) => {
  try {
    const data = req.body;
    const { email } = data; // get email from req.body

    const schema = {
      email: Joi.string().required(),
    }; // forgot password schema

    const result = Joi.validate(data, schema); // validate schema

    if (result.error) {
      const { message } = result.error.details[0];
      return next(message);
    } // if error ===> return

    // find user and return error if not exist
    const user = await User.findOne({ where: { email } });
    if (!user) return next('Invalid email');

    const UserId = user.id;
    const token = uuidv4();
    await Auth.destroy({
      where: {
        UserId,
      },
    }); // delete all tokens of user

    await Auth.create({
      id: token,
      dueDate: Date.now() + 7 * TIME.DAY,
      UserId,
    }); // create new token

    const changePasswordURL = `${HOST}/password/change/${token}`;

    mail({
      req,
      subject: 'Update Password',
      html: buildPasswordMail({
        title: 'Password Change',
        subtitle: `${email} password change request has been approved`,
        changePasswordURL,
      }),
      to: email,
    });

    log({
      req, type: 'FORGOT PASSWORD', action: `"${email} 비밀번호 찾기 요청"`,
    });

    return res.send({ ok: true });
  } catch (error) {
    return next(error);
  }
});

/**
* @swagger
* /api/auth/password/change/{token}:
*  patch:
*    summary: /api/auth/password/forgot 혹은 /api/auth/resetPassword 먼저 진행되어야 토큰이 생김
*    description: 비밀번호 변경
*    parameters:
*      - in: path
*        name: token
*        type: string
*        required: true
*      - in: body
*        name: user
*        schema:
*          type: object
*          required:
*            - password
*            - password2
*          properties:
*            password:
*              type: string
*              example: test
*            password2:
*              type: string
*              example: test
*    responses:
*      '200':
*         description: { ok: true }
*/
router.patch('/password/change/:token', async (req, res, next) => {
  try {
    const { token } = req.params;
    const { password, password2 } = req.body;

    const schema = {
      password: Joi.string().min(4).max(16).required(),
      password2: Joi.any().valid(Joi.ref('password')).required().options({ language: { any: { allowOnly: 'must match password' } } }),
    }; // change password schema

    const result = Joi.validate({ password, password2 }, schema); // validate schema

    if (result.error) {
      const { message } = result.error.details[0];
      return next(message);
    } // if error ===> return

    const auth = await Auth.findOne({
      where: { id: token },
    }); // find auth to validate

    await User.update({
      password: bcrypt.hashSync(password),
      verified: true,
    }, {
      where: { id: auth.UserId },
    }); // update user valid & password

    await Auth.destroy({
      where: { id: token },
    }); // delete auth

    return res.send({ ok: true });
  } catch (error) {
    return next(error);
  }
});

/**
 * @swagger
 * /api/auth/guard:
 *  get:
 *    summary: Login
 *    description: router guard
 *    responses:
 *      '200':
 *         description: user
 */
router.get('/guard', ensureAuthenticate, async (req, res, next) => {
  try {
    const user = await User.findOne({
      where: {
        id: req.user.id,
      },
      include: [Lang],
      attributes: ['id', 'position', 'email', 'name', 'uploadCount'],
    });

    return res.send(user);
  } catch (error) {
    return next(error);
  }
});

/**
 * @swagger
 * /api/auth/logout:
 *  get:
 *    summary: Login
 *    description: logout
 *    responses:
 *      '200':
 *         description: { ok: true }
 */
router.get('/logout', ensureAuthenticate, async (req, res, next) => {
  const UserId = req.user.id;

  await Promise.all([
    rimraf(`uploads/${UserId}/*`, () => console.log('rmiraf done')), // empty directory
    Storage.destroy({ where: { UserId } }), // empty db [Storage]
    emptyS3Directory({ key: UserId }), // empty s3 directory
  ]); // delete storage to prevent idle logout

  req.session.destroy((error) => {
    if (error) {
      next(error);
    }
  }); // session destroy

  log({
    req, type: 'LOGOUT', action: `"${req.user.email} 로그아웃"`,
  }); // log logout

  req.logout(); // passport logout
  req.user = null; // clear req.user
  return res.send({ ok: true });
});

module.exports = router;
