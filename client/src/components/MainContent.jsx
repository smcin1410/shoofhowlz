import { useState, useEffect } from 'react';
import PlayerCard from './PlayerCard';
import DraftBoard from './DraftBoard';

const MainContent = ({ socket, draftState, activeTab, setActiveTab, fullWidth = false }) => {
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
      {/* Tab Navigation */}
      <div className="bg-gray-800 rounded-lg p-1 mb-6">
        <div className="flex space-x-1">
          <button
            onClick={() => setActiveTab('player-pool')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all duration-200 ${
              activeTab === 'player-pool'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'text-gray-300 hover:text-white hover:bg-gray-700'
            }`}
          >
            Player Pool
          </button>
          <button
            onClick={() => setActiveTab('draft-board')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all duration-200 ${
              activeTab === 'draft-board'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'text-gray-300 hover:text-white hover:bg-gray-700'
            }`}
          >
            Full Draft Board
          </button>
        </div>
      </div>

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

      {/* Full Draft Board Tab */}
      {activeTab === 'draft-board' && (
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
      )}
    </div>
  );
};

export default MainContent;
