const io = require('socket.io-client');

const SERVER_URL = 'http://localhost:4000';
const NUM_DRAFTS = 3;
const PARTICIPANTS_PER_DRAFT = 6;

let allResults = {
  drafts: [],
  totalConnections: 0,
  totalErrors: 0,
  totalDisconnections: 0
};

console.log('🧪 Starting Multiple Drafts Stress Test');
console.log(`📋 Configuration: ${NUM_DRAFTS} drafts, ${PARTICIPANTS_PER_DRAFT} participants each`);

async function createDraftTest(draftIndex) {
  const draftId = `stress-draft-${draftIndex}-${Date.now()}`;
  const sockets = [];
  const draftResults = {
    draftId,
    connections: 0,
    errors: 0,
    disconnections: 0,
    timerEvents: 0,
    draftEvents: 0
  };

  console.log(`🚀 Starting Draft ${draftIndex + 1}: ${draftId}`);

  for (let i = 0; i < PARTICIPANTS_PER_DRAFT; i++) {
    const socket = io(SERVER_URL);
    const userId = `draft${draftIndex}-user${i + 1}`;

    socket.on('connect', () => {
      draftResults.connections++;
      allResults.totalConnections++;
      console.log(`✅ ${userId} connected to draft ${draftIndex + 1}`);

      socket.emit('join-lobby', {
        username: userId,
        role: i === 0 ? 'commissioner' : 'participant',
        draftId: draftId
      });
    });

    socket.on('connect_error', (error) => {
      draftResults.errors++;
      allResults.totalErrors++;
      console.error(`❌ Connection error for ${userId}:`, error.message);
    });

    socket.on('disconnect', (reason) => {
      draftResults.disconnections++;
      allResults.totalDisconnections++;
      console.error(`🔌 ${userId} disconnected:`, reason);
    });

    socket.on('timer-update', () => {
      draftResults.timerEvents++;
    });

    socket.on('draft-state', () => {
      draftResults.draftEvents++;
    });

    sockets.push({ socket, userId });
  }

  // Wait for connections, then start draft
  setTimeout(() => {
    if (sockets[0]) {
      const draftConfig = {
        id: draftId,
        leagueName: `Stress Test Draft ${draftIndex + 1}`,
        leagueSize: PARTICIPANTS_PER_DRAFT,
        draftType: 'snake',
        timeClock: 0.5, // 30 seconds for faster testing
        rounds: 2,
        teamNames: Array.from({length: PARTICIPANTS_PER_DRAFT}, (_, i) => `Team ${i + 1}`)
      };

      sockets[0].socket.emit('generate-draft-order', draftConfig);
      
      setTimeout(() => {
        sockets[0].socket.emit('start-draft', draftConfig);
        setTimeout(() => {
          sockets[0].socket.emit('start-draft-clock', { draftId });
        }, 1000);
      }, 1000);
    }
  }, 2000 + (draftIndex * 1000)); // Stagger draft starts

  // Cleanup after test
  setTimeout(() => {
    console.log(`🏁 Draft ${draftIndex + 1} test complete:`, draftResults);
    allResults.drafts.push(draftResults);
    sockets.forEach(({socket}) => socket.disconnect());
  }, 20000 + (draftIndex * 5000)); // Stagger cleanup

  return draftResults;
}

// Run all draft tests simultaneously
async function runStressTest() {
  console.log('🔥 Starting simultaneous draft stress test...');
  
  const draftPromises = [];
  for (let i = 0; i < NUM_DRAFTS; i++) {
    draftPromises.push(createDraftTest(i));
  }

  // Wait for all tests to complete
  setTimeout(() => {
    console.log('📊 STRESS TEST RESULTS:');
    console.log('Total Drafts:', allResults.drafts.length);
    console.log('Total Connections:', allResults.totalConnections);
    console.log('Total Errors:', allResults.totalErrors);
    console.log('Total Disconnections:', allResults.totalDisconnections);
    
    allResults.drafts.forEach((draft, index) => {
      console.log(`Draft ${index + 1}:`, {
        connections: draft.connections,
        errors: draft.errors,
        timerEvents: draft.timerEvents > 0 ? 'YES' : 'NO',
        draftEvents: draft.draftEvents > 0 ? 'YES' : 'NO'
      });
    });

    if (allResults.totalErrors === 0) {
      console.log('✅ STRESS TEST PASSED - No connection errors detected');
    } else {
      console.log('❌ STRESS TEST FAILED - Connection errors detected');
    }

    process.exit(0);
  }, 40000);
}

runStressTest().catch(console.error);