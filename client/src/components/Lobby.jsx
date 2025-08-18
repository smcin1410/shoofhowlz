import { useState, useEffect } from 'react';

const Lobby = ({ onDraftStart }) => {
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
  const [showSavedDrafts, setShowSavedDrafts] = useState(false);

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
    const adminPassword = window.prompt("Optional: Set an admin password for this draft session to access commissioner controls. Leave blank for no password.");

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
    setShowSavedDrafts(false);
  };

  const handleDeleteDraft = (draftToDelete) => {
    const updatedDrafts = savedDrafts.filter(draft => draft !== draftToDelete);
    setSavedDrafts(updatedDrafts);
    localStorage.setItem('saved-drafts', JSON.stringify(updatedDrafts));
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

          {/* Load Saved Draft */}
          <div className="bg-gray-800 rounded-lg p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
              <h2 className="text-xl font-semibold text-blue-400">Saved Drafts</h2>
              <div className="flex gap-2">
                <button
                  onClick={handleSaveDraft}
                  className="px-6 py-3 bg-gray-600 hover:bg-gray-700 rounded-lg transition-colors text-white font-medium"
                >
                  Save Configuration
                </button>
                <button
                  onClick={() => setShowSavedDrafts(!showSavedDrafts)}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors text-white font-medium"
                >
                  {showSavedDrafts ? 'Hide' : 'Load Saved Draft'}
                </button>
              </div>
            </div>
            
            {showSavedDrafts && (
              <div className="space-y-3">
                {savedDrafts.length === 0 ? (
                  <p className="text-gray-400 text-sm">No saved drafts found</p>
                ) : (
                  savedDrafts.map((draft, index) => (
                    <div key={index} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-gray-700 rounded-lg">
                      <div className="flex-1 mb-3 sm:mb-0">
                        <h3 className="font-semibold text-white">{draft.leagueName}</h3>
                        <p className="text-sm text-gray-400">
                          {draft.leagueSize} teams • {draft.draftType === 'snake' ? 'Snake' : 'Linear'} • {draft.totalRounds} rounds
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleLoadDraft(draft)}
                          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded text-sm transition-colors"
                        >
                          Load
                        </button>
                        <button
                          onClick={() => handleDeleteDraft(draft)}
                          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-sm transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
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
