import DB from '../models';

const {
  Log,
} = DB;

/**
 * @description Log Module
 * @param {req} req
 * @param {string} type log title
 * @param {string} action log short description
 * @param {text} data log detailed descrtiption
 */
const log = ({
  req, type, action, data,
}) => {
  const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress; // private ip

  return Log.create({
    ip,
    type,
    action,
    data: JSON.stringify(data),
    UserId: req.user && req.user.id,
  }); // create log to database
};

export default log;
