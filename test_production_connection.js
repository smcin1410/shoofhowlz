const io = require('socket.io-client');

const PRODUCTION_SERVER = 'https://fantasy-draft-server.onrender.com';
const TEST_DRAFT_ID = 'prod-test-' + Date.now();

console.log('🧪 Testing Production Server Connection');
console.log('Server:', PRODUCTION_SERVER);
console.log('Draft ID:', TEST_DRAFT_ID);

let results = {
  connection: false,
  joinLobby: false,
  draftCreation: false,
  timerStart: false,
  errors: []
};

const socket = io(PRODUCTION_SERVER, {
  timeout: 10000,
  transports: ['websocket', 'polling']
});

socket.on('connect', () => {
  console.log('✅ Connected to production server');
  results.connection = true;
  
  // Test joining lobby
  socket.emit('join-lobby', {
    username: 'test-user',
    role: 'commissioner',
    draftId: TEST_DRAFT_ID
  });
});

socket.on('participants-update', (participants) => {
  console.log('✅ Lobby join successful, participants:', participants.length);
  results.joinLobby = true;
  
  // Test draft creation
  const draftConfig = {
    id: TEST_DRAFT_ID,
    leagueName: 'Production Test',
    leagueSize: 4,
    draftType: 'snake',
    timeClock: 1.5, // 1.5 minutes = 90 seconds
    rounds: 2,
    teamNames: ['Team1', 'Team2', 'Team3', 'Team4']
  };
  
  console.log('🚀 Creating test draft...');
  socket.emit('generate-draft-order', draftConfig);
});

socket.on('draft-order-generated', (data) => {
  console.log('✅ Draft order generated:', data.draftOrder);
  results.draftCreation = true;
  
  // Start the draft
  const draftConfig = {
    id: TEST_DRAFT_ID,
    leagueName: 'Production Test',
    leagueSize: 4,
    draftType: 'snake',
    timeClock: 1.5,
    rounds: 2,
    teamNames: ['Team1', 'Team2', 'Team3', 'Team4']
  };
  
  socket.emit('start-draft', draftConfig);
  
  setTimeout(() => {
    console.log('⏰ Testing draft clock start...');
    socket.emit('start-draft-clock', { draftId: TEST_DRAFT_ID });
  }, 2000);
});

socket.on('timer-update', (data) => {
  if (!results.timerStart) {
    console.log('✅ Timer started successfully! Time remaining:', data.timeRemaining);
    results.timerStart = true;
    
    // Complete the test
    setTimeout(() => {
      printResults();
      socket.disconnect();
      process.exit(0);
    }, 3000);
  }
});

socket.on('connect_error', (error) => {
  console.error('❌ Connection failed:', error.message);
  results.errors.push(`Connection: ${error.message}`);
  setTimeout(() => {
    printResults();
    process.exit(1);
  }, 2000);
});

socket.on('error', (error) => {
  console.error('❌ Socket error:', error);
  results.errors.push(`Socket: ${error}`);
});

socket.on('draft-error', (error) => {
  console.error('❌ Draft error:', error);
  results.errors.push(`Draft: ${error.message}`);
});

function printResults() {
  console.log('\n📊 Production Connection Test Results:');
  console.log('=====================================');
  console.log('Server Connection:', results.connection ? '✅ PASS' : '❌ FAIL');
  console.log('Lobby Join:', results.joinLobby ? '✅ PASS' : '❌ FAIL');
  console.log('Draft Creation:', results.draftCreation ? '✅ PASS' : '❌ FAIL');
  console.log('Timer Start:', results.timerStart ? '✅ PASS' : '❌ FAIL');
  
  if (results.errors.length > 0) {
    console.log('\n❌ Errors:');
    results.errors.forEach(error => console.log(`  - ${error}`));
  }
  
  const passed = results.connection && results.joinLobby && results.draftCreation && results.timerStart;
  console.log('\n🎯 Overall Result:', passed ? '✅ PRODUCTION READY' : '❌ ISSUES DETECTED');
}

// Timeout after 30 seconds
setTimeout(() => {
  console.log('⏰ Test timeout - server may be slow or unavailable');
  printResults();
  process.exit(1);
}, 30000);