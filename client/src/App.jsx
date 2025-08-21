import { useState, useEffect, useCallback } from 'react';
import { Routes, Route } from 'react-router-dom';
import { io } from 'socket.io-client';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import DraftPage from './components/DraftPage';
import DraftLobby from './components/DraftLobby';
import DraftSummary from './components/DraftSummary';
import PickAnnouncement from './components/PickAnnouncement';
import DisplayPage from './components/DisplayPage';
import ResultsPage from './components/ResultsPage';
import DraftOrderAnnouncement from './components/DraftOrderAnnouncement';
import DirectJoinPage from './components/DirectJoinPage';
import { useSound } from './hooks/useSound';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:4000';

// Auto-save draft state to localStorage
const saveDraftStateToLocal = (draftState) => {
  try {
    localStorage.setItem('fantasy-draft-state', JSON.stringify({
      ...draftState,
      lastSaved: new Date().toISOString()
    }));
  } catch (error) {
    console.error('Error saving to localStorage:', error);
  }
};

// Load draft state from localStorage
const loadDraftStateFromLocal = () => {
  try {
    const saved = localStorage.getItem('fantasy-draft-state');
    if (saved) {
      const parsed = JSON.parse(saved);
      // Only restore if the draft was actually started
      if (parsed.isDraftStarted) {
        console.log('Found saved draft state in localStorage. Last saved:', parsed.lastSaved);
        return parsed;
      }
    }
  } catch (error) {
    console.error('Error loading from localStorage:', error);
  }
  return null;
};

const MainApp = () => {
  // Authentication state
  const [user, setUser] = useState(null);
  const [currentDraft, setCurrentDraft] = useState(null);
  
  // Draft system state
  const [socket, setSocket] = useState(null);
     const [draftState, setDraftState] = useState({
     isDraftStarted: false,
     pickHistory: [],
     draftOrder: [],
     teams: [],
     currentPick: null
   });
  const [draftConfig, setDraftConfig] = useState(null);
  const [isInLobby, setIsInLobby] = useState(true);
  const [isDraftComplete, setIsDraftComplete] = useState(false);
  const [showPickAnnouncement, setShowPickAnnouncement] = useState(false);
  const [showDraftOrderAnnouncement, setShowDraftOrderAnnouncement] = useState(false);
  const [lastPickAnnounced, setLastPickAnnounced] = useState(null);
  const [isCommissioner, setIsCommissioner] = useState(false);
  const [participants, setParticipants] = useState([]);
  const [showRecoveryMessage, setShowRecoveryMessage] = useState(false);
  const [connectedParticipantsCount, setConnectedParticipantsCount] = useState(0);
  
  // UI state
  const [appView, setAppView] = useState('dashboard'); // 'dashboard', 'lobby', 'draft'
  
     // Sound functions - using useCallback to prevent infinite re-renders
  const playPickSound = useCallback(() => {
    console.log('🔇 Sound not available');
  }, []);
  
  const playTimerSound = useCallback(() => {
    console.log('🔇 Timer sound not available');
  }, []);
  
  const playYourTurnSound = useCallback(() => {
    console.log('🔇 Turn sound not available');
  }, []);
  
  const toggleMute = useCallback(() => {
    console.log('🔇 Mute toggle not available');
  }, []);
  
  const isMuted = false;

  // Check for existing user session on app load
  useEffect(() => {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        setUser(parsedUser);
      } catch (error) {
        console.error('Error parsing saved user:', error);
        localStorage.removeItem('currentUser');
      }
    }
  }, []);

  // Socket connection management
  useEffect(() => {
    if (user) {
      // Connect to Socket.IO server when user logs in
      console.log('🔌 Connecting to server:', SERVER_URL);
      const newSocket = io(SERVER_URL, {
        // Improved settings for Render free tier
        timeout: 20000, // 20 second timeout for cold starts
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        maxReconnectionAttempts: 10,
        transports: ['websocket', 'polling']
      });
      setSocket(newSocket);

      // Listen for draft state updates
      newSocket.on('draft-state', (state) => {
        console.log('📡 draft-state event received:', state);
        console.log('🔍 State Analysis:', {
          'Draft started': state.isDraftStarted,
          'Current pick': state.currentPick,
          'Total picks': state.draftOrder?.length,
          'Teams count': state.teams?.length,
          'Pick history length': state.pickHistory?.length
        });
        
                 // Check if a new pick was made
         setDraftState(prevState => {
           // Ensure we have safe defaults
           const safeState = {
             ...state,
             pickHistory: Array.isArray(state.pickHistory) ? state.pickHistory : [],
             draftOrder: Array.isArray(state.draftOrder) ? state.draftOrder : [],
             teams: Array.isArray(state.teams) ? state.teams : []
           };
           
           if (prevState && safeState.pickHistory && Array.isArray(safeState.pickHistory) && 
               prevState.pickHistory && Array.isArray(prevState.pickHistory) &&
               safeState.pickHistory.length > prevState.pickHistory.length) {
             const newPick = safeState.pickHistory[safeState.pickHistory.length - 1];
             console.log('🎯 New pick detected:', newPick);
             setLastPickAnnounced(newPick);
             setShowPickAnnouncement(true);
             if (!isMuted) {
               playPickSound();
             }
           }
           return safeState;
         });
        
                 // Handle state changes
         if (state && state.isDraftStarted) {
           console.log('🚀 Draft is active, moving to draft view');
           // Ensure pickHistory is always an array
           const safeState = {
             ...state,
             pickHistory: Array.isArray(state.pickHistory) ? state.pickHistory : []
           };
           saveDraftStateToLocal(safeState);
           setAppView('draft');
           setIsInLobby(false);
           setIsDraftComplete(false);
         } else {
           console.log('⏸️ Draft is not started, staying in lobby');
           setAppView('lobby');
           setIsInLobby(true);
           setIsDraftComplete(false);
         }
      });

      newSocket.on('draft-order-generated', (data) => {
        console.log('📡 draft-order-generated received:', data);
        console.log('🔍 Draft Order Analysis:', {
          'Draft order length': data.draftOrder?.length,
          'Team count': data.draftConfig?.teamNames?.length,
          'League name': data.draftConfig?.leagueName,
          'Draft type': data.draftConfig?.draftType
        });
        
        try {
          // Create teams from the draft config
          const teams = data.draftConfig.teamNames.map((name, index) => ({
            id: index + 1,
            name: name
          }));
          
          console.log('🏈 Created teams:', teams.map(t => ({ id: t.id, name: t.name })));
          
                     setDraftState(prevState => ({ 
             ...prevState, 
             draftOrder: data.draftOrder || [],
             teams: teams || [],
             pickHistory: prevState.pickHistory || []
           }));
          
          console.log('✅ Draft state updated with order and teams');
          setShowDraftOrderAnnouncement(true);
          console.log('🎭 Showing draft order announcement');
          
          // Store the draft config for starting after animation
          setDraftConfig(data.draftConfig);
          console.log('💾 Draft config stored for later use');
          
        } catch (error) {
          console.error('💥 Error processing draft-order-generated:', error);
          alert('❌ Error: Failed to process draft order. Please try again.');
        }
      });

      newSocket.on('participants-update', (participantsList) => {
        setParticipants(participantsList);
        setConnectedParticipantsCount(participantsList.length);
      });

      newSocket.on('draft-complete', () => {
        console.log('🏁 Draft completed, moving to summary');
        setIsDraftComplete(true);
        setAppView('summary');
      });

      // Add connection status listeners
      newSocket.on('connect', () => {
        console.log('🔗 Socket connected successfully');
      });

      newSocket.on('disconnect', (reason) => {
        console.log('🔌 Socket disconnected:', reason);
        if (reason === 'io server disconnect') {
          // the disconnection was initiated by the server, you need to reconnect manually
          console.log('🔄 Server initiated disconnect, attempting to reconnect...');
          newSocket.connect();
        }
      });

      newSocket.on('connect_error', (error) => {
        console.error('❌ Socket connection error:', error);
        console.error('Error details:', {
          message: error.message,
          description: error.description,
          type: error.type,
          transport: error.transport
        });
        
        // Handle Render free tier cold starts - be patient with timeouts
        if (error.message?.includes('timeout')) {
          console.log('⏰ Server cold start detected - waiting for server to wake up...');
        } else {
          setTimeout(() => {
            if (!newSocket.connected) {
              console.warn('❌ Persistent connection issue - server may be down');
              // Reduce alert frequency to avoid user annoyance
            }
          }, 10000); // Increased timeout for cold starts
        }
      });

      // Enhanced error event listener with retry logic
      newSocket.on('error', (error) => {
        console.error('💥 Socket error:', error);
        console.error('Error context:', {
          connected: newSocket.connected,
          id: newSocket.id,
          transport: newSocket.io.engine?.transport?.name
        });
        
        // Don't show alert immediately - let reconnection logic handle it
        setTimeout(() => {
          if (!newSocket.connected) {
            alert('❌ Connection Error: An error occurred with the server connection.');
          }
        }, 3000);
      });

      // Add reconnection tracking
      newSocket.on('reconnect', (attemptNumber) => {
        console.log('🔄 Successfully reconnected after', attemptNumber, 'attempts');
      });

      newSocket.on('reconnect_attempt', (attemptNumber) => {
        console.log('🔄 Reconnection attempt', attemptNumber);
      });

      newSocket.on('reconnect_error', (error) => {
        console.error('🔄❌ Reconnection failed:', error);
      });

      // Cleanup on unmount
      return () => {
        console.log('🧹 Cleaning up socket connection');
        newSocket.disconnect();
      };
    }
  }, [user]); // Removed isMuted and playPickSound to prevent infinite re-renders

  // Authentication handlers
  const handleLogin = (userData) => {
    setUser(userData);
    setAppView('dashboard');
  };

  const handleLogout = () => {
    setUser(null);
    setCurrentDraft(null);
    setDraftState({
      isDraftStarted: false,
      pickHistory: [],
      draftOrder: [],
      teams: [],
      currentPick: null
    });
    setAppView('dashboard');
    localStorage.removeItem('currentUser');
    if (socket) {
      socket.disconnect();
      setSocket(null);
    }
  };

  // Draft management handlers
  const handleCreateDraft = (draftConfig) => {
    console.log('🎯 Creating draft:', draftConfig);
    console.log('🎯 Current user:', user);
    console.log('🎯 Socket available:', !!socket);
    console.log('🎯 Socket connected:', socket?.connected);
    
    setCurrentDraft(draftConfig);
    setDraftConfig(draftConfig);
    setIsCommissioner(true);
    
    console.log('🎯 Changing appView to lobby...');
    setAppView('lobby');
    
    // Join the draft room when creating
    if (socket) {
      console.log('🎯 Emitting join-lobby for new draft');
      socket.emit('join-lobby', {
        username: user.username,
        role: 'commissioner',
        draftId: draftConfig.id
      });
    } else {
      console.log('❌ No socket available when creating draft');
      console.log('❌ This might be the problem - socket connection issue');
    }
  };

  const handleJoinDraft = (draft) => {
    setCurrentDraft(draft);
    setDraftConfig(draft);
    setIsCommissioner(draft.createdBy === user.id);
    setAppView('lobby');
    
    // Join the draft room
    if (socket) {
      socket.emit('join-lobby', {
        username: user.username,
        role: draft.createdBy === user.id ? 'commissioner' : 'participant',
        draftId: draft.id
      });
    }
  };

  const handleReturnToDashboard = () => {
    setCurrentDraft(null);
    setDraftState({
      isDraftStarted: false,
      pickHistory: [],
      draftOrder: [],
      teams: [],
      currentPick: null
    });
    setDraftConfig(null);
    setIsCommissioner(false);
    setAppView('dashboard');
    
    if (socket) {
      socket.emit('leave-draft');
    }
  };

  const handleStartDraft = (config) => {
    console.log('🎯 App.jsx: handleStartDraft called');
    console.log('🔍 Validation Check:', {
      'Socket available': !!socket,
      'Socket connected': socket?.connected,
      'Is commissioner': isCommissioner,
      'Config provided': !!config,
      'Config details': config ? {
        'League name': config.leagueName,
        'League size': config.leagueSize,
        'Draft type': config.draftType,
        'Team count': config.teamNames?.length,
        'Total rounds': config.totalRounds
      } : 'No config'
    });
    
    // Validation checks
    if (!socket) {
      console.error('❌ Cannot start draft: Socket not available');
      alert('❌ Connection Error: Unable to connect to server. Please refresh the page and try again.');
      return;
    }
    
    if (!socket.connected) {
      console.error('❌ Cannot start draft: Socket not connected');
      alert('❌ Connection Error: Lost connection to server. Please refresh the page and try again.');
      return;
    }
    
    if (!isCommissioner) {
      console.error('❌ Cannot start draft: User is not commissioner');
      alert('❌ Permission Error: Only the commissioner can start the draft.');
      return;
    }
    
    if (!config) {
      console.error('❌ Cannot start draft: No draft configuration provided');
      alert('❌ Configuration Error: Draft configuration is missing. Please try again.');
      return;
    }
    
    // Validate required config fields
    const requiredFields = ['leagueName', 'leagueSize', 'draftType', 'teamNames', 'totalRounds'];
    const missingFields = requiredFields.filter(field => !config[field]);
    
    if (missingFields.length > 0) {
      console.error('❌ Cannot start draft: Missing required fields:', missingFields);
      alert(`❌ Configuration Error: Missing required fields: ${missingFields.join(', ')}`);
      return;
    }
    
    if (!config.teamNames || config.teamNames.length === 0) {
      console.error('❌ Cannot start draft: No teams configured');
      alert('❌ Configuration Error: No teams are configured for the draft.');
      return;
    }
    
    try {
      console.log('🚀 Emitting start-draft event with config:', config);
      socket.emit('start-draft', config);
      console.log('✅ start-draft event emitted successfully');
      
      // Add a timeout to check if the draft actually started
      setTimeout(() => {
        if (!draftState?.isDraftStarted) {
          console.warn('⚠️ Draft may not have started - checking state...');
          // Could add additional checks here
        }
      }, 3000);
      
    } catch (error) {
      console.error('💥 Error emitting start-draft event:', error);
      alert('❌ Error: Failed to start draft. Please try again.');
    }
  };

  const handleDraftOrderAnnouncementClose = () => {
    setShowDraftOrderAnnouncement(false);
    
    // Auto-start the draft after the announcement
    if (draftConfig && socket && isCommissioner) {
      socket.emit('start-draft', draftConfig);
    }
  };

  // Auto-draft feature for admin testing
  const handleAdminAutoDraft = () => {
    if (user?.isAdmin && socket) {
      socket.emit('admin-auto-draft', { interval: 1000 }); // 1 second intervals
    }
  };

  // Render different views based on authentication and app state
  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  if (appView === 'dashboard') {
    return (
      <Dashboard
        user={user}
        onJoinDraft={handleJoinDraft}
        onCreateDraft={handleCreateDraft}
        onLogout={handleLogout}
      />
    );
  }

  if (appView === 'lobby') {
    return (
      <>
        <DraftLobby
          user={user}
          currentDraft={currentDraft}
          isCommissioner={isCommissioner}
          participants={participants}
          socket={socket}
          onStartDraft={handleStartDraft}
          onReturnToDashboard={handleReturnToDashboard}
          onAdminAutoDraft={user?.isAdmin ? handleAdminAutoDraft : null}
        />
        
        {showDraftOrderAnnouncement && (
          <DraftOrderAnnouncement
            draftOrder={draftState?.draftOrder || []}
            teams={draftState?.teams || []}
            onClose={handleDraftOrderAnnouncementClose}
            onStartDraft={() => {
              console.log('🎯 DraftOrderAnnouncement onStartDraft callback triggered');
              console.log('🔍 Callback Debug:', {
                'Socket available': !!socket,
                'Socket connected': socket?.connected,
                'Draft config available': !!draftConfig,
                'Draft config details': draftConfig ? {
                  'League name': draftConfig.leagueName,
                  'League size': draftConfig.leagueSize,
                  'Team count': draftConfig.teamNames?.length
                } : 'No config'
              });
              
              try {
                // Start the actual draft after order announcement
                if (socket && draftConfig) {
                  console.log('🚀 Starting draft from announcement callback...');
                  socket.emit('start-draft', draftConfig);
                  console.log('✅ start-draft event emitted from callback');
                } else {
                  console.error('❌ Cannot start draft from callback:', {
                    'Socket missing': !socket,
                    'Config missing': !draftConfig
                  });
                  alert('❌ Error: Unable to start draft. Please try again.');
                  return;
                }
                
                console.log('🔒 Closing draft order announcement...');
                setShowDraftOrderAnnouncement(false);
                console.log('✅ Draft order announcement closed');
                
              } catch (error) {
                console.error('💥 Error in onStartDraft callback:', error);
                alert('❌ Error: Failed to start draft. Please try again.');
              }
            }}
          />
        )}
      </>
    );
  }

  if (appView === 'draft') {
    return (
      <>
        <DraftPage
          socket={socket}
          draftState={draftState}
          isCommissioner={isCommissioner}
          user={user}
          onReturnToDashboard={handleReturnToDashboard}
          onAdminAutoDraft={user?.isAdmin ? handleAdminAutoDraft : null}
        />
        
        {showPickAnnouncement && lastPickAnnounced && (
          <PickAnnouncement
            pick={lastPickAnnounced}
            onClose={() => setShowPickAnnouncement(false)}
            socket={socket}
          />
        )}
      </>
    );
  }

  if (appView === 'summary') {
    return (
      <DraftSummary
        draftState={draftState}
        onReturnToDashboard={handleReturnToDashboard}
      />
    );
  }

  return null;
};

const App = () => {
  return (
    <div className="bg-gray-900 min-h-screen">
      <Routes>
        <Route path="/" element={<MainApp />} />
        <Route path="/display" element={<DisplayPage />} />
        <Route path="/results/:draftId" element={<ResultsPage />} />
        <Route path="/join/:draftId/team/:teamId" element={<DirectJoinPage />} />
      </Routes>
    </div>
  );
};

export default App;
