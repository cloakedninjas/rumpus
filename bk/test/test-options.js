module.exports = {
  serverPort: 4000,
  socketURL: 'http://localhost:4000',
  socketOptions: {
    transports: ['websocket'],
    'force new connection': true
  },
  serverVersion: 1471
};