'use strict';

var debug = require('debug')('rumpus:RedisAdaptor');

function RedisAdapter(prefix, client) {
  this._prefix = prefix;
  this._client = client;
}

RedisAdapter.prototype.get = function (key, callback) {
  return this._client.get(this._prefixKey(key), function (err, data) {
    callback(err, JSON.parse(data));
  });
};

RedisAdapter.prototype.set = function (key, value, callback) {
  key = this._prefixKey(key);
  value = JSON.stringify(value);
  debug('Persisting data: %s = %j', key, value);

  return this._client.set(key, value);
};

RedisAdapter.prototype.delete = function (key, callback) {
  debug('Deleting key: %s', key);

  return this._client.del(this._prefixKey(key), callback);
};

RedisAdapter.prototype.indexAdd = function (index, value) {
  index = this._prefixKey(index);
  debug('Add %s to index: %s', value, index);

  return this._client.sadd(index, value);
};

RedisAdapter.prototype.indexGet = function (index, callback) {
  index = this._prefixKey(index);

  return this._client.smembers(index, callback);
};

RedisAdapter.prototype.indexRemove = function (index, value) {
  debug('Remove %s from index: $s', value, index);
  index = this._prefixKey(index);

  return this._client.srem(index, value);
};

RedisAdapter.prototype._prefixKey = function (key) {
  return this._prefix + '-' + key;
};

module.exports = RedisAdapter;
