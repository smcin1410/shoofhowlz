// Debug script to test the draft creation flow locally
const io = require('socket.io-client');

const SERVER_URL = 'https://fantasy-draft-server.onrender.com';
const TEST_DRAFT_ID = 'debug-draft-' + Date.now();

console.log('🧪 Testing Draft Creation Flow');
console.log('Server:', SERVER_URL);
console.log('Draft ID:', TEST_DRAFT_ID);

const socket = io(SERVER_URL, {
  timeout: 5000,
  transports: ['websocket', 'polling']
});

socket.on('connect', () => {
  console.log('✅ Connected to local server');
  
  // Simulate the exact flow from the frontend
  console.log('🎯 Step 1: Joining lobby as commissioner...');
  socket.emit('join-lobby', {
    username: 'test-commissioner',
    role: 'commissioner', 
    draftId: TEST_DRAFT_ID
  });
});

socket.on('participants-update', (participants) => {
  console.log('✅ Step 2: Lobby join successful, participants:', participants.length);
  console.log('🎯 Step 3: Testing what happens when we try to use this draft...');
  
  // This mimics what happens when the user clicks the draft buttons
  // Let's see what events are available
});

socket.on('connect_error', (error) => {
  console.error('❌ Connection failed:', error.message);
  console.log('💡 Make sure your local server is running: npm run start:server');
});

socket.on('error', (error) => {
  console.error('❌ Socket error:', error);
});

// Log all events to see what the server responds with
const originalEmit = socket.emit;
socket.emit = function(event, ...args) {
  console.log('📤 Emitting:', event, args);
  return originalEmit.call(this, event, ...args);
};

const originalOn = socket.on;
socket.on = function(event, callback) {
  return originalOn.call(this, event, (...args) => {
    console.log('📥 Received:', event, args);
    callback(...args);
  });
};

setTimeout(() => {
  console.log('⏰ Test timeout - disconnecting');
  socket.disconnect();
  process.exit(0);
}, 10000);