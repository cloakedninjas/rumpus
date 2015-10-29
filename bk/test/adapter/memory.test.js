var expect = require('chai').expect,
    MemoryAdapter = require('../../src/adapter/memory');

describe('Storage Adapter: Memory', function () {

  it('should return undefined for a non-existent key', function (done) {
    var adapter = new MemoryAdapter();

    adapter.get('bad-key').then(function (value) {
      expect(value).to.equal(undefined);
      done();
    });
  });

  it('should return a value once stored', function (done) {
    var adapter = new MemoryAdapter();

    adapter.set('good-key', {
      name: 'billy'
    })
        .then(function () {
          adapter.get('good-key')
              .then(function (value) {
                expect(value).to.be.an('object');
                expect(value.name).to.equal('billy');
                done();
              });
        });
  });
});