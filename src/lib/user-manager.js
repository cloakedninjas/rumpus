'use strict';

var _ = require('lodash'),
    User = require('../entity/user'),
    debug = require('debug')('rumpus:UserManager'),
    MESSAGE = require('../lib/message-types.js');

/**
 * @class UserManager
 * @param {MultiplayerServer} server
 * @constructor
 */
function UserManager(server) {
  this.server = server;
}

/**
 * Create a new user
 *
 * @param {Socket} socket
 * @returns {User}
 */
UserManager.prototype.createUser = function (socket) {
  debug('Creating user, id is %s', socket.id);
  var user = new User(socket.id, this.server.storageAdapter);
  user.setSocket(socket);

  socket.on(MESSAGE.USER_PROPS, user.setProperties.bind(user));

  user.persist();

  return user;
};

/**
 * Lookup a user by their ID
 *
 * @param {string} id
 * @param {Function} callback
 */
UserManager.prototype.getById = function (id, callback) {
  debug('getById(%s)', id);

  if (!callback) {
    throw new Error('getById requires a callback');
  }

  this.server.storageAdapter.get(User.getSerializableKey(id), function (err, data) {
    if (!err) {
      debug('Fetched user: %s', id);
      var user = new User(id, this.server.storageAdapter);

      user.setSocket(this.server.io.sockets.connected[id]);

      if (data) {
        user.hydrate(data);
      }

      callback(err, user);
    }
    else {
      debug('Error: %s', err);
      callback(err, null);
    }
  }.bind(this));
};

/**
 *
 * @param {User} user
 */
UserManager.prototype.deleteUser = function (user) {
  this.server.storageAdapter.delete(User.getSerializableKey(user.id));
};

/**
 *
 * @param {string} userId
 * @param {string} roomName
 * @returns {boolean}
 */
UserManager.prototype.isUserInRoom = function (userId, roomName) {
  var socket = this.server.io.sockets.connected[userId];

  if (socket) {
    return socket.rooms.indexOf(roomName) !== -1;
  }

  return false;
};

/**
 *
 * @param {string} userId
 * @param {Function} callback
 */
UserManager.prototype.getRoomsUserIsIn = function (userId, callback) {
  if (!callback) {
    throw new Error('getRoomsUserIsIn requires a callback');
  }

  var socket = this.server.io.sockets.connected[userId],
      rooms = [],
      callbackCount = 0;

  if (socket && socket.rooms.length > 0) {
    var roomManager = this.server.roomManager;

    _.each(socket.rooms, function (roomName) {
      roomManager.getByName(roomName, function (err, room) {
        if (!err) {
          rooms.push(room);
        }

        callbackCount++;

        if (callbackCount === socket.rooms.length) {
          debug('User %s belongs to %d rooms', userId, socket.rooms.length);
          callback(err, rooms);
        }
      });
    });
  }
  else {
    debug('User %s belongs to 0 rooms', userId);
    callback(null, []);
  }

  return this;
};

module.exports = UserManager;
