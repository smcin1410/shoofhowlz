import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:4000';

const DirectJoinPage = () => {
  const { draftId, teamId } = useParams();
  const navigate = useNavigate();
  const [socket, setSocket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [draftState, setDraftState] = useState(null);
  const [teamAssignments, setTeamAssignments] = useState([]);
  const [user, setUser] = useState(null);
  const [username, setUsername] = useState('');
  const [connectionStatus, setConnectionStatus] = useState('connecting');

  // Mobile-optimized direct join flow
  useEffect(() => {
    const initializeDirectJoin = async () => {
      try {
        // Create socket connection with mobile optimization
        const newSocket = io(SERVER_URL, {
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 2000,
          forceNew: true,
          transports: ['websocket', 'polling'], // Fallback for mobile networks
        });

        setSocket(newSocket);

        // Connection status handling
        newSocket.on('connect', () => {
          setConnectionStatus('connected');
          setLoading(false);
        });

        newSocket.on('disconnect', () => {
          setConnectionStatus('disconnected');
        });

        newSocket.on('reconnecting', () => {
          setConnectionStatus('reconnecting');
        });

        // Listen for draft state
        newSocket.on('draft-state', (state) => {
          setDraftState(state);
        });

        // Listen for team assignments
        newSocket.on('team-assignments-update', (assignments) => {
          setTeamAssignments(assignments);
        });

        // Handle direct join validation
        newSocket.on('direct-join-validation', (data) => {
          if (data.success) {
            // Team assignment found, proceed with direct join
            setUser({
              username: data.username,
              role: 'participant',
              teamId: teamId,
              isDirectJoin: true
            });
          } else {
            setError(data.message || 'Unable to join this team directly');
          }
        });

        // Validate direct join capability
        newSocket.emit('validate-direct-join', {
          draftId,
          teamId: parseInt(teamId),
        });

      } catch (err) {
        setError('Connection failed. Please check your internet connection.');
        setLoading(false);
      }
    };

    initializeDirectJoin();

    return () => {
      if (socket) {
        socket.close();
      }
    };
  }, [draftId, teamId]);

  const handleUsernameSubmit = (e) => {
    e.preventDefault();
    if (!username.trim()) {
      setError('Please enter your name');
      return;
    }

    if (socket) {
      // Attempt to claim the pre-assigned team
      socket.emit('direct-join-team', {
        draftId,
        teamId: parseInt(teamId),
        username: username.trim(),
        isDirectJoin: true
      });

      // Set user state
      setUser({
        username: username.trim(),
        role: 'participant',
        teamId: teamId,
        isDirectJoin: true
      });

      // Save to localStorage for persistence
      localStorage.setItem('currentUser', JSON.stringify({
        username: username.trim(),
        role: 'participant',
        teamId: teamId,
        isDirectJoin: true
      }));
    }
  };

  const handleJoinLobby = () => {
    navigate(`/lobby/${draftId}`);
  };

  const handleJoinDraft = () => {
    navigate(`/draft/${draftId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <div className="text-6xl mb-6">🏈</div>
          <h1 className="text-2xl font-bold mb-4">Joining Draft...</h1>
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="text-gray-400 mt-4">Connecting to your team</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <div className="text-6xl mb-6">❌</div>
          <h1 className="text-2xl font-bold mb-4">Join Failed</h1>
          <p className="text-gray-400 mb-6">{error}</p>
          <button
            onClick={handleJoinLobby}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium w-full"
          >
            Join Lobby Instead
          </button>
        </div>
      </div>
    );
  }

  if (!user) {
    // Mobile-optimized username entry
    const assignedTeam = teamAssignments.find(t => t.teamId === parseInt(teamId));
    
    return (
      <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">🏈</div>
            <h1 className="text-2xl font-bold mb-2">Quick Team Join</h1>
            {assignedTeam && (
              <div className="bg-gray-800 rounded-lg p-4 mb-4">
                <div className="text-lg font-medium text-blue-400">
                  Team {assignedTeam.teamId}: {assignedTeam.teamName}
                </div>
                <div className="text-sm text-gray-400 mt-1">
                  Pre-assigned for you
                </div>
              </div>
            )}
          </div>

          <form onSubmit={handleUsernameSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Enter Your Name
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Your name"
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
                autoFocus
                required
              />
            </div>

            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg font-medium text-lg"
            >
              Join My Team
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={handleJoinLobby}
              className="text-gray-400 hover:text-white text-sm"
            >
              Need to choose a different team? Join lobby instead
            </button>
          </div>

          <div className={`mt-4 flex items-center justify-center text-sm ${
            connectionStatus === 'connected' ? 'text-green-400' : 'text-red-400'
          }`}>
            <div className={`w-2 h-2 rounded-full mr-2 ${
              connectionStatus === 'connected' ? 'bg-green-400' : 'bg-red-400'
            }`}></div>
            {connectionStatus.charAt(0).toUpperCase() + connectionStatus.slice(1)}
          </div>
        </div>
      </div>
    );
  }

  // User joined successfully - show draft status
  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4">
      <div className="text-center max-w-sm">
        <div className="text-6xl mb-6">✅</div>
        <h1 className="text-2xl font-bold mb-4">Team Joined!</h1>
        
        {assignedTeam && (
          <div className="bg-green-800 rounded-lg p-4 mb-6">
            <div className="text-lg font-medium text-white">
              {assignedTeam.teamName}
            </div>
            <div className="text-sm text-green-200 mt-1">
              Welcome, {user.username}!
            </div>
          </div>
        )}

        <div className="space-y-3">
          {draftState?.isDraftStarted ? (
            <button
              onClick={handleJoinDraft}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium"
            >
              🏈 Join Draft Now
            </button>
          ) : (
            <button
              onClick={handleJoinLobby}
              className="w-full bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-medium"
            >
              📋 Wait in Lobby
            </button>
          )}
        </div>

        <p className="text-gray-400 text-sm mt-4">
          {draftState?.isDraftStarted 
            ? 'Draft is in progress - jump right in!'
            : 'Draft hasn\'t started yet - hang tight!'
          }
        </p>
      </div>
    </div>
  );
};

export default DirectJoinPage;
