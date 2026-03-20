export const environment = {
  production: false,
  wsEndpoint: 'ws://localhost:2567',
  roomName: 'my_room',
  // When true, the lobby shows Guest tab by default and sends seatToken='guest'
  // Your Colyseus server should skip token validation when it receives 'guest'
  guestModeEnabled: true,
};
