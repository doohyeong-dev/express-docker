export default (sequelize, DataTypes) => {
  const Country = sequelize.define('Country', {
    id: {
      primaryKey: true,
      type: DataTypes.INTEGER,
    }, // PK
    name: DataTypes.STRING(30), // Country name (한국, United States, ...)
  },
  {
    timestamps: false,
  });

  Country.associate = (models) => {
    Country.hasMany(models.User);
  };

  return Country;
};
