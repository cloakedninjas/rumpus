# PKG

## Installation

`npm install PKG --save`

## Usage

```javascript
var server = require('PKG')(3000, {
  version: 1
});

server.addMessageHandler('USER_REQUEST_GAME', function (socket, data) {
  console.log('client has requested a game with:', data);

  socket.emit('GAME_START', game.getStartingProperties());
});
```

## Overview
PKG provides a multiplayer game server built on top of [socket.io](https://socket.io). Out of the box, PKG will create a Lobby where clients will initially connect to. Clients can join any number of other rooms to support "chat channels", or clients can be moved out of the Lobby and into a game room if required.

PKG provides hooks for listening to client messages, upon which your application can respond.

PKG also packages the `events` class. The Server and Room classes trigger events, these are detailed in the [events section](https://github.com/cloakedninjas/PKG#events)

## API

### Server(port:Number, opts:Object)
The only required parameter is the port you wish to listen on. You may pass any of the [options](https://github.com/cloakedninjas/PKG#options) as an object.

### Server.addMessageHandler(messageName:String, fn:Function):Server
Binds to any socket message the client may send. `fn` is called with: (`Socket, [args[]...]`)

### Server.removeMessageHandler(messageName:String):Server
Remove a previously bound message handler to all connected users and prevent the handler from being bound to future clients.

### Server.on(eventName:String):Server

## Events
As well as socket messages sent, PKG will emit certain events you can listen to.

### Server
- `error` - triggered when an error occurs
- `user-connect` - triggered when a user connects to the server
- `user-disconnect` - triggered when a user leaves the server
 
### Room
- `room-empty` - triggered when a room becomes empty, the server will destroy the room
- `room-full` - triggered if a room has a maximum occupancy and that value is met
- `user-enter` - triggered when a user joins a room

### User
- `update` - triggered when a user's properties are changed

## Options

- `version` - string | number - sent to the client on connect. Default: `1`
- `waitForPropsBeforeLobby` - boolean - when set will only add the user to the lobby after receiving a `user-properties` message from them. Default `false`
- `sendLobbyUsers` - boolean - whether the server will provide a user list to newcomers to the lobby. Default `true`
- `broadcastNewUserToLobby` - boolean - whether to inform all lobby users when a new user joins. Default `true`
- `roomLimit` - number - The maximum number of users allowed in a room, or `null` for no limit. Default `null`
- `redis` - Object - Optional - If a Redis server is available allows for running multiple server instances on different servers and/or processes while still allowing communication between them. Default `null`
- `redis.host` - string - The hostname or IP address of the Redis server. Default `localhost`
- `redis.port` - number - The port of the Redis server. Default `6379`
- `redis.key` - string - Optional - A prefix to be added to keys.

## Tests

Slightly flakey in that they cannot all be run in one go. socket.io is taking too long to close before the next test runs and is in a bad state. Running them in batches works:

`mocha test/*.test.js && mocha test/entity/*.test.js && mocha test/adapter/*.test.js`