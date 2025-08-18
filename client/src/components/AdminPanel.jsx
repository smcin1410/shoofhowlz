import React, { useState } from 'react';

const AdminPanel = ({ socket, draftState }) => {
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  if (!draftState || !draftState.isDraftStarted) {
    return null;
  }

  const handleManualPick = () => {
    if (selectedPlayer && socket) {
      const confirmation = window.confirm(`Are you sure you want to draft ${selectedPlayer.player_name} for the current team?`);
      if (confirmation) {
        socket.emit('admin-draft-player', { playerId: selectedPlayer.rank });
        setSelectedPlayer(null);
        setSearchQuery('');
      }
    }
  };

  const filteredPlayers = searchQuery
    ? draftState.availablePlayers.filter(p =>
        p.player_name.toLowerCase().includes(searchQuery.toLowerCase())
      ).slice(0, 5) // Show top 5 matches
    : [];

  return (
    <div className="bg-gray-800 rounded-lg p-4 border border-yellow-500">
      <h3 className="text-lg font-bold text-yellow-400 mb-4">Commissioner Controls</h3>
      <div className="space-y-4">
        {/* Manual Pick Entry */}
        <div>
          <h4 className="font-semibold text-white mb-2">Manual Pick for Current Team</h4>
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setSelectedPlayer(null);
              }}
              placeholder="Search for a player..."
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
            />
            {searchQuery && (
              <div className="absolute z-10 w-full mt-1 bg-gray-700 border border-gray-600 rounded-lg shadow-lg">
                {filteredPlayers.length > 0 ? (
                  filteredPlayers.map(player => (
                    <div
                      key={player.rank}
                      onClick={() => {
                        setSelectedPlayer(player);
                        setSearchQuery(player.player_name);
                      }}
                      className="px-3 py-2 cursor-pointer hover:bg-gray-600 text-white"
                    >
                      {player.player_name} ({player.position} - {player.team})
                    </div>
                  ))
                ) : (
                  <div className="px-3 py-2 text-gray-400">No players found</div>
                )}
              </div>
            )}
          </div>
          <button
            onClick={handleManualPick}
            disabled={!selectedPlayer}
            className="w-full mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed"
          >
            Confirm Pick
          </button>
        </div>

        {/* Pause/Resume Timer */}
        <div>
          <h4 className="font-semibold text-white mb-2">Draft Clock</h4>
          <div className="flex gap-2">
            <button
              onClick={() => socket.emit('admin-pause-timer')}
              disabled={draftState.isPaused}
              className="flex-1 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg font-medium transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed"
            >
              Pause Timer
            </button>
            <button
              onClick={() => socket.emit('admin-resume-timer')}
              disabled={!draftState.isPaused}
              className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed"
            >
              Resume Timer
            </button>
          </div>
        </div>

        {/* Undo Last Pick */}
        <div>
          <h4 className="font-semibold text-white mb-2">Manage Picks</h4>
          <button
            onClick={() => {
              if (window.confirm('Are you sure you want to undo the last pick? This cannot be reversed.')) {
                socket.emit('admin-undo-last-pick');
              }
            }}
            className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
          >
            Undo Last Pick
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
