# rumpus

## Installation

`npm install rumpus --save`

## Usage

```javascript
var server = require('rumpus')(3000, {
  version: 1
});

server.addMessageHandler('USER_REQUEST_GAME', function (socket, data) {
  console.log('client has requested a game with:', data);

  socket.emit('GAME_START', game.getStartingProperties());
});
```

## Overview
rumpus provides a multiplayer game server built on top of [socket.io](https://socket.io). Out of the box, rumpus will create a Lobby where clients will initially connect to. Clients can join any number of other rooms to support "chat channels", or clients can be moved out of the Lobby and into a game room if required.

rumpus provides hooks for listening to client messages, upon which your application can respond.

rumpus also packages the `events` class. The Server and Room classes trigger events, these are detailed in the [events section](https://github.com/cloakedninjas/rumpus#events)

## API

### Server

### Server(port:Number, opts:Object)
The only required parameter is the port you wish to listen on. You may pass any of the [options](https://github.com/cloakedninjas/rumpus#options) as an object.

### addMessageHandler(messageName:String, fn:Function):Server
Binds to any socket message the client may send. `fn` is called with: (`Socket, [args[]...]`)

### removeMessageHandler(messageName:String):Server
Remove a previously bound message handler to all connected users and prevent the handler from being bound to future clients.

### on(eventName:String):Server
Attach a listener to events the server can emit, see [events section](https://github.com/cloakedninjas/rumpus#events)

### close()
Close the server, kills the Socket.io server

---

### RoomManager

### addUserToLobby(user:User):RoomManager
Adds a user into the lobby. This is only required if you have the config options `waitForPropsBeforeLobby` set to `true`. Otherwise users are already placed into the lobby on connect.

### createRoom([name:String], [maxUsers:number], [canBeClosed:boolean]):Room
Create a new room. If no room name is provided, a random UUID is generated.
If `maxUsers` is not provided, no room limit is enforced.
`canBeClosed` comes into effect when the room is empty. Be default, the last user to leave a room will cause that room to be closed.

### changeRoom(user:User, oldRoom:Room, newRoom:Room):RoomManager
Move a user from one room to another

### getByName(name:String):Promise
Get a Room by its name. This is an asynchronous operation.

### getRoomMembers(name:String):Promise
Get an array of Users by the name of the room. This is an asynchronous operation.

---

### UserManager

### getById(id:String):Promise
Get a User by their ID. This is an asynchronous operation.

### isUserInRoom(userId:String, roomName:String):boolean
Check if a user is a member of a given room. Users can be in multiple rooms at once.

### getRoomsUserIsIn(userId:String):Promise
Given a user ID, get an array of Rooms they are in. This is an asynchronous operation.

---

## Events
As well as socket messages sent, rumpus will emit certain events you can listen to.

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

For some reason, `room.test.js` puts the test suite into an odd state, causing sporadic failures further down the line. There is a Grunt task which will run each directory's tests in isolation: 

`grunt test`