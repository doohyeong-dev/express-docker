export default (sequelize, DataTypes) => {
  const Lang = sequelize.define('Lang', {
    id: {
      primaryKey: true,
      type: DataTypes.INTEGER,
    }, // PK
    name: DataTypes.STRING(30), // 한국어, English, ...
    key: DataTypes.STRING(30), // vuetify key
  },
  {
    timestamps: false,
  });

  Lang.associate = (models) => {
    Lang.hasMany(models.User);
  };

  return Lang;
};
