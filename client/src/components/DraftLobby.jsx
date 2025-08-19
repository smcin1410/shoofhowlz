import { useState, useEffect } from 'react';

const DraftLobby = ({
  user,
  currentDraft,
  isCommissioner,
  participants,
  socket,
  onStartDraft,
  onReturnToDashboard,
  onAdminAutoDraft
}) => {
  const [chatMessages, setChatMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isReady, setIsReady] = useState(false);
  const [showDraftOrderModal, setShowDraftOrderModal] = useState(false);
  const [draftOrderType, setDraftOrderType] = useState('random');
  const [manualDraftOrder, setManualDraftOrder] = useState([]);
  const [teamAssignments, setTeamAssignments] = useState([]);

  // Initialize team assignments and manual draft order
  useEffect(() => {
    if (currentDraft) {
      const assignments = currentDraft.teamNames.map((name, index) => ({
        teamId: index + 1,
        teamName: name,
        assignedUser: null
      }));
      setTeamAssignments(assignments);
      setManualDraftOrder(assignments.map((_, index) => index + 1));
    }
  }, [currentDraft]);

  // Socket event listeners
  useEffect(() => {
    if (!socket) return;

    // Chat functionality
    socket.on('lobby-chat-message', (message) => {
      setChatMessages(prev => [...prev, message]);
    });

    socket.on('chat-history', (history) => {
      setChatMessages(history);
    });

    socket.on('participants-update', (participantsList) => {
      // Update local participant state is handled by parent
    });

    socket.on('team-assignments-update', (assignments) => {
      setTeamAssignments(assignments);
    });

    // Request chat history when joining
    socket.emit('request-chat-history', { draftId: currentDraft?.id });

    return () => {
      socket.off('lobby-chat-message');
      socket.off('chat-history');
      socket.off('participants-update');
      socket.off('team-assignments-update');
    };
  }, [socket, currentDraft?.id]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (newMessage.trim() && socket) {
      socket.emit('lobby-chat-message', {
        draftId: currentDraft?.id,
        username: user.username,
        message: newMessage.trim(),
        timestamp: new Date().toISOString(),
        isCommissioner
      });
      setNewMessage('');
    }
  };

  const handleReadyToggle = () => {
    const newReadyState = !isReady;
    setIsReady(newReadyState);
    if (socket) {
      socket.emit('set-ready-status', {
        draftId: currentDraft?.id,
        username: user.username,
        isReady: newReadyState
      });
    }
  };

  const handleAssignTeam = (teamIndex, userId) => {
    const newAssignments = [...teamAssignments];
    newAssignments[teamIndex] = {
      ...newAssignments[teamIndex],
      assignedUser: userId
    };
    setTeamAssignments(newAssignments);
    
    // Emit team assignment to server
    if (socket) {
      socket.emit('assign-team', {
        draftId: currentDraft?.id,
        teamId: teamIndex + 1,
        assignedUser: userId,
        assignedBy: user.username
      });
    }
  };

  const handleClaimTeam = (teamIndex) => {
    if (socket) {
      socket.emit('claim-team', {
        draftId: currentDraft?.id,
        teamId: teamIndex + 1,
        userId: user.username,
        claimedBy: user.username
      });
    }
  };

  const handleStartDraftFlow = () => {
    setShowDraftOrderModal(true);
  };

  const handleDraftOrderSelection = () => {
    const draftConfig = {
      ...currentDraft,
      draftOrderType,
      manualDraftOrder: draftOrderType === 'manual' ? manualDraftOrder : null,
      teamAssignments
    };

    console.log('Draft order selection:', draftOrderType);
    console.log('Draft config:', draftConfig);
    console.log('Socket available:', !!socket);

    if (draftOrderType === 'random') {
      // Emit generate draft order event first
      console.log('Emitting generate-draft-order event');
      socket.emit('generate-draft-order', draftConfig);
      setShowDraftOrderModal(false);
      // The start will happen after the draft order animation
    } else {
      // Start with manual order immediately
      console.log('Starting draft with manual order');
      onStartDraft(draftConfig);
      setShowDraftOrderModal(false);
    }
  };

  const moveDraftOrderUp = (index) => {
    if (index > 0) {
      const newOrder = [...manualDraftOrder];
      [newOrder[index], newOrder[index - 1]] = [newOrder[index - 1], newOrder[index]];
      setManualDraftOrder(newOrder);
    }
  };

  const moveDraftOrderDown = (index) => {
    if (index < manualDraftOrder.length - 1) {
      const newOrder = [...manualDraftOrder];
      [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
      setManualDraftOrder(newOrder);
    }
  };

  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const allParticipantsReady = participants.length >= 2 && participants.every(p => p.isReady);

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-white">{currentDraft?.leagueName}</h1>
            <p className="text-gray-300">
              Draft Lobby • {currentDraft?.leagueSize} Teams • {currentDraft?.draftType} Draft
              {currentDraft?.draftDateTime && (
                <span className="ml-4 text-blue-400">
                  Scheduled: {formatDateTime(currentDraft.draftDateTime)}
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center space-x-4">
            {isCommissioner && (
              <span className="bg-yellow-600 text-yellow-100 px-3 py-1 rounded-full text-sm font-medium">
                👑 Commissioner
              </span>
            )}
            {onAdminAutoDraft && (
              <button
                onClick={onAdminAutoDraft}
                className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                🧪 Admin Auto Draft
              </button>
            )}
            <button
              onClick={onReturnToDashboard}
              className="bg-gray-600 hover:bg-gray-500 text-white px-4 py-2 rounded-md font-medium"
            >
              ← Dashboard
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          
          {/* Left Column - Draft Information & Team Assignments */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Draft Configuration Summary */}
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
              <h2 className="text-xl font-semibold text-white mb-4">Draft Configuration</h2>
              <div className="grid md:grid-cols-4 gap-4 text-sm">
                <div className="text-center p-3 bg-gray-700 rounded">
                  <div className="text-gray-400">Teams</div>
                  <div className="text-white font-medium">{currentDraft?.leagueSize}</div>
                </div>
                <div className="text-center p-3 bg-gray-700 rounded">
                  <div className="text-gray-400">Rounds</div>
                  <div className="text-white font-medium">{currentDraft?.totalRounds}</div>
                </div>
                <div className="text-center p-3 bg-gray-700 rounded">
                  <div className="text-gray-400">Timer</div>
                  <div className="text-white font-medium">{currentDraft?.timeClock} min</div>
                </div>
                <div className="text-center p-3 bg-gray-700 rounded">
                  <div className="text-gray-400">Type</div>
                  <div className="text-white font-medium">{currentDraft?.draftType}</div>
                </div>
              </div>
            </div>

            {/* Team Management */}
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
              <h2 className="text-xl font-semibold text-white mb-4">
                {isCommissioner ? 'Team Management' : 'Team Selection'}
              </h2>
              
              {isCommissioner ? (
                <>
                  <p className="text-gray-400 text-sm mb-4">
                    Assign participants to teams or mark teams as "Local" for in-person players.
                  </p>
                  <div className="grid md:grid-cols-1 gap-3">
                    {teamAssignments.map((assignment, index) => (
                      <div key={index} className="flex items-center space-x-3 p-3 bg-gray-700 rounded">
                        <span className="text-white font-medium w-20">
                          Team {assignment.teamId}:
                        </span>
                        <span className="text-gray-300 flex-1">{assignment.teamName}</span>
                        <select
                          value={assignment.assignedUser || ''}
                          onChange={(e) => handleAssignTeam(index, e.target.value || null)}
                          className="bg-gray-600 text-white text-sm px-2 py-1 rounded border border-gray-500 min-w-32"
                        >
                          <option value="">Available</option>
                          <option value="LOCAL">🏠 Local Player</option>
                          {participants.map(participant => (
                            <option key={participant.id} value={participant.id}>
                              {participant.username}
                            </option>
                          ))}
                        </select>
                        {assignment.assignedUser && assignment.assignedUser !== 'LOCAL' && (
                          <span className="text-green-400 text-xs">✓ Assigned</span>
                        )}
                        {assignment.assignedUser === 'LOCAL' && (
                          <span className="text-blue-400 text-xs">🏠 Local</span>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <p className="text-gray-400 text-sm mb-4">
                    Click "Claim" to select your team. You can only claim one team.
                  </p>
                  <div className="grid md:grid-cols-1 gap-3">
                    {teamAssignments.map((assignment, index) => {
                      const isClaimedByMe = assignment.assignedUser === user.username;
                      const isClaimed = assignment.assignedUser && assignment.assignedUser !== 'LOCAL';
                      const isLocal = assignment.assignedUser === 'LOCAL';
                      const canClaim = !isClaimed && !isLocal;
                      const alreadyClaimedTeam = teamAssignments.some(t => t.assignedUser === user.username);
                      
                      return (
                        <div key={index} className={`flex items-center justify-between p-3 rounded border ${
                          isClaimedByMe ? 'bg-green-700 border-green-600' : 
                          isClaimed ? 'bg-gray-700 border-gray-600' :
                          isLocal ? 'bg-blue-700 border-blue-600' :
                          'bg-gray-700 border-gray-600'
                        }`}>
                          <div className="flex items-center space-x-3">
                            <span className="text-white font-medium">
                              Team {assignment.teamId}: {assignment.teamName}
                            </span>
                            {isClaimedByMe && (
                              <span className="text-green-200 text-sm">✓ Your Team</span>
                            )}
                            {isClaimed && !isClaimedByMe && (
                              <span className="text-gray-400 text-sm">Claimed by {assignment.assignedUser}</span>
                            )}
                            {isLocal && (
                              <span className="text-blue-200 text-sm">🏠 Local Player</span>
                            )}
                          </div>
                          
                          {canClaim && !alreadyClaimedTeam && (
                            <button
                              onClick={() => handleClaimTeam(index)}
                              className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm"
                            >
                              Claim Team
                            </button>
                          )}
                          
                          {isClaimedByMe && (
                            <button
                              onClick={() => handleAssignTeam(index, null)}
                              className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm"
                            >
                              Release
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  
                  {teamAssignments.some(t => t.assignedUser === user.username) && (
                    <div className="mt-4 p-3 bg-green-800 border border-green-600 rounded">
                      <p className="text-green-200 text-sm">
                        ✓ You have claimed your team! You're ready for the draft.
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Start Draft Section (Commissioner Only) */}
            {isCommissioner && (
              <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
                <h2 className="text-xl font-semibold text-white mb-4">Start Draft</h2>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-300 mb-2">
                      {participants.length} participants connected
                      {allParticipantsReady && (
                        <span className="text-green-400 ml-2">✓ All ready</span>
                      )}
                    </p>
                    <p className="text-gray-400 text-sm">
                      Draft can start anytime. Late participants will be auto-picked until they join.
                    </p>
                  </div>
                  <button
                    onClick={handleStartDraftFlow}
                    className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-md font-medium"
                  >
                    🏈 Start Draft
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Participants & Chat */}
          <div className="space-y-6">
            
            {/* Participants */}
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-white mb-4">
                Participants ({participants.length})
              </h2>
              <div className="space-y-3">
                {participants.map((participant, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-700 rounded">
                    <div className="flex items-center space-x-3">
                      <div className={`w-3 h-3 rounded-full ${participant.isReady ? 'bg-green-400' : 'bg-gray-400'}`}></div>
                      <span className="text-white font-medium">{participant.username}</span>
                      {participant.role === 'commissioner' && (
                        <span className="text-yellow-400 text-xs">👑</span>
                      )}
                    </div>
                    <span className={`text-xs px-2 py-1 rounded ${
                      participant.isReady ? 'bg-green-600 text-green-100' : 'bg-gray-600 text-gray-300'
                    }`}>
                      {participant.isReady ? 'Ready' : 'Not Ready'}
                    </span>
                  </div>
                ))}
              </div>
              
              {/* Ready Toggle for Current User */}
              <div className="mt-4 pt-4 border-t border-gray-600">
                <button
                  onClick={handleReadyToggle}
                  className={`w-full py-2 px-4 rounded-md font-medium transition-colors ${
                    isReady 
                      ? 'bg-green-600 hover:bg-green-700 text-white' 
                      : 'bg-gray-600 hover:bg-gray-500 text-white'
                  }`}
                >
                  {isReady ? '✓ Ready' : 'Mark as Ready'}
                </button>
              </div>
            </div>

            {/* Chat */}
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Lobby Chat</h2>
              
              {/* Messages */}
              <div className="h-64 overflow-y-auto mb-4 space-y-2 bg-gray-700 rounded p-3">
                {chatMessages.map((msg, index) => (
                  <div key={index} className="text-sm">
                    <span className={`font-medium ${msg.isCommissioner ? 'text-yellow-400' : 'text-blue-400'}`}>
                      {msg.username}:
                    </span>
                    <span className="text-gray-200 ml-2">{msg.message}</span>
                  </div>
                ))}
                {chatMessages.length === 0 && (
                  <div className="text-gray-400 text-center py-8">
                    No messages yet. Start the conversation!
                  </div>
                )}
              </div>

              {/* Message Input */}
              <form onSubmit={handleSendMessage} className="flex space-x-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-md"
                >
                  Send
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* Draft Order Selection Modal */}
      {showDraftOrderModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg max-w-2xl w-full max-h-screen overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-white mb-6">Select Draft Order</h2>
              
              <div className="space-y-4 mb-6">
                <div>
                  <label className="flex items-center space-x-3 p-4 bg-gray-700 rounded-lg cursor-pointer">
                    <input
                      type="radio"
                      name="draftOrder"
                      value="random"
                      checked={draftOrderType === 'random'}
                      onChange={(e) => setDraftOrderType(e.target.value)}
                      className="text-blue-600"
                    />
                    <div>
                      <div className="text-white font-medium">🎲 Random Draft Order</div>
                      <div className="text-gray-400 text-sm">Teams will be randomly shuffled with a fun animation reveal</div>
                    </div>
                  </label>
                </div>
                
                <div>
                  <label className="flex items-center space-x-3 p-4 bg-gray-700 rounded-lg cursor-pointer">
                    <input
                      type="radio"
                      name="draftOrder"
                      value="manual"
                      checked={draftOrderType === 'manual'}
                      onChange={(e) => setDraftOrderType(e.target.value)}
                      className="text-blue-600"
                    />
                    <div>
                      <div className="text-white font-medium">⚙️ Manual Draft Order</div>
                      <div className="text-gray-400 text-sm">Set the exact order you want teams to draft</div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Manual Draft Order Configuration */}
              {draftOrderType === 'manual' && (
                <div className="mb-6 p-4 bg-gray-700 rounded-lg">
                  <h3 className="text-white font-medium mb-3">Arrange Draft Order</h3>
                  <div className="space-y-2">
                    {manualDraftOrder.map((teamId, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-gray-600 rounded">
                        <span className="text-white">
                          {index + 1}. {currentDraft?.teamNames[teamId - 1]}
                        </span>
                        <div className="flex space-x-1">
                          <button
                            type="button"
                            onClick={() => moveDraftOrderUp(index)}
                            disabled={index === 0}
                            className="p-1 text-gray-400 hover:text-white disabled:opacity-50"
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            onClick={() => moveDraftOrderDown(index)}
                            disabled={index === manualDraftOrder.length - 1}
                            className="p-1 text-gray-400 hover:text-white disabled:opacity-50"
                          >
                            ↓
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-4">
                <button
                  onClick={() => setShowDraftOrderModal(false)}
                  className="px-6 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-md"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDraftOrderSelection}
                  className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md"
                >
                  {draftOrderType === 'random' ? 'Generate & Start' : 'Start Draft'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DraftLobby;
