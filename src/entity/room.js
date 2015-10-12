'use strict';

var events = require('events'),
    util = require('util'),
    _ = require('lodash'),
    User = require('./user'),
    MESSAGE = require('../lib/message-types');

/**
 * @class Room
 * @param {io} io
 * @param {string} name
 * @param {MemoryAdapter | RedisAdapter} storageAdapter
 * @constructor
 */
function Room(io, name, storageAdapter) {
  events.EventEmitter.call(this);

  this.io = io;
  this.name = name;
  this.storageAdapter = storageAdapter;
  this.canBeClosed = true;
  this.maxUsers = null;
  this.properties = {};
}

util.inherits(Room, events.EventEmitter);

/**
 * Hydrate the entity from storage
 *
 * @param properties
 */
Room.prototype.hydrate = function (properties) {
  _.each(properties, function (property, propertyName) {
    this[propertyName] = property;
  }, this);

  return this;
};

Room.prototype.persist = function (callback) {
  this.storageAdapter.set(Room.getSerializableKey(this.name), {
    canBeClosed: this.canBeClosed,
    maxUsers: this.maxUsers,
    properties: this.properties
  }, callback);
};

/**
 * Add a user into the room
 *
 * @param {User} user
 */
Room.prototype.addUser = function (user) {
  if (this.maxUsers && this.getOccupancy() >= this.maxUsers) {
    throw new Error('Room full');
  }

  user.socket.join(this.name);
  this.emit(Room.EVENT_USER_ENTER, user);

  if (this.maxUsers && this.getOccupancy() === this.maxUsers) {
    this.emit(Room.EVENT_ROOM_FULL);
  }

  //this.storageAdapter.indexAdd(Room.getRoomUsersIndexName(this.name), user.id);
  this.storageAdapter.indexAdd(User.getUserRoomsIndexName(user.id), this.name);

  return this;
};

/**
 * Remove a user from the room
 *
 * @param {User} user
 */
Room.prototype.removeUser = function (user) {
  user.socket.to(this.name).emit(MESSAGE.USER_LEAVE, user.id);
  user.socket.leave(this.name);

  if (this.canBeClosed && this.getOccupancy() === 0) {
    this.emit(Room.EVENT_ROOM_EMPTY);
  }

  //this.storageAdapter.indexRemove(Room.getRoomUsersIndexName(this.name), user.id);
  this.storageAdapter.indexRemove(User.getUserRoomsIndexName(user.id), this.name);

  return this;
};

Room.prototype.getOccupancy = function () {
  var namespace = '/',
      socketIds = this.io.nsps[namespace].adapter.rooms[this.name];

  if (socketIds) {
    return Object.keys(socketIds).length;
  }
  else {
    return 0;
  }
};

/**
 * Broadcast a message to all room members
 *
 * @param {string} message
 * @param {*} [data]
 * @returns {Room}
 */
Room.prototype.broadcast = function (message, data) {
  this.io.to(this.name).emit(message, data);

  return this;
};

Room.EVENT_ROOM_EMPTY = 'room-empty';
Room.EVENT_ROOM_FULL = 'room-full';
Room.EVENT_USER_ENTER = 'user-enter';

Room.INDEX_ROOM_USERS = 'room-users';

Room.getSerializableKey = function (name) {
  return 'Room:' + name;
};

Room.getRoomUsersIndexName = function (roomName) {
  return 'RoomUsers:' + roomName;
};

module.exports = Room;
