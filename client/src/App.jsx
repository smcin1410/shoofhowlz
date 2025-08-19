import { useState, useEffect } from 'react';
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
  const [draftState, setDraftState] = useState(null);
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
  
  const { playPickSound, playTimerSound, playYourTurnSound, toggleMute, isMuted } = useSound();

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
      const newSocket = io(SERVER_URL);
      setSocket(newSocket);

      // Listen for draft state updates
      newSocket.on('draft-state', (state) => {
        console.log('draft-state event received:', state);
        
        // Check if a new pick was made
        setDraftState(prevState => {
          if (prevState && state.pickHistory && state.pickHistory.length > prevState.pickHistory.length) {
            const newPick = state.pickHistory[state.pickHistory.length - 1];
            console.log('New pick detected:', newPick);
            setLastPickAnnounced(newPick);
            setShowPickAnnouncement(true);
            if (!isMuted) {
              playPickSound();
            }
          }
          return state;
        });
        
        // Handle state changes
        if (state.isDraftStarted) {
          console.log('Draft is active, moving to draft view');
          saveDraftStateToLocal(state);
          setAppView('draft');
          setIsInLobby(false);
          setIsDraftComplete(false);
        } else {
          console.log('Draft is not started, staying in lobby');
          setAppView('lobby');
          setIsInLobby(true);
          setIsDraftComplete(false);
        }
      });

      newSocket.on('draft-order-generated', (data) => {
        setDraftState(prevState => ({ ...prevState, draftOrder: data.draftOrder }));
        setShowDraftOrderAnnouncement(true);
        
        // Store the draft config for starting after animation
        setDraftConfig(data.draftConfig);
      });

      newSocket.on('participants-update', (participantsList) => {
        setParticipants(participantsList);
        setConnectedParticipantsCount(participantsList.length);
      });

      newSocket.on('draft-complete', () => {
        setIsDraftComplete(true);
        setAppView('summary');
      });

      // Cleanup on unmount
      return () => {
        newSocket.disconnect();
      };
    }
  }, [user, isMuted, playPickSound]);

  // Authentication handlers
  const handleLogin = (userData) => {
    setUser(userData);
    setAppView('dashboard');
  };

  const handleLogout = () => {
    setUser(null);
    setCurrentDraft(null);
    setDraftState(null);
    setAppView('dashboard');
    localStorage.removeItem('currentUser');
    if (socket) {
      socket.disconnect();
      setSocket(null);
    }
  };

  // Draft management handlers
  const handleCreateDraft = (draftConfig) => {
    console.log('Creating draft:', draftConfig);
    setCurrentDraft(draftConfig);
    setDraftConfig(draftConfig);
    setIsCommissioner(true);
    setAppView('lobby');
    
    // Join the draft room when creating
    if (socket) {
      console.log('Emitting join-lobby for new draft');
      socket.emit('join-lobby', {
        username: user.username,
        role: 'commissioner',
        draftId: draftConfig.id
      });
    } else {
      console.log('No socket available when creating draft');
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
    setDraftState(null);
    setDraftConfig(null);
    setIsCommissioner(false);
    setAppView('dashboard');
    
    if (socket) {
      socket.emit('leave-draft');
    }
  };

  const handleStartDraft = (config) => {
    console.log('handleStartDraft called');
    console.log('Socket available:', !!socket);
    console.log('Is commissioner:', isCommissioner);
    console.log('Config:', config);
    
    if (socket && isCommissioner) {
      console.log('Emitting start-draft event');
      socket.emit('start-draft', config);
    } else {
      console.log('Cannot start draft - missing socket or not commissioner');
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
      </Routes>
    </div>
  );
};

export default App;
