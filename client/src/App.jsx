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
import ConnectionStatus from './components/ConnectionStatus';

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
  const [serverStatus, setServerStatus] = useState('connecting'); // 'connecting', 'connected', 'disconnected', 'waking'
  
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
      setServerStatus('waking');
      
      // Enhanced server wake-up with multiple attempts and better feedback
      const wakeUpServer = async () => {
        console.log('📞 Pinging server to wake up if needed:', SERVER_URL);
        
        try {
          // First health check with extended timeout for cold starts
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 35000); // Increased to 35 seconds
          
          const response = await fetch(SERVER_URL + '/health', {
            signal: controller.signal,
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
            // Add cache-busting headers
            cache: 'no-cache',
            mode: 'cors'
          });
          
          clearTimeout(timeoutId);
          
          if (response.ok) {
            const data = await response.json();
            console.log('✅ Server is awake and responding:', data);
            setServerStatus('connecting');
            return true;
          } else {
            console.warn('⚠️ Server responded but not healthy:', response.status);
            return false;
          }
        } catch (error) {
          if (error.name === 'AbortError') {
            console.log('⏰ Server health check timed out - server likely sleeping, giving it more time...');
          } else {
            console.log('⏰ Server health check failed, server is likely waking up:', error.message);
          }
          return false;
        }
      };
      
      // Try to wake up server before connecting Socket.IO
      wakeUpServer().then((isAwake) => {
        if (!isAwake) {
          console.log('⏰ Server may be cold starting, proceeding with Socket.IO connection...');
          setServerStatus('connecting');
        }
        
        // Connect to Socket.IO server when user logs in
        console.log('🔌 Connecting to server:', SERVER_URL);
        const newSocket = io(SERVER_URL, {
          // Enhanced settings for Render free tier cold starts
          timeout: 45000, // Increased to 45 seconds for cold starts
          reconnection: true,
          reconnectionAttempts: 20, // Increased attempts
          reconnectionDelay: 3000, // Start with 3 second delay
          reconnectionDelayMax: 15000, // Max 15 second delay
          maxReconnectionAttempts: 20,
          transports: ['polling', 'websocket'], // Try polling first for cold starts
          forceNew: true, // Force new connection to prevent cached issues
          upgrade: true, // Allow transport upgrade
          rememberUpgrade: false, // Don't remember upgrade to force fresh connection
          pingTimeout: 60000, // 60 second ping timeout
          pingInterval: 25000 // 25 second ping interval
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
            'Pick history length': state.pickHistory?.length,
            'Is complete': state.isComplete,
            'Status': state.status
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
            
            // Update draft status in localStorage
            const savedDrafts = JSON.parse(localStorage.getItem('drafts') || '[]');
            const updatedDrafts = savedDrafts.map(draft => {
              if (draft.id === currentDraft?.id) {
                return { ...draft, status: 'in_progress' };
              }
              return draft;
            });
            localStorage.setItem('drafts', JSON.stringify(updatedDrafts));
            
            setAppView('draft');
            setIsInLobby(false);
            
            // Check if draft is actually complete - preserve completion status
            if (state.isComplete || state.status === 'completed') {
              console.log('🏁 Draft is complete, preserving completion status');
              setIsDraftComplete(true);
            } else {
              setIsDraftComplete(false);
            }
          } else {
            console.log('⏸️ Draft is not started, staying in lobby');
            setAppView('lobby');
            setIsInLobby(true);
            
            // Check if draft is complete even when not started - preserve completion status
            if (state.isComplete || state.status === 'completed') {
              console.log('🏁 Draft is complete, preserving completion status');
              setIsDraftComplete(true);
            } else {
              setIsDraftComplete(false);
            }
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

      newSocket.on('draft-complete', (draftState) => {
        console.log('🏁 Draft completed, updating draft state');
        setIsDraftComplete(true);
        setDraftState(draftState);
        
        // Update draft status in localStorage
        const savedDrafts = JSON.parse(localStorage.getItem('drafts') || '[]');
        const updatedDrafts = savedDrafts.map(draft => {
          if (draft.id === currentDraft?.id) {
            return { ...draft, status: 'completed' };
          }
          return draft;
        });
        localStorage.setItem('drafts', JSON.stringify(updatedDrafts));
        
        // Stay in current view (lobby or draft) to show completion banner
      });

      newSocket.on('draft-state-response', (draftState) => {
        console.log('📡 Received draft state response:', draftState);
        setDraftState(draftState);
        if (draftState?.isComplete) {
          setIsDraftComplete(true);
        }
      });

      // Add connection status listeners
      newSocket.on('connect', () => {
        console.log('🔗 Socket connected successfully');
        setServerStatus('connected');
      });

      newSocket.on('disconnect', (reason) => {
        console.log('🔌 Socket disconnected:', reason);
        setServerStatus('disconnected');
        if (reason === 'io server disconnect') {
          // the disconnection was initiated by the server, you need to reconnect manually
          console.log('🔄 Server initiated disconnect, attempting to reconnect...');
          setServerStatus('connecting');
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
          setServerStatus('waking');
          
          // Show user-friendly message for cold starts
          setTimeout(() => {
            if (!newSocket.connected) {
              console.log('⏰ Server is still starting up - this can take up to 2 minutes on free tier');
              setServerStatus('waking');
            }
          }, 15000);
          
          setTimeout(() => {
            if (!newSocket.connected) {
              console.log('⏰ Extended cold start - server may need more time to initialize');
              setServerStatus('waking');
            }
          }, 30000);
        } else {
          setServerStatus('disconnected');
          setTimeout(() => {
            if (!newSocket.connected) {
              console.warn('❌ Persistent connection issue - server may be down');
              setServerStatus('disconnected');
            }
          }, 15000); // Increased timeout for cold starts
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

      // Enhanced reconnection tracking with status updates
      newSocket.on('reconnect', (attemptNumber) => {
        console.log('🔄 Successfully reconnected after', attemptNumber, 'attempts');
        setServerStatus('connected');
        
        // Re-join the current draft room if we were in one
        if (currentDraft && user) {
          console.log('🔄 Re-joining draft room after reconnection');
          newSocket.emit('join-lobby', {
            username: user.username,
            role: isCommissioner ? 'commissioner' : 'participant',
            draftId: currentDraft.id
          });
          
          // Request current draft state to restore completion status
          setTimeout(() => {
            console.log('🔄 Requesting current draft state after reconnection');
            newSocket.emit('request-draft-state', { draftId: currentDraft.id });
          }, 1000);
        }
      });

      newSocket.on('reconnect_attempt', (attemptNumber) => {
        console.log('🔄 Reconnection attempt', attemptNumber, 'of 15');
        setServerStatus('connecting');
        
        // Show user feedback after several attempts
        if (attemptNumber === 5) {
          console.log('📝 Multiple reconnection attempts - server may be experiencing cold start delays');
        } else if (attemptNumber === 10) {
          console.log('📝 Extended reconnection attempts - please be patient as server starts up');
        }
      });

      newSocket.on('reconnect_error', (error) => {
        console.error('🔄❌ Reconnection failed:', error);
        setServerStatus('disconnected');
      });

      newSocket.on('reconnect_failed', () => {
        console.error('🔄❌ All reconnection attempts failed');
        setServerStatus('disconnected');
        alert('❌ Connection Lost: Unable to reconnect to server after multiple attempts. Please refresh the page.');
      });

        // Cleanup on unmount
        return () => {
          console.log('🧹 Cleaning up socket connection');
          newSocket.disconnect();
        };
      });
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

  const handleRetryConnection = () => {
    console.log('🔄 User requested connection retry');
    setServerStatus('connecting');
    // The socket will automatically attempt to reconnect
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
    
    // IMPORTANT: Send the draft to the server so it appears in the API
    if (socket) {
      console.log('🎯 Sending draft to server via create-draft event');
      socket.emit('create-draft', {
        ...draftConfig,
        commissionerName: user.username,
        commissionerSocketId: socket.id,
        createdAt: new Date().toISOString()
      });
      
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

  const handleReturnToLobby = () => {
    console.log('🎯 Returning to lobby for draft:', currentDraft?.id);
    setAppView('lobby');
    
    if (socket) {
      // Rejoin the draft room to get latest state
      socket.emit('join-lobby', { draftId: currentDraft?.id });
    }
  };

  const handleForceCompleteDraft = () => {
    if (!socket || !draftState?.id) {
      alert('❌ Cannot force complete: No active draft or connection.');
      return;
    }
    
    if (confirm('⚠️ Are you sure you want to force complete this draft? This action cannot be undone.')) {
      console.log('🔧 Force completing draft:', draftState.id);
      socket.emit('force-complete-draft', { draftId: draftState.id });
    }
  };

  const handleStartDraft = (config) => {
    console.log('🎯 App.jsx: handleStartDraft called');
    console.log('🔍 Validation Check:', {
      'Socket available': !!socket,
      'Socket connected': socket?.connected,
      'Server status': serverStatus,
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
    
    // Check if this is joining an existing draft vs starting a new one
    const isJoiningExistingDraft = draftState?.isDraftStarted || draftState?.status === 'in_progress';
    
    if (isJoiningExistingDraft) {
      console.log('🏈 Joining existing draft - emitting join-draft event');
      
      // Validation checks for joining existing draft
      if (!socket) {
        console.error('❌ Cannot join draft: Socket not available');
        alert('❌ Connection Error: Unable to connect to server. Please refresh the page and try again.');
        return;
      }
      
      if (!socket.connected) {
        console.error('❌ Cannot join draft: Socket not connected');
        alert('❌ Connection Error: Lost connection to server. Please refresh the page and try again.');
        return;
      }
      
      if (!config?.id) {
        console.error('❌ Cannot join draft: No draft ID provided');
        alert('❌ Error: Draft ID is missing. Please try again.');
        return;
      }
      
      try {
        console.log('📥 Emitting join-draft event for draft:', config.id);
        socket.emit('join-draft', { draftId: config.id });
        console.log('✅ join-draft event emitted successfully');
        
        // Transition to draft view
        setAppView('draft');
        
      } catch (error) {
        console.error('💥 Error emitting join-draft event:', error);
        alert('❌ Error: Failed to join draft. Please try again.');
      }
      
      return;
    }
    
    // Enhanced server status validation for starting new draft
    if (serverStatus === 'waking') {
      console.error('❌ Cannot start draft: Server is still waking up from cold start');
      alert('⏰ Server Starting: The server is waking up from sleep. Please wait a moment and try again.');
      return;
    }
    
    if (serverStatus === 'connecting') {
      console.error('❌ Cannot start draft: Still connecting to server');
      alert('🔄 Connecting: Still establishing connection to server. Please wait a moment and try again.');
      return;
    }
    
    if (serverStatus === 'disconnected') {
      console.error('❌ Cannot start draft: Server is disconnected');
      alert('❌ Connection Error: Lost connection to server. Please refresh the page and try again.');
      return;
    }
    
    // Validation checks for starting new draft
    if (!socket) {
      console.error('❌ Cannot start draft: Socket not available');
      alert('❌ Connection Error: Unable to connect to server. Please refresh the page and try again.');
      return;
    }
    
    if (!socket.connected) {
      console.error('❌ Cannot start draft: Socket not connected');
      console.error('🎯 Socket connected:', socket.connected);
      
      // Provide more specific feedback based on server status
      if (serverStatus === 'waking') {
        console.error('❌ Server cold start detected - waiting for server to wake up...');
        alert('⏰ Server is starting up. Please wait 1-2 minutes for the server to fully wake up, then try starting the draft again.');
        return;
      } else if (serverStatus === 'connecting') {
        alert('🔄 Connecting to server. Please wait for the connection to establish, then try starting the draft again.');
        return;
      } else if (serverStatus === 'disconnected') {
        alert('❌ Connection lost. Please check your internet connection and try again.');
        return;
      } else {
        alert('❌ Connection Error: Lost connection to server. Please refresh the page and try again.');
        return;
      }
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

  // Draft completion verification function
  const verifyDraftCompletion = () => {
    if (!draftState) return false;
    
    const totalPicks = draftState.draftOrder?.length || 0;
    const currentPick = draftState.currentPick || 0;
    const isComplete = draftState.isComplete || false;
    const status = draftState.status || '';
    const pickHistoryLength = draftState.pickHistory?.length || 0;
    
    console.log('🔍 Draft completion verification:', {
      totalPicks,
      currentPick,
      isComplete,
      status,
      pickHistoryLength,
      calculatedComplete: currentPick >= totalPicks,
      finalVerification: isComplete || status === 'completed' || currentPick >= totalPicks
    });
    
    return isComplete || status === 'completed' || (currentPick >= totalPicks && totalPicks > 0);
  };

  // Auto-draft feature for admin testing
  const handleAdminAutoDraft = () => {
    if (user?.isAdmin && socket && draftState?.id) {
      console.log('🔧 Starting admin auto-draft for draft:', draftState.id);
      socket.emit('admin-auto-draft', { 
        draftId: draftState.id, 
        interval: 100 
      }); // 0.1 second intervals (100ms)
    } else {
      console.warn('❌ Admin auto-draft blocked:', {
        'Has admin access': !!user?.isAdmin,
        'Socket connected': !!socket,
        'Draft state available': !!draftState?.id
      });
      if (!draftState?.id) {
        alert('❌ Error: No active draft found. Please start a draft first.');
      }
    }
  };

  // Render different views based on authentication and app state
  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  if (appView === 'dashboard') {
    return (
      <>
        <Dashboard
          user={user}
          onJoinDraft={handleJoinDraft}
          onCreateDraft={handleCreateDraft}
          onLogout={handleLogout}
        />
        <ConnectionStatus 
          serverStatus={serverStatus} 
          onRetry={handleRetryConnection}
        />
      </>
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
          isDraftComplete={
            draftState?.isComplete || 
            draftState?.status === 'completed' ||
            (draftState?.currentPick >= draftState?.draftOrder?.length && draftState?.draftOrder?.length > 0) || 
            false
          }
          draftState={draftState}
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
          onReturnToLobby={handleReturnToLobby}
          onForceCompleteDraft={handleForceCompleteDraft}
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
        <Route path="/results" element={<ResultsPage />} />
        <Route path="/join/:draftId/team/:teamId" element={<DirectJoinPage />} />
      </Routes>
    </div>
  );
};

export default App;
