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
  this.users = {};
}

/**
 * Create a new user
 *
 * @param {Socket} socket
 * @returns {User}
 */
UserManager.prototype.createUser = function (socket) {
  debug('Creating user, id is %s', socket.id);
  var user = new User(socket.id, this.server);
  user.setSocket(socket);

  socket.on(MESSAGE.USER_PROPS, user.setProperties.bind(user));

  user.persist();

  this.users[socket.id] = user;

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

  var deferred = Q.defer();

  if (this.users[id]) {
    deferred.resolve(this.users[id]);
  }
  else {
    this.server.storageAdapter.get(User.getSerializableKey(id))
        .then(function (data) {
          debug('Fetched user: %s', id);
          var user = new User(id, this.server);

          if (data) {
            user.hydrate(data);
          }

          deferred.resolve(user);
        }.bind(this), deferred.reject);
  }

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
  var rooms = [],
      roomCount = 0,
      deferred = Q.defer(),
      roomManager = this.server.roomManager;

  this.server.storageAdapter.indexGet(User.getUserRoomsIndexName(userId))
      .then(function (roomNames) {
        _.each(roomNames, function (roomName) {
          roomManager.getByName(roomName).then(function (room) {
            roomCount++;

            if (room) {
              rooms.push(room);
            }

            if (roomCount === roomNames.length) {
              debug('User %s belongs to %d rooms', userId, roomNames.length);
              deferred.resolve(rooms);
            }
          });
        });
      });

  return deferred.promise;
};

UserManager.prototype.onMessage = function (message) {
  message = JSON.parse(message);

  switch (message.type) {
    case 'prop-change':
      this.emit(User.EVENT_PROP_UPDATE, this);
      break;
  }
};

module.exports = UserManager;
