'use strict';

var events = require('events'),
    util = require('util'),
    io = require('socket.io'),
    sio_redis = require('socket.io-redis'),
    redis = require('redis'),
    _ = require('lodash'),
    debug = require('debug')('rumpus'),
    MemoryAdapter = require('../adapter/memory'),
    RedisAdapter = require('../adapter/redis'),
    RoomManager = require('./room-manager'),
    UserManager = require('./user-manager'),
    User = require('../entity/user'),

    MESSAGE = require('./message-types'),

    defaultOptions = {
      version: 1,
      waitForPropsBeforeLobby: false,
      sendLobbyUsers: true,
      broadcastNewUserToLobby: true,
      roomLimit: null,
      redis: null
    };

/**
 * @class MultiplayerServer
 * @mixes EventEmitter
 * @param {number} port
 * @param {Object} config
 * @constructor
 */
function MultiplayerServer(port, config) {
  events.EventEmitter.call(this);

  debug('starting socket.io on port %d', port);
  this.io = io(port);
  this.config = _.extend({}, defaultOptions, config);

  if (this.config.redis) {
    if (!this.config.redis.host) {
      this.config.redis.host = 'localhost';
    }

    if (!this.config.redis.port) {
      this.config.redis.port = 6379;
    }

    if (!this.config.redis.key) {
      this.config.redis.key = '';
    }

    this.storageAdapter = new RedisAdapter(
        this.config.redis.key + MultiplayerServer.NS_REDIS_CORE,
        redis.createClient({
          host: this.config.redis.host,
          port: this.config.redis.port
        })
    );

    this.io.adapter(sio_redis({
      host: this.config.redis.host,
      port: this.config.redis.port,
      key: this.config.redis.key + MultiplayerServer.NS_REDIS_SIO
    }));
  }
  else {
    this.storageAdapter = new MemoryAdapter();
  }

  this.roomManager = new RoomManager(this);
  this.userManager = new UserManager(this);
  this.messageHandlers = {};

  this.roomManager.createLobby();

  this.io.on('connection', this._handleUserConnect.bind(this));
}

util.inherits(MultiplayerServer, events.EventEmitter);

/**
 * Binds a handler to a specific socket message the client may send
 *
 * @param {string} message
 * @param {Function} handler
 * @returns {MultiplayerServer}
 */
MultiplayerServer.prototype.addMessageHandler = function (message, handler) {
  this.messageHandlers[message] = handler;
  return this;
};

/**
 * Remove a previously bound handler
 *
 * @param {string} message
 * @returns {MultiplayerServer}
 */
MultiplayerServer.prototype.removeMessageHandler = function (message) {
  if (this.messageHandlers[message]) {
    delete this.messageHandlers[message];

    _.each(this.io.sockets.sockets, function (socket) {
      socket.removeAllListeners(message);
    }, this);
  }

  return this;
};

/**
 *
 * @param {Socket} socket
 */
MultiplayerServer.prototype._handleUserConnect = function (socket) {
  var roomManager = this.roomManager,
      userManager = this.userManager;

  if (this.config.redis) {
    var sub = redis.createClient(this.config.redis);

    sub.on('message', function (channel, message) {
      var pieces = message.split(':'),
          action = pieces[0],
          entity = pieces[1];

      roomManager.getByName(entity)
          .then(function (room) {
            userManager.getById(socket.id)
                .then(function (user) {
                  if (action === 'join-room') {
                    room.addUser(user);
                  }
                  else if (action === 'leave-room') {
                    room.removeUser(user);
                  }
                });
          });
    });

    sub.subscribe('COM-' + socket.id);
  }

  debug('User connected, reporting server version');
  socket.emit(MESSAGE.VERSION, this.config.version);

  socket.on('error', function (err) {
    debug('Socket error: %s', err);
  });

  var user = userManager.createUser(socket);

  if (!this.config.waitForPropsBeforeLobby) {
    this.roomManager.addUserToLobby(user);
  }
  else {
    socket.once(MESSAGE.USER_PROPS, function () {
      userManager.isUserInRoom(socket.id, RoomManager.LOBBY_NAME)
          .then(function (result) {
            if (!result) {
              roomManager.addUserToLobby(user);
            }
          });
    });
  }

  // add any custom message handlers to the new socket
  _.each(this.messageHandlers, function (handler, message) {
    socket.on(message, handler.bind(this, socket));
  }, this);

  socket.on('disconnect', this._handleUserDisconnect.bind(this, user));

  this.emit(MultiplayerServer.EVENT_USER_CONNECT, user);
};

/**
 *
 * @param {User} user
 */
MultiplayerServer.prototype._handleUserDisconnect = function (user) {
  debug('User %s disconnected from %s', user.id);

  this.storageAdapter.indexGet(User.getUserRoomsIndexName(user.id))
      .then(function (rooms) {
        _.each(rooms, function (roomName) {
          this.roomManager.getByName(roomName)
              .then(function (room) {
                room.removeUser(user);
              });
        }, this);
      }.bind(this));

  this.userManager.deleteUser(user);

  this.emit(MultiplayerServer.EVENT_USER_DISCONNECT, user);
};

MultiplayerServer.prototype.close = function () {
  debug('Closing server');
  this.io.close();
};

MultiplayerServer.EVENT_USER_CONNECT = 'user-connect';
MultiplayerServer.EVENT_USER_DISCONNECT = 'user-disconnect';

MultiplayerServer.NS_REDIS_CORE = 'rumpus';
MultiplayerServer.NS_REDIS_SIO = 'sio';

module.exports = MultiplayerServer;
