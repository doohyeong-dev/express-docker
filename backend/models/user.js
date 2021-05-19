
module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    id: {
      primaryKey: true,
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
    }, // PK
    hospital: DataTypes.STRING(30),
    email: DataTypes.STRING(30),
    name: DataTypes.STRING(30),
    password: DataTypes.STRING(60),
    contact: DataTypes.STRING(30),
    position: {
      type: DataTypes.STRING(20),
      defaultValue: 'user',
    }, // user, admin
    ip: DataTypes.STRING(40),
    verified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false, // default - not verified
    }, // not verified: 0, verified 1 ( password set by email)
    failCount: {
      type: DataTypes.INTEGER(2),
      defaultValue: 0,
    }, // failcount >= 5 ===> require google-recaptcha
    uploadCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    LangId: {
      type: DataTypes.INTEGER,
      defaultValue: 1, // ko
    }, // fk_lang_id
    CountryId: {
      type: DataTypes.INTEGER,
      defaultValue: 1, // 한국
    }, // fk_country_id
  }, {
    indexes: [{
      unique: true,
      fields: ['email'],
    }],
  });

  User.associate = (models) => {
    User.hasMany(models.Auth);
    User.belongsTo(models.Lang);
    User.belongsTo(models.Country);
  };
  return User;
};
