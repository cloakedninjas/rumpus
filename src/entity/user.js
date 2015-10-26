'use strict';

var events = require('events'),
    util = require('util'),
    _ = require('lodash'),
    debug = require('debug')('rumpus:User');

/**
 * @class User
 * @param {string} id
 * @param {MemoryAdapter | RedisAdapter} storageAdapter
 * @constructor
 */
function User(id, storageAdapter) {
  this.id = id;
  this.storageAdapter = storageAdapter;
}

util.inherits(User, events.EventEmitter);

/**
 * Attach a socket to the user
 *
 * @param {Socket} socket
 */
User.prototype.setSocket = function (socket) {
  this.socket = socket;
};

/**
 * Set properties for the user
 *
 * @param properties
 */
User.prototype.setProperties = function (properties) {
  debug('Setting user properties for %s %j', this.id, properties);
  this.properties = properties;

  this.persist()
      .then(function () {
        this.emit(User.EVENT_PROP_UPDATE, this);
      }.bind(this));
};

/**
 * @return {promise}
 */
User.prototype.persist = function () {
  return this.storageAdapter.set(User.getSerializableKey(this.id), {
    properties: this.properties
  });
};

/**
 * Hydrate the entity from storage
 *
 * @param properties
 */
User.prototype.hydrate = function (properties) {
  _.each(properties, function (property, propertyName) {
    this[propertyName] = property;
  }, this);

  return this;
};

/**
 * Return an object which will be broadcast publicly
 *
 * @returns {{id: number, properties: Object | undefined}}
 */
User.prototype.toBroadcastData = function () {
  return {
    id: this.id,
    properties: this.properties
  };
};

User.EVENT_PROP_UPDATE = 'update';

User.getSerializableKey = function (id) {
  return 'User:' + id;
};

User.getUserRoomsIndexName = function (id) {
  return 'UserRooms:' + id;
};

module.exports = User;
