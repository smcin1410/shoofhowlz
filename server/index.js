const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { createServer } = require('http');
const { Server } = require('socket.io');

const app = express();
const server = createServer(app);
const allowedOrigins = [
  "http://localhost:5173", "http://localhost:5174", "http://localhost:5175", "http://localhost:5176"
];
if (process.env.CLIENT_URL) {
  allowedOrigins.push(process.env.CLIENT_URL);
}

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));
app.use(express.json());

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
    
    // Sort by rank
    return allPlayers.sort((a, b) => a.rank - b.rank);
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

// Connected participants tracking
let connectedParticipants = new Map(); // Map of socketId -> participant info

// Function to check if a team can draft a player at a specific position
function canDraftPosition(team, position) {
  const currentCount = team.roster.filter(player => player.position === position).length;
  return currentCount < POSITION_CAPS[position];
}

// Function to get the current team's turn
function getCurrentTeam() {
  if (draftState.currentPick >= draftState.draftOrder.length) {
    return null; // Draft is complete
  }
  const teamIndex = draftState.draftOrder[draftState.currentPick] - 1;
  return draftState.teams[teamIndex];
}

// Timer management
let currentTimer = null;
let timeRemaining = 0; // Start at 0, not 90
let timerInterval = null;

// Function to start the draft timer
function startDraftTimer() {
  if (!draftState.isDraftStarted || draftState.currentPick >= draftState.draftOrder.length) {
    return;
  }

  timeRemaining = draftState.defaultTimeClock || 90;
  
  // Clear any existing timer
  if (timerInterval) {
    clearInterval(timerInterval);
  }

  timerInterval = setInterval(() => {
    timeRemaining--;
    
    // Broadcast timer update
    io.emit('timer-update', {
      timeRemaining,
      canExtend: timeRemaining <= 15
    });

    // Check if time is up
    if (timeRemaining <= 0) {
      clearInterval(timerInterval);
      timerInterval = null;
      
      // Auto-draft the best available player
      autoDraftPlayer();
    }
  }, 1000);
}

// Function to auto-draft a player
function autoDraftPlayer() {
  if (!draftState.isDraftStarted || draftState.currentPick >= draftState.draftOrder.length) {
    return;
  }

  const currentTeam = getCurrentTeam();
  if (!currentTeam) {
    return;
  }

  // Find the best available player that the team can draft
  for (const player of draftState.availablePlayers) {
    if (canDraftPosition(currentTeam, player.position)) {
      // Draft this player
      const playerIndex = draftState.availablePlayers.findIndex(p => p.rank === player.rank);
      draftState.availablePlayers.splice(playerIndex, 1);
      draftState.draftedPlayers.push(player);
      currentTeam.roster.push(player);
      
      // Record the pick in history
      draftState.pickHistory.push({
        pickIndex: draftState.currentPick,
        teamId: currentTeam.id,
        teamIndex: currentTeam.id - 1, // Add teamIndex for client compatibility
        player: player
      });
      
      // Move to next pick
      draftState.currentPick++;
      
      console.log(`Auto-drafted ${player.player_name} to ${currentTeam.name}`);
      
      // Clear current timer
      if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
      }
      timeRemaining = 0;
      
          // Broadcast updated state
    io.emit('draft-state', draftState);
    
    // Explicitly broadcast timer state as 0 to ensure all clients know timer is paused
    io.emit('timer-update', {
      timeRemaining: 0,
      canExtend: false
    });
    
    // Auto-save draft state
    saveDraftState();
    
    // Don't start timer automatically - wait for continue button
    // Timer will be started when the next team clicks continue
    
    break;
    }
  }
}

// API Routes
app.get('/api/players', (req, res) => {
  try {
    const players = loadAllPlayers();
    res.json(players);
  } catch (error) {
    console.error('Error fetching players:', error);
    res.status(500).json({ error: 'Failed to fetch players' });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Clear draft backup endpoint
app.post('/api/clear-backup', (req, res) => {
  try {
    const backupPath = path.join(__dirname, 'draft-backup.json');
    if (fs.existsSync(backupPath)) {
      fs.unlinkSync(backupPath);
      console.log('Draft backup cleared');
    }
    res.json({ success: true, message: 'Backup cleared' });
  } catch (error) {
    console.error('Error clearing backup:', error);
    res.status(500).json({ error: 'Failed to clear backup' });
  }
});

// Draft state management
let draftState = {
  availablePlayers: [],
  draftedPlayers: [],
  teams: [],
  draftOrder: [],
  currentPick: 0,
  isDraftStarted: false,
  pickHistory: [], // Track which player was drafted at which pick
  lastSaved: null // Track when last saved
};

// Auto-save draft state to file
function saveDraftState() {
  try {
    const saveData = {
      ...draftState,
      lastSaved: new Date().toISOString()
    };
    fs.writeFileSync(path.join(__dirname, 'draft-backup.json'), JSON.stringify(saveData, null, 2));
    console.log('Draft state auto-saved at:', new Date().toISOString());
  } catch (error) {
    console.error('Error saving draft state:', error);
  }
}

// Load draft state from file
function loadDraftState() {
  try {
    const backupPath = path.join(__dirname, 'draft-backup.json');
    if (fs.existsSync(backupPath)) {
      const backupData = fs.readFileSync(backupPath, 'utf8');
      const savedState = JSON.parse(backupData);
      
      // Only restore if the draft was actually started
      if (savedState.isDraftStarted) {
        draftState = { ...savedState };
        console.log('Draft state restored from backup. Last saved:', savedState.lastSaved);
        console.log(`Resuming at pick ${draftState.currentPick + 1} of ${draftState.draftOrder.length}`);
        return true;
      }
    }
  } catch (error) {
    console.error('Error loading draft state:', error);
  }
  return false;
}

// Initialize draft state with player data
function initializeDraftState() {
  // Try to load existing draft state first
  const restored = loadDraftState();
  
  if (!restored) {
    // Initialize fresh draft state
    draftState.availablePlayers = loadAllPlayers();
    draftState.draftedPlayers = [];
    draftState.teams = [];
    draftState.draftOrder = [];
    draftState.currentPick = 0;
    draftState.isDraftStarted = false;
    draftState.pickHistory = [];
    draftState.lastSaved = null;
  }
}

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  // Add participant to tracking
  connectedParticipants.set(socket.id, {
    socketId: socket.id,
    username: 'Anonymous User',
    role: 'participant',
    isReady: false,
    connectedAt: new Date().toISOString()
  });
  
  // Send current draft state to newly connected client
  socket.emit('draft-state', draftState);
  
  // Send current participants list
  socket.emit('participants-update', Array.from(connectedParticipants.values()));
  
  // Broadcast participant update to all clients
  io.emit('participants-update', Array.from(connectedParticipants.values()));
  
  // Only send timer state if timer is actually running and has time remaining
  if (timerInterval && timeRemaining > 0) {
    socket.emit('timer-update', {
      timeRemaining,
      canExtend: timeRemaining <= 15
    });
  } else {
    // Explicitly send timer state as 0 to ensure client knows timer is paused
    socket.emit('timer-update', {
      timeRemaining: 0,
      canExtend: false
    });
  }
  
  // Handle draft start
  socket.on('start-draft', (draftConfig) => {
    console.log('Starting draft with configuration:', draftConfig);

    // If draft is already started and has an admin password, validate it
    if (draftState.adminPassword && draftState.adminPassword !== draftConfig.adminPassword) {
      socket.emit('password-required');
      return;
    }

    // If draft is already started and no password provided but one is required
    if (draftState.adminPassword && !draftConfig.adminPassword) {
      socket.emit('password-required');
      return;
    }

    const { leagueName, leagueSize, draftType, tokens, timeClock, totalRounds, teams, adminPassword } = draftConfig;
    
    // Store draft configuration
    draftState.leagueName = leagueName;
    draftState.leagueSize = leagueSize;
    draftState.draftType = draftType;
    draftState.defaultTimeClock = timeClock;
    draftState.defaultTokens = tokens;
    draftState.totalRounds = totalRounds;
    draftState.adminPassword = adminPassword; // Store the admin password
    
    draftState.teams = teams.map((team, index) => ({
      id: index + 1,
      name: team.name,
      email: team.email,
      roster: [],
      timeExtensionTokens: tokens
    }));
    
    // Create draft order based on draft type and league size
    draftState.draftOrder = [];
    
    console.log(`Creating ${draftType} draft for ${leagueSize} teams with ${totalRounds} rounds`);
    
    if (draftType === 'snake') {
      // Snake draft: 1-12, 12-1, 1-12, etc.
      for (let round = 1; round <= totalRounds; round++) {
        if (round % 2 === 1) {
          // Odd rounds: 1 to leagueSize
          for (let pick = 1; pick <= leagueSize; pick++) {
            draftState.draftOrder.push(pick);
          }
        } else {
          // Even rounds: leagueSize to 1
          for (let pick = leagueSize; pick >= 1; pick--) {
            draftState.draftOrder.push(pick);
          }
        }
      }
    } else {
      // Linear draft: 1-12 for all rounds
      for (let round = 1; round <= totalRounds; round++) {
        for (let pick = 1; pick <= leagueSize; pick++) {
          draftState.draftOrder.push(pick);
        }
      }
    }
    
    // Log first few rounds of draft order for verification
    console.log('Draft order (first 3 rounds):');
    for (let round = 0; round < Math.min(3, totalRounds); round++) {
      const roundStart = round * leagueSize;
      const roundEnd = roundStart + leagueSize;
      const roundOrder = draftState.draftOrder.slice(roundStart, roundEnd);
      console.log(`Round ${round + 1}: [${roundOrder.join(', ')}]`);
    }
    
    draftState.currentPick = 0;
    draftState.isDraftStarted = true;
    draftState.pickHistory = [];
    
    // Ensure timer is stopped and reset when draft starts
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
    timeRemaining = 0;
    
    // Broadcast updated state to all clients
    io.emit('draft-state', draftState);
    
    // Explicitly broadcast timer state as 0 to ensure all clients know timer is paused
    io.emit('timer-update', {
      timeRemaining: 0,
      canExtend: false
    });
    
    // Auto-save draft state
    saveDraftState();
    
    // Don't start timer automatically - wait for continue button
    // Timer will be started when the next team clicks continue
  });

  // Handle initial draft clock start
  socket.on('start-draft-clock', () => {
    if (!draftState.isDraftStarted || draftState.currentPick >= draftState.draftOrder.length) {
      socket.emit('error', 'Draft is not started or already complete');
      return;
    }
    
    // Start timer for the current pick
    startDraftTimer();
  });

  // Handle continue button click to start timer for next pick
  socket.on('continue-draft', () => {
    if (!draftState.isDraftStarted || draftState.currentPick >= draftState.draftOrder.length) {
      socket.emit('error', 'Draft is complete or not started');
      return;
    }
    
    // Start timer for the current pick
    startDraftTimer();
  });

  // Handle draft player
  socket.on('draft-player', (data) => {
    console.log('Draft player request:', data);
    
    if (!draftState.isDraftStarted) {
      socket.emit('error', 'Draft has not started yet');
      return;
    }

    if (draftState.currentPick >= draftState.draftOrder.length) {
      socket.emit('error', 'Draft is already complete');
      return;
    }

    // Find the player to draft
    const playerIndex = draftState.availablePlayers.findIndex(p => p.rank === data.playerId);
    if (playerIndex === -1) {
      socket.emit('error', 'Player not found or already drafted');
      return;
    }

    const player = draftState.availablePlayers[playerIndex];
    const currentTeam = getCurrentTeam();
    
    if (!currentTeam) {
      socket.emit('error', 'No team found for current pick');
      return;
    }

    // Check if team can draft this position
    if (!canDraftPosition(currentTeam, player.position)) {
      socket.emit('error', `Cannot draft ${player.position} - position cap reached`);
      return;
    }

    // Draft the player
    draftState.availablePlayers.splice(playerIndex, 1);
    draftState.draftedPlayers.push(player);
    currentTeam.roster.push(player);
    
    // Record the pick in history
    draftState.pickHistory.push({
      pickIndex: draftState.currentPick,
      pickNumber: draftState.currentPick, // Add pickNumber for client compatibility
      teamId: currentTeam.id,
      teamIndex: currentTeam.id - 1, // Add teamIndex for client compatibility
      team: currentTeam, // Add full team object for pick announcement
      player: player
    });
    
    // Move to next pick
    draftState.currentPick++;
    
    console.log(`Drafted ${player.player_name} to ${currentTeam.name}`);
    
        // Clear current timer
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
    timeRemaining = 0;
    
    // Broadcast updated state to all clients
    io.emit('draft-state', draftState);
    
    // Explicitly broadcast timer state as 0 to ensure all clients know timer is paused
    io.emit('timer-update', {
      timeRemaining: 0,
      canExtend: false
    });
    
    // Auto-save draft state
    saveDraftState();
    
    // Don't start timer automatically - wait for continue button
    // Timer will be started when the next team clicks continue
    
    // Check if draft is complete
    if (draftState.currentPick >= draftState.draftOrder.length) {
      console.log('Draft completed!');
      io.emit('draft-complete', draftState);
      
      // Clear backup file when draft is complete
      try {
        const backupPath = path.join(__dirname, 'draft-backup.json');
        if (fs.existsSync(backupPath)) {
          fs.unlinkSync(backupPath);
          console.log('Draft backup cleared after completion');
        }
      } catch (error) {
        console.error('Error clearing backup after completion:', error);
      }
    }
  });

  // Handle time extension
  socket.on('extend-time', () => {
    const currentTeam = getCurrentTeam();
    if (!currentTeam || currentTeam.timeExtensionTokens <= 0) {
      socket.emit('error', 'No time extension tokens available');
      return;
    }

    // Add 30 seconds to the timer
    timeRemaining += 30;
    currentTeam.timeExtensionTokens--;
    
    // Broadcast timer update
    io.emit('timer-update', {
      timeRemaining,
      canExtend: timeRemaining <= 15
    });
    
    // Broadcast updated state (for token count)
    io.emit('draft-state', draftState);
    
    // Auto-save draft state
    saveDraftState();
    
    console.log(`Time extended for ${currentTeam.name}. Tokens remaining: ${currentTeam.timeExtensionTokens}`);
  });

  // Handle admin draft player
  socket.on('admin-draft-player', (data) => {
    console.log('Admin draft player request:', data);

    // Basic validation
    if (!draftState.isDraftStarted || draftState.currentPick >= draftState.draftOrder.length) {
      socket.emit('error', 'Draft is not active or is complete.');
      return;
    }

    const playerIndex = draftState.availablePlayers.findIndex(p => p.rank === data.playerId);
    if (playerIndex === -1) {
      socket.emit('error', 'Player not found or already drafted.');
      return;
    }

    const player = draftState.availablePlayers[playerIndex];
    const currentTeam = getCurrentTeam();

    if (!currentTeam) {
      socket.emit('error', 'Could not determine the current team.');
      return;
    }

    // Commissioner can override position caps, but we should still check.
    if (!canDraftPosition(currentTeam, player.position)) {
      console.warn(`Admin drafted ${player.player_name} for ${currentTeam.name}, overriding position cap for ${player.position}.`);
    }

    // Perform the draft
    draftState.availablePlayers.splice(playerIndex, 1);
    draftState.draftedPlayers.push(player);
    currentTeam.roster.push(player);

    draftState.pickHistory.push({
      pickIndex: draftState.currentPick,
      pickNumber: draftState.currentPick,
      teamId: currentTeam.id,
      teamIndex: currentTeam.id - 1,
      team: currentTeam,
      player: player,
    });

    draftState.currentPick++;

    console.log(`Admin drafted ${player.player_name} to ${currentTeam.name}`);

    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
    timeRemaining = 0;

    io.emit('draft-state', draftState);
    io.emit('timer-update', { timeRemaining: 0, canExtend: false });

    saveDraftState();

    if (draftState.currentPick >= draftState.draftOrder.length) {
      console.log('Draft completed via admin pick!');
      io.emit('draft-complete', draftState);
    }
  });

  socket.on('admin-pause-timer', () => {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
      draftState.isPaused = true;
      io.emit('draft-state', draftState);
      console.log('Admin paused the draft.');
    }
  });

  socket.on('admin-resume-timer', () => {
    if (!timerInterval && draftState.isDraftStarted && timeRemaining > 0) {
      draftState.isPaused = false;
      startDraftTimer(); // This will resume from the timeRemaining
      io.emit('draft-state', draftState);
      console.log('Admin resumed the draft.');
    }
  });

  socket.on('admin-undo-last-pick', () => {
    if (draftState.pickHistory.length > 0) {
      const lastPick = draftState.pickHistory.pop();
      const { player, teamId } = lastPick;

      // Add player back to available players and sort by rank
      draftState.availablePlayers.push(player);
      draftState.availablePlayers.sort((a, b) => a.rank - b.rank);

      // Remove player from team's roster
      const team = draftState.teams.find(t => t.id === teamId);
      if (team) {
        team.roster = team.roster.filter(p => p.rank !== player.rank);
      }

      // Decrement current pick
      draftState.currentPick--;

      io.emit('draft-state', draftState);
      saveDraftState();
      console.log(`Admin undid the last pick. ${player.player_name} is available again.`);
    } else {
      socket.emit('error', 'No picks to undo.');
    }
  });

  // Handle clear backup request
  socket.on('clear-backup', () => {
    console.log('clear-backup event received from client:', socket.id);
    try {
      const backupPath = path.join(__dirname, 'draft-backup.json');
      if (fs.existsSync(backupPath)) {
        fs.unlinkSync(backupPath);
        console.log('Draft backup cleared by user request');
      } else {
        console.log('No backup file found to clear');
      }
      
      // Clear timer
      if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
        console.log('Timer cleared');
      }
      timeRemaining = 0;
      
      // Reset draft state to initial state
      draftState = {
        availablePlayers: loadAllPlayers(),
        draftedPlayers: [],
        teams: [],
        draftOrder: [],
        currentPick: 0,
        isDraftStarted: false,
        pickHistory: [],
        lastSaved: null,
        leagueName: null,
        leagueSize: null,
        draftType: null,
        defaultTimeClock: null,
        defaultTokens: null
      };
      
      // Broadcast reset state to all clients
      io.emit('draft-state', draftState);
      io.emit('timer-update', {
        timeRemaining: 0,
        canExtend: false
      });
      
      console.log('Draft state reset to initial state and broadcasted to all clients');
      
    } catch (error) {
      console.error('Error clearing backup:', error);
    }
  });
  
  // Handle participant join with username
  socket.on('join-lobby', (data) => {
    const { username, role } = data;
    if (connectedParticipants.has(socket.id)) {
      const participant = connectedParticipants.get(socket.id);
      participant.username = username || 'Anonymous User';
      participant.role = role || 'participant';
      connectedParticipants.set(socket.id, participant);
      
      console.log(`${username} joined the lobby as ${role}`);
      
      // Broadcast updated participants list
      io.emit('participants-update', Array.from(connectedParticipants.values()));
    }
  });

  // Handle participant ready status
  socket.on('set-ready-status', (isReady) => {
    if (connectedParticipants.has(socket.id)) {
      const participant = connectedParticipants.get(socket.id);
      participant.isReady = isReady;
      connectedParticipants.set(socket.id, participant);
      
      console.log(`${participant.username} is ${isReady ? 'ready' : 'not ready'}`);
      
      // Broadcast updated participants list
      io.emit('participants-update', Array.from(connectedParticipants.values()));
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    
    // Remove participant from tracking
    if (connectedParticipants.has(socket.id)) {
      const participant = connectedParticipants.get(socket.id);
      console.log(`${participant.username} left the lobby`);
      connectedParticipants.delete(socket.id);
      
      // Broadcast updated participants list
      io.emit('participants-update', Array.from(connectedParticipants.values()));
    }
  });
});

// Initialize draft state
initializeDraftState();

// Start server
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Player data endpoint: http://localhost:${PORT}/api/players`);
  console.log(`Socket.IO server ready for connections`);
});
