var chai = require('chai'),
    expect = chai.expect,
    sinon = require('sinon'),
    sinonChai = require('sinon-chai'),
    _ = require('lodash'),
    io = require('socket.io-client'),
    Room = require('../../src/entity/room'),
    RoomManager = require('../../src/lib/room-manager'),
    MultiplayerServer = require('../../src/lib/multiplayer-server'),
    testOptions = require('../test-options'),
    MESSAGE = require('../../src/lib/message-types.js');

chai.use(sinonChai);

describe('Room Entity', function () {
  var sandbox = sinon.sandbox.create(),
      serverInstance;

  beforeEach(function () {
    serverInstance = new MultiplayerServer(testOptions.serverPort);
  });

  afterEach(function () {
    sandbox.restore();
    serverInstance.io.close();
  });

  describe('#addUser', function () {
    it('should add the user into the channel and trigger an event', function () {
      var room = serverInstance.roomManager.createRoom('room-1'),
          client1 = io.connect(testOptions.socketURL, testOptions.socketOptions);

      client1.on('connect', function () {
        var spy = sandbox.spy(client1, 'join');

        serverInstance.userManager.getById(client1.id, function (err, user) {

          room.on(Room.EVENT_USER_ENTER, function () {
            expect(spy).to.have.been.calledWith('room-7');
            done();
          });

          room.addUser(user);
        });
      });
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

    it('should add to the user-rooms index', function (done) {
      this.slow(200);
      var room = serverInstance.roomManager.createRoom('room-2'),
          client1 = io.connect(testOptions.socketURL, testOptions.socketOptions);

      client1.on('connect', function () {
        serverInstance.userManager.getById(client1.id, function (err, user) {
          var spy = sandbox.spy(serverInstance.storageAdapter, 'indexAdd');

          room.on(Room.EVENT_USER_ENTER, function () {

            setTimeout(function () {
              expect(spy).to.have.been.calledWith('UserRooms:' + user.id, 'room-2');
              done();
            }, 50);
          });

          room.addUser(user);
        });
      });
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

    it('should remove the user from the channel and trigger an event', function (done) {
      this.slow(200);

      var room = serverInstance.roomManager.createRoom('room-3'),
          client1 = io.connect(testOptions.socketURL, testOptions.socketOptions);
      client1.on('connect', function () {

        serverInstance.userManager.getById(client1.id, function (err, user) {
          var spy = sandbox.spy(user.socket, 'leave');

          room.on(Room.EVENT_USER_LEAVE, function () {
            expect(spy.called).to.equal(true);
            done();
          });

          room.on(Room.EVENT_USER_ENTER, function () {
            setTimeout(function () {
              room.removeUser(user);
            }, 50);
          });

          room.addUser(user);
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

    it('should remove the entry from the user-rooms index', function (done) {
      this.slow(300);
      var room = serverInstance.roomManager.createRoom('room-5'),
          client1 = io.connect(testOptions.socketURL, testOptions.socketOptions);

      client1.on('connect', function () {
        serverInstance.userManager.getById(client1.id, function (err, user) {
          var spy = sandbox.spy(serverInstance.storageAdapter, 'indexRemove');

          room.on(Room.EVENT_USER_ENTER, function () {
            setTimeout(function () {
              room.removeUser(user);
            }, 50);
          });

          room.on(Room.EVENT_USER_LEAVE, function () {
            setTimeout(function () {
              expect(spy).to.have.been.calledWith('UserRooms:' + user.id, 'room-5');
              done();
            }, 50);
          });

          room.addUser(user);
        });
      });
    });
  });

  describe('#broadcast', function () {
    it('should broadcast a message to all users', function (done) {
      var room = serverInstance.roomManager.createRoom('room-5'),
          client1 = io.connect(testOptions.socketURL, testOptions.socketOptions),
          receiveCount = 0;

      function checkMessage(data) {
        expect(data.foo).to.equal(789);

        receiveCount++;

        if (receiveCount === 2) {
          done();
        }
      }

      client1.on('connect', function () {
        var client2 = io.connect(testOptions.socketURL, testOptions.socketOptions);
        client2.on('connect', function () {
          client2.on(MESSAGE.LOBBY_USERS, function () {

            client1.on('MY_MESSAGE', checkMessage);
            client2.on('MY_MESSAGE', checkMessage);

            serverInstance.roomManager.lobby.broadcast('MY_MESSAGE', {foo: 789});
          });

        });
      });
    });
  });


});
