module.exports = {
  apps: [{
    name: 'doohyeong.dev',
    script: './bin/www',
    interpreter: 'babel-node',
    ignore_watch: ['node_modules', 'uploads'],
    env: {
      PORT: 3300,
      NODE_ENV: 'development',
      secret: '',
      recaptcha: '',
      MAILGUN_API_KEY: '',
      MAILGUN_DOMAIN: '',
      HOST_SERVER: 'http://localhost:8080',
      NODE_SERVER: 'http://localhost:3300',
    },
    env_test: {
      PORT: 3300,
      NODE_ENV: 'test',
      secret: '',
      recaptcha: '',
      MAILGUN_API_KEY: '',
      MAILGUN_DOMAIN: '',
      HOST_SERVER: 'http://localhost:8080',
      NODE_SERVER: 'http://localhost:3300',
    },
    env_production: {
      PORT: 3300,
      NODE_ENV: 'production',
      secret: '',
      recaptcha: '',
      MAILGUN_API_KEY: '',
      MAILGUN_DOMAIN: '',
      HOST_SERVER: '',
      NODE_SERVER: '',
    },
  }],
};
