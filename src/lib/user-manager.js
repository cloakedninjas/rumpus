'use strict';

var _ = require('lodash'),
    Q = require('q'),
    uuid = require('node-uuid'),
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
  var user = new User(uuid.v1(), this.server.storageAdapter);
  user.setSocket(socket);

  debug('Creating user, id is %s', user.id);

  socket.on(MESSAGE.USER_PROPS, user.setProperties.bind(user));

  user.persist();

  return user;
};

/**
 * Lookup a user by their ID
 *
 * @param {string} id
 * @return {promise}
 */
UserManager.prototype.getById = function (id) {
  debug('getById(%s)', id);

  /*if (Array.isArray(id)) {
   return Q.all(_.map(id, this.getById));
   }*/

  var deferred = Q.defer();
  this.server.storageAdapter.get(User.getSerializableKey(id))
      .then(function (data) {
        debug('Fetched user: %s', id);
        var user = new User(id, this.server.storageAdapter);

        user.setSocket(this.server.io.sockets.connected[id]);

        if (data) {
          user.hydrate(data);
        }

        deferred.resolve(user);
      }.bind(this), deferred.reject);

  return deferred.promise;
};

/**
 *
 * @param {User} user
 * @return {promise}
 */
UserManager.prototype.deleteUser = function (user) {
  return this.server.storageAdapter.delete(User.getSerializableKey(user.id));
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
 * @returns {promise}
 */
UserManager.prototype.getRoomsUserIsIn = function (userId) {
  var socket = this.server.io.sockets.connected[userId],
      rooms = [],
      roomCount = 0,
      deferred = Q.defer();

  if (socket && socket.rooms.length > 0) {
    var roomManager = this.server.roomManager;

    _.each(socket.rooms, function (roomName) {
      roomManager.getByName(roomName).then(function (room) {
        roomCount++;

        if (room) {
          rooms.push(room);
        }

        if (roomCount === socket.rooms.length) {
          debug('User %s belongs to %d rooms', userId, socket.rooms.length);
          deferred.resolve(rooms);
        }
      });
    });
  }
  else {
    debug('User %s belongs to 0 rooms', userId);
    deferred.resolve([]);
  }

  return deferred.promise;
};

module.exports = UserManager;
