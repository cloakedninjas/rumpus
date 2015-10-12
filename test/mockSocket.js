/**
 * @extends Socket
 * @constructor
 */
var FakeSocket = function () {};

FakeSocket.prototype = {
  join: function () {
    return this;
  },
  to: function () {
    return this;
  },
  leave: function () {
    return this;
  },
  emit: function () {
    return this;
  }
};

module.exports = FakeSocket;