'use strict';

var _ = require('lodash'),
    Q = require('q'),
    uuid = require('node-uuid'),
    debug = require('debug')('rumpus:RoomManager'),
    Room = require('../entity/room'),
    MESSAGE = require('./message-types');

/**
 * @class RoomManager
 * @param {MultiplayerServer} server
 * @constructor
 */
function RoomManager(server) {
  this.server = server;
}

/**
 * Check if there already is a lobby, if not create one
 * @return {RoomManager}
 */
RoomManager.prototype.createLobby = function () {
  this.getByName(RoomManager.LOBBY_NAME)
      .then(function (lobby) {
        if (!lobby) {
          lobby = this.createRoom(RoomManager.LOBBY_NAME, null, false);
        }

        this.lobby = lobby;
      }.bind(this));

  return this;
};

/**
 *
 * @param {User} user
 */
RoomManager.prototype.addUserToLobby = function (user) {
  debug('Adding %s to lobby', user.id);

  if (this.server.config.broadcastNewUserToLobby) {
    // tell whole lobby, new user has joined
    this.server.io.to(RoomManager.LOBBY_NAME).emit(MESSAGE.USER_JOIN, user.toBroadcastData());
  }

  // add the user into the lobby
  this.lobby.addUser(user);

  if (this.server.config.sendLobbyUsers) {
    // tell the new user who else is in the lobby
    this.broadcastRoomMembers(RoomManager.LOBBY_NAME, user);
  }

  return this;
};

/**
 * Create a new Room
 *
 * @param {string} [name]
 * @param {number} [maxUsers]
 * @param {boolean} [canBeClosed]
 * @returns {Room|exports|module.exports}
 */
RoomManager.prototype.createRoom = function (name, maxUsers, canBeClosed) {
  if (!name) {
    name = 'room-' + uuid.v1();
  }

  if (canBeClosed === undefined) {
    canBeClosed = true;
  }

  var room = new Room(this.server, name);

  room.canBeClosed = canBeClosed;
  room.maxUsers = maxUsers || this.server.config.roomLimit;

  room.persist();

  return room;
};

/**
 *
 * @param {User} user
 * @param {Room} oldRoom
 * @param {Room} newRoom
 */
RoomManager.prototype.changeRoom = function (user, oldRoom, newRoom) {
  try {
    newRoom.addUser(user);
    oldRoom.removeUser(user);
    debug('Moving %s from %s to %s', user.id, oldRoom.name, newRoom.name);
  }
  catch (e) {
    debug('Failed to move %s to %s', user.id, newRoom.name);
  }

  return this;
};

/**
 * Lookup a room by its name
 *
 * @param {string} name
 * @return {promise}
 */
RoomManager.prototype.getByName = function (name) {
  return this.server.storageAdapter.get(Room.getSerializableKey(name))
      .then(function (data) {
        var room = new Room(this.server, name);

        if (data) {
          room.hydrate(data);
          return room;
        }
      }.bind(this));
};

/**
 *
 * @param {string} roomName
 * @return {promise}
 */
RoomManager.prototype.getRoomMembers = function (roomName) {
  debug('Getting room members for %s', roomName);

  var deferred = Q.defer();

  this.server.storageAdapter.indexGet(Room.getRoomUsersIndexName(RoomManager.LOBBY_NAME))
      .then(function (userIds) {
        var userIdCount = userIds.length,
            users = [],
            userCount = 0;

        if (userIdCount > 0) {
          var userManager = this.server.userManager;

          _.each(userIds, function (userId) {
            userManager.getById(userId)
                .then(function (user) {
                  users.push(user);

                  userCount++;

                  if (userCount === userIdCount) {
                    debug('Found %d room members for %s', users.length, roomName);
                    deferred.resolve(users);
                  }
                });
          });
        }
        else {
          debug('No users in %s', roomName);
          deferred.resolve([]);
        }
      }.bind(this));

  return deferred.promise;
};

/**
 *
 * @param {string} roomName
 * @param {User} recipientUser
 */
RoomManager.prototype.broadcastRoomMembers = function (roomName, recipientUser) {
  debug('broadcasting room members to %s for room %s', recipientUser.id, roomName);
  this.getRoomMembers(roomName)
      .then(function (users) {
        var broadcastUsers = [];

        _.each(users, function (user) {
          if (user.id !== recipientUser.id) {
            broadcastUsers.push(user.toBroadcastData());
          }
        });

        recipientUser.socket.emit(MESSAGE.LOBBY_USERS, broadcastUsers);
      });

  return this;
};

RoomManager.LOBBY_NAME = 'lobby';

module.exports = RoomManager;
