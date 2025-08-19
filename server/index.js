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

// Multi-draft state management
const activeDrafts = new Map(); // Map of draftId -> draft state
const draftParticipants = new Map(); // Map of draftId -> Map of socketId -> participant info
const draftChatHistory = new Map(); // Map of draftId -> chat messages
const draftTimers = new Map(); // Map of draftId -> timer info
const draftTeamAssignments = new Map(); // Map of draftId -> team assignments

// Utility functions
function generateId() {
  return Math.random().toString(36).substr(2, 9);
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
      email: draftConfig.invitedEmails?.[index] || '',
      roster: [],
      timeExtensionTokens: draftConfig.tokens || 3,
      isPresent: false,
      assignedParticipant: null,
      autoPickEnabled: true
    })),
    draftOrder: [],
    currentPick: 0,
    pickHistory: [],
    defaultTimeClock: draftConfig.timeClock * 60, // Convert minutes to seconds
    createdBy: draftConfig.createdBy,
    createdAt: draftConfig.createdAt
  };
}

function generateDraftOrder(teams, draftType) {
  const teamIds = teams.map(team => team.id);
  
  // Shuffle the team IDs for random order
  for (let i = teamIds.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [teamIds[i], teamIds[j]] = [teamIds[j], teamIds[i]];
  }
  
  const draftOrder = [];
  const totalRounds = teams.length; // Using team count for now, should be configurable
  
  for (let round = 0; round < totalRounds; round++) {
    if (draftType === 'Snake' && round % 2 === 1) {
      // Reverse order for odd rounds (snake draft)
      draftOrder.push(...[...teamIds].reverse());
    } else {
      // Normal order for even rounds or linear draft
      draftOrder.push(...teamIds);
    }
  }
  
  return draftOrder;
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

function autoDraftPlayer(draftId) {
  const draftState = activeDrafts.get(draftId);
  if (!draftState || !draftState.isDraftStarted || draftState.currentPick >= draftState.draftOrder.length) {
    return;
  }

  const currentTeam = getCurrentTeam(draftState);
  if (!currentTeam) {
    return;
  }

  // Find the best available player that the team can draft
  for (const player of draftState.availablePlayers) {
    if (canDraftPosition(currentTeam, player.position)) {
      // Execute the draft
      draftPlayer(draftId, player.id, true); // true indicates auto-pick
      break;
    }
  }
}

function draftPlayer(draftId, playerId, isAutoPick = false) {
  const draftState = activeDrafts.get(draftId);
  if (!draftState) return false;

  const currentTeam = getCurrentTeam(draftState);
  if (!currentTeam) return false;

  const playerIndex = draftState.availablePlayers.findIndex(p => p.id === playerId);
  if (playerIndex === -1) return false;

  const player = draftState.availablePlayers[playerIndex];

  // Validate position cap
  if (!canDraftPosition(currentTeam, player.position)) {
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

  // Move to next pick
  draftState.currentPick++;

  // Check if draft is complete
  if (draftState.currentPick >= draftState.draftOrder.length) {
    draftState.isComplete = true;
  }

  // Clear timer for this draft
  const timerInfo = draftTimers.get(draftId);
  if (timerInfo?.interval) {
    clearInterval(timerInfo.interval);
    draftTimers.delete(draftId);
  }

  // Broadcast updated state
  io.to(`draft-${draftId}`).emit('draft-state', draftState);

  return true;
}

function startDraftTimer(draftId) {
  const draftState = activeDrafts.get(draftId);
  if (!draftState?.isDraftStarted || draftState.currentPick >= draftState.draftOrder.length) {
    return;
  }

  const currentTeam = getCurrentTeam(draftState);
  if (!currentTeam) return;

  // Check if current team should auto-pick
  if (!currentTeam.isPresent || currentTeam.autoPickEnabled) {
    console.log(`Auto-picking for ${currentTeam.name} - team not present`);
    setTimeout(() => {
      autoDraftPlayer(draftId);
    }, 2000);
    return;
  }

  let timeRemaining = draftState.defaultTimeClock || 90;
  
  // Clear any existing timer
  const existingTimer = draftTimers.get(draftId);
  if (existingTimer?.interval) {
    clearInterval(existingTimer.interval);
  }

  const interval = setInterval(() => {
    timeRemaining--;
    
    // Broadcast timer update to draft room
    io.to(`draft-${draftId}`).emit('timer-update', {
      timeRemaining,
      canExtend: timeRemaining <= 15
    });

    if (timeRemaining <= 0) {
      clearInterval(interval);
      draftTimers.delete(draftId);
      autoDraftPlayer(draftId);
    }
  }, 1000);

  draftTimers.set(draftId, { interval, timeRemaining });
}

// Admin auto-draft for testing
function adminAutoDraft(draftId, interval = 1000) {
  const draftState = activeDrafts.get(draftId);
  if (!draftState?.isDraftStarted) return;

  const autoDraftInterval = setInterval(() => {
    if (draftState.currentPick >= draftState.draftOrder.length || draftState.isComplete) {
      clearInterval(autoDraftInterval);
      return;
    }
    autoDraftPlayer(draftId);
  }, interval);
}

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

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

  // Assign team (Commissioner only)
  socket.on('assign-team', (data) => {
    const { draftId, teamId, assignedUser, assignedBy } = data;
    
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
      if (teamIndex !== -1) {
        assignments[teamIndex].assignedUser = assignedUser;
        
        // Broadcast updated assignments
        io.to(`draft-${draftId}`).emit('team-assignments-update', assignments);
        
        console.log(`Team ${teamId} assigned to ${assignedUser} by ${assignedBy}`);
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
      
      if (teamIndex !== -1 && !assignments[teamIndex].assignedUser && !alreadyClaimed) {
        assignments[teamIndex].assignedUser = userId;
        
        // Broadcast updated assignments
        io.to(`draft-${draftId}`).emit('team-assignments-update', assignments);
        
        console.log(`Team ${teamId} claimed by ${claimedBy}`);
      }
    }
  });

  // Generate draft order
  socket.on('generate-draft-order', (draftConfig) => {
    const draftState = activeDrafts.get(draftConfig.id) || createDraftState(draftConfig);
    
    const draftOrder = generateDraftOrder(draftState.teams, draftConfig.draftType);
    draftState.draftOrder = draftOrder;
    
    activeDrafts.set(draftConfig.id, draftState);
    
    // Broadcast draft order generated event
    io.to(`draft-${draftConfig.id}`).emit('draft-order-generated', { draftOrder });
  });

  // Start draft
  socket.on('start-draft', (draftConfig) => {
    console.log('Starting draft:', draftConfig.id);
    
    let draftState = activeDrafts.get(draftConfig.id);
    if (!draftState) {
      draftState = createDraftState(draftConfig);
      activeDrafts.set(draftConfig.id, draftState);
    }

    // Set draft as started
    draftState.isDraftStarted = true;
    
    // If no draft order exists, generate one
    if (!draftState.draftOrder.length) {
      draftState.draftOrder = generateDraftOrder(draftState.teams, draftConfig.draftType);
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
    io.to(`draft-${draftConfig.id}`).emit('draft-state', draftState);
    
    // Start the first pick timer
    setTimeout(() => {
      startDraftTimer(draftConfig.id);
    }, 1000);
  });

  // Continue draft (start next timer)
  socket.on('continue-draft', (data) => {
    const { draftId } = data;
    startDraftTimer(draftId);
  });

  // Draft player
  socket.on('draft-player', (data) => {
    const { draftId, playerId } = data;
    draftPlayer(draftId, playerId, false);
  });

  // Admin auto-draft
  socket.on('admin-auto-draft', (data) => {
    const { draftId, interval } = data;
    console.log(`Admin auto-draft started for draft ${draftId}`);
    adminAutoDraft(draftId, interval);
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

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
