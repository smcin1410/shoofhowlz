import { useState, useEffect } from 'react';

const Lobby = ({ onDraftStart, socket, participants, userInfo, setUserInfo }) => {
  const [leagueName, setLeagueName] = useState('');
  const [leagueSize, setLeagueSize] = useState(12);
  const [draftType, setDraftType] = useState('snake');
  const [tokens, setTokens] = useState(3);
  const [timeClock, setTimeClock] = useState(90); // in seconds
  const [totalRounds, setTotalRounds] = useState(16);
  const [teams, setTeams] = useState(Array(12).fill().map((_, index) => ({
    name: `Team ${index + 1}`,
    email: ''
  })));
  const [errors, setErrors] = useState({});
  const [chatMessages, setChatMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [savedDrafts, setSavedDrafts] = useState([]);
  const [showJoinModal, setShowJoinModal] = useState(true);
  const [tempUsername, setTempUsername] = useState('');

  // Load saved drafts on component mount
  useEffect(() => {
    const saved = localStorage.getItem('savedDrafts');
    if (saved) {
      try {
        setSavedDrafts(JSON.parse(saved));
      } catch (error) {
        console.error('Error loading saved drafts:', error);
      }
    }
  }, []);

  // Update teams array when league size changes
  useEffect(() => {
    setTeams(Array(leagueSize).fill().map((_, index) => ({
      name: `Team ${index + 1}`,
      email: ''
    })));
  }, [leagueSize]);

  // Handle joining the lobby
  const handleJoinLobby = (role = 'participant') => {
    if (!tempUsername.trim()) {
      alert('Please enter a username to join the lobby');
      return;
    }

    const newUserInfo = {
      username: tempUsername.trim(),
      role: role,
      isReady: false
    };

    setUserInfo(newUserInfo);
    setShowJoinModal(false);

    if (socket) {
      socket.emit('join-lobby', newUserInfo);
    }
  };

  // Handle ready status toggle
  const handleReadyToggle = () => {
    const newReadyStatus = !userInfo.isReady;
    setUserInfo(prev => ({ ...prev, isReady: newReadyStatus }));
    
    if (socket) {
      socket.emit('set-ready-status', newReadyStatus);
    }
  };

  const handleTeamChange = (index, field, value) => {
    const newTeams = [...teams];
    newTeams[index][field] = value;
    setTeams(newTeams);
    
    // Clear error for this field
    if (errors[`${index}-${field}`]) {
      const newErrors = { ...errors };
      delete newErrors[`${index}-${field}`];
      setErrors(newErrors);
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!leagueName.trim()) {
      newErrors.leagueName = 'League name is required';
    }
    
    teams.forEach((team, index) => {
      if (!team.name.trim()) {
        newErrors[`${index}-name`] = 'Team name is required';
      }
      // Email validation is now optional - only validate if email is provided
      if (team.email.trim()) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(team.email)) {
          newErrors[`${index}-email`] = 'Please enter a valid email';
        }
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleStartDraft = () => {
    console.log('handleStartDraft called!');
    
    if (!validateForm()) {
      console.log('Form validation failed');
      return;
    }

    // Prompt for an admin password
    const adminPassword = window.prompt("🔑 Commissioner Setup\n\nSet an admin password to access commissioner controls during the draft:\n• Manual pick entry\n• Pause/resume timer\n• Undo picks\n\nLeave blank for no admin controls.");

    const draftConfig = {
      leagueName,
      leagueSize,
      draftType,
      tokens,
      timeClock,
      totalRounds,
      teams,
      adminPassword: adminPassword || null, // Add password to config
    };

    console.log('Draft config:', draftConfig);

    // Save current draft configuration
    const savedDraft = {
      id: Date.now(),
      name: leagueName,
      config: draftConfig,
      timestamp: new Date().toISOString()
    };

    const updatedSavedDrafts = [...savedDrafts, savedDraft];
    setSavedDrafts(updatedSavedDrafts);
    localStorage.setItem('savedDrafts', JSON.stringify(updatedSavedDrafts));

    console.log('Calling onDraftStart with config:', draftConfig);
    onDraftStart(draftConfig);
  };

  const handleSaveDraft = () => {
    if (!validateForm()) {
      return;
    }

    const draftConfig = {
      leagueName,
      leagueSize,
      draftType,
      tokens,
      timeClock,
      totalRounds,
      teams,
    };

    const savedDraft = {
      id: Date.now(),
      name: leagueName,
      config: draftConfig,
      timestamp: new Date().toISOString()
    };

    const updatedSavedDrafts = [...savedDrafts, savedDraft];
    setSavedDrafts(updatedSavedDrafts);
    localStorage.setItem('savedDrafts', JSON.stringify(updatedSavedDrafts));

    alert('Draft configuration saved!');
  };

  const handleLoadDraft = (savedDraft) => {
    const { config } = savedDraft;
    setLeagueName(config.leagueName);
    setLeagueSize(config.leagueSize);
    setDraftType(config.draftType);
    setTokens(config.tokens);
    setTimeClock(config.timeClock);
    setTotalRounds(config.totalRounds || 16);
    setTeams(config.teams);
    
    // Provide user feedback
    alert(`Loaded "${savedDraft.name}" configuration successfully!`);
  };

  const handleDeleteDraft = (draftToDelete) => {
    if (window.confirm(`Are you sure you want to delete "${draftToDelete.name}"?`)) {
      const updatedDrafts = savedDrafts.filter(draft => draft.id !== draftToDelete.id);
      setSavedDrafts(updatedDrafts);
      localStorage.setItem('savedDrafts', JSON.stringify(updatedDrafts));
    }
  };

  const handleDuplicateDraft = (originalDraft) => {
    const duplicatedDraft = {
      id: Date.now(),
      name: `${originalDraft.name} (Copy)`,
      config: { ...originalDraft.config },
      timestamp: new Date().toISOString()
    };

    const updatedSavedDrafts = [...savedDrafts, duplicatedDraft];
    setSavedDrafts(updatedSavedDrafts);
    localStorage.setItem('savedDrafts', JSON.stringify(updatedSavedDrafts));
    
    alert(`Created copy: "${duplicatedDraft.name}"`);
  };

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      const message = {
        id: Date.now(),
        text: newMessage,
        timestamp: new Date().toLocaleTimeString(),
        sender: 'You'
      };
      setChatMessages([...chatMessages, message]);
      setNewMessage('');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const timeOptions = [
    { value: 60, label: '1:00' },
    { value: 75, label: '1:15' },
    { value: 90, label: '1:30' },
    { value: 105, label: '1:45' },
    { value: 120, label: '2:00' },
    { value: 135, label: '2:15' },
    { value: 150, label: '2:30' },
    { value: 165, label: '2:45' },
    { value: 180, label: '3:00' },
    { value: 195, label: '3:15' },
    { value: 210, label: '3:30' },
    { value: 225, label: '3:45' },
    { value: 240, label: '4:00' }
  ];

  return (
    <div className="min-h-screen bg-gray-900 py-8 px-4">
      {/* Join Lobby Modal */}
      {showJoinModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold text-white mb-4">Join Draft Lobby</h2>
            <p className="text-gray-300 mb-4">Enter a username to join the lobby:</p>
            
            <input
              type="text"
              value={tempUsername}
              onChange={(e) => setTempUsername(e.target.value)}
              placeholder="Your username..."
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-gray-400 mb-4"
              onKeyPress={(e) => e.key === 'Enter' && handleJoinLobby()}
              autoFocus
            />
            
            <div className="flex flex-col gap-2">
              <button
                onClick={() => handleJoinLobby('commissioner')}
                className="w-full px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg font-medium transition-colors"
              >
                Join as Commissioner
              </button>
              <button
                onClick={() => handleJoinLobby('participant')}
                className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                Join as Participant
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">
            Fantasy Football Draft
          </h1>
          <p className="text-gray-400 text-lg">
            Set up your draft configuration and invite your league members
          </p>
        </div>

        {/* Main Form */}
        <div className="space-y-6">
          {/* League Configuration */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-blue-400 mb-4">League Configuration</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  League Name *
                </label>
                <input
                  type="text"
                  value={leagueName}
                  onChange={(e) => setLeagueName(e.target.value)}
                  placeholder="Enter your league name"
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-gray-400"
                />
                {errors.leagueName && (
                  <p className="text-red-400 text-sm mt-1">{errors.leagueName}</p>
                )}
              </div>
            </div>
          </div>

          {/* Draft Settings */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-blue-400 mb-4">Draft Settings</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  League Size
                </label>
                <select
                  value={leagueSize}
                  onChange={(e) => setLeagueSize(parseInt(e.target.value))}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white"
                >
                  {[8, 10, 12, 14, 16].map(size => (
                    <option key={size} value={size}>{size} Teams</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Draft Type
                </label>
                <select
                  value={draftType}
                  onChange={(e) => setDraftType(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white"
                >
                  <option value="snake">Snake Draft</option>
                  <option value="linear">Linear Draft</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Number of Rounds
                </label>
                <select
                  value={totalRounds}
                  onChange={(e) => setTotalRounds(parseInt(e.target.value))}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white"
                >
                  {Array.from({ length: 9 }, (_, i) => i + 12).map(rounds => (
                    <option key={rounds} value={rounds}>{rounds} Rounds</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Time Extension Tokens
                </label>
                <select
                  value={tokens}
                  onChange={(e) => setTokens(parseInt(e.target.value))}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white"
                >
                  {[0, 1, 2, 3, 4, 5].map(token => (
                    <option key={token} value={token}>{token} Tokens</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Pick Time Limit
                </label>
                <select
                  value={timeClock}
                  onChange={(e) => setTimeClock(parseInt(e.target.value))}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white"
                >
                  {timeOptions.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Saved Drafts - Always Visible */}
          <div className="bg-gray-800 rounded-lg p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
              <h2 className="text-xl font-semibold text-blue-400">Saved Draft Configurations</h2>
              <button
                onClick={handleSaveDraft}
                className="px-6 py-3 bg-gray-600 hover:bg-gray-700 rounded-lg transition-colors text-white font-medium flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                Save Current
              </button>
            </div>
            
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {savedDrafts.length === 0 ? (
                <div className="text-center py-8">
                  <svg className="w-16 h-16 text-gray-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  <p className="text-gray-400 text-sm">No saved draft configurations</p>
                  <p className="text-gray-500 text-xs mt-1">Configure your league settings and click "Save Current" to store them for future use</p>
                </div>
              ) : (
                savedDrafts
                  .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)) // Sort by newest first
                  .map((draft) => (
                    <div key={draft.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-gray-700 rounded-lg border border-gray-600 hover:border-gray-500 transition-colors">
                      <div className="flex-1 mb-3 sm:mb-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-white">{draft.name}</h3>
                          <span className="px-2 py-0.5 bg-blue-600 text-white text-xs rounded">
                            {new Date(draft.timestamp).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="text-sm text-gray-400 space-y-1">
                          <div className="flex flex-wrap gap-4">
                            <span>👥 {draft.config.leagueSize} teams</span>
                            <span>🔄 {draft.config.draftType === 'snake' ? 'Snake Draft' : 'Linear Draft'}</span>
                            <span>🏆 {draft.config.totalRounds} rounds</span>
                          </div>
                          <div className="flex flex-wrap gap-4">
                            <span>⏱️ {Math.floor(draft.config.timeClock / 60)}:{(draft.config.timeClock % 60).toString().padStart(2, '0')} per pick</span>
                            <span>🎟️ {draft.config.tokens} extension tokens</span>
                          </div>
                        </div>
                        <div className="text-xs text-gray-500 mt-2">
                          Saved {new Date(draft.timestamp).toLocaleString()}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => handleLoadDraft(draft)}
                          className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded text-sm transition-colors flex items-center gap-1"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                          </svg>
                          Load
                        </button>
                        <button
                          onClick={() => handleDuplicateDraft(draft)}
                          className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition-colors flex items-center gap-1"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                          Copy
                        </button>
                        <button
                          onClick={() => handleDeleteDraft(draft)}
                          className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-sm transition-colors flex items-center gap-1"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Delete
                        </button>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>

          {/* Team Management */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-blue-400 mb-4">Team Management</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {teams.map((team, index) => (
                <div key={index} className="space-y-3 p-4 bg-gray-700 rounded-lg">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Team {index + 1} Name *
                    </label>
                    <input
                      type="text"
                      value={team.name}
                      onChange={(e) => handleTeamChange(index, 'name', e.target.value)}
                      placeholder={`Team ${index + 1}`}
                      className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-gray-400"
                    />
                    {errors[`${index}-name`] && (
                      <p className="text-red-400 text-xs mt-1">{errors[`${index}-name`]}</p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Email (Optional)
                    </label>
                    <input
                      type="email"
                      value={team.email}
                      onChange={(e) => handleTeamChange(index, 'email', e.target.value)}
                      placeholder="player@example.com"
                      className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-gray-400"
                    />
                    {errors[`${index}-email`] && (
                      <p className="text-red-400 text-xs mt-1">{errors[`${index}-email`]}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Participants and Chat Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Active Participants */}
            <div className="bg-gray-800 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  Active Participants ({participants.length})
                </h3>
                
                {userInfo.username && (
                  <button
                    onClick={handleReadyToggle}
                    className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                      userInfo.isReady 
                        ? 'bg-green-600 hover:bg-green-700 text-white' 
                        : 'bg-gray-600 hover:bg-gray-500 text-white'
                    }`}
                  >
                    {userInfo.isReady ? 'Ready ✓' : 'Not Ready'}
                  </button>
                )}
              </div>
              
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {participants.length === 0 ? (
                  <p className="text-gray-400 text-sm">No participants yet...</p>
                ) : (
                  participants.map((participant) => (
                    <div key={participant.socketId} className="flex items-center justify-between p-2 bg-gray-700 rounded">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${participant.isReady ? 'bg-green-400' : 'bg-gray-400'}`}></div>
                        <span className="text-white font-medium">{participant.username}</span>
                        {participant.role === 'commissioner' && (
                          <span className="px-2 py-0.5 bg-yellow-600 text-white text-xs rounded">
                            Commissioner
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-gray-400">
                        {participant.isReady ? 'Ready' : 'Waiting'}
                      </span>
                    </div>
                  ))
                )}
              </div>
              
              {userInfo.username && (
                <div className="mt-4 p-3 bg-gray-700 rounded-lg">
                  <div className="text-sm text-gray-300">You are: <span className="text-white font-medium">{userInfo.username}</span></div>
                  <div className="text-xs text-gray-400">Role: {userInfo.role === 'commissioner' ? 'Commissioner' : 'Participant'}</div>
                  <div className="text-xs text-gray-400">Status: {userInfo.isReady ? 'Ready' : 'Not Ready'}</div>
                </div>
              )}
            </div>

            {/* Chat Section */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-blue-400 mb-4">Lobby Chat</h2>
            <div className="bg-gray-700 rounded-lg p-4 h-64 flex flex-col">
              <div className="flex-1 overflow-y-auto mb-4 space-y-2">
                {chatMessages.map((message) => (
                  <div key={message.id} className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-blue-400 rounded-full mt-2 flex-shrink-0"></div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-gray-300">
                        <span className="font-medium text-white">{message.sender}</span>
                        <span className="text-gray-500 ml-2">{message.timestamp}</span>
                      </div>
                      <div className="text-sm text-gray-300 break-words">
                        {message.text}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Type your message..."
                  className="flex-1 px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-gray-400"
                />
                <button
                  onClick={handleSendMessage}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  Send
                </button>
              </div>
            </div>
          </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 pt-6">
            <button
              onClick={handleStartDraft}
              className="flex-1 px-6 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              Start Draft
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Lobby;
