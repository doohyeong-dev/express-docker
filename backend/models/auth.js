export default (sequelize, DataTypes) => {
  const Auth = sequelize.define('Auth', {
    id: {
      primaryKey: true,
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
    }, // PK
    dueDate: DataTypes.DATE, // to set expiration period for email authentication
  });
  Auth.associate = (models) => {
    Auth.belongsTo(models.User);
  };
  return Auth;
};
