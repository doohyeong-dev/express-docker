import passport from 'passport';
import bcrypt from 'bcrypt-nodejs';
import sha1 from 'js-sha1';
import {
  User,
} from '../models';

const LocalStrategy = require('passport-local').Strategy;

module.exports = () => {
  passport.serializeUser((user, done) => {
    done(null, user);
  });

  passport.deserializeUser((user, done) => {
    done(null, user);
  });

  passport.use(
    new LocalStrategy({
      usernameField: 'email',
      passwordField: 'password',
      session: true,
      passReqToCallback: false,
    },
    async (email, password, done) => {
      const user = await User.findOne({
        where: {
          email,
        },
      });
      if (!user) return done(null, false);
      if (!user.verified) return done(null, false);
      if (
        user.password === sha1(password)
          || bcrypt.compareSync(password, user.password)
      ) {
        delete user.dataValues.password;
        return done(null, user);
      }
      return done(null, false);
    }),
  );
};
