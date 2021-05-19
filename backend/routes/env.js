import { Country, Lang } from "../models";

const router = require("express").Router();

/**
 * @swagger
 * /api/env:
 *  get:
 *    description: 초기 환경변수를 한번에 호출
 *    responses:
 *      '200':
 *         description: countries, langs
 */
router.get("/", async (req, res, next) => {
  try {
    const envs = await Promise.all([Country.findAll(), Lang.findAll()]);
    return res.send({
      countries: envs[0],
      langs: envs[1],
    });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
