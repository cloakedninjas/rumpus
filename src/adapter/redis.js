'use strict';

var debug = require('debug')('rumpus:RedisAdaptor'),
    Q = require('q');

function RedisAdapter(prefix, client) {
  this._prefix = prefix;
  this._client = client;
}

RedisAdapter.prototype.get = function (key) {
  var deferred = Q.defer();

  this._client.get(this._prefixKey(key), function (err, data) {
    if (err) {
      deferred.reject(err);
    }
    else {
      deferred.resolve(JSON.parse(data));
    }
  });

  return deferred.promise;
};

RedisAdapter.prototype.set = function (key, value) {
  var deferred = Q.defer();

  key = this._prefixKey(key);
  value = JSON.stringify(value);
  debug('Persisting data: %s = %j', key, value);

  this._client.set(key, value, function (err) {
    if (err) {
      deferred.reject(err);
    }
    else {
      deferred.resolve();
    }
  });

  return deferred.promise;
};

RedisAdapter.prototype.delete = function (key) {
  var deferred = Q.defer();
  debug('Deleting key: %s', key);

  this._client.del(this._prefixKey(key), function (err) {
    if (err) {
      deferred.reject(err);
    }
    else {
      deferred.resolve();
    }
  });

  return deferred.promise;
};

RedisAdapter.prototype.indexAdd = function (index, value) {
  var deferred = Q.defer();

  index = this._prefixKey(index);
  debug('Add %s to index: %s', value, index);

  this._client.sadd(index, value, function (err) {
    if (err) {
      deferred.reject(err);
    }
    else {
      deferred.resolve();
    }
  });

  return deferred.promise;
};

RedisAdapter.prototype.indexGet = function (index) {
  var deferred = Q.defer();

  index = this._prefixKey(index);

  this._client.smembers(index, function (err, data) {
    if (err) {
      deferred.reject(err);
    }
    else {
      deferred.resolve(data);
    }
  });

  return deferred.promise;
};

RedisAdapter.prototype.indexRemove = function (index, value) {
  var deferred = Q.defer();

  debug('Remove %s from index: %s', value, index);
  index = this._prefixKey(index);

  this._client.srem(index, value, function (err) {
    if (err) {
      deferred.reject(err);
    }
    else {
      deferred.resolve();
    }
  });

  return deferred.promise;
};

RedisAdapter.prototype._prefixKey = function (key) {
  return this._prefix + '-' + key;
};

module.exports = RedisAdapter;
