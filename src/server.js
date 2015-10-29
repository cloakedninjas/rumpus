'use strict';

var events = require('events'),
    util = require('util'),
    io = require('socket.io'),
    sio_redis = require('socket.io-redis'),
    redis = require('redis'),
    _ = require('lodash'),
    debug = require('debug')('rumpus'),

    MemoryAdapter = require('./adapter/memory'),
    RedisAdapter = require('./adapter/redis'),

    defaultOptions = {
      version: 1,
      waitForPropsBeforeLobby: false,
      sendLobbyUsers: true,
      broadcastNewUserToLobby: true,
      roomLimit: null,
      redis: null
    };


function Server(config) {
  events.EventEmitter.call(this);

  this.config = _.extend({}, defaultOptions, config);

  debug('starting socket.io on port %d', config.port);
  this.io = io(port);

  if (this.config.redis) {
    this.redisEnabled = true;
    this._initRedis();

  }
  else {
    this.redisEnabled = false;
    this.storageAdapter = new MemoryAdapter();
  }

}

util.inherits(Server, events.EventEmitter);

// prototype

Server.prototype._initRedis = function () {
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
      this.config.redis.key + Server.NS_REDIS_CORE,
      redis.createClient({
        host: this.config.redis.host,
        port: this.config.redis.port
      })
  );

  this.io.adapter(sio_redis({
    host: this.config.redis.host,
    port: this.config.redis.port,
    key: this.config.redis.key + Server.NS_REDIS_SIO
  }));

  this._attachPubSub();
};

Server.prototype._attachPubSub = function () {
  // create pub/sub channels
  this.sub = redis.createClient({
    host: this.config.redis.host,
    port: this.config.redis.port
  });

  this.sub.on('error', function (err) {
    console.error('sub error: ', err);
  });

  this.pub = redis.createClient({
    host: this.config.redis.host,
    port: this.config.redis.port
  });

  this.pub.on('error', function (err) {
    console.error('pub error: ', err);
  });

  this.sub.on('message', function (channel, message) {
    console.log('incoming message', channel, message);

    /*

     // Room:
     this.server.pub.publish('room:' + this.id, JSON.stringify({action: 'leave-room', userId: user.id}));

     */

    var channelData = channel.split(':');

    switch (channelData[0]) {
      case 'user':
        var userId = channelData[1];

        if (userId) {
          this.userManager.onMessage(userId, message);
        }
        break;

      case 'room':
        var roomId = channelData[1];

        if (roomId) {
          this.roomManager.onMessage(roomId, message);
        }
        break;
        break;
    }
  }.bind(this));
};

Server.NS_REDIS_CORE = 'rumpus';
Server.NS_REDIS_SIO = 'sio';

module.exports = Server;