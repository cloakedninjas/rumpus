'use strict';
var Q = require('q');

function MemoryAdapter() {
  this._storage = {};
  this._indexes = {};
}

MemoryAdapter.prototype.get = function (key) {
  var deferred = Q.defer();
  deferred.resolve(this._storage[key]);
  return deferred.promise;
};

MemoryAdapter.prototype.set = function (key, value) {
  var deferred = Q.defer();
  this._storage[key] = value;
  deferred.resolve();
  return deferred.promise;
};

MemoryAdapter.prototype.delete = function (key) {
  var deferred = Q.defer();
  delete this._storage[key];
  deferred.resolve();
  return deferred.promise;
};

MemoryAdapter.prototype.indexAdd = function (index, value) {
  var deferred = Q.defer();

  if (!this._indexes[index]) {
    this._indexes[index] = [];
  }

  this._indexes[index].push(value);

  deferred.resolve();
  return deferred.promise;
};

MemoryAdapter.prototype.indexGet = function (index) {
  var deferred = Q.defer();
  deferred.resolve(this._indexes[index]);
  return deferred.promise;
};

MemoryAdapter.prototype.indexRemove = function (indexName, value) {
  var deferred = Q.defer();

  if (this._indexes[indexName]) {
    var index = this._indexes[indexName];
    index.splice(index.indexOf(value), 1);
  }

  return deferred.promise;
};

module.exports = MemoryAdapter;
