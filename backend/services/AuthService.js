/**
 * @description Login verification
 */
export const ensureAuthenticate = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  return res.sendStatus(500);
};

/**
 * @description Login verification with admin level
 */
export const isAdmin = (req, res, next) => (req.user.position === 'admin' ? next() : next('no permission'));
