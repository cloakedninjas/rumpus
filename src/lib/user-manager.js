'use strict';

var _ = require('lodash'),
    Q = require('q'),
    io = require('socket.io'),
    RemoteSocket = require('./remoteSocket'),
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

        var socket = this.server.io.sockets.connected[id];

        if (!socket) {
          // socket is held on another server
          socket = new RemoteSocket(this.server.config.redis, id);
        }

        console.log('ID:', socket.id);

        user.setSocket(socket);

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
 * @returns {promise}
 */
UserManager.prototype.isUserInRoom = function (userId, roomName) {
  return this.server.storageAdapter.indexGet(User.getUserRoomsIndexName(userId))
      .then(function (roomNames) {
        return _.find(roomNames, function (room) {

          return room === roomName;
        }) !== undefined;
      });
};

/**
 *
 * @param {string} userId
 * @returns {promise}
 */
UserManager.prototype.getRoomsUserIsIn = function (userId) {
  // TODO - fix
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
