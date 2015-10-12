'use strict';

function MemoryAdapter() {
  this._storage = {};
  this._indexes = {};
}

MemoryAdapter.prototype.get = function (key, callback) {
  callback(null, this._storage[key]);
};

MemoryAdapter.prototype.set = function (key, value, callback) {
  this._storage[key] = value;

  if (callback) {
    callback(null);
  }
};

MemoryAdapter.prototype.delete = function (key, callback) {
  delete this._storage[key];

  if (callback) {
    callback(null);
  }
};

MemoryAdapter.prototype.indexAdd = function (index, value, callback) {
  if (!this._indexes[index]) {
    this._indexes[index] = [];
  }

  this._indexes[index].push(value);

  if (callback) {
    callback(null);
  }
};

MemoryAdapter.prototype.indexGet = function (index, callback) {
  callback(null, this._indexes[index]);
};

MemoryAdapter.prototype.indexRemove = function (indexName, value) {
  if (this._indexes[indexName]) {
    var index = this._indexes[indexName];
    index.splice(index.indexOf(value), 1);
  }
};

module.exports = MemoryAdapter;
