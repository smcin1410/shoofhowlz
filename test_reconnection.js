const io = require('socket.io-client');

const SERVER_URL = 'http://localhost:4000';
const DRAFT_ID = 'reconnection-test-' + Date.now();
const NUM_PARTICIPANTS = 3;

let testResults = {
  initialConnections: 0,
  disconnections: 0,
  reconnections: 0,
  errors: 0,
  draftStateReceived: 0,
  timerEventsReceived: 0
};

console.log('🧪 Starting Client Reconnection Test');
console.log('📋 Testing reconnection stability during active draft');

async function runReconnectionTest() {
  const sockets = [];
  let disconnectedSockets = [];
  
  // Create initial connections
  for (let i = 0; i < NUM_PARTICIPANTS; i++) {
    const userId = `reconnect-user-${i + 1}`;
    const socket = createSocket(userId, i === 0);
    sockets.push({ socket, userId, index: i });
  }
  
  // Wait for initial connections and start draft
  setTimeout(() => {
    startDraft(sockets[0]);
    
    // Start disconnection/reconnection cycle after draft starts
    setTimeout(() => {
      startReconnectionCycle(sockets);
    }, 5000);
    
  }, 3000);
  
  // Test completion
  setTimeout(() => {
    console.log('🏁 Reconnection Test Results:');
    console.log('Initial Connections:', testResults.initialConnections);
    console.log('Disconnections:', testResults.disconnections);
    console.log('Reconnections:', testResults.reconnections);
    console.log('Errors:', testResults.errors);
    console.log('Draft States Received:', testResults.draftStateReceived);
    console.log('Timer Events Received:', testResults.timerEventsReceived);
    
    const success = testResults.errors === 0 && 
                   testResults.reconnections > 0 && 
                   testResults.draftStateReceived > 0;
    
    if (success) {
      console.log('✅ RECONNECTION TEST PASSED');
    } else {
      console.log('❌ RECONNECTION TEST FAILED');
    }
    
    // Cleanup
    [...sockets, ...disconnectedSockets].forEach(({socket}) => {
      if (socket && socket.connected) {
        socket.disconnect();
      }
    });
    
    process.exit(0);
  }, 25000);
}

function createSocket(userId, isCommissioner) {
  const socket = io(SERVER_URL);
  
  socket.on('connect', () => {
    console.log(`✅ ${userId} connected`);
    testResults.initialConnections++;
    
    socket.emit('join-lobby', {
      username: userId,
      role: isCommissioner ? 'commissioner' : 'participant',
      draftId: DRAFT_ID
    });
  });
  
  socket.on('reconnect', (attemptNumber) => {
    console.log(`🔄 ${userId} reconnected after ${attemptNumber} attempts`);
    testResults.reconnections++;
    
    // Rejoin the draft after reconnection
    socket.emit('join-lobby', {
      username: userId,
      role: isCommissioner ? 'commissioner' : 'participant',
      draftId: DRAFT_ID
    });
  });
  
  socket.on('disconnect', (reason) => {
    console.log(`🔌 ${userId} disconnected: ${reason}`);
    if (reason !== 'io client disconnect') {
      testResults.disconnections++;
    }
  });
  
  socket.on('connect_error', (error) => {
    console.error(`❌ ${userId} connection error:`, error.message);
    testResults.errors++;
  });
  
  socket.on('draft-state', (state) => {
    console.log(`📡 ${userId} received draft state (picks: ${state.pickHistory?.length || 0})`);
    testResults.draftStateReceived++;
  });
  
  socket.on('timer-update', (data) => {
    testResults.timerEventsReceived++;
    if (data.timeRemaining % 20 === 0) {
      console.log(`⏰ ${userId} timer: ${data.timeRemaining}s remaining`);
    }
  });
  
  return socket;
}

function startDraft(commissionerSocket) {
  const draftConfig = {
    id: DRAFT_ID,
    leagueName: 'Reconnection Test',
    leagueSize: NUM_PARTICIPANTS,
    draftType: 'snake',
    timeClock: 1, // 1 minute timer
    rounds: 2,
    teamNames: Array.from({length: NUM_PARTICIPANTS}, (_, i) => `ReconnectTeam${i + 1}`)
  };
  
  console.log('🚀 Starting draft for reconnection testing...');
  commissionerSocket.socket.emit('generate-draft-order', draftConfig);
  
  setTimeout(() => {
    commissionerSocket.socket.emit('start-draft', draftConfig);
    setTimeout(() => {
      commissionerSocket.socket.emit('start-draft-clock', { draftId: DRAFT_ID });
    }, 1000);
  }, 1000);
}

async function startReconnectionCycle(sockets) {
  console.log('🔄 Starting reconnection cycle...');
  
  // Disconnect and reconnect each client one by one
  for (let i = 0; i < sockets.length; i++) {
    const {socket, userId} = sockets[i];
    
    console.log(`🔌 Forcing disconnect for ${userId}...`);
    socket.disconnect();
    
    // Wait a bit, then reconnect
    setTimeout(() => {
      console.log(`🔄 Reconnecting ${userId}...`);
      socket.connect();
    }, 2000 + (i * 1000)); // Stagger reconnections
  }
  
  // After all reconnections, test simultaneous disconnects
  setTimeout(() => {
    console.log('🔄 Testing simultaneous disconnection/reconnection...');
    
    sockets.forEach(({socket}) => {
      socket.disconnect();
    });
    
    setTimeout(() => {
      sockets.forEach(({socket}) => {
        socket.connect();
      });
    }, 3000);
    
  }, 10000);
}

runReconnectionTest().catch(console.error);