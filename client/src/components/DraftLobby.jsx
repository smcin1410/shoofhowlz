import React, { useState, useEffect } from 'react';
import { formatTimeDisplay } from '../utils/timeUtils';
import DraftSettingsModal from './DraftSettingsModal';
import InvitationModal from './InvitationModal';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:4000';

const DraftLobby = ({
  user,
  currentDraft,
  isCommissioner,
  participants,
  socket,
  teamAssignments,
  setTeamAssignments,
  onStartDraft,
  onReturnToDashboard,
  onAdminAutoDraft,
  isDraftComplete,
  draftState
}) => {
  console.log('🏢 DraftLobby component rendering with props:', {
    'User': user?.username,
    'Current Draft': currentDraft?.leagueName,
    'Draft ID': currentDraft?.id,
    'Is Commissioner': isCommissioner,
    'Participants': participants?.length,
    'Socket Available': !!socket,
    'Draft Complete': isDraftComplete,
    'Draft State Available': !!draftState
  });
  const [chatMessages, setChatMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isReady, setIsReady] = useState(false);
  const [showDraftOrderModal, setShowDraftOrderModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showInvitationModal, setShowInvitationModal] = useState(false);
  const [draftOrderType, setDraftOrderType] = useState('random');
  const [manualDraftOrder, setManualDraftOrder] = useState([]);

  // Helper function to log data size for analysis
  const logDataSize = (data, label) => {
    const dataString = JSON.stringify(data);
    const sizeKB = Math.round(dataString.length / 1024);
    const sizeMB = (dataString.length / (1024 * 1024)).toFixed(2);
    
    console.log(`📊 ${label} data size:`, {
      bytes: dataString.length,
      kilobytes: sizeKB,
      megabytes: sizeMB,
      localStorageLimit: '~5-10MB',
      sessionStorageLimit: '~5-10MB'
    });
    
    return dataString.length;
  };

  // Comprehensive testing function for storage optimization
  const runStorageTests = () => {
    console.log('🧪 Running comprehensive storage tests...');
    
    // Test 1: Current draft data size
    if (draftState) {
      const originalSize = logDataSize(draftState, 'Current draft state');
      const optimizedData = createOptimizedDraftData();
      const optimizedSize = logDataSize(optimizedData, 'Optimized version');
      
      const reduction = ((originalSize - optimizedSize) / originalSize * 100).toFixed(1);
      console.log(`✅ Test 1 - Size reduction: ${reduction}%`);
    }
    
    // Test 2: Simulate large draft (192 picks, 12 teams, 16 rounds)
    const simulateLargeDraft = () => {
      const largeDraftData = {
        id: 'test-large-draft',
        leagueName: 'Test Large League',
        teams: Array.from({ length: 12 }, (_, i) => ({
          id: i + 1,
          name: `Team ${i + 1}`,
          email: `team${i + 1}@example.com`,
          roster: []
        })),
        pickHistory: Array.from({ length: 192 }, (_, i) => ({
          pickIndex: i,
          pickNumber: i + 1,
          player: {
            id: `player-${i}`,
            player_name: `Player Name ${i + 1}`,
            position: ['QB', 'RB', 'WR', 'TE', 'K', 'DEF'][i % 6],
            team: ['SF', 'GB', 'KC', 'BUF', 'TB', 'LAR'][i % 6],
            rank: i + 1,
            adp: (i + 1) * 1.5,
            projectedPoints: 100 - i
          },
          team: {
            id: (i % 12) + 1,
            name: `Team ${(i % 12) + 1}`
          },
          isAutoPick: Math.random() > 0.7,
          timestamp: Date.now() - (192 - i) * 60000
        })),
        draftOrder: Array.from({ length: 192 }, (_, i) => ({
          teamId: (i % 12) + 1,
          pickNumber: i + 1
        })),
        isComplete: true
      };
      
      const largeOriginalSize = logDataSize(largeDraftData, 'Large draft (192 picks) - Original');
      
      // Create optimized version
      const largeOptimized = {
        id: largeDraftData.id,
        leagueName: largeDraftData.leagueName,
        teams: largeDraftData.teams.map(t => ({ id: t.id, name: t.name, email: t.email })),
        pickHistory: largeDraftData.pickHistory.map(pick => ({
          idx: pick.pickIndex,
          num: pick.pickNumber,
          p: {
            id: pick.player.id,
            n: pick.player.player_name,
            pos: pick.player.position,
            tm: pick.player.team,
            r: pick.player.rank
          },
          t: {
            id: pick.team.id,
            n: pick.team.name
          },
          auto: pick.isAutoPick,
          ts: pick.timestamp
        })),
        draftOrder: largeDraftData.draftOrder,
        isComplete: true
      };
      
      const largeOptimizedSize = logDataSize(largeOptimized, 'Large draft (192 picks) - Optimized');
      const largeReduction = ((largeOriginalSize - largeOptimizedSize) / largeOriginalSize * 100).toFixed(1);
      
      console.log(`✅ Test 2 - Large draft optimization: ${largeReduction}% reduction`);
      console.log(`📈 Storage analysis:`, {
        'Will fit in localStorage': largeOptimizedSize < 5000000,
        'Estimated localStorage usage': `${(largeOptimizedSize / 5000000 * 100).toFixed(1)}%`,
        'Fallback needed': largeOptimizedSize > 5000000
      });
    };
    
    simulateLargeDraft();
    
    // Test 3: Storage method validation
    console.log('✅ Test 3 - Storage method priority:');
    console.log('1. Server storage (24hr expiration)');
    console.log('2. localStorage (optimized data)');
    console.log('3. sessionStorage (fallback)');
    console.log('4. Essential data only (last resort)');
    
    console.log('🎯 All storage tests completed!');
  };

  // Helper function to create highly optimized draft data
  const createOptimizedDraftData = () => ({
    // Essential metadata only
    id: currentDraft.id,
    leagueName: currentDraft.leagueName,
    totalRounds: currentDraft.totalRounds,
    draftType: currentDraft.draftType,
    leagueSize: currentDraft.leagueSize,
    isComplete: true,
    
    // Optimized team data (only essential fields)
    teams: (draftState?.teams || []).map(team => ({
      id: team.id,
      name: team.name,
      email: team.email || ''
    })),
    
    // Highly optimized pick history (remove redundant data)
    pickHistory: (draftState?.pickHistory || []).map(pick => ({
      idx: pick.pickIndex,
      num: pick.pickNumber,
      p: {
        id: pick.player.id,
        n: pick.player.player_name,
        pos: pick.player.position,
        tm: pick.player.team,
        r: pick.player.rank
      },
      t: {
        id: pick.team.id,
        n: pick.team.name
      },
      auto: pick.isAutoPick || false,
      ts: pick.timestamp
    })),
    
    // Draft order (already compact)
    draftOrder: draftState?.draftOrder || []
  });

  // Helper function to create minimal data fallback
  const createMinimalDraftData = () => ({
    id: currentDraft.id,
    leagueName: currentDraft.leagueName,
    teams: (draftState?.teams || []).map(team => ({ id: team.id, name: team.name })),
    pickHistory: (draftState?.pickHistory || []).map(pick => ({
      idx: pick.pickIndex,
      p: { n: pick.player.player_name, pos: pick.player.position, tm: pick.player.team },
      t: { id: pick.team.id, n: pick.team.name }
    })),
    draftOrder: draftState?.draftOrder || [],
    isComplete: true
  });

  // Helper function to create essential data only
  const createEssentialDraftData = () => ({
    id: currentDraft.id,
    leagueName: currentDraft.leagueName,
    teams: (draftState?.teams || []).map(team => ({ id: team.id, name: team.name })),
    pickHistory: (draftState?.pickHistory || []).slice(0, 50).map(pick => ({
      p: { n: pick.player.player_name, pos: pick.player.position },
      t: { n: pick.team.name }
    })),
    isComplete: true,
    limited: true
  });

  // Helper function to handle storage errors
  const handleStorageError = async (error) => {
    if (error.name === 'QuotaExceededError') {
      try {
        // Method 1: Try sessionStorage with minimal data
        const minimalData = createMinimalDraftData();
        const minimalSize = logDataSize(minimalData, 'Minimal fallback');
        
        sessionStorage.setItem(`draft-results-${currentDraft.id}`, JSON.stringify(minimalData));
        console.log('📄 Minimal draft data stored in sessionStorage (fallback)');
        
        const url = `${window.location.origin}/results?draftId=${currentDraft.id}`;
        window.open(url, '_blank');
        
      } catch (sessionError) {
        try {
          // Method 2: Try essential data only
          const essentialData = createEssentialDraftData();
          localStorage.setItem(`draft-results-${currentDraft.id}`, JSON.stringify(essentialData));
          console.log('📄 Essential draft data stored in localStorage');
          
          alert('⚠️ Draft data is very large. Opening limited print view with first 50 picks...');
          const url = `${window.location.origin}/results?draftId=${currentDraft.id}`;
          window.open(url, '_blank');
          
        } catch (finalError) {
          alert('❌ Unable to store draft data. Please try "Force Complete Draft" first or try again later.');
        }
      }
    } else {
      alert('❌ Error opening draft board. Please try again.');
    }
  };

  // Helper function to store data locally with fallbacks
  const storeDraftDataLocally = async (draftData) => {
    try {
      const dataString = JSON.stringify(draftData);
      const storageKey = `draft-results-${currentDraft.id}`;
      
      console.log('🔍 Storing draft data locally:', {
        draftId: currentDraft.id,
        dataSize: dataString.length,
        storageKey
      });
      
      if (dataString.length > 4000000) { // 4MB limit
        sessionStorage.setItem(storageKey, dataString);
        console.log('📄 Large draft data stored in sessionStorage');
      } else {
        localStorage.setItem(storageKey, dataString);
        console.log('📄 Draft data stored in localStorage');
      }
      
      const url = `${window.location.origin}/results?draftId=${currentDraft.id}`;
      console.log('🔍 Opening URL:', url);
      window.open(url, '_blank');
    } catch (error) {
      console.error('❌ Error storing draft data locally:', error);
      throw error;
    }
  };

  // Main function to handle opening the draft board with server-first storage
  const handleOpenDraftBoard = async () => {
    try {
      console.log('🔍 Opening draft board for draft:', currentDraft.id);
      console.log('🔍 Current draft state:', draftState);
      
      // Create optimized draft data
      const optimizedData = createOptimizedDraftData();
      const originalSize = logDataSize(draftState, 'Original draft state');
      const optimizedSize = logDataSize(optimizedData, 'Optimized draft');
      
      console.log('📈 Data optimization results:', {
        'Original size': `${Math.round(originalSize / 1024)}KB`,
        'Optimized size': `${Math.round(optimizedSize / 1024)}KB`,
        'Size reduction': `${Math.round((1 - optimizedSize / originalSize) * 100)}%`,
        'Picks included': optimizedData.pickHistory.length
      });
      
      // Try server storage first
      try {
        console.log('📡 Attempting to store draft data on server...');
        const response = await fetch(`${SERVER_URL}/api/store-draft-results`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            draftId: currentDraft.id,
            draftData: optimizedData
          })
        });
        
        if (response.ok) {
          const result = await response.json();
          console.log('✅ Draft data stored on server successfully:', result.message);
          
          // Store a reference in localStorage
          localStorage.setItem(`draft-results-${currentDraft.id}`, JSON.stringify({
            id: currentDraft.id,
            storedOnServer: true,
            timestamp: Date.now()
          }));
          
          // Use the client port directly to avoid server routing issues
          const clientUrl = window.location.origin.includes('localhost:4000') 
            ? 'http://localhost:5173' 
            : window.location.origin;
          const url = `${clientUrl}/results?draftId=${currentDraft.id}`;
          console.log('🔍 Opening URL:', url);
          window.open(url, '_blank');
          return;
        } else {
          const errorData = await response.json();
          throw new Error(`Server storage failed: ${errorData.error}`);
        }
      } catch (serverError) {
        console.warn('⚠️ Server storage failed, falling back to client storage:', serverError.message);
      }
      
      // Fallback to client storage if server fails
      console.log('📱 Using client storage fallback...');
      await storeDraftDataLocally(optimizedData);
      
    } catch (error) {
      console.error('❌ Failed to store draft data:', error);
      await handleStorageError(error);
    }
  };

  // Helper function to get timer value in seconds
  const getTimerInSeconds = () => {
    let timeValue = currentDraft?.timeClock || currentDraft?.defaultTimeClock || 90;
    // If the value is less than 10, it's likely in minutes, so convert to seconds
    if (timeValue < 10) {
      timeValue = timeValue * 60;
    }
    return timeValue;
  };

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

      // Team assignments are now handled in App.jsx

      // Enhanced team assignment notifications
      socket.on('team-pre-assigned', (data) => {
        alert(`🔒 Team Pre-Assignment!\n\n${data.message}\n\nYou can now proceed with the draft when it begins.`);
      });

      socket.on('team-claim-success', (data) => {
        alert(`✅ Team Claimed Successfully!\n\n${data.message}`);
      });

      socket.on('team-claim-error', (data) => {
        let alertMessage = `❌ Team Claim Failed\n\n${data.message}`;
        
        if (data.type === 'pre_assigned_protected') {
          alertMessage += '\n\n💡 This team is reserved for a specific participant. Please choose an available team.';
        } else if (data.type === 'already_claimed') {
          alertMessage += '\n\n💡 You can only claim one team per draft.';
        }
        
        alert(alertMessage);
      });

      // Draft error handling
      socket.on('draft-error', (error) => {
        console.error('❌ Draft error received:', error);
        alert(`❌ Draft Error: ${error.message}`);
        setShowDraftOrderModal(false);
      });

      // Draft completion handling
      socket.on('draft-complete', (draftState) => {
        console.log('🏆 Draft completed!', draftState);
        // The parent component will handle the state update
      });

      // Request chat history when joining
      socket.emit('request-chat-history', { draftId: currentDraft?.id });

      return () => {
        socket.off('lobby-chat-message');
        socket.off('chat-history');
        socket.off('participants-update');
        socket.off('team-pre-assigned');
        socket.off('team-claim-success');
        socket.off('team-claim-error');
        socket.off('draft-error');
        socket.off('draft-complete');
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
        assignedUser: userId, // username for display
        assignedUserId: user.id, // userId for persistence
        assignedBy: user.username
      });
    }
  };

  const handleClaimTeam = (teamIndex) => {
    if (socket) {
      socket.emit('claim-team', {
        draftId: currentDraft?.id,
        teamId: teamIndex + 1,
        userId: user.id, // Use user ID for persistence
        username: user.username, // Include username for display
        claimedBy: user.username
      });
    }
  };

  const handleStartDraftFlow = () => {
    // Check draft status and handle accordingly
    if (draftState?.status === 'completed' || draftState?.isComplete) {
      // Draft is completed - go to review/edit mode
      console.log('📋 Reviewing completed draft');
      onStartDraft(currentDraft); // This will take us to the draft page for review
    } else if (draftState?.status === 'in_progress' || draftState?.isDraftStarted) {
      // Draft is in progress - join the draft
      console.log('🏈 Joining live draft');
      onStartDraft(currentDraft); // This will take us to the active draft
    } else {
      // Draft hasn't started - show draft order modal
      console.log('🚀 Starting new draft');
      setShowDraftOrderModal(true);
    }
  };

  const handleDraftOrderSelection = () => {
    // Generate complete draft order for manual selection
    let completeManualDraftOrder = null;
    
    if (draftOrderType === 'manual') {
      // Validate manual draft order
      if (!manualDraftOrder || manualDraftOrder.length !== currentDraft.leagueSize) {
        alert('❌ Invalid manual draft order: Must include all teams');
        return;
      }
      
      // Generate complete draft order for all rounds
      completeManualDraftOrder = [];
      const totalRounds = currentDraft.totalRounds || 16;
      
      for (let round = 0; round < totalRounds; round++) {
        if (currentDraft.draftType === 'Snake' && round % 2 === 1) {
          // Reverse order for odd rounds (snake draft)
          completeManualDraftOrder.push(...[...manualDraftOrder].reverse());
        } else {
          // Normal order for even rounds or linear draft
          completeManualDraftOrder.push(...manualDraftOrder);
        }
      }
      
      console.log('📋 Generated complete manual draft order:', {
        'First round': manualDraftOrder,
        'Total rounds': totalRounds,
        'Draft type': currentDraft.draftType,
        'Complete order length': completeManualDraftOrder.length
      });
    }
    
    const draftConfig = {
      ...currentDraft,
      draftOrderType,
      manualDraftOrder: completeManualDraftOrder,
      teamAssignments
    };

    console.log('🎯 Draft configuration debug:', {
      draftOrderType,
      'currentDraft.draftType': currentDraft.draftType,
      'draftConfig.draftType': draftConfig.draftType,
      socketAvailable: !!socket
    });

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
              {showDraftOrderModal && (
                <span className="ml-4 text-yellow-400">
                  {draftOrderType === 'random' ? '🎲 Random Order' : '⚙️ Manual Order'}
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
            {user?.isAdmin && (
              <button
                onClick={() => {
                  console.log('🔧 Manual completion trigger clicked');
                  console.log('Current isDraftComplete:', isDraftComplete);
                  console.log('Current draft state:', currentDraft);
                  // Force show completion state for testing
                  alert('🔧 Manual completion trigger - check console for debug info');
                }}
                className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                🔧 Debug Completion
              </button>
            )}
            {/* Return to Draft Button - Show when draft is in progress */}
            {(draftState?.status === 'in_progress' || draftState?.isDraftStarted) && !draftState?.isComplete && (
              <button
                onClick={() => {
                  console.log('🏈 Returning to active draft:', currentDraft?.id);
                  onStartDraft(currentDraft);
                }}
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-md font-medium transition-colors flex items-center space-x-2"
                title="Rejoin the active draft"
              >
                <span>🏈</span>
                <span>Return to Draft</span>
                {draftState?.currentPick && draftState?.draftOrder && (
                  <span className="bg-green-700 px-2 py-1 rounded text-xs">
                    Pick {draftState.currentPick}/{draftState.draftOrder.length}
                  </span>
                )}
              </button>
            )}
            {(draftState?.isComplete || draftState?.status === 'completed') && (
              <button
                onClick={handleOpenDraftBoard}
                className="bg-purple-500 hover:bg-purple-600 text-white px-6 py-3 rounded-md font-medium transition-colors"
              >
                📄 Print Friendly Draft Board
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

      {/* Draft Completion Banner */}
      {(draftState?.isComplete || draftState?.status === 'completed') && (
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="bg-green-800 border border-green-600 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="text-green-400 text-2xl">🏆</div>
                <div>
                  <h2 className="text-white font-semibold text-lg">Draft Complete!</h2>
                  <p className="text-green-200 text-sm">
                    Congratulations! The draft has been completed successfully. You can now generate PDFs and share results.
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                {isCommissioner && (
                  <button
                    onClick={runStorageTests}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-3 rounded-md font-medium transition-colors"
                    title="Run comprehensive storage optimization tests"
                  >
                    🧪 Test Storage
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Return to Draft Banner - Show when draft is in progress */}
      {(draftState?.status === 'in_progress' || draftState?.isDraftStarted) && !draftState?.isComplete && (
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="bg-blue-800 border border-blue-600 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="text-blue-400 text-2xl">🏈</div>
                <div>
                  <h2 className="text-white font-semibold text-lg">Draft in Progress!</h2>
                  <p className="text-blue-200 text-sm">
                    {(() => {
                      const currentPickIndex = (draftState?.currentPick || 1) - 1;
                      const totalPicks = draftState?.draftOrder?.length || 0;
                      const currentTeam = draftState?.draftOrder?.[currentPickIndex];
                      const currentTeamName = currentTeam ? draftState?.teams?.find(t => t.id === currentTeam.teamId)?.name || `Team ${currentTeam.teamId}` : 'Unknown Team';
                      const completionPercentage = totalPicks > 0 ? Math.round(((draftState?.currentPick || 1) - 1) / totalPicks * 100) : 0;
                      
                      return `Pick ${draftState?.currentPick || 1} of ${totalPicks} - ${currentTeamName} is on the clock (${completionPercentage}% complete)`;
                    })()}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    console.log('🏈 Returning to active draft from banner:', currentDraft?.id);
                    onStartDraft(currentDraft);
                  }}
                  className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-md font-medium transition-colors flex items-center space-x-2"
                  title="Rejoin the active draft"
                >
                  <span>🏈</span>
                  <span>Return to Draft</span>
                </button>
              </div>
            </div>
            
            {/* Progress Bar */}
            {draftState?.currentPick && draftState?.draftOrder && (
              <div className="mt-4">
                <div className="flex justify-between text-xs text-blue-300 mb-1">
                  <span>Draft Progress</span>
                  <span>{Math.round(((draftState?.currentPick || 1) - 1) / (draftState?.draftOrder?.length || 1) * 100)}%</span>
                </div>
                <div className="w-full bg-blue-700 rounded-full h-3">
                  <div 
                    className="bg-green-500 h-3 rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.round(((draftState?.currentPick || 1) - 1) / (draftState?.draftOrder?.length || 1) * 100)}%`
                    }}
                  ></div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

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
                  <div className="text-white font-medium">
                    {formatTimeDisplay(getTimerInSeconds())}
                  </div>
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
                {isCommissioner ? 'Team Pre-Assignment & Management' : 'Team Selection'}
              </h2>
              
              {isCommissioner ? (
                <>
                  <p className="text-gray-400 text-sm mb-4">
                    <strong>Enhanced Team Pre-Assignment:</strong> Assign specific participants to specific teams. 
                    Pre-assigned teams will be automatically claimed when participants join and are protected from incorrect claiming.
                  </p>
                  
                  {/* Summary Stats */}
                  <div className="grid grid-cols-3 gap-4 mb-6 text-center">
                    <div className="bg-gray-700 rounded p-3">
                      <div className="text-white font-medium">{teamAssignments.filter(t => t.assignedUser && t.assignedUser !== 'LOCAL').length}</div>
                      <div className="text-gray-400 text-xs">Pre-Assigned</div>
                    </div>
                    <div className="bg-gray-700 rounded p-3">
                      <div className="text-white font-medium">{teamAssignments.filter(t => t.assignedUser === 'LOCAL').length}</div>
                      <div className="text-gray-400 text-xs">Local Players</div>
                    </div>
                    <div className="bg-gray-700 rounded p-3">
                      <div className="text-white font-medium">{teamAssignments.filter(t => !t.assignedUser).length}</div>
                      <div className="text-gray-400 text-xs">Available</div>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-1 gap-3">
                    {teamAssignments.map((assignment, index) => {
                      const participantInfo = participants.find(p => p.id === assignment.assignedUser);
                      const isPreAssigned = assignment.assignedUser && assignment.assignedUser !== 'LOCAL';
                      const isLocal = assignment.assignedUser === 'LOCAL';
                      const isConnected = participantInfo?.id && participants.some(p => p.id === participantInfo.id);
                      
                      return (
                        <div key={index} className={`flex items-center space-x-3 p-3 rounded border-l-4 ${
                          isPreAssigned ? (isConnected ? 'bg-green-700 border-green-500' : 'bg-yellow-700 border-yellow-500') :
                          isLocal ? 'bg-blue-700 border-blue-500' :
                          'bg-gray-700 border-gray-500'
                        }`}>
                          <span className="text-white font-medium w-20">
                            Team {assignment.teamId}:
                          </span>
                          <span className="text-gray-300 flex-1">{assignment.teamName}</span>
                          <div className="flex items-center space-x-2 flex-1">
                            <select
                              value={assignment.assignedUser || ''}
                              onChange={(e) => handleAssignTeam(index, e.target.value || null)}
                              className="bg-gray-600 text-white text-sm px-2 py-1 rounded border border-gray-500 min-w-40 flex-1"
                            >
                              <option value="">🔓 Available to Claim</option>
                              <option value="LOCAL">🏠 Local In-Person Player</option>
                              {participants.map(participant => (
                                <option key={participant.id} value={participant.id}>
                                  🔒 {participant.username} {participant.isReady ? '✓' : '⏳'}
                                </option>
                              ))}
                            </select>
                            
                            {/* Quick Action Buttons */}
                            {assignment.assignedUser && (
                              <button
                                onClick={() => handleAssignTeam(index, null)}
                                className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded text-xs"
                                title="Clear this assignment"
                              >
                                ✕
                              </button>
                            )}
                            
                            {/* Swap functionality */}
                            {assignment.assignedUser && index < teamAssignments.length - 1 && (
                              <button
                                onClick={() => {
                                  const nextIndex = index + 1;
                                  const currentUser = assignment.assignedUser;
                                  const nextUser = teamAssignments[nextIndex].assignedUser;
                                  
                                  // Swap assignments
                                  handleAssignTeam(index, nextUser);
                                  handleAssignTeam(nextIndex, currentUser);
                                }}
                                className="bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded text-xs"
                                title="Swap with next team"
                              >
                                ⇅
                              </button>
                            )}
                          </div>
                          <div className="flex items-center space-x-2">
                            {isPreAssigned && (
                              <>
                                <span className={`text-xs px-2 py-1 rounded ${
                                  isConnected ? 'bg-green-600 text-green-100' : 'bg-yellow-600 text-yellow-100'
                                }`}>
                                  {isConnected ? '🔒 Pre-Assigned & Connected' : '🔒 Pre-Assigned (Waiting)'}
                                </span>
                                {participantInfo && (
                                  <span className="text-gray-300 text-xs">
                                    ({participantInfo.username})
                                  </span>
                                )}
                              </>
                            )}
                            {isLocal && (
                              <span className="text-blue-200 text-xs px-2 py-1 bg-blue-600 rounded">
                                🏠 Local Player
                              </span>
                            )}
                            {!assignment.assignedUser && (
                              <span className="text-gray-400 text-xs px-2 py-1 bg-gray-600 rounded">
                                🔓 First-Come-First-Serve
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  
                  {/* Enhanced Commissioner Controls */}
                  <div className="mt-6 pt-4 border-t border-gray-600">
                    <h3 className="text-white font-medium mb-3">Commissioner Team Management</h3>
                    
                    {/* Quick Actions Row */}
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <button
                        onClick={() => {
                          // Clear all assignments
                          const updates = teamAssignments.map(assignment => ({
                            ...assignment,
                            assignedUser: null
                          }));
                          setTeamAssignments(updates);
                          
                          // Use bulk assignment for efficiency
                          const bulkAssignments = teamAssignments
                            .filter(assignment => assignment.assignedUser) // Only teams that need clearing
                            .map(assignment => ({
                              teamId: assignment.teamId,
                              assignedUser: null
                            }));
                          
                          if (bulkAssignments.length > 0 && socket) {
                            socket.emit('bulk-assign-teams', {
                              draftId: currentDraft?.id,
                              assignments: bulkAssignments,
                              assignedBy: user.username
                            });
                          }
                        }}
                        className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded text-sm font-medium flex items-center justify-center space-x-2"
                        title="Remove all team assignments"
                      >
                        <span>🗑️</span>
                        <span>Clear All Teams</span>
                      </button>
                      
                      <button
                        onClick={() => {
                          // Shuffle all connected participants to random available teams
                          const availableTeams = teamAssignments.filter(t => !t.assignedUser);
                          const connectedParticipants = participants.filter(p => 
                            p.role !== 'commissioner' && !teamAssignments.some(t => t.assignedUser === p.id)
                          );
                          
                          // Shuffle participants
                          const shuffled = [...connectedParticipants].sort(() => Math.random() - 0.5);
                          const updates = [...teamAssignments];
                          const bulkAssignments = [];
                          
                          shuffled.slice(0, availableTeams.length).forEach((participant, idx) => {
                            const teamIndex = teamAssignments.findIndex(t => !t.assignedUser);
                            if (teamIndex !== -1) {
                              updates[teamIndex] = {
                                ...updates[teamIndex],
                                assignedUser: participant.id
                              };
                              
                              bulkAssignments.push({
                                teamId: updates[teamIndex].teamId,
                                assignedUser: participant.id
                              });
                            }
                          });
                          
                          setTeamAssignments(updates);
                          
                          // Use bulk assignment for efficiency
                          if (bulkAssignments.length > 0 && socket) {
                            socket.emit('bulk-assign-teams', {
                              draftId: currentDraft?.id,
                              assignments: bulkAssignments,
                              assignedBy: user.username
                            });
                          }
                        }}
                        className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded text-sm font-medium flex items-center justify-center space-x-2"
                        title="Randomly assign connected participants"
                      >
                        <span>🎲</span>
                        <span>Shuffle Assign</span>
                      </button>
                    </div>
                    
                    <h4 className="text-white font-medium mb-3">Auto-Assignment</h4>
                    <p className="text-gray-400 text-sm mb-3">
                      Auto-assign all connected participants to available teams in order
                    </p>
                    <button
                      onClick={() => {
                        const availableTeams = teamAssignments.filter(t => !t.assignedUser);
                        const unassignedParticipants = participants.filter(p => 
                          p.role !== 'commissioner' && !teamAssignments.some(t => t.assignedUser === p.id)
                        );
                        
                        const updates = [...teamAssignments];
                        unassignedParticipants.slice(0, availableTeams.length).forEach((participant, idx) => {
                          const teamIndex = teamAssignments.findIndex(t => !t.assignedUser);
                          if (teamIndex !== -1) {
                            updates[teamIndex] = { ...updates[teamIndex], assignedUser: participant.id };
                          }
                        });
                        
                        setTeamAssignments(updates);
                        
                        // Send all assignments to server
                        updates.forEach((assignment, index) => {
                          if (assignment.assignedUser && assignment.assignedUser !== teamAssignments[index].assignedUser) {
                            socket?.emit('assign-team', {
                              draftId: currentDraft?.id,
                              teamId: assignment.teamId,
                              assignedUser: assignment.assignedUser,
                              assignedBy: user.username
                            });
                          }
                        });
                      }}
                      className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded text-sm"
                      disabled={participants.filter(p => p.role !== 'commissioner').length === 0}
                    >
                      🪄 Auto-Assign Connected Participants
                    </button>
                  </div>

                  {/* Direct Join Links Section */}
                  <div className="mt-6 pt-4 border-t border-gray-600">
                    <h3 className="text-white font-medium mb-3">📱 Remote Participant Links</h3>
                    <p className="text-gray-400 text-sm mb-3">
                      Generate direct join links for each team to share with remote participants
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button
                        onClick={() => setShowInvitationModal(true)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm font-medium flex items-center justify-center space-x-2"
                      >
                        <span>📨</span>
                        <span>Send Invitations</span>
                      </button>
                      
                      <button
                        onClick={() => {
                          const baseUrl = window.location.origin;
                          const directLinks = teamAssignments.map(assignment => ({
                            teamId: assignment.teamId,
                            teamName: assignment.teamName,
                            directLink: `${baseUrl}/join/${currentDraft?.id}/team/${assignment.teamId}`,
                            shareableText: `Join ${assignment.teamName} in our fantasy draft: ${baseUrl}/join/${currentDraft?.id}/team/${assignment.teamId}`
                          }));

                          // Create shareable text
                          const allLinksText = directLinks.map(link => 
                            `${link.teamName}: ${link.directLink}`
                          ).join('\n\n');

                          // Copy to clipboard
                          navigator.clipboard.writeText(allLinksText).then(() => {
                            alert('✅ Direct join links copied to clipboard!\n\nShare these links with remote participants for instant team access.');
                          }).catch(() => {
                            // Fallback: show in alert
                            alert(`📱 Direct Join Links:\n\n${allLinksText}`);
                          });
                        }}
                        className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded text-sm font-medium flex items-center justify-center space-x-2"
                      >
                        <span>📋</span>
                        <span>Quick Copy Links</span>
                      </button>
                    </div>
                    
                    <div className="mt-3 p-3 bg-blue-900 border border-blue-700 rounded text-sm">
                      <p className="text-blue-200">
                        <strong>💡 How it works:</strong> Share team-specific links via text/email. 
                        Remote participants can join directly to their assigned team, skipping the lobby.
                      </p>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* Check if user has a pre-assigned team */}
                  {(() => {
                    const myPreAssignedTeam = teamAssignments.find(t => t.assignedUser === user.username);
                    const myClaimedTeam = teamAssignments.find(t => t.assignedUser === user.username);
                    
                    if (myPreAssignedTeam) {
                      return (
                        <div className="mb-4 p-4 bg-green-800 border border-green-600 rounded">
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="text-green-200 font-medium">🔒 Your Pre-Assigned Team</h3>
                              <p className="text-green-300 text-sm mt-1">
                                <strong>Team {myPreAssignedTeam.teamId}: {myPreAssignedTeam.teamName}</strong>
                              </p>
                              <p className="text-green-200 text-xs mt-1">
                                This team has been reserved for you by the commissioner. You're all set for the draft!
                              </p>
                            </div>
                            <div className="text-green-400 text-2xl">✓</div>
                          </div>
                        </div>
                      );
                    }
                    
                    return (
                      <p className="text-gray-400 text-sm mb-4">
                        {teamAssignments.some(t => t.assignedUser && t.assignedUser !== 'LOCAL' && t.assignedUser !== user.username) 
                          ? "🔒 Some teams are pre-assigned. You can claim any available team below." 
                          : "Click \"Claim\" to select your team. You can only claim one team."
                        }
                      </p>
                    );
                  })()}
                  
                  <div className="grid md:grid-cols-1 gap-3">
                    {teamAssignments.map((assignment, index) => {
                      const isClaimedByMe = assignment.assignedUser === user.username;
                      const isPreAssignedToMe = assignment.assignedUser === user.username;
                      const isPreAssignedToOther = assignment.assignedUser && assignment.assignedUser !== 'LOCAL' && assignment.assignedUser !== user.username;
                      const isLocal = assignment.assignedUser === 'LOCAL';
                      const canClaim = !assignment.assignedUser; // Only available teams can be claimed
                      const alreadyClaimedTeam = teamAssignments.some(t => t.assignedUser === user.username);
                      const otherUserInfo = participants.find(p => p.id === assignment.assignedUser);
                      
                      return (
                        <div key={index} className={`flex items-center justify-between p-3 rounded border-l-4 ${
                          isClaimedByMe ? 'bg-green-700 border-green-500' : 
                          isPreAssignedToOther ? 'bg-yellow-700 border-yellow-500' :
                          isLocal ? 'bg-blue-700 border-blue-500' :
                          'bg-gray-700 border-gray-500'
                        }`}>
                          <div className="flex items-center space-x-3 flex-1">
                            <span className="text-white font-medium">
                              Team {assignment.teamId}: {assignment.teamName}
                            </span>
                            
                            {isClaimedByMe && (
                              <span className="text-green-200 text-sm bg-green-600 px-2 py-1 rounded">
                                ✓ Your Team
                              </span>
                            )}
                            
                            {isPreAssignedToOther && (
                              <span className="text-yellow-200 text-sm bg-yellow-600 px-2 py-1 rounded">
                                🔒 Pre-assigned to {otherUserInfo?.username || assignment.assignedUser}
                              </span>
                            )}
                            
                            {isLocal && (
                              <span className="text-blue-200 text-sm bg-blue-600 px-2 py-1 rounded">
                                🏠 Local Player
                              </span>
                            )}
                            
                            {canClaim && (
                              <span className="text-gray-300 text-sm bg-gray-600 px-2 py-1 rounded">
                                🔓 Available to Claim
                              </span>
                            )}
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            {canClaim && !alreadyClaimedTeam && (
                              <button
                                onClick={() => handleClaimTeam(index)}
                                className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm"
                              >
                                Claim Team
                              </button>
                            )}
                            
                            {isClaimedByMe && !isPreAssignedToMe && (
                              <button
                                onClick={() => handleAssignTeam(index, null)}
                                className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm"
                              >
                                Release
                              </button>
                            )}
                            
                            {isPreAssignedToOther && (
                              <span className="text-yellow-200 text-xs">
                                Protected
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  
                  {/* Status Messages */}
                  {(() => {
                    const myTeam = teamAssignments.find(t => t.assignedUser === user.username);
                    const availableTeams = teamAssignments.filter(t => !t.assignedUser).length;
                    const preAssignedTeams = teamAssignments.filter(t => t.assignedUser && t.assignedUser !== 'LOCAL' && t.assignedUser !== user.username).length;
                    
                    if (myTeam) {
                      return (
                        <div className="mt-4 p-3 bg-green-800 border border-green-600 rounded">
                          <p className="text-green-200 text-sm">
                            ✓ You have secured <strong>Team {myTeam.teamId}: {myTeam.teamName}</strong>! You're ready for the draft.
                          </p>
                        </div>
                      );
                    }
                    
                    if (availableTeams === 0) {
                      return (
                        <div className="mt-4 p-3 bg-red-800 border border-red-600 rounded">
                          <p className="text-red-200 text-sm">
                            ⚠️ All teams are assigned or claimed. Contact the commissioner if you need a team assignment.
                          </p>
                        </div>
                      );
                    }
                    
                    return (
                      <div className="mt-4 p-3 bg-blue-800 border border-blue-600 rounded">
                        <p className="text-blue-200 text-sm">
                          💡 <strong>{availableTeams}</strong> teams available to claim. 
                          {preAssignedTeams > 0 && (
                            <span> <strong>{preAssignedTeams}</strong> teams are pre-assigned to other participants.</span>
                          )}
                        </p>
                      </div>
                    );
                  })()}

                  {/* Team Selection Interface for Participants */}
                  {!isCommissioner && !teamAssignments.find(t => t.assignedUser === user.username) && (
                    <div className="mt-6 p-4 bg-gray-800 border border-gray-700 rounded">
                      <h3 className="text-lg font-medium text-white mb-3">🎯 Select Your Team</h3>
                      <p className="text-gray-300 text-sm mb-4">
                        Choose a team to participate in the draft. Once selected, you'll be able to rejoin the draft directly if you disconnect.
                      </p>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {teamAssignments
                          .filter(assignment => !assignment.assignedUser) // Only show available teams
                          .map((assignment, index) => (
                            <div key={index} className="p-3 bg-gray-700 border border-gray-600 rounded hover:bg-gray-600 transition-colors">
                              <div className="text-center">
                                <h4 className="text-white font-medium">Team {assignment.teamId}</h4>
                                <p className="text-gray-300 text-sm mb-3">{assignment.teamName}</p>
                                <button
                                  onClick={() => handleClaimTeam(assignment.teamId - 1)} // Convert to 0-based index
                                  className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm font-medium transition-colors"
                                >
                                  🎯 Select This Team
                                </button>
                              </div>
                            </div>
                          ))}
                      </div>
                      
                      {teamAssignments.filter(t => !t.assignedUser).length === 0 && (
                        <div className="text-center p-4 bg-yellow-800 border border-yellow-600 rounded">
                          <p className="text-yellow-200 text-sm">
                            ⚠️ No teams are currently available. Please wait for the commissioner to assign teams or contact them for assistance.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Start Draft Section (Commissioner Only) */}
            {isCommissioner && (
              <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
                <h2 className="text-xl font-semibold text-white mb-4">
                  {draftState?.status === 'completed' || draftState?.isComplete ? 'Draft Management' : 'Start Draft'}
                </h2>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-300 mb-2">
                      {draftState?.status === 'completed' || draftState?.isComplete ? (
                        `Draft completed - ${draftState?.pickHistory?.length || 0} total picks made`
                      ) : draftState?.status === 'in_progress' || draftState?.isDraftStarted ? (
                        (() => {
                          const currentPickIndex = (draftState?.currentPick || 1) - 1;
                          const totalPicks = draftState?.draftOrder?.length || 0;
                          const currentTeam = draftState?.draftOrder?.[currentPickIndex];
                          const currentTeamName = currentTeam ? draftState?.teams?.find(t => t.id === currentTeam.teamId)?.name || `Team ${currentTeam.teamId}` : 'Unknown Team';
                          const completionPercentage = totalPicks > 0 ? Math.round(((draftState?.currentPick || 1) - 1) / totalPicks * 100) : 0;
                          
                          return `Pick ${draftState?.currentPick || 1} of ${totalPicks} - ${currentTeamName} on the clock (${completionPercentage}% complete)`;
                        })()
                      ) : (
                        `${participants.length} participants connected${
                          allParticipantsReady ? ' ✓ All ready' : ''
                        }`
                      )}
                    </p>
                    
                    {/* Progress Bar for Active Drafts */}
                    {(draftState?.status === 'in_progress' || draftState?.isDraftStarted) && !draftState?.isComplete && (
                      <div className="my-3">
                        <div className="flex justify-between text-xs text-gray-400 mb-1">
                          <span>Draft Progress</span>
                          <span>{Math.round(((draftState?.currentPick || 1) - 1) / (draftState?.draftOrder?.length || 1) * 100)}%</span>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-2">
                          <div 
                            className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                            style={{
                              width: `${Math.round(((draftState?.currentPick || 1) - 1) / (draftState?.draftOrder?.length || 1) * 100)}%`
                            }}
                          ></div>
                        </div>
                      </div>
                    )}
                    
                    <p className="text-gray-400 text-sm">
                      {draftState?.status === 'completed' || draftState?.isComplete ? (
                        'Click to review the completed draft and make any necessary edits.'
                      ) : draftState?.status === 'in_progress' || draftState?.isDraftStarted ? (
                        'Draft can be joined anytime. Late participants will be auto-picked until they join.'
                      ) : (
                        'Draft can start anytime. Late participants will be auto-picked until they join.'
                      )}
                    </p>
                  </div>
                  <div className="flex space-x-3">
                    <button
                      onClick={() => setShowSettingsModal(true)}
                      className="px-4 py-3 rounded-md font-medium transition-colors bg-gray-600 hover:bg-gray-700 text-white flex items-center space-x-2"
                      title="Draft Settings"
                    >
                      <span>⚙️</span>
                      <span>Settings</span>
                    </button>
                    <button
                      onClick={handleStartDraftFlow}
                      className={`px-6 py-3 rounded-md font-medium transition-colors ${
                        draftState?.status === 'completed' || draftState?.isComplete
                          ? 'bg-purple-600 hover:bg-purple-700 text-white'
                          : draftState?.status === 'in_progress' || draftState?.isDraftStarted
                          ? 'bg-blue-600 hover:bg-blue-700 text-white'
                          : 'bg-green-600 hover:bg-green-700 text-white'
                      }`}
                    >
                      {draftState?.status === 'completed' || draftState?.isComplete ? (
                        '📋 Review Completed Draft'
                      ) : draftState?.status === 'in_progress' || draftState?.isDraftStarted ? (
                        '🏈 Enter Live Draft'
                      ) : (
                        '🚀 Start Draft'
                      )}
                    </button>
                  </div>
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
                {(draftState?.status === 'in_progress' || draftState?.isDraftStarted) && !draftState?.isComplete && (
                  <span className="ml-2 text-sm text-blue-400">
                    • Draft Active
                  </span>
                )}
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
                      {/* Show if participant is in the draft */}
                      {(draftState?.status === 'in_progress' || draftState?.isDraftStarted) && !draftState?.isComplete && (
                        <span className="text-blue-400 text-xs bg-blue-600 px-2 py-1 rounded">
                          🏈 In Draft
                        </span>
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
                  <p className="text-gray-400 text-sm mb-4">
                    Set the first round order. The system will automatically handle snake/linear draft patterns for subsequent rounds.
                  </p>
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
                  
                  {/* Preview of complete draft order */}
                  <div className="mt-4 p-3 bg-gray-600 rounded">
                    <h4 className="text-white font-medium mb-2">Draft Order Preview</h4>
                    <div className="text-gray-300 text-sm">
                      <div className="mb-2">
                        <strong>Round 1:</strong> {manualDraftOrder.map((teamId, index) => 
                          `${index + 1}. ${currentDraft?.teamNames[teamId - 1]}`
                        ).join(' → ')}
                      </div>
                      {currentDraft?.draftType === 'Snake' && (
                        <div>
                          <strong>Round 2:</strong> {[...manualDraftOrder].reverse().map((teamId, index) => 
                            `${index + 1}. ${currentDraft?.teamNames[teamId - 1]}`
                          ).join(' → ')}
                        </div>
                      )}
                      <div className="text-gray-400 mt-2">
                        Total picks: {manualDraftOrder.length * (currentDraft?.totalRounds || 16)}
                      </div>
                    </div>
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

      {/* Draft Settings Modal */}
      <DraftSettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        currentDraft={currentDraft}
        socket={socket}
        isCommissioner={isCommissioner}
        onSettingsUpdate={(newSettings) => {
          // The settings will be updated via the socket event
          console.log('Settings updated:', newSettings);
        }}
      />

      {/* Enhanced Invitation Modal */}
      <InvitationModal
        isOpen={showInvitationModal}
        onClose={() => setShowInvitationModal(false)}
        currentDraft={currentDraft}
        teamAssignments={teamAssignments}
        user={user}
      />
    </div>
  );
};

export default DraftLobby;
