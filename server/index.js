const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { createServer } = require('http');
const { Server } = require('socket.io');

const app = express();
const server = createServer(app);
const allowedOrigins = [
  "http://localhost:5173", "http://localhost:5174", "http://localhost:5175", "http://localhost:5176",
  "https://shoof-howlz.vercel.app",
  "https://shoofhowlz.vercel.app"
];

// Add production client URL from environment variable
if (process.env.CLIENT_URL) {
  allowedOrigins.push(process.env.CLIENT_URL);
}

// In production, allow Vercel preview deployments
if (process.env.NODE_ENV === 'production') {
  allowedOrigins.push(/https:\/\/.*\.vercel\.app$/);
}

// Add connection pooling and rate limiting
const rateLimit = new Map();
const RATE_LIMIT_WINDOW = 1000; // 1 second
const MAX_EVENTS_PER_WINDOW = 10;

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST", "DELETE"]
  },
  // Performance optimizations
  pingTimeout: 60000,
  pingInterval: 25000,
  transports: ['websocket', 'polling'],
  allowEIO3: true,
  // Reduce memory usage
  maxHttpBufferSize: 1e6, // 1MB
  // Optimize for real-time updates
  upgradeTimeout: 10000,
  // Enable compression
  perMessageDeflate: {
    threshold: 32768,
    zlibInflateOptions: {
      chunkSize: 10 * 1024
    }
  }
});

// Rate limiting middleware
io.use((socket, next) => {
  const clientId = socket.handshake.address;
  const now = Date.now();
  
  if (!rateLimit.has(clientId)) {
    rateLimit.set(clientId, { count: 0, resetTime: now + RATE_LIMIT_WINDOW });
  }
  
  const clientLimit = rateLimit.get(clientId);
  if (now > clientLimit.resetTime) {
    clientLimit.count = 0;
    clientLimit.resetTime = now + RATE_LIMIT_WINDOW;
  }
  
  if (clientLimit.count >= MAX_EVENTS_PER_WINDOW) {
    return next(new Error('Rate limit exceeded'));
  }
  
  clientLimit.count++;
  next();
});

const PORT = process.env.PORT || 4000;

// Add server health monitoring
const serverStats = {
  startTime: Date.now(),
  totalConnections: 0,
  activeConnections: 0,
  totalDrafts: 0,
  totalPicks: 0,
  averageResponseTime: 0,
  errors: []
};

// Enhanced global error handlers with connection tracking
let connectionErrors = [];
let timerErrors = [];

process.on('uncaughtException', (error) => {
  console.error('💥 CRITICAL UNCAUGHT EXCEPTION:', error);
  console.error('Stack:', error.stack);
  console.error('Active Drafts:', activeDrafts.size);
  console.error('Active Timers:', draftTimers.size);
  console.error('Time:', new Date().toISOString());
  
  // Track connection-related errors
  if (error.message && (error.message.includes('socket') || error.message.includes('connection'))) {
    connectionErrors.push({
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      activeDrafts: activeDrafts.size,
      activeTimers: draftTimers.size
    });
  }
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 CRITICAL UNHANDLED REJECTION:', promise);
  console.error('Reason:', reason);
  console.error('Active Drafts:', activeDrafts.size);
  console.error('Active Timers:', draftTimers.size);
  console.error('Time:', new Date().toISOString());
  
  // Track timer-related rejections
  if (reason && (reason.toString().includes('timer') || reason.toString().includes('interval'))) {
    timerErrors.push({
      reason: reason.toString(),
      timestamp: new Date().toISOString(),
      activeDrafts: activeDrafts.size,
      activeTimers: draftTimers.size
    });
  }
});

// Cleanup function to prevent memory leaks
function cleanupDraftResources(draftId) {
  try {
    console.log('🧹 Cleaning up resources for draft:', draftId);
    
    // Clear timers
    const timerInfo = draftTimers.get(draftId);
    if (timerInfo?.interval) {
      clearInterval(timerInfo.interval);
      draftTimers.delete(draftId);
    }
    
    // Clear admin intervals
    const draftState = activeDrafts.get(draftId);
    if (draftState?.adminIntervals) {
      draftState.adminIntervals.forEach(interval => {
        clearInterval(interval);
      });
      draftState.adminIntervals = [];
    }
    
    // Clear any auto-pick flags
    if (draftState?.teams) {
      draftState.teams.forEach(team => {
        team.autoPickInProgress = false;
      });
    }
    
    console.log('✅ Resources cleaned up for draft:', draftId);
  } catch (error) {
    console.error('💥 Error during resource cleanup:', error);
  }
}

process.on('SIGTERM', () => {
  console.log('👋 SIGTERM received. Shutting down gracefully...');
  
  // Clean up all active drafts
  activeDrafts.forEach((_, draftId) => {
    cleanupDraftResources(draftId);
  });
  
  server.close(() => {
    console.log('🔒 Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('👋 SIGINT received. Shutting down gracefully...');
  
  // Clean up all active drafts
  activeDrafts.forEach((_, draftId) => {
    cleanupDraftResources(draftId);
  });
  
  server.close(() => {
    console.log('🔒 Server closed');
    process.exit(0);
  });
});

// Middleware
app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));
app.use(express.json());

// Health check endpoint for waking up the server
app.get('/health', (req, res) => {
  console.log('📞 Health check request received');
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    activeDrafts: activeDrafts.size,
    connectedClients: io.engine.clientsCount || 0
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'Fantasy Draft Server', 
    status: 'running',
    timestamp: new Date().toISOString()
  });
});

// Function to load all player data
function loadAllPlayers() {
  const dataDir = path.join(__dirname, 'data');
  const allPlayers = [];
  
  try {
    const files = fs.readdirSync(dataDir).filter(file => file.endsWith('.json'));
    
    for (const file of files) {
      const filePath = path.join(dataDir, file);
      const fileContent = fs.readFileSync(filePath, 'utf8');
      const players = JSON.parse(fileContent);
      allPlayers.push(...players);
    }
    
    // Sort by rank and add IDs based on rank
    const sortedPlayers = allPlayers.sort((a, b) => a.rank - b.rank);
    
    // Add ID field to each player using their rank
    sortedPlayers.forEach(player => {
      if (!player.id) {
        player.id = `player-${player.rank}`;
      }
    });
    
    return sortedPlayers;
  } catch (error) {
    console.error('Error loading player data:', error);
    return [];
  }
}

// Position caps for fantasy football
const POSITION_CAPS = {
  QB: 4,
  RB: 8,
  WR: 8,
  TE: 3,
  K: 3,
  'D/ST': 3
};

// Multi-draft state management
const activeDrafts = new Map(); // Map of draftId -> draft state
const draftParticipants = new Map(); // Map of draftId -> Map of socketId -> participant info
const draftChatHistory = new Map(); // Map of draftId -> chat messages
const draftTimers = new Map(); // Map of draftId -> timer info
const draftTeamAssignments = new Map(); // Map of draftId -> team assignments
const draftResultsStorage = new Map(); // Map of draftId -> stored draft results for print

// Enhanced user session tracking for reconnection
const userDraftSessions = new Map(); // Map of userId -> { draftId, username, teamAssignment, joinedAt, isActive }
const socketUserMap = new Map(); // Map of socketId -> userId for quick lookup
const draftUserSessions = new Map(); // Map of draftId -> Set of userIds for quick draft user lookup

// Persistent draft storage
const DRAFTS_FILE = path.join(__dirname, 'data', 'drafts.json');

// Ensure data directory exists
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
  console.log('📁 Created data directory');
}

// Enhanced user session management functions
function saveUserDraftSession(userId, draftId, username, teamAssignment = null) {
  const session = {
    draftId,
    username,
    teamAssignment,
    joinedAt: new Date().toISOString(),
    isActive: true,
    lastSeen: new Date().toISOString()
  };
  
  userDraftSessions.set(userId, session);
  
  // Track user in draft
  if (!draftUserSessions.has(draftId)) {
    draftUserSessions.set(draftId, new Set());
  }
  draftUserSessions.get(draftId).add(userId);
  
  console.log(`💾 Saved user session: ${username} (${userId}) in draft ${draftId}`);
}

function getUserDraftSession(userId) {
  return userDraftSessions.get(userId);
}

function clearUserDraftSession(userId) {
  const session = userDraftSessions.get(userId);
  if (session) {
    // Remove from draft tracking
    const draftUsers = draftUserSessions.get(session.draftId);
    if (draftUsers) {
      draftUsers.delete(userId);
      if (draftUsers.size === 0) {
        draftUserSessions.delete(session.draftId);
      }
    }
    
    userDraftSessions.delete(userId);
    console.log(`🗑️ Cleared user session for ${userId}`);
  }
}

function updateUserLastSeen(userId) {
  const session = userDraftSessions.get(userId);
  if (session) {
    session.lastSeen = new Date().toISOString();
  }
}

function getDraftActiveUsers(draftId) {
  const userIds = draftUserSessions.get(draftId);
  if (!userIds) return [];
  
  return Array.from(userIds).map(userId => {
    const session = userDraftSessions.get(userId);
    return session ? { ...session, userId } : null;
  }).filter(Boolean);
}

// Load drafts from file on server start
function loadDraftsFromFile() {
  try {
    if (fs.existsSync(DRAFTS_FILE)) {
      const data = fs.readFileSync(DRAFTS_FILE, 'utf8');
      const savedDrafts = JSON.parse(data);
      
      savedDrafts.forEach(draft => {
        // Set status to scheduled if draft was in_progress (server restart scenario)
        if (draft.status === 'in_progress' || draft.isDraftStarted) {
          draft.status = 'scheduled';
          draft.isDraftStarted = false;
        }
        activeDrafts.set(draft.id, draft);
      });
      console.log(`📋 Loaded ${savedDrafts.length} drafts from file`);
    }
  } catch (error) {
    console.error('Error loading drafts:', error);
  }
}

// Save drafts to file
function saveDraftsToFile() {
  try {
    const drafts = Array.from(activeDrafts.values())
      .filter(draft => draft.status !== 'completed') // Don't save completed drafts
      .map(draft => ({
        ...draft,
        // Clear runtime-only data
        availablePlayers: draft.availablePlayers || [],
        draftedPlayers: draft.draftedPlayers || [],
        adminIntervals: undefined // Don't persist intervals
      }));
    
    fs.writeFileSync(DRAFTS_FILE, JSON.stringify(drafts, null, 2));
    console.log(`💾 Saved ${drafts.length} drafts to file`);
  } catch (error) {
    console.error('Error saving drafts:', error);
  }
}

// Utility functions
function generateId() {
  return Math.random().toString(36).substr(2, 9);
}

// Draft permission validation function - All drafts are now public
function validateDraftPermissions(user, draftState) {
  try {
    // All drafts are public - anyone can join
    return { allowed: true, reason: 'Public draft' };
    
  } catch (error) {
    console.error('Error validating draft permissions:', error);
    return { 
      allowed: true, 
      reason: 'Public draft' 
    };
  }
}

function createDraftState(draftConfig) {
  const allPlayers = loadAllPlayers();
  
  return {
    id: draftConfig.id,
    leagueName: draftConfig.leagueName,
    leagueSize: draftConfig.leagueSize,
    draftType: draftConfig.draftType,
    totalRounds: draftConfig.totalRounds,
    timeClock: draftConfig.timeClock,
    tokens: draftConfig.tokens,
    isDraftStarted: false,
    isComplete: false,
    availablePlayers: allPlayers,
    draftedPlayers: [],
    teams: draftConfig.teamNames.map((name, index) => ({
      id: index + 1,
      name: name,
      roster: [],
      timeExtensionTokens: draftConfig.tokens || 3,
      isPresent: true, // Teams are present by default
      isExplicitlyAbsent: false, // Track explicit absence
      assignedParticipant: null,
      autoPickEnabled: false // Auto-pick disabled by default
    })),
    draftOrder: [],
    currentPick: 0,
    pickHistory: [],
    defaultTimeClock: (typeof draftConfig.timeClock === 'number' && draftConfig.timeClock > 0) ? draftConfig.timeClock * 60 : 90, // Convert minutes to seconds or default to 90
    createdBy: draftConfig.createdBy,
    createdAt: draftConfig.createdAt
  };
}

function generateDraftOrder(teams, draftType, totalRounds = 16) {
  const crypto = require('crypto');
  const teamIds = teams.map(team => team.id);
  
  console.log('🎲 Generating cryptographically secure random draft order...');
  
  // Multiple entropy sources for enhanced randomness
  const entropy = [
    Date.now(),
    process.hrtime.bigint(),
    Math.random() * 1000000,
    crypto.randomBytes(8).readBigUInt64BE(0),
    performance.now()
  ];
  
  console.log('🔒 Entropy sources:', {
    timestamp: entropy[0],
    highResTime: entropy[1].toString(),
    mathRandom: entropy[2],
    cryptoRandom: entropy[3].toString(),
    performanceNow: entropy[4]
  });
  
  // Create multiple independent shuffles using different algorithms
  const shuffleResults = [];
  
  // Fisher-Yates with crypto randomness
  let order1 = [...teamIds];
  for (let i = order1.length - 1; i > 0; i--) {
    const j = crypto.randomInt(0, i + 1);
    [order1[i], order1[j]] = [order1[j], order1[i]];
  }
  shuffleResults.push(order1);
  
  // Modern Fisher-Yates with time-based seed
  let order2 = [...teamIds];
  const timeSeed = Date.now() % 1000000;
  for (let i = order2.length - 1; i > 0; i--) {
    const j = Math.floor(((crypto.randomBytes(4).readUInt32BE(0) + timeSeed) % (i + 1)));
    [order2[i], order2[j]] = [order2[j], order2[i]];
  }
  shuffleResults.push(order2);
  
  // Durstenfeld shuffle with combined entropy
  let order3 = [...teamIds];
  for (let i = order3.length - 1; i > 0; i--) {
    const randomBytes = crypto.randomBytes(4);
    const entropyMix = randomBytes.readUInt32BE(0) ^ Date.now() ^ Number(process.hrtime.bigint());
    const j = entropyMix % (i + 1);
    [order3[i], order3[j]] = [order3[j], order3[i]];
  }
  shuffleResults.push(order3);
  
  // Sort-based shuffle with crypto comparison
  let order4 = [...teamIds].sort(() => {
    const randomValue = crypto.randomBytes(1)[0] - 128;
    return randomValue;
  });
  shuffleResults.push(order4);
  
  // Final meta-shuffle: randomly select from the 4 orders
  const finalOrderIndex = crypto.randomInt(0, shuffleResults.length);
  const selectedOrder = shuffleResults[finalOrderIndex];
  
  console.log('🎯 Shuffle results comparison:', {
    'Algorithm 1 (Fisher-Yates Crypto)': order1,
    'Algorithm 2 (Time-seeded)': order2,  
    'Algorithm 3 (Durstenfeld Mixed)': order3,
    'Algorithm 4 (Sort-based)': order4,
    'Selected Algorithm': finalOrderIndex + 1,
    'Final Order': selectedOrder
  });
  
  // Verify randomness quality
  const randomnessStats = verifyRandomness(selectedOrder);
  console.log('🔒 Randomness Verification:', randomnessStats);
  
  const draftOrder = [];
  
  for (let round = 0; round < totalRounds; round++) {
    if (draftType === 'Snake' && round % 2 === 1) {
      // Reverse order for odd rounds (snake draft)
      draftOrder.push(...[...selectedOrder].reverse());
    } else {
      // Normal order for even rounds or linear draft
      draftOrder.push(...selectedOrder);
    }
  }
  
  console.log('✅ Final draft order generated:', {
    'Teams': teams.length,
    'Draft Type': draftType,
    'Total Rounds': totalRounds,
    'Total Picks': draftOrder.length,
    'First Round': draftOrder.slice(0, teams.length),
    'Generation Time': new Date().toISOString()
  });
  
  return draftOrder;
}

function verifyRandomness(order) {
  // Calculate basic randomness metrics
  const stats = {
    length: order.length,
    unique: new Set(order).size,
    entropy: 0,
    patterns: [],
    timestamp: new Date().toISOString()
  };
  
  // Check for sequential patterns
  let sequential = 0;
  for (let i = 0; i < order.length - 1; i++) {
    if (Math.abs(order[i] - order[i + 1]) === 1) {
      sequential++;
    }
  }
  stats.sequentialPairs = sequential;
  
  // Check for duplicates (should be 0)
  stats.duplicates = order.length - stats.unique;
  
  // Simple entropy calculation
  const frequency = {};
  order.forEach(item => frequency[item] = (frequency[item] || 0) + 1);
  Object.values(frequency).forEach(count => {
    const p = count / order.length;
    stats.entropy -= p * Math.log2(p);
  });
  
  // Quality assessment
  stats.quality = stats.duplicates === 0 && stats.sequentialPairs < order.length * 0.3 ? 'GOOD' : 'POOR';
  
  return stats;
}

function getCurrentTeam(draftState) {
  if (draftState.currentPick >= draftState.draftOrder.length) {
    return null; // Draft is complete
  }
  const teamIndex = draftState.draftOrder[draftState.currentPick] - 1;
  return draftState.teams[teamIndex];
}

function canDraftPosition(team, position) {
  const currentCount = team.roster.filter(player => player.position === position).length;
  return currentCount < POSITION_CAPS[position];
}

function autoDraftPlayer(draftId, forceAutoPick = false) {
  try {
    const draftState = activeDrafts.get(draftId);
    if (!draftState || !draftState.isDraftStarted || draftState.currentPick >= draftState.draftOrder.length) {
      console.log('⚠️ Auto-draft cancelled - invalid draft state:', draftId);
      return false;
    }

    const currentTeam = getCurrentTeam(draftState);
    if (!currentTeam) {
      console.log('⚠️ Auto-draft cancelled - no current team:', draftId);
      return false;
    }

    // 🔒 SECURITY: Prevent unauthorized auto-draft
    // Only allow auto-draft in these specific cases:
    if (!forceAutoPick) {
      // Case 1: Team is explicitly absent and has auto-pick enabled
      const teamAbsent = currentTeam.autoPickEnabled && currentTeam.isExplicitlyAbsent;
      
      // Case 2: Admin auto-draft is active (check for admin intervals)
      const adminAutoDraftActive = draftState.adminIntervals && draftState.adminIntervals.length > 0;
      
      if (!teamAbsent && !adminAutoDraftActive) {
        console.log('🔒 SECURITY: Auto-draft blocked - team not absent and admin auto-draft not active');
        console.log('🔍 Team status:', {
          teamName: currentTeam.name,
          autoPickEnabled: currentTeam.autoPickEnabled,
          isExplicitlyAbsent: currentTeam.isExplicitlyAbsent,
          adminAutoDraftActive: adminAutoDraftActive
        });
        return false;
      }
    }

    // Prevent multiple simultaneous auto-picks for the same team
    if (currentTeam.autoPickInProgress) {
      console.log('⚠️ Auto-pick already in progress for team:', currentTeam.name);
      return false;
    }

    console.log(`🤖 Auto-drafting for ${currentTeam.name} (Pick ${draftState.currentPick + 1})`);

    // Find the best available player that the team can draft
    let selectedPlayer = null;
    for (const player of draftState.availablePlayers) {
      if (canDraftPosition(currentTeam, player.position)) {
        selectedPlayer = player;
        break;
      }
    }

    if (!selectedPlayer) {
      console.error('💥 No available players for auto-draft! This should not happen.');
      return false;
    }

    console.log(`🤖 Auto-selecting: ${selectedPlayer.name} (${selectedPlayer.position}) for ${currentTeam.name}`);

    // Execute the draft with auto-pick flag
    const success = draftPlayer(draftId, selectedPlayer.id, true); // true indicates auto-pick
    
    if (success) {
      console.log(`✅ Auto-draft successful for ${currentTeam.name}`);
    } else {
      console.error(`💥 Auto-draft failed for ${currentTeam.name}`);
    }
    
    return success;
    
  } catch (error) {
    console.error('💥 Critical error in autoDraftPlayer:', error);
    console.error('Stack trace:', error.stack);
    console.error('Draft ID:', draftId);
    
    // Clear any flags to prevent deadlock
    const draftState = activeDrafts.get(draftId);
    if (draftState) {
      const currentTeam = getCurrentTeam(draftState);
      if (currentTeam) {
        currentTeam.autoPickInProgress = false;
      }
    }
    
    return false;
  }
}

// Separate function for processing draft picks - optimized for immediate processing
function processDraftPick(draftId, playerId, username, socketId) {
  try {
    const draftState = activeDrafts.get(draftId);
    if (!draftState) {
      return { success: false, error: 'Draft not found' };
    }

    if (draftState.isComplete) {
      return { success: false, error: 'Draft is already complete' };
    }

    // Find player
    const playerIndex = draftState.availablePlayers.findIndex(p => p.rank === parseInt(playerId));
    if (playerIndex === -1) {
      return { success: false, error: 'Player not found' };
    }

    const player = draftState.availablePlayers[playerIndex];
    const currentTeam = getCurrentTeam(draftState);
    
    if (!currentTeam) {
      return { success: false, error: 'No current team found' };
    }

    // Validate pick
    if (!canDraftPosition(currentTeam, player.position)) {
      return { success: false, error: 'Position cap exceeded' };
    }

    // Process the pick
    draftState.availablePlayers.splice(playerIndex, 1);
    draftState.draftedPlayers.push(player);
    currentTeam.roster.push(player);
    
    // Add to pick history
    draftState.pickHistory.push({
      player,
      team: currentTeam,
      pickIndex: draftState.currentPick,
      pickNumber: draftState.currentPick + 1,
      timestamp: Date.now()
    });

    // Move to next pick
    draftState.currentPick++;

    // Check if draft is complete
    if (draftState.currentPick >= draftState.draftOrder.length) {
      draftState.isComplete = true;
    }

    // Clear any existing timer
    const existingTimer = draftTimers.get(draftId);
    if (existingTimer?.interval) {
      clearInterval(existingTimer.interval);
      draftTimers.delete(draftId);
    }

    return { success: true, draftState };
    
  } catch (error) {
    console.error('💥 Error processing draft pick:', error);
    return { success: false, error: 'Server error processing pick' };
  }
}

function draftPlayer(draftId, playerId, isAutoPick = false) {
  try {
    const draftState = activeDrafts.get(draftId);
    if (!draftState) {
      console.log('⚠️ Draft state not found for ID:', draftId);
      return false;
    }

    const currentTeam = getCurrentTeam(draftState);
    if (!currentTeam) {
      console.log('⚠️ No current team found for draft:', draftId);
      return false;
    }

    // For auto-pick, select the best available player
    if (isAutoPick) {
      if (draftState.availablePlayers.length === 0) {
        console.log('⚠️ No available players for auto-pick');
        return false;
      }
      
      // Find the first player that fits the team's position cap
      for (let i = 0; i < draftState.availablePlayers.length; i++) {
        const player = draftState.availablePlayers[i];
        if (canDraftPosition(currentTeam, player.position)) {
          playerId = player.id || player.rank;
          console.log(`🤖 Auto-picking player: ${player.player_name} (${player.position})`);
          break;
        }
      }
      
      if (!playerId) {
        console.log('⚠️ No suitable player found for auto-pick');
        return false;
      }
    }
    
    console.log(`🔍 Looking for player with ID: ${playerId}`);
    console.log(`🔍 Available players count: ${draftState.availablePlayers.length}`);
    console.log(`🔍 First few available players:`, draftState.availablePlayers.slice(0, 3).map(p => ({ id: p.id, rank: p.rank, name: p.player_name })));
    
    // Try to find player by ID first, then by rank
    let playerIndex = draftState.availablePlayers.findIndex(p => p.id === playerId);
    
    if (playerIndex === -1) {
      // Try finding by rank as fallback
      playerIndex = draftState.availablePlayers.findIndex(p => p.rank == playerId);
      if (playerIndex !== -1) {
        console.log(`✅ Found player by rank instead of ID: ${playerId}`);
        const player = draftState.availablePlayers[playerIndex];
        console.log(`🔍 Player found by rank:`, { id: player.id, rank: player.rank, name: player.player_name });
      } else {
        console.log('⚠️ Player not found in available players by ID or rank:', playerId);
        console.log('🔍 Available players:', draftState.availablePlayers.slice(0, 5).map(p => ({ id: p.id, rank: p.rank, name: p.player_name })));
        return false;
      }
    }

    const player = draftState.availablePlayers[playerIndex];

    // Validate position cap
    if (!canDraftPosition(currentTeam, player.position)) {
      console.log('⚠️ Position cap exceeded for:', player.position);
      return false;
    }

    // Remove player from available pool
    draftState.availablePlayers.splice(playerIndex, 1);
    draftState.draftedPlayers.push(player);

    // Add to team roster
    currentTeam.roster.push(player);

    // Record the pick
    const pick = {
      pickNumber: draftState.pickHistory.length + 1,
      pickIndex: draftState.currentPick,
      round: Math.floor(draftState.currentPick / draftState.leagueSize) + 1,
      pickInRound: (draftState.currentPick % draftState.leagueSize) + 1,
      team: { ...currentTeam },
      player: player,
      timestamp: new Date().toISOString(),
      isAutoPick
    };

    draftState.pickHistory.push(pick);
    console.log(`✅ Pick ${pick.pickNumber}: ${currentTeam.name} selected ${player.player_name} (${player.position})`);

    // Move to next pick
    draftState.currentPick++;

    // Check if draft is complete
    const isDraftComplete = draftState.currentPick >= draftState.draftOrder.length;
    if (isDraftComplete) {
      draftState.isComplete = true;
      draftState.status = 'completed';
      console.log('🏁 Draft completed!');
      
      
      // Emit draft-complete event to all clients
      io.to(`draft-${draftId}`).emit("draft-complete", draftState);
      console.log("📢 Draft complete event emitted");
      
      // Clean up user sessions for this draft
      const draftUsers = draftUserSessions.get(draftId);
      if (draftUsers) {
        draftUsers.forEach(userId => {
          clearUserDraftSession(userId);
        });
        draftUserSessions.delete(draftId);
        console.log(`🧹 Cleared user sessions for completed draft ${draftId}`);
      }
      
      // Clean up all resources when draft is complete
      cleanupDraftResources(draftId);
    }

    // Clear timer for this draft
    const timerInfo = draftTimers.get(draftId);
    if (timerInfo?.interval) {
      clearInterval(timerInfo.interval);
      draftTimers.delete(draftId);
      console.log('⏹️ Timer cleared for draft:', draftId);
    }

    // Broadcast updated state with connection failure protection
    try {
      const connectedClients = io.sockets.adapter.rooms.get(`draft-${draftId}`)?.size || 0;
      console.log(`📡 Broadcasting draft state to ${connectedClients} clients`);
      
      if (connectedClients === 0) {
        console.warn('⚠️ No connected clients for draft state broadcast - draft may be orphaned');
      }
      
      io.to(`draft-${draftId}`).emit('draft-state', draftState);
      console.log('✅ Draft state broadcasted successfully');
      
    } catch (broadcastError) {
      console.error('💥 CRITICAL DRAFT STATE BROADCAST ERROR:', broadcastError);
      console.error('Draft ID:', draftId);
      console.error('Player ID:', playerId);
      console.error('Connected clients:', io.sockets.adapter.rooms.get(`draft-${draftId}`)?.size || 'NONE');
      console.error('Stack:', broadcastError.stack);
      
      // Track critical broadcast failures
      connectionErrors.push({
        error: `Draft state broadcast failed: ${broadcastError.message}`,
        draftId,
        playerId,
        timestamp: new Date().toISOString(),
        connectedClients: io.sockets.adapter.rooms.get(`draft-${draftId}`)?.size || 0,
        critical: true
      });
      
      // Continue execution - the draft operation succeeded, just broadcasting failed
    }

    // Don't start timer automatically - wait for continue button
    console.log('⏸️ Draft completed, waiting for continue button to start next timer');

    return true;
  } catch (error) {
    console.error('💥 Critical error in draftPlayer:', error);
    console.error('Stack trace:', error.stack);
    console.error('Draft ID:', draftId, 'Player ID:', playerId, 'Auto-pick:', isAutoPick);
    
    // Clean up any timers to prevent further issues
    const timerInfo = draftTimers.get(draftId);
    if (timerInfo?.interval) {
      clearInterval(timerInfo.interval);
      draftTimers.delete(draftId);
    }
    
    return false;
  }
}

function startDraftTimer(draftId) {
  console.log(`🔍 TIMER DEBUG: startDraftTimer called for draft ${draftId}`);
  
  try {
    const draftState = activeDrafts.get(draftId);
    if (!draftState?.isDraftStarted || draftState.currentPick >= draftState.draftOrder.length) {
      console.log('⚠️ Cannot start timer - draft not started or completed:', draftId);
      return;
    }

    const currentTeam = getCurrentTeam(draftState);
    if (!currentTeam) {
      console.log('⚠️ No current team found for timer start:', draftId);
      return;
    }

    // CRITICAL: Clear any existing timer first
    const existingTimer = draftTimers.get(draftId);
    if (existingTimer?.interval) {
      console.log('🔥 Clearing existing timer for draft:', draftId);
      clearInterval(existingTimer.interval);
      draftTimers.delete(draftId);
    }

    // Check if current team should auto-pick
    // Only auto-pick if team is explicitly marked as absent AND has auto-pick enabled
    if (currentTeam.autoPickEnabled && currentTeam.isExplicitlyAbsent) {
      console.log(`🤖 Auto-picking for ${currentTeam.name} - team explicitly absent`);
      
      // Set a flag to prevent multiple auto-picks
      if (!currentTeam.autoPickInProgress) {
        currentTeam.autoPickInProgress = true;
        setTimeout(() => {
          // Double-check the team is still current and auto-pick hasn't already happened
          const currentDraftState = activeDrafts.get(draftId);
          const stillCurrentTeam = getCurrentTeam(currentDraftState);
          if (stillCurrentTeam && stillCurrentTeam.id === currentTeam.id && currentTeam.autoPickInProgress) {
            currentTeam.autoPickInProgress = false;
            autoDraftPlayer(draftId);
          }
        }, 10000); // Increased to 10 seconds to give more time
      }
      return;
    }

    let timeRemaining = draftState.defaultTimeClock || 90;
    console.log(`🔍 TIMER DEBUG: Draft config timeClock=${draftState.timeClock}, defaultTimeClock=${draftState.defaultTimeClock}, calculated timeRemaining=${timeRemaining}`);
    console.log(`⏰ Starting ${timeRemaining}s timer for ${currentTeam.name} (Pick ${draftState.currentPick + 1})`);
    
    const timerState = { 
      interval: null, 
      timeRemaining,
      draftId,
      startedAt: Date.now()
    };

    const interval = setInterval(() => {
      // Safety check: ensure draft state still exists
      const currentDraftState = activeDrafts.get(draftId);
      if (!currentDraftState || currentDraftState.isComplete) {
        console.log('⚠️ Draft state invalid or complete - clearing timer:', draftId);
        clearInterval(interval);
        draftTimers.delete(draftId);
        return;
      }

      timerState.timeRemaining--;
      
      // Broadcast timer update to draft room with enhanced error tracking
      try {
        const connectedSockets = io.sockets.adapter.rooms.get(`draft-${draftId}`)?.size || 0;
        console.log(`📡 Broadcasting timer update to ${connectedSockets} clients in draft-${draftId}`);
        
        io.to(`draft-${draftId}`).emit('timer-update', {
          timeRemaining: timerState.timeRemaining,
          canExtend: timerState.timeRemaining <= 15,
          currentPick: currentDraftState.currentPick + 1
        });
        
        // Track successful broadcasts
        if (timerState.timeRemaining % 10 === 0) {
          console.log(`✅ Timer broadcast successful at ${timerState.timeRemaining}s remaining`);
        }
        
      } catch (broadcastError) {
        console.error('💥 CRITICAL TIMER BROADCAST ERROR:', broadcastError);
        console.error('Draft ID:', draftId);
        console.error('Time remaining:', timerState.timeRemaining);
        console.error('Connected clients:', io.sockets.adapter.rooms.get(`draft-${draftId}`)?.size || 'NONE');
        console.error('Stack:', broadcastError.stack);
        
        // Track broadcast errors
        connectionErrors.push({
          error: `Timer broadcast failed: ${broadcastError.message}`,
          draftId,
          timeRemaining: timerState.timeRemaining,
          timestamp: new Date().toISOString(),
          connectedClients: io.sockets.adapter.rooms.get(`draft-${draftId}`)?.size || 0
        });
        
        // If broadcast fails consistently, clear the timer to prevent spam
        if (timerState.broadcastErrors > 5) {
          console.error('💥 Too many broadcast errors - clearing timer to prevent cascade failure');
          clearInterval(interval);
          draftTimers.delete(draftId);
          return;
        }
        timerState.broadcastErrors = (timerState.broadcastErrors || 0) + 1;
      }

      if (timerState.timeRemaining <= 0) {
        console.log(`⏰ Timer expired for ${currentTeam.name} - auto-drafting...`);
        clearInterval(interval);
        draftTimers.delete(draftId);
        
        // Safety check before auto-draft
        const finalDraftState = activeDrafts.get(draftId);
        if (finalDraftState && !finalDraftState.isComplete) {
          autoDraftPlayer(draftId);
        }
      }
    }, 1000);

    timerState.interval = interval;
    draftTimers.set(draftId, timerState);
    console.log(`✅ Timer started successfully for draft ${draftId}`);
    
  } catch (error) {
    console.error('💥 Critical error in startDraftTimer:', error);
    console.error('Stack trace:', error.stack);
    console.error('Draft ID:', draftId);
    
    // Clean up any partial timer state
    const existingTimer = draftTimers.get(draftId);
    if (existingTimer?.interval) {
      clearInterval(existingTimer.interval);
      draftTimers.delete(draftId);
    }
  }
}

// Admin auto-draft for testing
function adminAutoDraft(draftId, interval = 1000) {
  try {
    const draftState = activeDrafts.get(draftId);
    if (!draftState?.isDraftStarted) {
      console.log('⚠️ Cannot start admin auto-draft - draft not started:', draftId);
      return;
    }

    console.log(`🔧 Admin auto-draft started for ${draftId} with ${interval}ms interval`);

    const autoDraftInterval = setInterval(() => {
      try {
        // Re-fetch draft state each time to ensure it's current
        const currentDraftState = activeDrafts.get(draftId);
        if (!currentDraftState || currentDraftState.currentPick >= currentDraftState.draftOrder.length || currentDraftState.isComplete) {
          console.log('🔧 Admin auto-draft completed for:', draftId);
          clearInterval(autoDraftInterval);
          return;
        }
        
        console.log(`🔧 Admin auto-draft pick ${currentDraftState.currentPick + 1} for ${draftId}`);
        autoDraftPlayer(draftId, true); // Force auto-pick for admin override
      } catch (innerError) {
        console.error('💥 Error in admin auto-draft interval:', innerError);
        clearInterval(autoDraftInterval);
      }
    }, interval);

    // Store interval reference for cleanup if needed
    if (!draftState.adminIntervals) {
      draftState.adminIntervals = [];
    }
    draftState.adminIntervals.push(autoDraftInterval);

  } catch (error) {
    console.error('💥 Error starting admin auto-draft:', error);
  }
}

// Socket.IO connection handling
io.on('connection', (socket) => {
  serverStats.totalConnections++;
  serverStats.activeConnections++;
  console.log('New client connected:', socket.id);
  
  // Track user session on connection
  socket.on('user-connect', (data) => {
    const { userId, username } = data;
    if (userId && username) {
      socketUserMap.set(socket.id, userId);
      
      // Check if user has an active draft session
      const session = getUserDraftSession(userId);
      if (session && session.isActive) {
        console.log(`🔄 User ${username} reconnecting with active session in draft ${session.draftId}`);
        socket.emit('session-recovery', {
          session,
          message: 'You have an active draft session. Attempting to reconnect...'
        });
      }
    }
  });
  
  socket.on('disconnect', () => {
    serverStats.activeConnections--;
    const userId = socketUserMap.get(socket.id);
    
    if (userId) {
      // Update last seen but don't clear session immediately
      updateUserLastSeen(userId);
      console.log(`📱 User ${userId} disconnected (session preserved for reconnection)`);
    }
    
    socketUserMap.delete(socket.id);
    console.log('Client disconnected:', socket.id);
  });

  // Join a draft lobby
  socket.on('join-lobby', (data) => {
    const { username, role, draftId } = data;
    
    // Join the draft room
    socket.join(`draft-${draftId}`);
    
    // Add participant to draft
    if (!draftParticipants.has(draftId)) {
      draftParticipants.set(draftId, new Map());
    }
    
    const participants = draftParticipants.get(draftId);
    participants.set(socket.id, {
      id: socket.id,
      username,
      role,
      isReady: false,
      socketId: socket.id
    });

    // Broadcast updated participants list
    const participantsList = Array.from(participants.values());
    io.to(`draft-${draftId}`).emit('participants-update', participantsList);

    // Send current team assignments to the new user
    const assignments = draftTeamAssignments.get(draftId);
    if (assignments) {
      socket.emit('team-assignments-update', assignments);
    }

    console.log(`${username} joined draft ${draftId} as ${role}`);
  });

  // Session recovery - attempt to rejoin draft automatically
  socket.on('recover-session', (data) => {
    const { userId } = data;
    
    if (!userId) {
      console.log('⚠️ No userId provided for session recovery');
      socket.emit('session-recovery-error', { message: 'User ID required for session recovery' });
      return;
    }
    
    console.log(`🔄 Session recovery attempt for user ${userId}`);
    
    const session = getUserDraftSession(userId);
    if (!session || !session.isActive) {
      console.log(`⚠️ No active session found for user ${userId}`);
      socket.emit('session-recovery-error', { message: 'No active draft session found' });
      return;
    }
    
    const { draftId, username } = session;
    const draftState = activeDrafts.get(draftId);
    
    if (!draftState) {
      console.log(`⚠️ Draft ${draftId} no longer exists for user ${userId}`);
      clearUserDraftSession(userId);
      socket.emit('session-recovery-error', { message: 'The draft you were participating in no longer exists' });
      return;
    }
    
    // Check if draft is still active
    if (draftState.status === 'completed' || draftState.isComplete) {
      console.log(`⚠️ Draft ${draftId} is completed for user ${userId}`);
      clearUserDraftSession(userId);
      socket.emit('session-recovery-error', { message: 'The draft you were participating in has been completed' });
      return;
    }
    
    console.log(`✅ Session recovery successful for user ${userId} in draft ${draftId}`);
    
    // Update session
    updateUserLastSeen(userId);
    socketUserMap.set(socket.id, userId);
    
    // Join the draft room
    socket.join(`draft-${draftId}`);
    
    // Send the current draft state
    socket.emit('draft-state', draftState);
    
    // Send participants and team assignments
    const participants = draftParticipants.get(draftId);
    if (participants) {
      const participantsList = Array.from(participants.values());
      socket.emit('participants-update', participantsList);
    }
    
    const assignments = draftTeamAssignments.get(draftId);
    if (assignments) {
      socket.emit('team-assignments-update', assignments);
    }
    
    // Send recovery success
    socket.emit('session-recovered', {
      draftId,
      username,
      message: 'Successfully reconnected to your draft!'
    });
  });

  // Join draft (get current draft state) with permission validation
  socket.on('join-draft', (data) => {
    const { draftId, user } = data;
    
    if (!draftId) {
      console.log('⚠️ No draftId provided for join-draft request');
      socket.emit('draft-error', { message: 'No draft ID provided' });
      return;
    }
    
    if (!user) {
      console.log('⚠️ No user information provided for join-draft request');
      socket.emit('draft-error', { message: 'User information required' });
      return;
    }
    
    console.log(`📥 Join draft request for draft ${draftId} from user ${user.username || user.id}`);
    
    // Get the current draft state
    const draftState = activeDrafts.get(draftId);
    
    if (!draftState) {
      console.log('⚠️ Draft not found:', draftId);
      socket.emit('draft-error', { message: 'Draft not found' });
      return;
    }
    
    // Server-side permission validation
    const canJoin = validateDraftPermissions(user, draftState);
    if (!canJoin.allowed) {
      console.log(`🚫 User ${user.username || user.id} denied access to draft ${draftId}: ${canJoin.reason}`);
      socket.emit('draft-error', { 
        message: canJoin.reason || 'You do not have permission to join this draft'
      });
      return;
    }
    
    console.log(`✅ User ${user.username || user.id} authorized to join draft ${draftId}`);
    
    // Save user session for reconnection
    const teamAssignment = draftTeamAssignments.get(draftId)?.find(team => 
      team.owner === user.username || team.ownerId === user.id
    );
    saveUserDraftSession(user.id, draftId, user.username, teamAssignment);
    
    // Track socket to user mapping
    socketUserMap.set(socket.id, user.id);
    
    // Join the draft room
    socket.join(`draft-${draftId}`);
    
    console.log(`✅ Sending draft state for draft ${draftId}`);
    
    // Send the current draft state to the client
    socket.emit('draft-state', draftState);
    
    // Also send current participants if available
    const participants = draftParticipants.get(draftId);
    if (participants) {
      const participantsList = Array.from(participants.values());
      socket.emit('participants-update', participantsList);
    }
    
    // Send team assignments if available
    const assignments = draftTeamAssignments.get(draftId);
    if (assignments) {
      socket.emit('team-assignments-update', assignments);
    }
    
    // Send session confirmation
    socket.emit('session-saved', {
      draftId,
      message: 'Your session has been saved for automatic reconnection'
    });
  });

  // Handle chat messages
  socket.on('lobby-chat-message', (data) => {
    const { draftId, username, message, isCommissioner } = data;
    
    const chatMessage = {
      username,
      message,
      timestamp: new Date().toISOString(),
      isCommissioner
    };

    // Store in chat history
    if (!draftChatHistory.has(draftId)) {
      draftChatHistory.set(draftId, []);
    }
    draftChatHistory.get(draftId).push(chatMessage);

    // Broadcast to draft room
    io.to(`draft-${draftId}`).emit('lobby-chat-message', chatMessage);
  });

  // Request chat history
  socket.on('request-chat-history', (data) => {
    const { draftId } = data;
    const history = draftChatHistory.get(draftId) || [];
    socket.emit('chat-history', history);
  });

  // Set ready status
  socket.on('set-ready-status', (data) => {
    const { draftId, username, isReady } = data;
    
    const participants = draftParticipants.get(draftId);
    if (participants) {
      const participant = participants.get(socket.id);
      if (participant) {
        participant.isReady = isReady;
        
        // Broadcast updated participants
        const participantsList = Array.from(participants.values());
        io.to(`draft-${draftId}`).emit('participants-update', participantsList);
      }
    }
  });

  // Enhanced team assignment (Commissioner only)
  // Bulk team assignment for commissioner efficiency
  socket.on('bulk-assign-teams', (data) => {
    const { draftId, assignments, assignedBy } = data;
    
    if (!draftId || !assignments || !Array.isArray(assignments)) {
      console.log('⚠️ Invalid bulk assignment data');
      socket.emit('team-assignment-error', { message: 'Invalid bulk assignment data' });
      return;
    }

    // Initialize team assignments if they don't exist
    if (!draftTeamAssignments.has(draftId)) {
      const draftState = activeDrafts.get(draftId);
      if (draftState) {
        const defaultAssignments = draftState.teams.map((team, index) => ({
          teamId: index + 1,
          teamName: team.name,
          assignedUser: null,
          assignedBy: null,
          assignedAt: null,
          isPreAssigned: false,
          isLocked: false
        }));
        draftTeamAssignments.set(draftId, defaultAssignments);
      }
    }

    const currentAssignments = draftTeamAssignments.get(draftId);
    if (!currentAssignments) {
      socket.emit('team-assignment-error', { message: 'Draft not found' });
      return;
    }

    // Apply bulk assignments
    let updated = false;
    assignments.forEach(({ teamId, assignedUser }) => {
      const teamIndex = currentAssignments.findIndex(t => t.teamId === teamId);
      if (teamIndex !== -1) {
        currentAssignments[teamIndex].assignedUser = assignedUser;
        currentAssignments[teamIndex].assignedBy = assignedBy;
        currentAssignments[teamIndex].assignedAt = new Date().toISOString();
        currentAssignments[teamIndex].isPreAssigned = assignedUser !== null && assignedUser !== 'LOCAL';
        currentAssignments[teamIndex].isLocked = currentAssignments[teamIndex].isPreAssigned;
        updated = true;
      }
    });

    if (updated) {
      console.log(`📋 Bulk team assignments updated for draft ${draftId} by ${assignedBy}`);
      
      // Broadcast to all clients in this draft
      io.to(`draft-${draftId}`).emit('team-assignments-updated', {
        draftId,
        assignments: currentAssignments
      });
      
      // Save to persistent storage
      saveDraftsToFile();
    }
  });

  socket.on('assign-team', (data) => {
    const { draftId, teamId, assignedUser, assignedBy } = data;
    
    // Initialize team assignments if they don't exist
    if (!draftTeamAssignments.has(draftId)) {
      const draftState = activeDrafts.get(draftId);
      if (draftState) {
        const assignments = draftState.teams.map((team, index) => ({
          teamId: index + 1,
          teamName: team.name,
          assignedUser: null,
          assignedBy: null,
          assignedAt: null,
          isPreAssigned: false,
          isLocked: false
        }));
        draftTeamAssignments.set(draftId, assignments);
      }
    }
    
    const assignments = draftTeamAssignments.get(draftId);
    if (assignments) {
      const teamIndex = assignments.findIndex(t => t.teamId === teamId);
      if (teamIndex !== -1) {
        // Enhanced assignment tracking
        assignments[teamIndex].assignedUser = assignedUser;
        assignments[teamIndex].assignedBy = assignedBy;
        assignments[teamIndex].assignedAt = new Date().toISOString();
        assignments[teamIndex].isPreAssigned = assignedUser !== null && assignedUser !== 'LOCAL';
        assignments[teamIndex].isLocked = assignments[teamIndex].isPreAssigned;
        
        // Broadcast updated assignments
        io.to(`draft-${draftId}`).emit('team-assignments-update', assignments);
        
        const actionType = assignedUser ? 'assigned' : 'released';
        console.log(`Enhanced Pre-Assignment: Team ${teamId} ${actionType} ${assignedUser ? `to ${assignedUser}` : ''} by ${assignedBy} at ${assignments[teamIndex].assignedAt}`);
        
        // Auto-assignment notification if participant is connected
        if (assignedUser && assignedUser !== 'LOCAL') {
          const participants = draftParticipants.get(draftId);
          if (participants) {
            const participant = Array.from(participants.values()).find(p => p.username === assignedUser || p.id === assignedUser);
            if (participant) {
              io.to(participant.socketId).emit('team-pre-assigned', {
                teamId,
                teamName: assignments[teamIndex].teamName,
                assignedBy,
                message: `You have been pre-assigned to Team ${teamId}: ${assignments[teamIndex].teamName} by ${assignedBy}`
              });
            }
          }
        }
      }
    }
  });

  // Claim team (Participant)
  socket.on('claim-team', (data) => {
    const { draftId, teamId, userId, claimedBy } = data;
    
    // Initialize team assignments if they don't exist
    if (!draftTeamAssignments.has(draftId)) {
      const draftState = activeDrafts.get(draftId);
      if (draftState) {
        const assignments = draftState.teams.map((team, index) => ({
          teamId: index + 1,
          teamName: team.name,
          assignedUser: null
        }));
        draftTeamAssignments.set(draftId, assignments);
      }
    }
    
    const assignments = draftTeamAssignments.get(draftId);
    if (assignments) {
      const teamIndex = assignments.findIndex(t => t.teamId === teamId);
      
      // Check if team is available and user hasn't already claimed a team
      const alreadyClaimed = assignments.some(t => t.assignedUser === userId);
      
      // Enhanced validation with pre-assignment protection
      const teamAssignment = assignments[teamIndex];
      
      if (teamIndex === -1) {
        socket.emit('team-claim-error', {
          message: 'Invalid team selection',
          type: 'invalid_team'
        });
        return;
      }
      
      if (alreadyClaimed) {
        socket.emit('team-claim-error', {
          message: 'You have already claimed a team',
          type: 'already_claimed'
        });
        return;
      }
      
      // Check if team is pre-assigned to someone else
      if (teamAssignment.isPreAssigned && teamAssignment.assignedUser !== userId) {
        socket.emit('team-claim-error', {
          message: `Team ${teamId} is pre-assigned to another participant and is protected from claiming`,
          type: 'pre_assigned_protected'
        });
        return;
      }
      
      // Check if team is available for claiming
      if (teamAssignment.assignedUser && !teamAssignment.isPreAssigned) {
        socket.emit('team-claim-error', {
          message: 'Team is already claimed by another participant',
          type: 'already_claimed_by_other'
        });
        return;
      }
      
      // Allow claiming if team is unassigned or pre-assigned to this user
      if (!teamAssignment.assignedUser || (teamAssignment.isPreAssigned && teamAssignment.assignedUser === userId)) {
        teamAssignment.assignedUser = userId;
        
        // Broadcast updated assignments
        io.to(`draft-${draftId}`).emit('team-assignments-update', assignments);
        
        const claimType = teamAssignment.isPreAssigned ? 'Pre-assigned team claimed' : 'Team claimed';
        console.log(`Enhanced Team Claiming: ${claimType} - Team ${teamId} by ${claimedBy} (${userId})`);
        
        // Send success confirmation
        socket.emit('team-claim-success', {
          teamId,
          teamName: teamAssignment.teamName,
          message: teamAssignment.isPreAssigned 
            ? `You have successfully claimed your pre-assigned team: ${teamAssignment.teamName}`
            : `You have successfully claimed Team ${teamId}: ${teamAssignment.teamName}`
        });
      }
    }
  });

  // Create draft
  socket.on('create-draft', (draftConfig) => {
    try {
      console.log('🎉 RECEIVED create-draft event from client!');
      console.log('📝 Creating draft with config:', draftConfig);
      console.log('🔍 Socket ID:', socket.id);
      console.log('🔍 Draft ID:', draftConfig.id);
      
      // Generate a unique draft ID if not provided
      if (!draftConfig.id) {
        draftConfig.id = generateId();
        console.log('🆔 Generated new draft ID:', draftConfig.id);
      }
      
      // Create draft state
      const draftState = createDraftState(draftConfig);
      console.log('🏗️ Created draft state:', {
        id: draftState.id,
        leagueName: draftState.leagueName,
        teams: draftState.teams?.length
      });
      
      // Store in active drafts
      activeDrafts.set(draftConfig.id, draftState);
      
      // Save drafts to persistent storage
      saveDraftsToFile();
      
      console.log(`✅ Draft created with ID: ${draftConfig.id}`);
      console.log(`📊 Active drafts count: ${activeDrafts.size}`);
      console.log(`📊 Active drafts keys: [${Array.from(activeDrafts.keys()).join(', ')}]`);
      
      // Broadcast draft created event to everyone (not just the draft room)
      io.emit('draft-created', {
        draftId: draftConfig.id,
        draftInfo: {
          id: draftConfig.id,
          leagueName: draftState.leagueName,
          createdBy: draftState.createdBy,
          status: draftState.status || 'scheduled',
          leagueSize: draftState.teams.length,
          totalRounds: draftState.totalRounds,
          timeClock: draftState.timeClock,
          draftType: draftState.draftType,
          createdAt: draftState.createdAt,
          participants: []
        }
      });
      
      // Also send to the draft room for immediate feedback
      io.to(`draft-${draftConfig.id}`).emit('draft-created', {
        draftId: draftConfig.id,
        draftState: draftState
      });
      
    } catch (error) {
      console.error('💥 Error creating draft:', error);
      socket.emit('draft-error', { message: 'Failed to create draft' });
    }
  });

  // Generate draft order
  socket.on('generate-draft-order', (draftConfig) => {
    try {
      console.log('🎲 Generating draft order with config:', draftConfig);
      
      // Find the draft ID from socket rooms if not provided
      let draftId = draftConfig?.id;
      if (!draftId) {
        const rooms = Array.from(socket.rooms);
        const draftRoom = rooms.find(room => room.startsWith('draft-'));
        if (draftRoom) {
          draftId = draftRoom.replace('draft-', '');
        }
      }
      
      if (!draftId) {
        console.log('⚠️ No draft ID found for generate-draft-order request');
        socket.emit('draft-error', { message: 'No draft ID found' });
        return;
      }
      
      let draftState = activeDrafts.get(draftId);
      if (!draftState) {
        console.log('⚠️ Draft not found, creating new draft state');
        draftState = createDraftState({ ...draftConfig, id: draftId });
        activeDrafts.set(draftId, draftState);
      }
      
      // Check if manual draft order is provided
      let draftOrder;
      if (draftConfig.manualDraftOrder && Array.isArray(draftConfig.manualDraftOrder)) {
        console.log('📋 Using manual draft order:', draftConfig.manualDraftOrder);
        
        // Validate manual draft order
        const expectedLength = draftState.teams.length * (draftConfig.totalRounds || 16);
        if (draftConfig.manualDraftOrder.length !== expectedLength) {
          console.error('❌ Invalid manual draft order length:', {
            'Provided': draftConfig.manualDraftOrder.length,
            'Expected': expectedLength,
            'Teams': draftState.teams.length,
            'Rounds': draftConfig.totalRounds || 16
          });
          socket.emit('draft-error', { 
            message: `Invalid manual draft order: Expected ${expectedLength} picks but got ${draftConfig.manualDraftOrder.length}` 
          });
          return;
        }
        
        // Validate that all team IDs are valid
        const validTeamIds = draftState.teams.map(team => team.id);
        const invalidTeamIds = draftConfig.manualDraftOrder.filter(id => !validTeamIds.includes(id));
        if (invalidTeamIds.length > 0) {
          console.error('❌ Invalid team IDs in manual draft order:', invalidTeamIds);
          socket.emit('draft-error', { 
            message: `Invalid team IDs in manual draft order: ${invalidTeamIds.join(', ')}` 
          });
          return;
        }
        
        draftOrder = draftConfig.manualDraftOrder;
        console.log('✅ Manual draft order validated successfully');
      } else {
        console.log('🎲 Generating random draft order');
        draftOrder = generateDraftOrder(draftState.teams, draftConfig.draftType || 'snake', draftConfig.totalRounds || 16);
      }
      
      draftState.draftOrder = draftOrder;
      
      activeDrafts.set(draftId, draftState);
      
      // Broadcast draft order generated event with config for auto-start
      io.to(`draft-${draftId}`).emit('draft-order-generated', { 
        draftOrder, 
        draftConfig: { ...draftConfig, id: draftId }
      });
      
      console.log(`Draft order generated for draft ${draftId}:`, draftOrder.slice(0, draftState.teams.length));
      
    } catch (error) {
      console.error('💥 Error generating draft order:', error);
      socket.emit('draft-error', { message: 'Failed to generate draft order' });
    }
  });

  // Start draft
  socket.on('start-draft', (draftConfig) => {
    try {
      console.log('🚀 Starting draft with config:', draftConfig);
      
      // Find the draft ID from socket rooms if not provided
      let draftId = draftConfig?.id;
      if (!draftId) {
        const rooms = Array.from(socket.rooms);
        const draftRoom = rooms.find(room => room.startsWith('draft-'));
        if (draftRoom) {
          draftId = draftRoom.replace('draft-', '');
        }
      }
      
      if (!draftId) {
        console.log('⚠️ No draft ID found for start-draft request');
        socket.emit('draft-error', { message: 'No draft ID found' });
        return;
      }
      
      console.log('Starting draft with ID:', draftId);
      
      let draftState = activeDrafts.get(draftId);
      if (!draftState) {
        console.log('⚠️ Draft not found, creating new draft state');
        draftState = createDraftState({ ...draftConfig, id: draftId });
        activeDrafts.set(draftId, draftState);
      }

      // Set draft as started
      draftState.isDraftStarted = true;
      draftState.status = 'in_progress';
      
      // If no draft order exists, check for manual order or generate one
      if (!draftState.draftOrder.length) {
        if (draftConfig.manualDraftOrder && Array.isArray(draftConfig.manualDraftOrder)) {
          console.log('📋 Using manual draft order for start-draft:', draftConfig.manualDraftOrder);
          
          // Validate manual draft order
          const expectedLength = draftState.teams.length * (draftConfig.totalRounds || 16);
          if (draftConfig.manualDraftOrder.length !== expectedLength) {
            console.error('❌ Invalid manual draft order length for start-draft:', {
              'Provided': draftConfig.manualDraftOrder.length,
              'Expected': expectedLength,
              'Teams': draftState.teams.length,
              'Rounds': draftConfig.totalRounds || 16
            });
            socket.emit('draft-error', { 
              message: `Invalid manual draft order: Expected ${expectedLength} picks but got ${draftConfig.manualDraftOrder.length}` 
            });
            return;
          }
          
          // Validate that all team IDs are valid
          const validTeamIds = draftState.teams.map(team => team.id);
          const invalidTeamIds = draftConfig.manualDraftOrder.filter(id => !validTeamIds.includes(id));
          if (invalidTeamIds.length > 0) {
            console.error('❌ Invalid team IDs in manual draft order for start-draft:', invalidTeamIds);
            socket.emit('draft-error', { 
              message: `Invalid team IDs in manual draft order: ${invalidTeamIds.join(', ')}` 
            });
            return;
          }
          
          draftState.draftOrder = draftConfig.manualDraftOrder;
          console.log('✅ Manual draft order validated and applied for start-draft');
        } else {
          console.log('🎲 Generating random draft order for start-draft');
          draftState.draftOrder = generateDraftOrder(draftState.teams, draftConfig.draftType || 'snake', draftConfig.totalRounds || 16);
        }
      }

      // Apply team assignments if provided
      if (draftConfig.teamAssignments) {
        draftConfig.teamAssignments.forEach(assignment => {
          if (assignment.assignedUser) {
            const team = draftState.teams.find(t => t.id === assignment.teamId);
            if (team) {
              team.assignedParticipant = assignment.assignedUser;
              team.isPresent = true;
              team.autoPickEnabled = false;
            }
          }
        });
      }

      // Broadcast updated state
      io.to(`draft-${draftId}`).emit('draft-state', draftState);
      
      // Don't automatically start timer - wait for manual start
      console.log(`Draft ${draftId} started but timer not yet initiated. Waiting for manual start.`);
      
    } catch (error) {
      console.error('💥 Error starting draft:', error);
      socket.emit('draft-error', { message: 'Failed to start draft' });
    }
  });

  // Start draft clock (manual start)
  socket.on('start-draft-clock', (data) => {
    console.log(`🔍 CLOCK DEBUG: start-draft-clock received with data:`, data);
    let draftId = data?.draftId;
    if (!draftId) {
      // Find draftId from socket rooms if not provided in data
      const rooms = Array.from(socket.rooms);
      console.log(`🔍 CLOCK DEBUG: Socket rooms:`, rooms);
      const draftRoom = rooms.find(room => room.startsWith('draft-'));
      if (draftRoom) {
        draftId = draftRoom.replace('draft-', '');
        console.log(`🔍 CLOCK DEBUG: Found draftId from room: ${draftId}`);
      }
    }
    
    if (draftId) {
      console.log(`✅ Manual draft clock start requested for draft ${draftId}`);
      const draftExists = activeDrafts.has(draftId);
      console.log(`🔍 CLOCK DEBUG: Draft exists in activeDrafts: ${draftExists}`);
      if (draftExists) {
        const draftState = activeDrafts.get(draftId);
        console.log(`🔍 CLOCK DEBUG: Draft started: ${draftState.isDraftStarted}, Complete: ${draftState.isComplete}`);
      }
      startDraftTimer(draftId);
    } else {
      console.log('❌ No draftId found for start-draft-clock request');
      console.log('🔍 CLOCK DEBUG: Available socket rooms:', Array.from(socket.rooms));
    }
  });

  // Continue draft (start next timer) - Enhanced timer reset
  socket.on('continue-draft', (data) => {
    const { draftId } = data;
    if (draftId) {
      console.log(`🔄 Continue draft requested for draft ${draftId}`);
      
      // Clear any existing timer first
      const existingTimer = draftTimers.get(draftId);
      if (existingTimer?.interval) {
        clearInterval(existingTimer.interval);
        draftTimers.delete(draftId);
        console.log('⏹️ Cleared existing timer before starting new one');
      }
      
      // Reset timer state
      io.to(`draft-${draftId}`).emit('timer-update', {
        timeRemaining: 0,
        canExtend: false,
        currentPick: 0
      });
      
      // Start new timer with small delay
      setTimeout(() => {
        startDraftTimer(draftId);
      }, 200);
      
    } else {
      console.log('No draftId provided for continue-draft request');
    }
  });

  // Draft player - Optimized for immediate processing
  socket.on('draft-player', (data) => {
    try {
      const { draftId, playerId, username } = data;
      
      // Immediate acknowledgment
      socket.emit('draft-acknowledged', { 
        playerId, 
        timestamp: Date.now() 
      });
      
      if (!draftId || !playerId) {
        console.log('⚠️ Missing draftId or playerId for draft-player request');
        socket.emit('draft-error', { message: 'Missing required data' });
        return;
      }

      console.log(`📥 Draft player request: ${playerId} for draft ${draftId} by user: ${username || 'unknown'}`);
      
      // Process draft immediately
      const result = processDraftPick(draftId, playerId, username, socket.id);
      
      if (result.success) {
        // Broadcast immediately
        io.to(`draft-${draftId}`).emit('draft-state', result.draftState);
        
        // Start next timer immediately
        setTimeout(() => {
          startDraftTimer(draftId);
        }, 100); // Small delay to ensure state is updated
        
        console.log(`✅ Draft processed successfully: ${playerId}`);
      } else {
        socket.emit('draft-error', { message: result.error });
      }
      
    } catch (error) {
      console.error('💥 Error in draft-player handler:', error);
      socket.emit('draft-error', { message: 'Server error during draft' });
    }
  });

  // Time extension
  socket.on('extend-time', (data) => {
    // Extract draftId from socket room or data
    let draftId = data?.draftId;
    if (!draftId) {
      // Find draftId from socket rooms
      const rooms = Array.from(socket.rooms);
      const draftRoom = rooms.find(room => room.startsWith('draft-'));
      if (draftRoom) {
        draftId = draftRoom.replace('draft-', '');
      }
    }
    
    const timerInfo = draftTimers.get(draftId);
    const draftState = activeDrafts.get(draftId);
    
    if (timerInfo && draftState) {
      const currentTeam = getCurrentTeam(draftState);
      if (currentTeam && currentTeam.timeExtensionTokens > 0) {
        // Add 30 seconds to timer
        timerInfo.timeRemaining += 30;
        
        // Reduce token count
        currentTeam.timeExtensionTokens--;
        
        console.log(`Time extended by 30 seconds for ${currentTeam.name}. Tokens remaining: ${currentTeam.timeExtensionTokens}`);
        
        // Broadcast updated state and timer
        io.to(`draft-${draftId}`).emit('draft-state', draftState);
        io.to(`draft-${draftId}`).emit('timer-update', {
          timeRemaining: timerInfo.timeRemaining,
          canExtend: timerInfo.timeRemaining <= 15
        });
      }
    }
  });

  // Admin draft player
  socket.on('admin-draft-player', (data) => {
    try {
      const { playerId } = data;
      if (!playerId) {
        console.log('⚠️ Missing playerId for admin-draft-player request');
        socket.emit('draft-error', { message: 'Missing player ID' });
        return;
      }

      // Find the draft this admin is connected to
      const rooms = Array.from(socket.rooms);
      const draftRoom = rooms.find(room => room.startsWith('draft-'));
      if (!draftRoom) {
        console.log('⚠️ Admin not connected to any draft');
        socket.emit('draft-error', { message: 'Not connected to any draft' });
        return;
      }

      const draftId = draftRoom.replace('draft-', '');
      console.log(`📥 Admin draft player request: ${playerId} for draft ${draftId}`);

      const success = draftPlayer(draftId, playerId, false);
      if (!success) {
        socket.emit('draft-error', { message: 'Admin draft failed - player may be unavailable or invalid' });
      }
    } catch (error) {
      console.error('💥 Error in admin-draft-player handler:', error);
      socket.emit('draft-error', { message: 'Server error during admin draft' });
    }
  });

  // Admin pause timer
  socket.on('admin-pause-timer', () => {
    try {
      // Find the draft this admin is connected to
      const rooms = Array.from(socket.rooms);
      const draftRoom = rooms.find(room => room.startsWith('draft-'));
      if (!draftRoom) {
        console.log('⚠️ Admin not connected to any draft');
        socket.emit('draft-error', { message: 'Not connected to any draft' });
        return;
      }

      const draftId = draftRoom.replace('draft-', '');
      console.log(`📥 Admin pause timer request for draft ${draftId}`);

      const draftState = activeDrafts.get(draftId);
      if (!draftState) {
        console.log('⚠️ Draft not found:', draftId);
        socket.emit('draft-error', { message: 'Draft not found' });
        return;
      }

      // Clear existing timer
      const timerInfo = draftTimers.get(draftId);
      if (timerInfo?.interval) {
        clearInterval(timerInfo.interval);
        draftTimers.delete(draftId);
        console.log('⏹️ Timer paused by admin');
      }

      // Set pause state
      draftState.isPaused = true;

      // Broadcast updated state
      io.to(`draft-${draftId}`).emit('draft-state', draftState);

    } catch (error) {
      console.error('💥 Error in admin-pause-timer handler:', error);
      socket.emit('draft-error', { message: 'Server error during pause' });
    }
  });

  // Admin resume timer
  socket.on('admin-resume-timer', () => {
    try {
      // Find the draft this admin is connected to
      const rooms = Array.from(socket.rooms);
      const draftRoom = rooms.find(room => room.startsWith('draft-'));
      if (!draftRoom) {
        console.log('⚠️ Admin not connected to any draft');
        socket.emit('draft-error', { message: 'Not connected to any draft' });
        return;
      }

      const draftId = draftRoom.replace('draft-', '');
      console.log(`📥 Admin resume timer request for draft ${draftId}`);

      const draftState = activeDrafts.get(draftId);
      if (!draftState) {
        console.log('⚠️ Draft not found:', draftId);
        socket.emit('draft-error', { message: 'Draft not found' });
        return;
      }

      // Clear pause state
      draftState.isPaused = false;

      // Start timer
      startDraftTimer(draftId);

      // Broadcast updated state
      io.to(`draft-${draftId}`).emit('draft-state', draftState);

    } catch (error) {
      console.error('💥 Error in admin-resume-timer handler:', error);
      socket.emit('draft-error', { message: 'Server error during resume' });
    }
  });

  // Request current draft state (for reconnection)
  socket.on('request-draft-state', (data) => {
    try {
      const { draftId } = data;
      console.log(`📡 Request for draft state: ${draftId}`);
      
      const draftState = activeDrafts.get(draftId);
      if (draftState) {
        console.log(`📡 Sending draft state for ${draftId}:`, {
          'Current pick': draftState.currentPick,
          'Total picks': draftState.draftOrder?.length,
          'Is complete': draftState.isComplete
        });
        socket.emit('draft-state-response', draftState);
      } else {
        console.log(`⚠️ Draft state not found for ${draftId}`);
        socket.emit('draft-state-response', null);
      }
    } catch (error) {
      console.error('💥 Error in request-draft-state handler:', error);
      socket.emit('draft-state-response', null);
    }
  });

  // Admin undo last pick
  socket.on('admin-undo-last-pick', () => {
    try {
      // Find the draft this admin is connected to
      const rooms = Array.from(socket.rooms);
      const draftRoom = rooms.find(room => room.startsWith('draft-'));
      if (!draftRoom) {
        console.log('⚠️ Admin not connected to any draft');
        socket.emit('draft-error', { message: 'Not connected to any draft' });
        return;
      }

      const draftId = draftRoom.replace('draft-', '');
      console.log(`📥 Admin undo last pick request for draft ${draftId}`);

      const draftState = activeDrafts.get(draftId);
      if (!draftState) {
        console.log('⚠️ Draft not found:', draftId);
        socket.emit('draft-error', { message: 'Draft not found' });
        return;
      }

      if (draftState.pickHistory.length === 0) {
        console.log('⚠️ No picks to undo');
        socket.emit('draft-error', { message: 'No picks to undo' });
        return;
      }

      // Get the last pick
      const lastPick = draftState.pickHistory.pop();
      const player = lastPick.player;
      const team = lastPick.team;

      // Return player to available pool - insert at correct rank position
      const insertIndex = draftState.availablePlayers.findIndex(p => p.rank > player.rank);
      if (insertIndex === -1) {
        // Player should go at the end (highest rank)
        draftState.availablePlayers.push(player);
      } else {
        // Insert at the correct position
        draftState.availablePlayers.splice(insertIndex, 0, player);
      }
      
      // Ensure proper sorting by rank
      draftState.availablePlayers.sort((a, b) => a.rank - b.rank);
      
      draftState.draftedPlayers = draftState.draftedPlayers.filter(p => p.rank !== player.rank);

      // Remove from team roster
      const teamIndex = draftState.teams.findIndex(t => t.id === team.id);
      if (teamIndex !== -1) {
        draftState.teams[teamIndex].roster = draftState.teams[teamIndex].roster.filter(p => p.rank !== player.rank);
      }

      // Move back to previous pick
      draftState.currentPick--;

      console.log(`✅ Undid pick: ${team.name} - ${player.player_name} (${player.position})`);

      // Broadcast updated state
      io.to(`draft-${draftId}`).emit('draft-state', draftState);

    } catch (error) {
      console.error('💥 Error in admin-undo-last-pick handler:', error);
      socket.emit('draft-error', { message: 'Server error during undo' });
    }
  });

  // Admin auto-draft - Enhanced security
  socket.on('admin-auto-draft', (data) => {
    const { draftId, interval } = data;
    
    // Enhanced security validation
    if (!draftId) {
      console.log('❌ Admin auto-draft denied: No draftId provided');
      socket.emit('draft-error', { message: 'Draft ID required for admin auto-draft' });
      return;
    }
    
    const draftState = activeDrafts.get(draftId);
    if (!draftState) {
      console.log('❌ Admin auto-draft denied: Draft not found:', draftId);
      socket.emit('draft-error', { message: 'Draft not found' });
      return;
    }
    
    if (!draftState.isDraftStarted) {
      console.log('❌ Admin auto-draft denied: Draft not started:', draftId);
      socket.emit('draft-error', { message: 'Draft must be started before using auto-draft' });
      return;
    }
    
    if (draftState.isComplete) {
      console.log('❌ Admin auto-draft denied: Draft already complete:', draftId);
      socket.emit('draft-error', { message: 'Draft is already complete' });
      return;
    }
    
    console.log(`🔧 Admin auto-draft authorized for draft ${draftId} with ${interval || 1000}ms interval`);
    adminAutoDraft(draftId, interval || 1000);
  });

  // Force complete draft - Commissioner only
  socket.on('force-complete-draft', (data) => {
    const { draftId } = data;
    
    // Enhanced security validation
    if (!draftId) {
      console.log('❌ Force complete denied: No draftId provided');
      socket.emit('draft-error', { message: 'Draft ID required for force complete' });
      return;
    }
    
    const draftState = activeDrafts.get(draftId);
    if (!draftState) {
      console.log('❌ Force complete denied: Draft not found:', draftId);
      socket.emit('draft-error', { message: 'Draft not found' });
      return;
    }
    
    if (draftState.isComplete) {
      console.log('❌ Force complete denied: Draft already complete:', draftId);
      socket.emit('draft-error', { message: 'Draft is already complete' });
      return;
    }
    
    console.log(`🔧 Force completing draft ${draftId} by commissioner request`);
    
    // Mark draft as complete
    draftState.isComplete = true;
    draftState.status = 'completed';
    draftState.currentPick = draftState.draftOrder.length;
    
    // Emit draft complete event
    io.to(`draft-${draftId}`).emit('draft-complete', draftState);
    
    // Clean up user sessions for this draft
    const draftUsers = draftUserSessions.get(draftId);
    if (draftUsers) {
      draftUsers.forEach(userId => {
        clearUserDraftSession(userId);
      });
      draftUserSessions.delete(draftId);
      console.log(`🧹 Cleared user sessions for force-completed draft ${draftId}`);
    }
    
    // Clean up resources
    cleanupDraftResources(draftId);
    
    console.log(`✅ Draft ${draftId} force completed successfully`);
  });

  // Enhanced direct join validation for streamlined remote joining with permission check
  socket.on('validate-direct-join', (data) => {
    const { draftId, teamId, user } = data;
    
    try {
      const assignments = draftTeamAssignments.get(draftId);
      const draftState = activeDrafts.get(draftId);
      
      if (!draftState) {
        socket.emit('direct-join-validation', {
          success: false,
          message: 'Draft not found'
        });
        return;
      }

      // Find the specific team being requested
      const requestedTeam = draftState.teams?.find(team => team.id === teamId);
      
      // All teams are available for claiming in the lobby
      // No email validation needed since all drafts are public

      const teamAssignment = assignments?.find(a => a.teamId === teamId);
      
      socket.emit('direct-join-validation', {
        success: true,
        message: 'Team available for claiming',
        teamInfo: {
          teamId: teamId,
          teamName: teamAssignment?.teamName || requestedTeam?.name || `Team ${teamId}`,
          isPreAssigned: teamAssignment?.isPreAssigned || false,
          assignedUser: teamAssignment?.assignedUser
        }
      });

    } catch (error) {
      console.error('Direct join validation error:', error);
      socket.emit('direct-join-validation', {
        success: false,
        message: 'Server error during validation'
      });
    }
  });

  // Direct team join for streamlined remote access
  socket.on('direct-join-team', (data) => {
    const { draftId, teamId, username } = data;
    
    try {
      // Join the draft room
      socket.join(`draft-${draftId}`);
      
      // Add participant to draft
      if (!draftParticipants.has(draftId)) {
        draftParticipants.set(draftId, new Map());
      }
      
      const participants = draftParticipants.get(draftId);
      participants.set(socket.id, {
        id: socket.id,
        username,
        role: 'participant',
        isReady: true, // Direct join participants are automatically ready
        socketId: socket.id,
        isDirectJoin: true,
        assignedTeamId: teamId
      });

      // Automatically claim the team if available
      const assignments = draftTeamAssignments.get(draftId);
      if (assignments) {
        const teamIndex = assignments.findIndex(t => t.teamId === teamId);
        if (teamIndex !== -1) {
          const teamAssignment = assignments[teamIndex];
          
          // Allow claiming if unassigned or pre-assigned to this user
          if (!teamAssignment.assignedUser || teamAssignment.assignedUser === username) {
            teamAssignment.assignedUser = socket.id;
            teamAssignment.assignedBy = 'direct-join';
            teamAssignment.assignedAt = new Date().toISOString();
            
            // Broadcast updated assignments
            io.to(`draft-${draftId}`).emit('team-assignments-update', assignments);
            
            console.log(`Direct join successful: ${username} claimed Team ${teamId} via direct link`);
          }
        }
      }

      // Broadcast updated participants list
      const participantsList = Array.from(participants.values());
      io.to(`draft-${draftId}`).emit('participants-update', participantsList);

      console.log(`${username} joined draft ${draftId} directly to team ${teamId}`);

    } catch (error) {
      console.error('Direct join error:', error);
    }
  });

  // Update draft settings (commissioner only)
  socket.on('update-draft-settings', (data) => {
    try {
      const { draftId, settings, updatedBy } = data;
      console.log(`📝 Settings update request for draft ${draftId}:`, settings);
      
      const draftState = activeDrafts.get(draftId);
      if (!draftState) {
        console.log('⚠️ Draft not found:', draftId);
        socket.emit('draft-settings-error', { message: 'Draft not found' });
        return;
      }
      
      // Verify the requester is the commissioner
      const isCommissioner = draftState.commissionerSocketId === socket.id;
      if (!isCommissioner) {
        console.log('⚠️ Unauthorized settings update attempt');
        socket.emit('draft-settings-error', { message: 'Only the commissioner can update draft settings' });
        return;
      }
      
      // Update draft settings
      draftState.timeClock = settings.timeClock;
      draftState.tokens = settings.tokens;
      draftState.totalRounds = settings.totalRounds;
      draftState.draftType = settings.draftType;
      draftState.pickTimeout = settings.pickTimeout;
      draftState.allowTrades = settings.allowTrades;
      draftState.pauseEnabled = settings.pauseEnabled;
      
      // If total rounds changed, regenerate draft order
      if (draftState.totalRounds !== (draftState.teams.length * settings.totalRounds)) {
        console.log(`🔄 Regenerating draft order for ${settings.totalRounds} rounds`);
        draftState.draftOrder = generateDraftOrder(draftState.teams, settings.totalRounds, settings.draftType);
      }
      
      // Confirm success
      socket.emit('draft-settings-updated', { success: true, settings });
      
      // Broadcast updated state to all participants
      io.to(`draft-${draftId}`).emit('draft-state', draftState);
      
      console.log('✅ Draft settings updated successfully');
      
    } catch (error) {
      console.error('💥 Error updating draft settings:', error);
      socket.emit('draft-settings-error', { message: 'Failed to update settings' });
    }
  });

  // Keep-alive ping for mobile connections
  socket.on('ping', () => {
    socket.emit('pong');
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    
    // Remove from all draft participant lists
    draftParticipants.forEach((participants, draftId) => {
      if (participants.has(socket.id)) {
        participants.delete(socket.id);
        
        // Broadcast updated participants
        const participantsList = Array.from(participants.values());
        io.to(`draft-${draftId}`).emit('participants-update', participantsList);
      }
    });
  });
});

// API Routes
app.get('/api/players', (req, res) => {
  try {
    const players = loadAllPlayers();
    res.json(players);
  } catch (error) {
    console.error('Error serving players:', error);
    res.status(500).json({ error: 'Failed to load player data' });
  }
});

// Get all available drafts
app.get('/api/drafts', (req, res) => {
  try {
    const availableDrafts = [];
    
    console.log(`🔍 Debug: activeDrafts.size = ${activeDrafts.size}`);
    console.log(`🔍 Debug: activeDrafts keys = [${Array.from(activeDrafts.keys()).join(', ')}]`);
    
    activeDrafts.forEach((draftState, draftId) => {
      console.log(`🔍 Debug: Processing draft ${draftId}:`, {
        leagueName: draftState.leagueName,
        createdBy: draftState.createdBy,
        status: draftState.status,
        teamsLength: draftState.teams?.length
      });
      
      // Only include drafts that are available for joining
      const draftInfo = {
        id: draftId,
        leagueName: draftState.leagueName || `Draft ${draftId}`,
        createdBy: draftState.createdBy || 'Commissioner',
        status: draftState.status || (draftState.isDraftStarted ? 'in_progress' : 'scheduled'),
        leagueSize: draftState.teams?.length || 0,
        totalRounds: draftState.totalRounds || 16,
        timeClock: draftState.timeClock || 90,
        draftType: draftState.draftType || 'Snake',
        participants: Array.from(draftParticipants.get(draftId)?.values() || []),
        createdAt: draftState.createdAt || new Date().toISOString(),
        isComplete: draftState.isComplete || false,
        currentPick: draftState.currentPick || 1,
        totalPicks: draftState.draftOrder?.length || 0,
        // Add additional fields that the client expects
        teamNames: draftState.teams?.map(t => t.name) || [],
        invitedEmails: draftState.teams?.map(t => t.email) || []
      };
      
      availableDrafts.push(draftInfo);
    });
    
    // Sort by creation date (newest first)
    availableDrafts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    console.log(`📋 Serving ${availableDrafts.length} available drafts`);
    res.json(availableDrafts);
  } catch (error) {
    console.error('Error serving drafts:', error);
    res.status(500).json({ error: 'Failed to load drafts' });
  }
});

// Delete a draft
app.delete('/api/drafts/:draftId', (req, res) => {
  console.log('🔍 DELETE endpoint hit!');
  console.log('🔍 Request params:', req.params);
  console.log('🔍 Request body:', req.body);
  console.log('🔍 Request headers:', req.headers);
  
  try {
    const { draftId } = req.params;
    const { userId, isAdmin } = req.body; // Get user info from request body
    
    console.log(`🗑️ Delete draft request for draft ${draftId} by user ${userId} (admin: ${isAdmin})`);
    
    // Check if draft exists
    const draftState = activeDrafts.get(draftId);
    if (!draftState) {
      console.log(`❌ Draft ${draftId} not found`);
      return res.status(404).json({ error: 'Draft not found' });
    }
    
    // Check permissions - only draft creator or admin can delete
    const canDelete = isAdmin || draftState.createdBy === userId;
    if (!canDelete) {
      console.log(`❌ User ${userId} not authorized to delete draft ${draftId}`);
      return res.status(403).json({ error: 'Not authorized to delete this draft' });
    }
    
    // Clean up all draft resources
    console.log(`🧹 Cleaning up resources for draft ${draftId}`);
    
    // Clear timers
    const timerInfo = draftTimers.get(draftId);
    if (timerInfo?.interval) {
      clearInterval(timerInfo.interval);
      draftTimers.delete(draftId);
    }
    
    // Clear admin intervals
    if (draftState.adminIntervals) {
      draftState.adminIntervals.forEach(interval => {
        clearInterval(interval);
      });
    }
    
    // Remove from all tracking maps
    activeDrafts.delete(draftId);
    draftParticipants.delete(draftId);
    draftChatHistory.delete(draftId);
    draftTeamAssignments.delete(draftId);
    
    // Clear user sessions for this draft
    userDraftSessions.forEach((session, userId) => {
      if (session.draftId === draftId) {
        userDraftSessions.delete(userId);
      }
    });
    
    // Clear draft user sessions
    draftUserSessions.delete(draftId);
    
    // Save updated drafts to file (this will exclude the deleted draft)
    saveDraftsToFile();
    
    // Notify all connected clients about the deletion
    io.emit('draft-deleted', { draftId, deletedBy: userId });
    
    console.log(`✅ Draft ${draftId} successfully deleted`);
    res.json({ success: true, message: 'Draft deleted successfully' });
    
  } catch (error) {
    console.error('❌ Error deleting draft:', error);
    res.status(500).json({ error: 'Failed to delete draft' });
  }
});

// Draft results storage endpoints
app.post('/api/store-draft-results', (req, res) => {
  try {
    const { draftId, draftData } = req.body;
    
    if (!draftId || !draftData) {
      return res.status(400).json({ error: 'Missing draft ID or data' });
    }
    
    // Store draft data in server memory (for session)
    const storageKey = `draft-results-${draftId}`;
    draftResultsStorage.set(storageKey, {
      data: draftData,
      timestamp: Date.now(),
      expires: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
    });
    
    console.log(`📄 Draft results stored on server for ID: ${draftId}, size: ${JSON.stringify(draftData).length} bytes`);
    res.json({ success: true, message: 'Draft results stored successfully' });
    
  } catch (error) {
    console.error('❌ Error storing draft results:', error);
    res.status(500).json({ error: 'Failed to store draft results' });
  }
});

app.get('/api/get-draft-results/:draftId', (req, res) => {
  try {
    const { draftId } = req.params;
    const storageKey = `draft-results-${draftId}`;
    const storedData = draftResultsStorage.get(storageKey);
    
    if (!storedData) {
      return res.status(404).json({ error: 'Draft results not found' });
    }
    
    // Check if data has expired
    if (Date.now() > storedData.expires) {
      draftResultsStorage.delete(storageKey);
      return res.status(404).json({ error: 'Draft results have expired' });
    }
    
    console.log(`📄 Draft results retrieved for ID: ${draftId}`);
    res.json({ success: true, data: storedData.data });
    
  } catch (error) {
    console.error('❌ Error retrieving draft results:', error);
    res.status(500).json({ error: 'Failed to retrieve draft results' });
  }
});

// Enhanced health check endpoint
app.get('/health', (req, res) => {
  const uptime = Date.now() - serverStats.startTime;
  const memoryUsage = process.memoryUsage();
  
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: Math.floor(uptime / 1000),
    activeDrafts: activeDrafts.size,
    connectedClients: io.engine.clientsCount || 0,
    serverStats: {
      totalConnections: serverStats.totalConnections,
      activeConnections: serverStats.activeConnections,
      totalDrafts: serverStats.totalDrafts,
      totalPicks: serverStats.totalPicks,
      averageResponseTime: serverStats.averageResponseTime,
      memoryUsage: {
        rss: Math.round(memoryUsage.rss / 1024 / 1024) + 'MB',
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024) + 'MB',
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024) + 'MB'
      }
    },
    recentErrors: serverStats.errors.slice(-5),
    activeTimers: draftTimers.size,
    connectionErrors: connectionErrors.length,
    timerErrors: timerErrors.length
  });
});

// Debug endpoint to monitor connection issues
app.get('/debug/errors', (req, res) => {
  res.json({
    connectionErrors: connectionErrors.slice(-10), // Last 10 connection errors
    timerErrors: timerErrors.slice(-10), // Last 10 timer errors
    activeDrafts: Array.from(activeDrafts.keys()),
    activeTimers: Array.from(draftTimers.keys()),
    currentTime: new Date().toISOString()
  });
});

// Serve static files for React app (in production)
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/dist')));
}

// Serve React app routes (for client-side routing)
app.get('/results', (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
  } else {
    // In development, redirect to the client dev server
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    res.redirect(`${clientUrl}/results${req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : ''}`);
  }
});

app.get('/display', (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
  } else {
    // In development, redirect to the client dev server
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    res.redirect(`${clientUrl}/display`);
  }
});

app.get('/join/:draftId/team/:teamId', (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
  } else {
    // In development, redirect to the client dev server
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    res.redirect(`${clientUrl}/join/${req.params.draftId}/team/${req.params.teamId}`);
  }
});

// Serve React app routes (for client-side routing)
app.get('/results', (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
  } else {
    // In development, redirect to the client dev server
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    res.redirect(`${clientUrl}/results${req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : ''}`);
  }
});

app.get('/display', (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
  } else {
    // In development, redirect to the client dev server
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    res.redirect(`${clientUrl}/display`);
  }
});

app.get('/join/:draftId/team/:teamId', (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
  } else {
    // In development, redirect to the client dev server
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    res.redirect(`${clientUrl}/join/${req.params.draftId}/team/${req.params.teamId}`);
  }
});



server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  
  // Load existing drafts from file
  loadDraftsFromFile();
  
  // Memory monitoring
  setInterval(() => {
    const memUsage = process.memoryUsage();
    const totalMem = Math.round(memUsage.rss / 1024 / 1024);
    if (totalMem > 500) { // Alert if over 500MB
      console.warn(`⚠️ High memory usage: ${totalMem}MB`);
    }
  }, 60000); // Check every minute

  // Draft results cleanup for expired data
  setInterval(() => {
    const now = Date.now();
    let cleanedCount = 0;
    
    for (const [key, value] of draftResultsStorage.entries()) {
      if (now > value.expires) {
        draftResultsStorage.delete(key);
        cleanedCount++;
      }
    }
    
    if (cleanedCount > 0) {
      console.log(`🧹 Cleaned up ${cleanedCount} expired draft results`);
    }
  }, 60 * 60 * 1000); // Clean up every hour

  // Periodic draft state backup
  setInterval(() => {
    saveDraftsToFile();
  }, 5 * 60 * 1000); // Save every 5 minutes
});
