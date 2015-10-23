var chai = require('chai'),
    expect = chai.expect,
    sinon = require('sinon'),
    sinonChai = require('sinon-chai'),
    io = require('socket.io-client'),
    _ = require('lodash'),
    RoomManager = require('../src/lib/room-manager'),
    User = require('../src/entity/user'),
    Room = require('../src/entity/room'),
    MESSAGE = require('../src/lib/message-types'),
    testOptions = require('./test-options'),
    MultiplayerServer = require('../src/lib/multiplayer-server'),
    serverInstance;

chai.use(sinonChai);

describe('User Manager', function () {

  describe('#createUser', function () {
    this.slow(300);
    before(function () {
      serverInstance = new MultiplayerServer(testOptions.serverPort);
    });

    after(function () {
      serverInstance.io.close();
    });

    it('should create a User object and insert the Socket', function () {
      var user = serverInstance.userManager.createUser({
        id: 'aa11bb33--4',
        on: function () {}
      });

      expect(user).to.be.instanceof(User);
      expect(user.id).to.equal('aa11bb33--4');
    });

    it('should set user properties when the client sends them', function (done) {
      var client = io.connect(testOptions.socketURL, testOptions.socketOptions);

      client.on('connect', function () {
        client.emit(MESSAGE.USER_PROPS, {
          name: 'Jenny'
        });

        setTimeout(function () {
          serverInstance.userManager.getById(client.id, function (err, user) {
            expect(user.properties.name).to.equal('Jenny');
            done();
          });
        }, 50);

      });
    });
  });

  describe('#isUserInRoom', function () {
    after(function () {
      serverInstance.io.close();
    });

    it('should return correctly', function (done) {
      this.slow(300);
      serverInstance = new MultiplayerServer(testOptions.serverPort);

      var client = io.connect(testOptions.socketURL, testOptions.socketOptions),
          room = serverInstance.roomManager.createRoom('new-room');

      client.on('connect', function () {
        serverInstance.userManager.getById(client.id, function (err, user) {

          room.on(Room.EVENT_USER_ENTER, function () {

            setTimeout(function () {
              expect(serverInstance.userManager.isUserInRoom(client.id, 'non-existent-room')).to.equal(false, 'should not be in a non existent room');
              expect(serverInstance.userManager.isUserInRoom(client.id, RoomManager.LOBBY_NAME)).to.equal(true, 'should be in lobby');
              expect(serverInstance.userManager.isUserInRoom(client.id, 'new-room')).to.equal(true, 'should be in new-room');

              done();
            }, 50);

          });

          room.addUser(user);
        });
      });
    });
  });

  describe('#getRoomsUserIsIn', function () {
    after(function () {
      serverInstance.io.close();
    });

    it('should return a list of rooms the user is in', function (done) {
      this.slow(300);
      serverInstance = new MultiplayerServer(testOptions.serverPort);

      var client = io.connect(testOptions.socketURL, testOptions.socketOptions),
          room1 = serverInstance.roomManager.createRoom('room-1'),
          room;

      serverInstance.roomManager.createRoom('room-2');

      client.on('connect', function () {
        serverInstance.userManager.getById(client.id, function (err, user) {

          room1.on(Room.EVENT_USER_ENTER, function () {

            setTimeout(function () {
              serverInstance.userManager.getRoomsUserIsIn(client.id, function (err, rooms) {

                expect(rooms.length).to.equal(3);

                room = _.find(rooms, function (room) {
                  return room.name === RoomManager.LOBBY_NAME;
                });
                expect(room).to.not.equal(undefined, 'should be in the lobby');

                room = _.find(rooms, function (room) {
                  return room.name === 'room-1';
                });
                expect(room).to.not.equal(undefined, 'should be in room-1');

                room = _.find(rooms, function (room) {
                  return room.name === client.id;
                });
                expect(room).to.not.equal(undefined, 'should be in user\'s own room');

                done();
              });

            }, 50);
          });

          room1.addUser(user);
        });
      });
    });
  });

  describe('#deleteUser', function () {
    it('should remove the user from storage', function () {
      var user = serverInstance.userManager.createUser({
        id: '78gas38-s',
        on: function () {}
      });

      var spy = sinon.spy(serverInstance.storageAdapter, 'delete');
      serverInstance.userManager.deleteUser(user);

      expect(spy).to.have.been.calledWith('User:' + user.id);

      spy.restore();
    });
  });

});
