var chai = require('chai'),
    expect = chai.expect,
    sinon = require('sinon'),
    sinonChai = require('sinon-chai'),
    _ = require('lodash'),
    io = require('socket.io-client'),
    Room = require('../../src/entity/room'),
    User = require('../../src/entity/user'),
    RoomManager = require('../../src/lib/room-manager'),
    MultiplayerServer = require('../../src/lib/multiplayer-server'),
    testOptions = require('../testOptions'),
    MemoryAdapter = require('../../src/adapter/memory'),
    FakeSocket = require('../mockSocket'),
    MESSAGE = require('../../src/lib/message-types.js');

chai.use(sinonChai);

describe('Room Entity', function () {
  beforeEach(function () {
    serverInstance = new MultiplayerServer(3000);
  });
  afterEach(function () {
    serverInstance.io.close();
  });

  var userSocket = new FakeSocket(),
      user = new User('hag734'),
      storageAdapter = new MemoryAdapter(),
      serverInstance;

  user.setSocket(userSocket);

  describe('#addUser', function () {
    it('should add the user into the channel', function () {
      var spy = sinon.spy(userSocket, 'join'),
          room = new Room(new FakeSocket(), 'room-7', storageAdapter);

      room.addUser(user);
      expect(spy.calledWith('room-7')).to.equal(true);

      spy.restore();
    });

    it('should trigger an event when a user joins', function (done) {
      var room = new Room(new FakeSocket(), 'room-4', storageAdapter);

      room.on(Room.EVENT_USER_ENTER, function (user) {
        expect(user.id).to.equal('hag734');
        done();
      });

      room.addUser(user);
    });

    it('should trigger an event if there is a max room capacity and it is met', function (done) {
      this.slow(200);
      var room = serverInstance.roomManager.createRoom('my-room', 2);

      room.on(Room.EVENT_ROOM_FULL, function () {
        expect(room.getOccupancy()).to.equal(2);
        done();
      });

      var client1 = io.connect(testOptions.socketURL, testOptions.socketOptions);
      client1.on('connect', function () {
        var client2 = io.connect(testOptions.socketURL, testOptions.socketOptions);
        client2.on('connect', function () {

          serverInstance.roomManager.getRoomMembers(RoomManager.LOBBY_NAME, function (err, users) {
            _.each(users, function (user) {
              serverInstance.roomManager.changeRoom(user, serverInstance.roomManager.lobby, room);
            });
          });
        });
      });
    });

    it('should add to the user-rooms index', function () {
      var room = new Room(new FakeSocket(), 'room-4', storageAdapter),
          spy = sinon.spy(storageAdapter, 'indexAdd');

      room.addUser(user);

      expect(spy).to.have.been.calledWith('UserRooms:' + user.id, 'room-4');

      spy.restore();
    });
  });

  describe('#removeUser', function () {
    it('should broadcast that the user is leaving', function (done) {
      var client1 = io.connect(testOptions.socketURL, testOptions.socketOptions);
      client1.on('connect', function () {
        var client2 = io.connect(testOptions.socketURL, testOptions.socketOptions);
        client2.on('connect', function () {

          client2.on(MESSAGE.USER_LEAVE, function () {
            done();
          });

          serverInstance.userManager.getById(client1.id, function (err, user) {
            serverInstance.roomManager.lobby.removeUser(user);
          });

        });
      });
    });

    it('should remove the user from the channel', function () {
      var client1 = io.connect(testOptions.socketURL, testOptions.socketOptions);
      client1.on('connect', function () {

        serverInstance.userManager.getById(client1.id, function (err, user) {
          var spy = sinon.spy(user.socket, 'leave');

          serverInstance.roomManager.lobby.removeUser(user);

          expect(spy.called).to.equal(true);
          spy.restore();
        });
      });
    });

    it('should trigger an event when the room becomes empty', function (done) {
      this.slow(200);
      var room = serverInstance.roomManager.createRoom('room-18');

      room.on(Room.EVENT_ROOM_EMPTY, function () {
        done();
      });

      var client1 = io.connect(testOptions.socketURL, testOptions.socketOptions);
      client1.on('connect', function () {

        serverInstance.userManager.getById(client1.id, function (err, user) {
          room.addUser(user);

          setTimeout(function () {
            room.removeUser(user);
          }, 50);
        });
      });
    });

    it('should remove the entry from the user-rooms index', function () {
      this.slow(200);
      var room = serverInstance.roomManager.createRoom('room-19'),
          spy = sinon.spy(storageAdapter, 'indexRemove');

      var client1 = io.connect(testOptions.socketURL, testOptions.socketOptions);
      client1.on('connect', function () {

        serverInstance.userManager.getById(client1.id, function (err, user) {
          room.addUser(user);

          setTimeout(function () {
            room.removeUser(user);

            expect(spy).to.have.been.calledWith('UserRooms:' + client1.id, 'room-19');

            spy.restore();
            done();
          }, 50);
        });
      });


    });
  });

  describe('#broadcast', function () {
    it('should broadcast a message to all users', function () {
      var roomSocket = new FakeSocket(),
          room = new Room(roomSocket, 'room-123', storageAdapter),
          user2 = new User('bobby1'),
          user2Socket = new FakeSocket();

      user2.setSocket(user2Socket);

      room.addUser(user);
      room.addUser(user2);

      var toSpy = sinon.spy(roomSocket, 'to'),
          emitSpy = sinon.spy(roomSocket, 'emit');

      room.broadcast('MY_MESSAGE', {foo: 789});

      expect(toSpy.calledWith('room-123')).to.equal(true);
      expect(emitSpy.calledWith('MY_MESSAGE', {foo: 789})).to.equal(true);

      toSpy.restore();
      emitSpy.restore();
    });

  });


});
