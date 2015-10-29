var expect = require('chai').expect,
    io = require('socket.io-client'),
    User = require('../../src/entity/user'),
    MemoryAdapter = require('../../src/adapter/memory');

describe('User Entity', function () {

  describe('#toBroadcastData', function () {
    it('should return data in the correct format', function () {
      var user = new User('aa11bbff44', new MemoryAdapter());
      user.setProperties({
        name: 'Tim',
        age: 14,
        schoolId: 100737
      });

      var data = user.toBroadcastData();

      expect(data.id).to.equal('aa11bbff44');
      expect(data.properties.name).to.equal('Tim');
      expect(data.properties.age).to.equal(14);
      expect(data.properties.schoolId).to.equal(100737);
    });
  });

  describe('#hydrate', function () {
    it('should push data into the user', function () {
      var user = new User('id-4567', new MemoryAdapter());

      user.hydrate({
        id: 17,
        properties: {
          level: 7,
          medal: 'gold'
        }
      });

      expect(user.id).to.equal(17);
      expect(user.properties.level).to.equal(7);
      expect(user.properties.medal).to.equal('gold');
    });
  });

  it('should trigger an event when properties are set', function (done) {
    var user = new User('bha564', new MemoryAdapter());

    user.on(User.EVENT_PROP_UPDATE, function (data) {
      expect(data.properties.age).to.equal(17);
      expect(data.properties.preferredFruit).to.equal('apple');
      done();
    });

    user.setProperties({
      age: 17,
      preferredFruit: 'apple'
    });
  });

});
