'use strict';

var _ = require('lodash');

function RemoteSocket(redisConfig, socketId) {
  this._callbackHandlers = {};
  this.socketId = socketId;
  this.channelName = 'COM-' + socketId;
  this.emitTo = '';

  this.sub = redis.createClient(redisConfig);
  this.pub = redis.createClient(redisConfig);

  this.sub.on('message', function (channel, message) {
    var pieces = message.split(':'),
        action = pieces[0],
        entity = pieces[1];

    console.log('Heard message:', pieces);

    switch (action) {
      case RemoteSocket.ACTION_JOIN_ROOM:
      case RemoteSocket.ACTION_LEAVE_ROOM:
        var roomManager = 1;

        roomManager.getByName(entity).then(function (room) {
          var userManager = 2;

          userManager.getById(this.socketId).then(function (user) {
            if (action === RemoteSocket.ACTION_JOIN_ROOM) {
              room.addUser(user);
            }
            else {
              room.removeUser(user);
            }

          }.bind(this))
        }.bind(this));

        break;

      case RemoteSocket.ACTION_EMIT:
          // TODO
        break;

      default:
        // check internal handlers
        if (this._callbackHandlers[action]) {
          data = pieces[2] ? JSON.parse(pieces[2]) : undefined;
          this._callbackHandlers[action].call(this, entity, data);
        }
    }
  }.bind(this));

  this.sub.subscribe(this.channelName);
}

RemoteSocket.prototype.on = function (message, callback) {
  // attach handler
  this._callbackHandlers[message] = callback;
};

RemoteSocket.prototype.emit = function (message, data) {
  this.pub.publish(this.channelName, RemoteSocket.ACTION_EMIT + ':' + message + ':' + JSON.stringify(data));
  this.emitTo = '';
};

RemoteSocket.prototype.to = function (recipient) {
  this.emitTo = recipient;
};

RemoteSocket.prototype.join = function (roomName) {
  this.pub.publish(this.channelName, RemoteSocket.ACTION_JOIN_ROOM + ':' + roomName);
};

RemoteSocket.prototype.leave = function (roomName) {
  this.pub.publish(this.channelName, RemoteSocket.ACTION_LEAVE_ROOM + ':' + roomName);
};

RemoteSocket.ACTION_JOIN_ROOM = 'join-room';
RemoteSocket.ACTION_LEAVE_ROOM = 'join-room';
RemoteSocket.ACTION_EMIT = 'emit';


module.exports = RemoteSocket;