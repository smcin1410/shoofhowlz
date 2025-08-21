const io = require('socket.io-client');

const SERVER_URL = 'http://localhost:4000';
const DRAFT_ID = 'rapid-picks-test-' + Date.now();
const NUM_PARTICIPANTS = 4;
const PICKS_TO_SIMULATE = 8; // 2 rounds

let testResults = {
  connections: [],
  picks: [],
  errors: [],
  timerEvents: [],
  successfulPicks: 0,
  failedPicks: 0
};

console.log('🧪 Starting Rapid Pick Test');
console.log('📋 Configuration:', {
  participants: NUM_PARTICIPANTS,
  picksToSimulate: PICKS_TO_SIMULATE,
  draftId: DRAFT_ID
});

async function runRapidPickTest() {
  const sockets = [];
  
  // Create connections
  for (let i = 0; i < NUM_PARTICIPANTS; i++) {
    const socket = io(SERVER_URL);
    const userId = `rapid-user-${i + 1}`;
    
    socket.on('connect', () => {
      console.log(`✅ ${userId} connected`);
      testResults.connections.push({
        userId,
        connected: true,
        timestamp: new Date().toISOString()
      });
      
      socket.emit('join-lobby', {
        username: userId,
        role: i === 0 ? 'commissioner' : 'participant',
        draftId: DRAFT_ID
      });
    });
    
    socket.on('connect_error', (error) => {
      testResults.errors.push({
        userId,
        type: 'connection',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    });
    
    socket.on('draft-error', (error) => {
      console.error(`❌ Draft error for ${userId}:`, error.message);
      testResults.errors.push({
        userId,
        type: 'draft',
        error: error.message,
        timestamp: new Date().toISOString()
      });
      testResults.failedPicks++;
    });
    
    socket.on('draft-state', (state) => {
      if (state.pickHistory && state.pickHistory.length > 0) {
        const lastPick = state.pickHistory[state.pickHistory.length - 1];
        console.log(`📡 ${userId} received pick: ${lastPick.player?.name || 'Unknown'} to ${lastPick.team?.name || 'Unknown Team'}`);
        testResults.picks.push({
          userId,
          pick: lastPick,
          timestamp: new Date().toISOString()
        });
        testResults.successfulPicks++;
      }
    });
    
    socket.on('timer-update', (data) => {
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
  
  // Start the draft
  if (sockets[0]) {
    const draftConfig = {
      id: DRAFT_ID,
      leagueName: 'Rapid Pick Test',
      leagueSize: NUM_PARTICIPANTS,
      draftType: 'snake',
      timeClock: 2, // 2 minutes but we'll pick rapidly
      rounds: 2, // Short draft for rapid testing
      teamNames: Array.from({length: NUM_PARTICIPANTS}, (_, i) => `RapidTeam${i + 1}`)
    };
    
    console.log('🚀 Starting rapid pick draft...');
    sockets[0].socket.emit('generate-draft-order', draftConfig);
    
    setTimeout(() => {
      sockets[0].socket.emit('start-draft', draftConfig);
      
      setTimeout(() => {
        sockets[0].socket.emit('start-draft-clock', { draftId: DRAFT_ID });
        
        // Start rapid picks after draft clock starts
        setTimeout(() => {
          simulateRapidPicks(sockets);
        }, 2000);
        
      }, 1000);
    }, 1000);
  }
  
  // Test completion
  setTimeout(() => {
    console.log('🏁 Rapid Pick Test Results:');
    console.log('Total Connections:', testResults.connections.length);
    console.log('Successful Picks:', testResults.successfulPicks);
    console.log('Failed Picks:', testResults.failedPicks);
    console.log('Total Errors:', testResults.errors.length);
    console.log('Timer Events:', testResults.timerEvents.length);
    
    if (testResults.errors.length === 0 && testResults.successfulPicks >= PICKS_TO_SIMULATE) {
      console.log('✅ RAPID PICK TEST PASSED');
    } else {
      console.log('❌ RAPID PICK TEST FAILED');
      if (testResults.errors.length > 0) {
        console.log('Errors:', testResults.errors);
      }
    }
    
    sockets.forEach(({socket}) => socket.disconnect());
    process.exit(0);
  }, 30000);
}

async function simulateRapidPicks(sockets) {
  console.log('🔥 Starting rapid pick simulation...');
  
  // Simulate rapid picks with minimal delays
  for (let pick = 0; pick < PICKS_TO_SIMULATE; pick++) {
    const teamIndex = pick % NUM_PARTICIPANTS;
    const socket = sockets[teamIndex].socket;
    const userId = sockets[teamIndex].userId;
    
    // Pick a random player ID (simulating available players)
    const playerId = `player-${Math.floor(Math.random() * 500) + 1}`;
    
    console.log(`🚀 ${userId} making rapid pick ${pick + 1}...`);
    
    socket.emit('draft-player', {
      draftId: DRAFT_ID,
      playerId: playerId
    });
    
    // Very short delay between picks to test race conditions
    await new Promise(resolve => setTimeout(resolve, 200)); // 200ms between picks
  }
  
  console.log('✅ Rapid pick simulation complete');
}

runRapidPickTest().catch(console.error);