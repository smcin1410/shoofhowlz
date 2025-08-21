const io = require('socket.io-client');

// Test configuration
const SERVER_URL = 'http://localhost:4000';
const DRAFT_ID = 'test-draft-' + Date.now();
const TEST_PARTICIPANTS = 4; // Number of simulated users

let testResults = {
  connections: [],
  draftEvents: [],
  errors: [],
  timerEvents: []
};

console.log('🧪 Starting Draft Connection Test');
console.log('📋 Test Configuration:', {
  server: SERVER_URL,
  draftId: DRAFT_ID,
  participants: TEST_PARTICIPANTS
});

// Create multiple socket connections to simulate users
async function runConnectionTest() {
  const sockets = [];
  
  // Create connections
  for (let i = 0; i < TEST_PARTICIPANTS; i++) {
    const socket = io(SERVER_URL);
    const userId = `test-user-${i + 1}`;
    
    socket.on('connect', () => {
      console.log(`✅ User ${userId} connected:`, socket.id);
      testResults.connections.push({
        userId,
        socketId: socket.id,
        connected: true,
        timestamp: new Date().toISOString()
      });
      
      // Join the draft lobby
      socket.emit('join-lobby', {
        username: userId,
        role: i === 0 ? 'commissioner' : 'participant',
        draftId: DRAFT_ID
      });
    });
    
    socket.on('connect_error', (error) => {
      console.error(`❌ Connection error for ${userId}:`, error.message);
      testResults.errors.push({
        userId,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    });
    
    socket.on('disconnect', (reason) => {
      console.error(`🔌 User ${userId} disconnected:`, reason);
      testResults.connections.push({
        userId,
        socketId: socket.id,
        connected: false,
        reason,
        timestamp: new Date().toISOString()
      });
    });
    
    socket.on('draft-state', (state) => {
      console.log(`📡 ${userId} received draft state:`, {
        started: state.isDraftStarted,
        currentPick: state.currentPick,
        pickHistoryLength: state.pickHistory?.length
      });
      testResults.draftEvents.push({
        userId,
        event: 'draft-state',
        currentPick: state.currentPick,
        timestamp: new Date().toISOString()
      });
    });
    
    socket.on('timer-update', (data) => {
      console.log(`⏰ ${userId} received timer update:`, data.timeRemaining + 's');
      testResults.timerEvents.push({
        userId,
        timeRemaining: data.timeRemaining,
        timestamp: new Date().toISOString()
      });
    });
    
    sockets.push({ socket, userId });
  }
  
  // Wait for all connections
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Start the draft (as commissioner)
  if (sockets[0]) {
    console.log('🚀 Starting test draft...');
    const draftConfig = {
      id: DRAFT_ID,
      leagueName: 'Connection Test League',
      leagueSize: TEST_PARTICIPANTS,
      draftType: 'snake',
      timeClock: 1, // 1 minute for faster testing
      rounds: 3, // Short draft for testing
      teamNames: Array.from({length: TEST_PARTICIPANTS}, (_, i) => `Team ${i + 1}`)
    };
    
    sockets[0].socket.emit('generate-draft-order', draftConfig);
    
    setTimeout(() => {
      sockets[0].socket.emit('start-draft', draftConfig);
      
      // Start the draft clock after a delay
      setTimeout(() => {
        console.log('⏰ Starting draft clock...');
        sockets[0].socket.emit('start-draft-clock', { draftId: DRAFT_ID });
      }, 3000);
      
    }, 2000);
  }
  
  // Let the test run for 30 seconds
  setTimeout(() => {
    console.log('🏁 Test completed. Results:');
    console.log('Connections:', testResults.connections.length);
    console.log('Draft Events:', testResults.draftEvents.length);
    console.log('Timer Events:', testResults.timerEvents.length);
    console.log('Errors:', testResults.errors.length);
    
    if (testResults.errors.length > 0) {
      console.log('❌ Errors detected:', testResults.errors);
    }
    
    // Cleanup
    sockets.forEach(({socket}) => socket.disconnect());
    process.exit(0);
  }, 30000);
}

runConnectionTest().catch(console.error);