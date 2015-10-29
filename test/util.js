var Server = require('../src/server');

module.exports = {
  startServer: function () {
    return new Server();
  }
};