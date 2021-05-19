export default (sequelize, DataTypes) => {
  const Log = sequelize.define(
    'Log',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      }, // PK
      ip: DataTypes.STRING(39),
      type: DataTypes.STRING(64), // LOGIN / MAIL / LOGOUT ...
      action: DataTypes.TEXT, // DESCRIPTION
      data: DataTypes.TEXT, // DETAILED DESCRIPTION
    },
    { timestamps: true, updatedAt: false },
  );

  Log.associate = (models) => {
    Log.belongsTo(models.User);
  };

  return Log;
};
