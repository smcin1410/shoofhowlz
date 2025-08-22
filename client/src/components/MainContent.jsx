import { useState, useEffect } from 'react';
import PlayerCard from './PlayerCard';
import DraftBoard from './DraftBoard';

// Mobile Draft Board Component
const MobileDraftBoard = ({ draftState }) => {
  const [selectedRound, setSelectedRound] = useState(1);
  const [swipeStart, setSwipeStart] = useState(null);
  
  const totalRounds = Math.ceil(draftState.draftOrder.length / draftState.teams.length);
  
  const handleTouchStart = (e) => {
    setSwipeStart(e.touches[0].clientX);
  };

  const handleTouchEnd = (e) => {
    if (!swipeStart) return;
    
    const swipeEnd = e.changedTouches[0].clientX;
    const swipeDistance = swipeStart - swipeEnd;
    
    if (Math.abs(swipeDistance) > 50) { // Minimum swipe distance
      if (swipeDistance > 0 && selectedRound < totalRounds) {
        // Swipe left - next round
        setSelectedRound(selectedRound + 1);
      } else if (swipeDistance < 0 && selectedRound > 1) {
        // Swipe right - previous round
        setSelectedRound(selectedRound - 1);
      }
    }
    
    setSwipeStart(null);
  };

  const getPositionColor = (position) => {
    switch (position) {
      case 'QB':
        return 'bg-red-600 text-white';
      case 'RB':
        return 'bg-blue-600 text-white';
      case 'WR':
        return 'bg-green-600 text-white';
      case 'TE':
        return 'bg-yellow-600 text-white';
      case 'K':
      case 'DST':
      case 'D/ST':
        return 'bg-purple-600 text-white';
      default:
        return 'bg-gray-600 text-white';
    }
  };
  
  return (
    <div 
      className="block sm:hidden"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Round Selector */}
      <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-2">
        {Array.from({ length: totalRounds }, (_, i) => i + 1).map(round => (
          <button
            key={round}
            onClick={() => setSelectedRound(round)}
            className={`px-3 py-1 rounded text-sm font-medium whitespace-nowrap ${
              selectedRound === round 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Round {round}
          </button>
        ))}
      </div>
      
      {/* Draft Board for Selected Round */}
      <div className="bg-gray-800 rounded-lg p-4">
        <h3 className="text-white font-semibold mb-3">Round {selectedRound}</h3>
        <div className="space-y-2">
          {draftState.teams.map((team, teamIndex) => {
            const pickIndex = (selectedRound - 1) * draftState.teams.length + teamIndex;
            const pick = draftState.pickHistory[pickIndex];
            
            return (
              <div key={teamIndex} className="flex items-center justify-between p-2 bg-gray-700 rounded">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400 w-8">
                    {pickIndex + 1}.
                  </span>
                  <span className="text-sm font-medium text-white">
                    {team.name}
                  </span>
                </div>
                <div className="text-sm text-gray-300">
                  {pick ? (
                    <span className={`px-2 py-1 rounded text-xs ${getPositionColor(pick.player.position)}`}>
                      {pick.player.player_name}
                    </span>
                  ) : (
                    <span className="text-gray-500">-</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// Mobile Quick Actions Component
const MobileQuickActions = ({ draftState, socket, isCommissioner }) => {
  const [showQuickActions, setShowQuickActions] = useState(false);
  
  return (
    <div className="fixed bottom-4 right-4 z-50 sm:hidden">
      {/* Floating Action Button */}
      <button
        onClick={() => setShowQuickActions(!showQuickActions)}
        className="bg-blue-600 hover:bg-blue-700 text-white w-14 h-14 rounded-full shadow-lg flex items-center justify-center"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
      </button>
      
      {/* Quick Actions Menu */}
      {showQuickActions && (
        <div className="absolute bottom-16 right-0 bg-gray-800 rounded-lg shadow-lg border border-gray-600 p-2 min-w-48">
          <div className="space-y-1">
            {isCommissioner && (
              <button
                onClick={() => {
                  if (socket && draftState?.id) {
                    socket.emit('reset-timer', { draftId: draftState.id });
                  }
                  setShowQuickActions(false);
                }}
                className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 rounded flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Reset Timer
              </button>
            )}
            
            <button
              onClick={() => {
                // Scroll to top
                window.scrollTo({ top: 0, behavior: 'smooth' });
                setShowQuickActions(false);
              }}
              className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 rounded flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
              </svg>
              Scroll to Top
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const MainContent = ({ socket, draftState, activeTab, setActiveTab, fullWidth = false, user, teamAssignments }) => {
  const [filteredPlayers, setFilteredPlayers] = useState([]);
  const [positionFilter, setPositionFilter] = useState('All');
  const [teamFilter, setTeamFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [zoomLevel, setZoomLevel] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    if (draftState) {
      filterPlayers();
    }
  }, [draftState, positionFilter, teamFilter]);

  // Keyboard shortcuts for zoom
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (activeTab === 'draft-board') {
        if (e.key === '+' || e.key === '=') {
          e.preventDefault();
          handleZoomIn();
        } else if (e.key === '-') {
          e.preventDefault();
          handleZoomOut();
        } else if (e.key === '0') {
          e.preventDefault();
          handleResetZoom();
        }
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [activeTab]);

  const filterPlayers = () => {
    if (!draftState?.availablePlayers) return;
    
    let filtered = [...draftState.availablePlayers];
    
    if (positionFilter !== 'All') {
      filtered = filtered.filter(player => player.position === positionFilter);
    }
    
    if (teamFilter !== 'All') {
      filtered = filtered.filter(player => player.team === teamFilter);
    }
    
    setFilteredPlayers(filtered);
  };

  const getUniqueTeams = () => {
    if (!draftState?.availablePlayers) return [];
    const teams = [...new Set(draftState.availablePlayers.map(player => player.team))];
    return teams.sort();
  };

  const handleSearch = (query) => {
    setSearchQuery(query);
  };

  const getFilteredPlayersForSearch = () => {
    if (!searchQuery.trim() || !draftState?.availablePlayers) return filteredPlayers;
    
    return filteredPlayers.filter(player =>
      player.player_name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  const getCurrentPickDisplay = (pickIndex) => {
    const round = Math.floor(pickIndex / draftState.teams.length) + 1;
    const pickInRound = (pickIndex % draftState.teams.length) + 1;
    return `${round}.${pickInRound.toString().padStart(2, '0')}`;
  };

  const getTeamName = (teamIndex) => {
    return draftState.teams[teamIndex]?.name || `Team ${teamIndex + 1}`;
  };

  const getPositionColor = (position) => {
    switch (position) {
      case 'QB':
        return 'bg-red-600 text-white';
      case 'RB':
        return 'bg-blue-600 text-white';
      case 'WR':
        return 'bg-green-600 text-white';
      case 'TE':
        return 'bg-yellow-600 text-white';
      case 'K':
      case 'DST':
      case 'D/ST':
        return 'bg-purple-600 text-white';
      default:
        return 'bg-gray-600 text-white';
    }
  };

  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 0.1, 2));
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 0.1, 0.5));
  };

  const handleResetZoom = () => {
    setZoomLevel(1);
  };

  const toggleFilters = () => {
    setShowFilters(!showFilters);
  };

  return (
    <div className={`${fullWidth ? 'w-full' : 'lg:w-[80%]'} transition-all duration-300`}>
      {/* Mobile Header Spacing */}
      <div className="h-20 sm:h-16"></div>
      
      {/* Tab Navigation - Mobile Optimized */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="flex">
          <button
            onClick={() => setActiveTab('player-pool')}
            className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
              activeTab === 'player-pool'
                ? 'bg-blue-600 text-white'
                : 'text-gray-300 hover:text-white hover:bg-gray-700'
            }`}
          >
            Player Pool
          </button>
          <button
            onClick={() => setActiveTab('draft-board')}
            className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
              activeTab === 'draft-board'
                ? 'bg-blue-600 text-white'
                : 'text-gray-300 hover:text-white hover:bg-gray-700'
            }`}
          >
            Draft Board
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="h-full overflow-auto p-4">
        {/* Player Pool Tab */}
        {activeTab === 'player-pool' && (
          <div className="space-y-4">
            {/* Search and Filters */}
            <div className="bg-gray-800 rounded-lg p-3">
              {/* Search Bar with Filter Toggle */}
              <div className="flex items-center gap-2 mb-3">
                <div className="relative flex-1">
                  <input
                    type="text"
                    placeholder="Search players by name..."
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="w-full px-3 py-2 pl-8 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-sm"
                  />
                  <svg className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                
                {/* Filter Toggle Button */}
                <button
                  onClick={toggleFilters}
                  className={`p-2 rounded-lg transition-all duration-200 flex items-center gap-1 ${
                    showFilters 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'
                  }`}
                  title={showFilters ? 'Hide Filters' : 'Show Filters'}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                  </svg>
                  <span className="text-xs font-medium hidden sm:inline">
                    {showFilters ? 'Hide' : 'Filters'}
                  </span>
                </button>
              </div>

              {/* Collapsible Filter Controls */}
              {showFilters && (
                <div className="space-y-3 pt-3 border-t border-gray-700">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-medium text-gray-300 mb-1">Position</label>
                      <select
                        value={positionFilter}
                        onChange={(e) => setPositionFilter(e.target.value)}
                        className="w-full px-2 py-1.5 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-sm"
                      >
                        <option value="All">All Positions</option>
                        <option value="QB">Quarterbacks</option>
                        <option value="RB">Running Backs</option>
                        <option value="WR">Wide Receivers</option>
                        <option value="TE">Tight Ends</option>
                        <option value="K">Kickers</option>
                        <option value="D/ST">Defense/Special Teams</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-xs font-medium text-gray-300 mb-1">Team</label>
                      <select
                        value={teamFilter}
                        onChange={(e) => setTeamFilter(e.target.value)}
                        className="w-full px-2 py-1.5 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-sm"
                      >
                        <option value="All">All Teams</option>
                        {getUniqueTeams().map(team => (
                          <option key={team} value={team}>{team}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Player Count */}
                  <div className="text-xs text-gray-400 text-center sm:text-left">
                    {getFilteredPlayersForSearch().length} of {draftState?.availablePlayers?.length || 0} available players
                  </div>
                </div>
              )}

              {/* Always show player count when filters are hidden */}
              {!showFilters && (
                <div className="text-xs text-gray-400 text-center sm:text-left">
                  {getFilteredPlayersForSearch().length} of {draftState?.availablePlayers?.length || 0} available players
                </div>
              )}
            </div>

            {/* Player Grid - Mobile Optimized */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 max-h-[calc(100vh-300px)] lg:max-h-[800px] overflow-y-auto pr-2">
              {getFilteredPlayersForSearch().map((player) => (
                <PlayerCard 
                  key={player.rank} 
                  player={player} 
                  socket={socket}
                  draftState={draftState}
                  user={user}
                  teamAssignments={teamAssignments}
                />
              ))}
            </div>
            
            {getFilteredPlayersForSearch().length === 0 && (
              <div className="text-center py-8 text-gray-400">
                <svg className="w-12 h-12 mx-auto mb-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.47-.881-6.08-2.33" />
                </svg>
                <p>No players match your current filters</p>
              </div>
            )}
          </div>
        )}

        {/* Draft Board Tab */}
        {activeTab === 'draft-board' && (
          <>
            {/* Desktop Draft Board */}
            <div className="hidden sm:block">
              <DraftBoard
                draftState={draftState}
                socket={socket}
                zoomLevel={zoomLevel}
                setZoomLevel={setZoomLevel}
                getCurrentPickDisplay={getCurrentPickDisplay}
                getTeamName={getTeamName}
                getPositionColor={getPositionColor}
                handleZoomIn={handleZoomIn}
                handleZoomOut={handleZoomOut}
                handleResetZoom={handleResetZoom}
              />
            </div>
            
            {/* Mobile Draft Board */}
            <MobileDraftBoard draftState={draftState} />
          </>
        )}
      </div>

      {/* Mobile Quick Actions */}
      <MobileQuickActions 
        draftState={draftState} 
        socket={socket} 
        isCommissioner={user?.isCommissioner} 
      />
    </div>
  );
};

export default MainContent;
