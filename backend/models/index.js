/* eslint-disable import/no-dynamic-require */

const fs = require('fs');
const path = require('path');
const Sequelize = require('sequelize');
const mysql = require('mysql2/promise');

const basename = path.basename(__filename);
const env = process.env.NODE_ENV || 'development';
const config = require(`${__dirname}/../config/dbconfig.json`)[env];
const db = {};

mysql.createConnection({
  user: config.username || 'dev_database',
  password: config.password || 'password',
  port: 3306,
  host: 'mysql',
}).then((connection) => {
  connection.query(`CREATE DATABASE IF NOT EXISTS ${config.database};`);
  connection.end();
});

let sequelize;
if (config.use_env_variable) {
  sequelize = new Sequelize(process.env[config.use_env_variable], config);
} else {
  sequelize = new Sequelize(config.database, config.username, config.password, config);
}

fs
  .readdirSync(__dirname)
  .filter((file) => (file.indexOf('.') !== 0) && (file !== basename) && (file.slice(-3) === '.js'))
  .forEach((file) => {
    const model = sequelize.import(path.join(__dirname, file));
    db[model.name] = model;
  });

Object.keys(db).forEach((modelName) => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;
