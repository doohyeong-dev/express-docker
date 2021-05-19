import swaggerUi from 'swagger-ui-express';
import swaggerJsDoc from 'swagger-jsdoc';

const options = {
  swaggerDefinition: {
    info: {
      title: 'Express Docker',
      version: '1.0.0',
      description: 'Express Docker API with auto-generated swagger doc',
    },
    basePath: '/',
  },
  apis: ['./routes/**/*.js'],
};

const specs = swaggerJsDoc(options);

module.exports = (app) => {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));
};
