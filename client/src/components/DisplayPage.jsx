import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { useSound } from '../hooks/useSound';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:4000';

const DisplayPage = () => {
  const [draftState, setDraftState] = useState(null);
  const [teamAssignments, setTeamAssignments] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [lastActivity, setLastActivity] = useState(Date.now());
  const socketRef = useRef(null);
  const { playPickSound, playYourTurnSound } = useSound();

  useEffect(() => {
    const socket = io(SERVER_URL, {
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });
    socketRef.current = socket;

    // Connection status handling
    socket.on('connect', () => {
      setConnectionStatus('connected');
      setLastActivity(Date.now());
    });

    socket.on('disconnect', () => {
      setConnectionStatus('disconnected');
    });

    socket.on('reconnecting', () => {
      setConnectionStatus('reconnecting');
    });

    // Draft state updates
    socket.on('draft-state', (state) => {
      setDraftState(state);
      setLastActivity(Date.now());
      playPickSound(); // Audio feedback for pick updates
    });

    // Team assignments for participant status
    socket.on('team-assignments-update', (assignments) => {
      setTeamAssignments(assignments);
      setLastActivity(Date.now());
    });

    // Participant updates
    socket.on('participants-update', (participantsList) => {
      setParticipants(participantsList);
      setLastActivity(Date.now());
    });

    // Chat messages for remote communication
    socket.on('lobby-chat-message', (message) => {
      setChatMessages(prev => [...prev.slice(-9), message]); // Keep last 10 messages
      setLastActivity(Date.now());
      if (message.isCommissioner) {
        playYourTurnSound(); // Audio for important commissioner messages
      }
    });

    // Keep-alive ping
    const pingInterval = setInterval(() => {
      if (socket.connected) {
        socket.emit('ping');
      }
    }, 30000);

    return () => {
      clearInterval(pingInterval);
      socket.close();
    };
  }, [playPickSound, playYourTurnSound]);

  const getCurrentTeam = () => {
    if (!draftState?.isDraftStarted || draftState.currentPick >= draftState.draftOrder.length) {
      return null;
    }
    const teamIndex = draftState.draftOrder[draftState.currentPick] - 1;
    return draftState.teams[teamIndex];
  };

  const getTeamStatus = (teamId) => {
    const assignment = teamAssignments.find(a => a.teamId === teamId);
    if (!assignment?.assignedUser) return 'available';
    if (assignment.assignedUser === 'LOCAL') return 'local';
    const participant = participants.find(p => p.id === assignment.assignedUser);
    return participant ? 'remote' : 'offline';
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'remote': return '📱';
      case 'local': return '🏠';
      case 'offline': return '💤';
      default: return '❓';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'remote': return 'text-blue-400 bg-blue-900';
      case 'local': return 'text-green-400 bg-green-900';
      case 'offline': return 'text-yellow-400 bg-yellow-900';
      default: return 'text-gray-400 bg-gray-700';
    }
  };

  if (!draftState) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center">
        <div className="text-center">
          <div className="text-8xl mb-8">🏈</div>
          <h1 className="text-6xl font-bold mb-4">Fantasy Football Draft</h1>
          <div className="text-3xl text-gray-400 mb-8">
            {connectionStatus === 'connecting' && 'Connecting to draft...'}
            {connectionStatus === 'connected' && 'Waiting for draft to start...'}
            {connectionStatus === 'disconnected' && 'Connection lost - Reconnecting...'}
            {connectionStatus === 'reconnecting' && 'Reconnecting...'}
          </div>
          <div className={`inline-flex items-center px-6 py-3 rounded-full text-xl ${
            connectionStatus === 'connected' ? 'bg-green-900 text-green-200' :
            connectionStatus === 'reconnecting' ? 'bg-yellow-900 text-yellow-200' :
            'bg-red-900 text-red-200'
          }`}>
            <div className={`w-4 h-4 rounded-full mr-3 ${
              connectionStatus === 'connected' ? 'bg-green-400' :
              connectionStatus === 'reconnecting' ? 'bg-yellow-400 animate-pulse' :
              'bg-red-400'
            }`}></div>
            {connectionStatus.charAt(0).toUpperCase() + connectionStatus.slice(1)}
          </div>
        </div>
      </div>
    );
  }

  if (!draftState.isDraftStarted) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-8">
        <div className="text-center max-w-4xl">
          <div className="text-8xl mb-8">🏈</div>
          <h1 className="text-6xl font-bold mb-6">{draftState.leagueName || 'Fantasy Football Draft'}</h1>
          <div className="text-3xl text-gray-400 mb-12">Draft Starting Soon...</div>
          
          {/* Participant Status Grid */}
          {participants.length > 0 && (
            <div className="bg-gray-800 rounded-2xl p-8 mb-8">
              <h2 className="text-3xl font-bold mb-6">Participants ({participants.length})</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {participants.map((participant, index) => (
                  <div key={index} className="bg-gray-700 rounded-xl p-4 text-center">
                    <div className="text-2xl mb-2">
                      {participant.role === 'commissioner' ? '👑' : '👤'}
                    </div>
                    <div className="text-xl font-medium text-white">{participant.username}</div>
                    <div className={`text-sm mt-2 px-3 py-1 rounded-full ${
                      participant.isReady ? 'bg-green-600 text-green-100' : 'bg-gray-600 text-gray-300'
                    }`}>
                      {participant.isReady ? 'Ready' : 'Not Ready'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className={`inline-flex items-center px-8 py-4 rounded-full text-2xl ${
            connectionStatus === 'connected' ? 'bg-green-900 text-green-200' : 'bg-red-900 text-red-200'
          }`}>
            <div className={`w-6 h-6 rounded-full mr-4 ${
              connectionStatus === 'connected' ? 'bg-green-400' : 'bg-red-400'
            }`}></div>
            Display Ready
          </div>
        </div>
      </div>
    );
  }

  const currentTeam = getCurrentTeam();

  return (
    <div className="min-h-screen bg-gray-900 text-white overflow-hidden">
      {/* Enhanced Header for Large Screens */}
      <div className="bg-gray-800 border-b-4 border-blue-500 px-8 py-6 relative">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-5xl font-bold text-white">{draftState.leagueName || 'Fantasy Football Draft'}</h1>
            <div className="text-2xl text-gray-300 mt-2">
              Round {Math.floor(draftState.currentPick / draftState.teams.length) + 1} • 
              Pick {(draftState.currentPick % draftState.teams.length) + 1}
            </div>
          </div>
          
          {/* Current Team On The Clock */}
          {currentTeam && (
            <div className="text-center">
              <div className="text-2xl text-blue-400 mb-2">ON THE CLOCK</div>
              <div className="bg-blue-600 rounded-2xl px-8 py-4 relative">
                <div className="text-4xl font-bold text-white">{currentTeam.name}</div>
                <div className="flex items-center justify-center mt-2">
                  <span className="text-2xl mr-2">{getStatusIcon(getTeamStatus(currentTeam.id))}</span>
                  <span className={`px-4 py-2 rounded-full text-lg font-medium ${getStatusColor(getTeamStatus(currentTeam.id))}`}>
                    {getTeamStatus(currentTeam.id).toUpperCase()}
                  </span>
                </div>
                {/* Pulsing animation for current team */}
                <div className="absolute inset-0 bg-blue-400 rounded-2xl animate-pulse opacity-20"></div>
              </div>
            </div>
          )}

          {/* Connection Status */}
          <div className="text-right">
            <div className={`inline-flex items-center px-4 py-2 rounded-full text-lg ${
              connectionStatus === 'connected' ? 'bg-green-900 text-green-200' : 'bg-red-900 text-red-200'
            }`}>
              <div className={`w-3 h-3 rounded-full mr-2 ${
                connectionStatus === 'connected' ? 'bg-green-400' : 'bg-red-400'
              }`}></div>
              LIVE
            </div>
            <div className="text-gray-400 text-sm mt-1">
              Last Update: {new Date(lastActivity).toLocaleTimeString()}
            </div>
          </div>
        </div>
      </div>

      <div className="flex h-full">
        {/* Main Draft Board - Enhanced for Large Screens */}
        <div className="flex-1 p-8">
          <div className="bg-gray-800 rounded-2xl p-6 h-full">
            <h2 className="text-3xl font-bold mb-6 text-center">Draft Board</h2>
            
            {/* Enhanced Draft Grid */}
            <div className="grid grid-cols-12 gap-2 text-center">
              {/* Team Headers */}
              {draftState.teams.map((team, index) => (
                <div key={index} className={`p-4 rounded-lg border-2 ${
                  currentTeam?.id === team.id 
                    ? 'bg-blue-600 border-blue-400 animate-pulse' 
                    : 'bg-gray-700 border-gray-600'
                }`}>
                  <div className="text-xl font-bold text-white mb-2">{team.name}</div>
                  <div className="flex items-center justify-center">
                    <span className="text-lg mr-2">{getStatusIcon(getTeamStatus(team.id))}</span>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(getTeamStatus(team.id))}`}>
                      {getTeamStatus(team.id).toUpperCase()}
                    </span>
                  </div>
                </div>
              ))}

              {/* Draft Picks Grid */}
              {Array.from({ length: draftState.totalRounds || 16 }, (_, round) => (
                draftState.teams.map((team, teamIndex) => {
                  const pickIndex = round * draftState.teams.length + teamIndex;
                  const pick = draftState.pickHistory.find(p => p.pickIndex === pickIndex);
                  const isCurrentPick = pickIndex === draftState.currentPick;
                  
                  return (
                    <div key={`${round}-${teamIndex}`} className={`p-3 rounded border text-center min-h-[80px] flex flex-col justify-center ${
                      isCurrentPick 
                        ? 'bg-blue-600 border-blue-400 animate-pulse' 
                        : pick 
                          ? 'bg-green-700 border-green-500' 
                          : 'bg-gray-700 border-gray-600'
                    }`}>
                      {pick ? (
                        <>
                          <div className="text-white font-medium text-lg">{pick.player.name}</div>
                          <div className="text-gray-300 text-sm">{pick.player.position} - {pick.player.team}</div>
                          {pick.isAutoPick && <div className="text-yellow-400 text-xs">AUTO</div>}
                        </>
                      ) : isCurrentPick ? (
                        <div className="text-white font-bold text-lg">PICKING...</div>
                      ) : (
                        <div className="text-gray-500 text-sm">{pickIndex + 1}</div>
                      )}
                    </div>
                  );
                })
              ))}
            </div>
          </div>
        </div>

        {/* Enhanced Right Panel */}
        <div className="w-96 bg-gray-800 p-6 flex flex-col">
          {/* Recent Picks */}
          <div className="mb-8">
            <h3 className="text-2xl font-bold mb-4">Recent Picks</h3>
            <div className="space-y-3">
              {draftState.pickHistory.slice(-5).reverse().map((pick, index) => (
                <div key={index} className="bg-gray-700 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-white font-medium text-lg">{pick.player.name}</div>
                      <div className="text-gray-300">{pick.player.position} - {pick.player.team}</div>
                      <div className="text-blue-400 text-sm">{pick.team.name}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-gray-400 text-sm">Pick {pick.pickIndex + 1}</div>
                      {pick.isAutoPick && (
                        <div className="text-yellow-400 text-xs bg-yellow-900 px-2 py-1 rounded">AUTO</div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Live Chat Feed for Remote Communication */}
          {chatMessages.length > 0 && (
            <div className="flex-1">
              <h3 className="text-2xl font-bold mb-4">Live Updates</h3>
              <div className="bg-gray-700 rounded-lg p-4 h-64 overflow-y-auto">
                {chatMessages.map((msg, index) => (
                  <div key={index} className="mb-3 last:mb-0">
                    <div className="flex items-center mb-1">
                      <span className={`font-medium ${msg.isCommissioner ? 'text-yellow-400' : 'text-blue-400'}`}>
                        {msg.isCommissioner ? '👑' : '💬'} {msg.username}
                      </span>
                      <span className="text-gray-500 text-xs ml-2">
                        {new Date(msg.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="text-gray-200 text-sm bg-gray-600 rounded p-2">
                      {msg.message}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Team Status Legend */}
          <div className="mt-6">
            <h3 className="text-xl font-bold mb-3">Team Status</h3>
            <div className="space-y-2">
              <div className="flex items-center">
                <span className="text-lg mr-2">📱</span>
                <span className="text-blue-400">Remote Participant</span>
              </div>
              <div className="flex items-center">
                <span className="text-lg mr-2">🏠</span>
                <span className="text-green-400">Local In-Person</span>
              </div>
              <div className="flex items-center">
                <span className="text-lg mr-2">💤</span>
                <span className="text-yellow-400">Offline/Auto-Pick</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Draft Complete Overlay */}
      {draftState.isComplete && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50">
          <div className="text-center">
            <div className="text-8xl mb-6">🏆</div>
            <h1 className="text-6xl font-bold text-white mb-4">Draft Complete!</h1>
            <div className="text-2xl text-gray-300">
              {draftState.leagueName} - {draftState.pickHistory.length} picks made
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DisplayPage;
