'use strict';

var DEFAULT_PORT = 3000;

var args = process.argv.slice(2),
    port = args[0] || DEFAULT_PORT,

    MultiplayerServer = require('./lib/multiplayer-server.js'),
    config = require('./config.json');


new MultiplayerServer(port, config);