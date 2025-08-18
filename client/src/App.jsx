import { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { io } from 'socket.io-client';
import DraftPage from './components/DraftPage';
import Lobby from './components/Lobby';
import DraftSummary from './components/DraftSummary';
import PickAnnouncement from './components/PickAnnouncement';
import DisplayPage from './components/DisplayPage';
import ResultsPage from './components/ResultsPage';
import { useSound } from './hooks/useSound';

const SERVER_URL = process.env.REACT_APP_SERVER_URL || 'http://localhost:4000';

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
  const [socket, setSocket] = useState(null);
  const [draftState, setDraftState] = useState(null);
  const [isInLobby, setIsInLobby] = useState(true);
  const [isDraftComplete, setIsDraftComplete] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [showPickAnnouncement, setShowPickAnnouncement] = useState(false);
  const [lastPick, setLastPick] = useState(null);
  const [error, setError] = useState(null);
  const [showRecoveryMessage, setShowRecoveryMessage] = useState(false);
  const [hasCheckedRecovery, setHasCheckedRecovery] = useState(false);
  const [isCommissioner, setIsCommissioner] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [playPickSound] = useSound('/pick-sound.mp3');

  // Check for saved draft state only once on app load
  useEffect(() => {
    if (!hasCheckedRecovery) {
      const savedState = loadDraftStateFromLocal();
      if (savedState) {
        setShowRecoveryMessage(true);
      }
      setHasCheckedRecovery(true);
    }
  }, [hasCheckedRecovery]);

  useEffect(() => {
    // Connect to Socket.IO server
    const newSocket = io(SERVER_URL);
    setSocket(newSocket);

    // Listen for draft state updates
    newSocket.on('draft-state', (state) => {
      console.log('draft-state event received:', state);
      
      // Check if a new pick was made (using previous state stored in ref)
      setDraftState(prevState => {
        if (prevState && state.pickHistory && state.pickHistory.length > prevState.pickHistory.length) {
          const newPick = state.pickHistory[state.pickHistory.length - 1];
          console.log('New pick detected:', newPick);
          setLastPick(newPick);
          setShowPickAnnouncement(true);
          if (!isMuted) {
            playPickSound();
          }
        }
        return state;
      });
      
      // Handle state changes
      if (state.isDraftStarted) {
        console.log('Draft is active, staying in draft view');
        // Draft is active
        saveDraftStateToLocal(state);
        setIsInLobby(false);
        setIsDraftComplete(false);
      } else {
        console.log('Draft is not started, returning to lobby');
        // Draft is not started - return to lobby
        setIsInLobby(true);
        setIsDraftComplete(false);
        setShowRecoveryMessage(false);
      }
    });

    // Listen for draft completion
    newSocket.on('draft-complete', (state) => {
      setDraftState(state);
      setShowCompletionModal(true);
    });

    // Listen for error messages
    newSocket.on('error', (errorMessage) => {
      setError(errorMessage);
      // Clear error after 5 seconds
      setTimeout(() => setError(null), 5000);
    });

    return () => {
      newSocket.close();
    };
  }, []); // Remove draftState dependency to prevent recreating listeners

  const handleDraftStart = (draftConfig) => {
    console.log('App handleDraftStart called with config:', draftConfig);
    if (socket) {
      console.log('Emitting start-draft to server');
      socket.emit('start-draft', draftConfig);
    } else {
      console.log('No socket connection available');
    }
  };

  const handleDraftComplete = () => {
    setShowCompletionModal(false);
    setIsDraftComplete(true);
  };

  const handleReturnToLobby = () => {
    console.log('handleReturnToLobby called!');
    
    // Clear any existing draft state from localStorage
    localStorage.removeItem('fantasy-draft-state');
    
    // Clear server backup and reset state
    if (socket) {
      console.log('Emitting clear-backup to server');
      socket.emit('clear-backup');
    }
    
    // Immediately reset local state
    setDraftState(null);
    setIsInLobby(true);
    setIsDraftComplete(false);
    setShowRecoveryMessage(false);
    setShowPickAnnouncement(false);
    setLastPick(null);
    
    console.log('Local state reset complete');
  };

  const handlePickAnnouncementClose = () => {
    setShowPickAnnouncement(false);
  };

  const handleAdminLogin = () => {
    if (!draftState || !draftState.adminPassword) return;

    const password = window.prompt("Enter the admin password:");
    if (password === draftState.adminPassword) {
      setIsCommissioner(true);
      alert("Admin access granted!");
    } else {
      alert("Incorrect password.");
    }
  };

  if (isInLobby) {
    return (
      <div className="min-h-screen bg-gray-900">
        <Lobby onDraftStart={handleDraftStart} />
      </div>
    );
  }

  if (isDraftComplete) {
    return (
      <div className="min-h-screen bg-gray-900">
        <DraftSummary draftState={draftState} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Recovery Message */}
      {showRecoveryMessage && (
        <div className="fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-strong z-[60] animate-slide-down">
          <div className="flex items-center space-x-2">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <span className="font-medium">Draft state recovered! Server will restore your progress.</span>
            <button 
              onClick={() => setShowRecoveryMessage(false)}
              className="ml-2 text-white hover:text-gray-200"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Error Toast */}
      {error && (
        <div className="fixed top-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-strong z-[60] animate-slide-down">
          <div className="flex items-center space-x-2">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <span className="font-medium">{error}</span>
          </div>
        </div>
      )}
      
      {/* Pick Announcement Modal */}
      {showPickAnnouncement && lastPick && (
        <PickAnnouncement 
          pick={lastPick} 
          onClose={handlePickAnnouncementClose}
          draftState={draftState}
          socket={socket}
        />
      )}
      
      {/* Draft Completion Modal */}
      {showCompletionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-gray-800 rounded-xl p-8 max-w-md mx-4 shadow-strong animate-bounce-in border border-gray-700">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-900 mb-4">
                <svg className="h-6 w-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-white mb-4">Draft Complete!</h2>
              <p className="text-gray-300 mb-6">
                All 192 picks have been made. The draft is now complete!
              </p>
              <button
                onClick={handleDraftComplete}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors duration-200 shadow-soft hover:shadow-medium"
              >
                View Final Results
              </button>
            </div>
          </div>
        </div>
      )}
      
      <DraftPage 
        socket={socket} 
        draftState={draftState} 
        onReturnToLobby={handleReturnToLobby}
        isCommissioner={isCommissioner}
        onAdminLogin={handleAdminLogin}
        isMuted={isMuted}
        setIsMuted={setIsMuted}
      />
    </div>
  );
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<MainApp />} />
      <Route path="/display" element={<DisplayPage />} />
      <Route path="/results" element={<ResultsPage />} />
    </Routes>
  );
}

export default App;
