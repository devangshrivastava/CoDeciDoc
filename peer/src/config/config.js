// src/config/config.js
export const iceServers = [
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    {
      urls: "turn:global.relay.metered.ca:80",
      username: "9ed5150a9096f79487728504",
      credential: "z+RYu0NbpK7bzo6O",
    },
    {
      urls: "turn:global.relay.metered.ca:80?transport=tcp",
      username: "9ed5150a9096f79487728504",
      credential: "z+RYu0NbpK7bzo6O",
    },
    {
      urls: "turn:global.relay.metered.ca:443",
      username: "9ed5150a9096f79487728504",
      credential: "z+RYu0NbpK7bzo6O",
    },
    {
      urls: "turns:global.relay.metered.ca:443?transport=tcp",
      username: "9ed5150a9096f79487728504",
      credential: "z+RYu0NbpK7bzo6O",
    },
  ];
  
  export const SOCKET_URL = 'http://172.31.54.137:4444';
  