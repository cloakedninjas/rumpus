var expect = require('chai').expect,
    io = require('socket.io-client'),
    MESSAGE = require('../src/lib/message-types.js'),
    testOptions = require('./testOptions'),
    MultiplayerServer = require('../src/lib/multiplayer-server'),
    serverInstance;

describe('Multiplayer Server', function () {
  beforeEach(function () {
    serverInstance = new MultiplayerServer(3000);
  });

  afterEach(function () {
    serverInstance.io.close();
  });

  it('should report the version number on connect', function (done) {
    serverInstance.io.close();
    serverInstance = new MultiplayerServer(3000, {
      version: 1471
    });

    var client1 = io.connect(testOptions.socketURL, testOptions.socketOptions);

    client1.on('connect', function () {
      client1.on(MESSAGE.VERSION, function (data) {
        expect(data).to.equal(1471);

        client1.disconnect();
        done();
      });
    });
  });

  it('should trigger an event when a user connects', function (done) {
    serverInstance.on(MultiplayerServer.EVENT_USER_CONNECT, function () {
      client1.disconnect();
      done();
    });

    var client1 = io.connect(testOptions.socketURL, testOptions.socketOptions);
  });

  it('should trigger an event when a user disconnects', function (done) {
    serverInstance.on(MultiplayerServer.EVENT_USER_DISCONNECT, function (data) {
      expect(data.id).to.not.equal(undefined);
      done();
    });

    var client = io.connect(testOptions.socketURL, testOptions.socketOptions);

    client.on('connect', function () {
      client.disconnect();
    });
  });

  it('should return a list of lobby users when joining', function (done) {
    var client1 = io.connect(testOptions.socketURL, testOptions.socketOptions);

    client1.on('connect', function () {
      client1.on(MESSAGE.LOBBY_USERS, function (data) {

        expect(data).to.be.an('Array', 'should be an array');
        expect(data.length).to.equal(0, 'should be empty');

        var client2 = io.connect(testOptions.socketURL, testOptions.socketOptions);

        client2.on('connect', function () {
          client2.on(MESSAGE.LOBBY_USERS, function (data) {

            expect(data.length).to.equal(1, 'should contain a single user');
            expect(data[0].id).to.equal(client1.id);

            client1.disconnect();
            client2.disconnect();
            done();
          });
        });
      });
    });
  });

  it('should broadcast to all lobby users when a new user joins', function (done) {
    var client1 = io.connect(testOptions.socketURL, testOptions.socketOptions),
        client2;

    client1.on('connect', function () {
      client2 = io.connect(testOptions.socketURL, testOptions.socketOptions);

      client1.on(MESSAGE.USER_JOIN, function (data) {
        // for some reason, Socket.IO takes some time to set the ID property, hence this timeout
        setTimeout(function () {
          expect(data).to.be.an('Object');
          expect(data.id).to.equal(client2.id);

          client1.disconnect();
          client2.disconnect();
          done();
        }, 10);
      });
    });
  });

  it('should wait for user props if waitForPropsBeforeLobby is set', function (done) {
    var delay = 80;
    this.slow((delay * 2) + 400);

    serverInstance.io.close();

    serverInstance = new MultiplayerServer(3000, {
      waitForPropsBeforeLobby: true
    });

    var client1 = io.connect(testOptions.socketURL, testOptions.socketOptions);

    client1.on('connect', function () {
      setTimeout(function () {
        expect(serverInstance.roomManager.lobby.getOccupancy()).to.equal(0);

        client1.emit(MESSAGE.USER_PROPS, {
          name: 'Jane',
          age: 32
        });

        setTimeout(function () {
          expect(serverInstance.roomManager.lobby.getOccupancy()).to.equal(1);
          done();
        }, delay);

      }, delay);
    });
  });

  it('should broadcast to fellow room occupants when a user disconnects', function (done) {
    var client1 = io.connect(testOptions.socketURL, testOptions.socketOptions),
        client1Id;

    client1.on('connect', function () {
      client1Id = client1.id;
      var client2 = io.connect(testOptions.socketURL, testOptions.socketOptions);

      client2.on('connect', function () {
        client2.on(MESSAGE.USER_LEAVE, function (data) {

          expect(data).to.equal(client1Id);
          done();
        });

        client1.disconnect();
      });
    });

  });

  describe('#addMessageHandler', function () {
    it('should attach a handler to a specific message', function (done) {

      serverInstance.addMessageHandler('MY_CUSTOM_MSG', function (user, data) {
        expect(data.dummy).to.equal(178);
        client1.disconnect();
        done();
      });

      var client1 = io.connect(testOptions.socketURL, testOptions.socketOptions);

      client1.on('connect', function () {
        client1.emit('MY_CUSTOM_MSG', {dummy: 178});
      });

    });
  });

  describe('#removeMessageHandler', function () {
    it('should remove a handler from current and future sockets', function (done) {

      var callCount = 0,
          messageHandler = function () {
            callCount++;
          };

      serverInstance.addMessageHandler('MY_CUSTOM_MSG', messageHandler);

      var client1 = io.connect(testOptions.socketURL, testOptions.socketOptions);

      client1.on('connect', function () {

        serverInstance.removeMessageHandler('MY_CUSTOM_MSG', messageHandler);
        client1.emit('MY_CUSTOM_MSG');

        var client2 = io.connect(testOptions.socketURL, testOptions.socketOptions);

        client2.on('connect', function () {
          client2.emit('MY_CUSTOM_MSG');

          setTimeout(function () {
            expect(callCount).to.equal(0);
            done();
          }, 10);
        });
      });
    });
  });

});
