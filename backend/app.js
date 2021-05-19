/* eslint-disable import/no-dynamic-require */
/* eslint-disable global-require */
/* eslint-disable import/prefer-default-export */
import express from "express";
import fs from "fs";
import bodyParser from "body-parser";
import cors from "cors";
import path from "path";
import cookieParser from "cookie-parser";
import expressSession from "express-session";
import logger from "morgan";
import passport from "passport";
import connectRedis from 'connect-redis';
import redis from 'redis';
import helmet from "helmet";
import passportConfig from "./config/passport";
import { TIME } from "./config/const";
import swaggerDoc from "./swagger-doc";

passportConfig();

const app = express();
const db = require("./models").sequelize;

const { secret } = process.env;
/*
 * redis setup
 */
const RedisStore = connectRedis(expressSession);
const redisClient = redis.createClient({ port: 6379, host: 'redis'});

app.use(cookieParser());

export const store = new RedisStore({
  client: redisClient,
  prefix: 'session:',
  db,
});

/*
 * express-session setup
 */
app.use(
  expressSession({
    secret,
    saveUninitialized: false,
    resave: false,
    // store,
    cookie: {
      maxAge: TIME.DAY,
      secure: false,
    },
    key: "_sid",
  })
);

/*
 * security module
 */
app.use(helmet());

/*
 * passport + session
 */

app.use(passport.initialize());
app.use(passport.session());

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

/*
 * cors setup
 */
app.use(
  cors({
    credentials: true,
    origin: process.env.HOST_SERVER,
  })
);

/*
 * static direcctory setup
 */
app.use(express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

/**
 * init router, routes/users.js ===> /api/users/
 */
fs.readdirSync(path.join(__dirname, "routes"))
  .map((filename) => ({
    name: filename.split(".")[0],
    router: require(path.join(__dirname, "routes", filename)),
  }))
  .forEach(({ name, router }) => app.use(`/api/${name}`, router));

swaggerDoc(app); // init swagger

module.exports = app;
