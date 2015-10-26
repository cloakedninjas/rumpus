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

RoomManager.prototype.createLobby = function () {
  this.lobby = this.createRoom(RoomManager.LOBBY_NAME, null, false);
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

  if (this.server.config.sendLobbyUsers) {
    // tell the user who's in the lobby
    this.broadcastRoomMembers(RoomManager.LOBBY_NAME, user);
  }

  // add the user into the lobby
  this.lobby.addUser(user);
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

  var room = new Room(this.server.io, name, this.server.storageAdapter);

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
        var room = new Room(this.server.io, name, this.server.storageAdapter);

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

  var namespace = '/',
      socketIds = this.server.io.nsps[namespace].adapter.rooms[roomName],
      deferred = Q.defer();

  if (socketIds) {
    var socketIdCount = Object.keys(socketIds).length,
        users = [],
        userCount = 0;

    if (socketIdCount > 0) {
      var userManager = this.server.userManager;

      _.each(socketIds, function (val, socketId) {
        userManager.getById(socketId)
            .then(function (user) {
              users.push(user);

              userCount++;

              if (userCount === socketIdCount) {
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
  }
  else {
    debug('No users in %s', roomName);
    deferred.resolve([]);
  }

  return deferred.promise;
};

/**
 *
 * @param {string} roomName
 * @param {User} recipientUser
 */
RoomManager.prototype.broadcastRoomMembers = function (roomName, recipientUser) {
  this.getRoomMembers(roomName)
      .then(function (users) {
        var broadcastUsers = [];

        _.each(users, function (user) {
          broadcastUsers.push(user.toBroadcastData());
        });

        recipientUser.socket.emit(MESSAGE.LOBBY_USERS, broadcastUsers);
      });
  /*this.getRoomMembers(roomName, function (err, users) {
    var broadcastUsers = [];

    _.each(users, function (user) {
      broadcastUsers.push(user.toBroadcastData());
    });

    recipientUser.socket.emit(MESSAGE.LOBBY_USERS, broadcastUsers);
  });*/
};

RoomManager.LOBBY_NAME = 'lobby';

module.exports = RoomManager;
