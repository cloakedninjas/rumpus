var expect = require('chai').expect,
    sinon = require('sinon'),
    io = require('socket.io-client'),
    RoomManager = require('../src/lib/room-manager'),
    Room = require('../src/entity/room'),
    User = require('../src/entity/user'),
    MESSAGE = require('../src/lib/message-types'),
    testOptions = require('./test-options'),
    MultiplayerServer = require('../src/lib/multiplayer-server'),
    serverInstance;

describe('Room Manager', function () {
  var sandbox = sinon.sandbox.create();

  beforeEach(function () {
    serverInstance = new MultiplayerServer(testOptions.serverPort);
  });

  afterEach(function () {
    sandbox.restore();
    serverInstance.close();
  });

  this.slow(500);

  describe('#createLobby', function () {
    it('should create a lobby', function () {
      var roomManager = new RoomManager(serverInstance);
      roomManager.createLobby();

      expect(roomManager.lobby).to.be.instanceof(Room);
      expect(roomManager.lobby.name).to.equal(RoomManager.LOBBY_NAME);
    });
  });

  describe('#addUserToLobby', function () {
    it('should add the user into the lobby', function (done) {
      var spy = sandbox.spy(serverInstance.roomManager.lobby, 'addUser'),
          client1 = io.connect(testOptions.socketURL, testOptions.socketOptions);

      client1.on('connect', function () {
        client1.on(MESSAGE.LOBBY_USERS, function () {
          expect(spy.called).to.equal(true);
          done();
        });
      });
    });

    it('should broadcast that a user has joined if configured to', function (done) {
      serverInstance.close();
      serverInstance = new MultiplayerServer(testOptions.serverPort, {
        sendLobbyUsers: false,
        broadcastNewUserToLobby: true
      });

      var client1 = io.connect(testOptions.socketURL, testOptions.socketOptions),
          client2;

      client1.on('connect', function () {
        client1.on(MESSAGE.USER_JOIN, function (data) {
          expect(data.id).to.not.equal(undefined);

          client1.disconnect();
          client2.disconnect();
          done();
        });

        client2 = io.connect(testOptions.socketURL, testOptions.socketOptions);
      });
    });

    it('should not broadcast that a user has joined if configured not to', function (done) {
      serverInstance.close();
      serverInstance = new MultiplayerServer(testOptions.serverPort, {
        sendLobbyUsers: false,
        broadcastNewUserToLobby: false
      });

      var client1 = io.connect(testOptions.socketURL, testOptions.socketOptions),
          client2,
          messageBroadcast = false;

      client1.on('connect', function () {
        client1.on(MESSAGE.USER_JOIN, function () {
          messageBroadcast = true;
          expect(messageBroadcast).to.equal(false); // should not get here

          client1.disconnect();
          client2.disconnect();
          done();
        });

        client2 = io.connect(testOptions.socketURL, testOptions.socketOptions);

        client2.on('connect', function () {
          setTimeout(function () {
            expect(messageBroadcast).to.equal(false);

            client1.disconnect();
            client2.disconnect();
            done();
          }, 100);
        });
      });
    });

    it('should only tell the new user who\'s in the lobby if configured to', function (done) {
      serverInstance.close();
      serverInstance = new MultiplayerServer(testOptions.serverPort, {
        sendLobbyUsers: true,
        broadcastNewUserToLobby: false
      });

      var client1 = io.connect(testOptions.socketURL, testOptions.socketOptions),
          client2;

      client1.on('connect', function () {

        client2 = io.connect(testOptions.socketURL, testOptions.socketOptions);

        client2.on('connect', function () {
          client2.on(MESSAGE.LOBBY_USERS, function (data) {
            expect(data).to.be.an('array');
            expect(data.length).to.equal(1);
            expect(data[0]).to.be.an('object');
            expect(data[0].id).to.equal(client1.id);

            client1.disconnect();
            client2.disconnect();
            done();
          });
        });
      });
    });

    it('should not only tell the new user who\'s in the lobby if configured not to', function (done) {
      serverInstance.close();
      serverInstance = new MultiplayerServer(testOptions.serverPort, {
        sendLobbyUsers: false,
        broadcastNewUserToLobby: false
      });

      var client1 = io.connect(testOptions.socketURL, testOptions.socketOptions),
          client2,
          messageBroadcast = false;

      client1.on('connect', function () {

        client2 = io.connect(testOptions.socketURL, testOptions.socketOptions);

        client2.on('connect', function () {
          client2.on(MESSAGE.LOBBY_USERS, function () {
            messageBroadcast = true;
            expect(messageBroadcast).to.equal(false); // should not get here

            client1.disconnect();
            client2.disconnect();
            done();
          });

          setTimeout(function () {
            expect(messageBroadcast).to.equal(false);

            client1.disconnect();
            client2.disconnect();
            done();
          }, 100);

        });
      });
    });

  });

  describe('#createRoom', function () {
    it('should generate a unique name if none is provided', function () {
      var roomManager = new RoomManager(serverInstance),
          room1 = roomManager.createRoom(),
          room2 = roomManager.createRoom();

      expect(room1.name).to.not.equal('');
      expect(room1.name).to.not.equal(room2.name);
    });

    it('should create a Room', function () {
      var roomManager = new RoomManager(serverInstance),
          room = roomManager.createRoom('Bob');

      expect(room).to.be.instanceof(Room);
      expect(room.name).to.equal('Bob');
    });
  });

  describe('#changeRoom', function () {
    it('should move a user from one room to another', function (done) {
      var roomManager = serverInstance.roomManager,
          room = roomManager.createRoom('Bob'),
          socket = io.connect(testOptions.socketURL, testOptions.socketOptions);

      socket.on(MESSAGE.LOBBY_USERS, function () {
        serverInstance.userManager.getById(socket.id).then(function (user) {
          roomManager.changeRoom(user, roomManager.lobby, room);

          setTimeout(function () {
            expect(serverInstance.userManager.isUserInRoom(user.id, 'Bob')).to.equal(true);
            expect(serverInstance.userManager.isUserInRoom(user.id, RoomManager.LOBBY_NAME)).to.equal(false);

            socket.disconnect();
            done();
          }, 50);
        });
      });
    });

    it('should leave the user where they were if destination room is full', function (done) {
      var roomManager = serverInstance.roomManager,
          userManager = serverInstance.userManager,
          room = roomManager.createRoom('room75', 1);

      var client1 = io.connect(testOptions.socketURL, testOptions.socketOptions),
          client2;

      client1.on('connect', function () {

        client2 = io.connect(testOptions.socketURL, testOptions.socketOptions);

        client2.on('connect', function () {
          userManager.getById(client1.id).then(function (user1) {
            roomManager.changeRoom(user1, roomManager.lobby, room);

            userManager.getById(client2.id).then(function (user2) {
              roomManager.changeRoom(user2, roomManager.lobby, room);

              setTimeout(function () {
                expect(userManager.isUserInRoom(user1.id, 'room75')).to.equal(true);
                expect(userManager.isUserInRoom(user2.id, 'room75')).to.equal(false);

                client1.disconnect();
                client2.disconnect();
                done();

              }, 50);
            });
          });
        });
      });

    });
  });

  describe('#getRoomMembers', function () {
    it('should return a list of users in the room', function (done) {
      var roomManager = serverInstance.roomManager,
          client1 = io.connect(testOptions.socketURL, testOptions.socketOptions);

      client1.on('connect', function () {
        var client2 = io.connect(testOptions.socketURL, testOptions.socketOptions);
        client2.on('connect', function () {

          roomManager.getRoomMembers(RoomManager.LOBBY_NAME).then(function (roomUsers) {
            expect(roomUsers.length).to.equal(2);
            expect(roomUsers[0].id).to.not.equal(roomUsers[1].id);

            expect(roomUsers[0].id === client1.id || roomUsers[1].id === client1.id).to.equal(true);
            expect(roomUsers[0].id === client2.id || roomUsers[1].id === client2.id).to.equal(true);

            done();
          });
        });
      });
    });

  });
});
