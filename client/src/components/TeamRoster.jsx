import React, { useState } from 'react';

const TeamRoster = ({ draftState }) => {
  const [selectedTeamId, setSelectedTeamId] = useState(1);

  if (!draftState || !draftState.teams || draftState.teams.length === 0) {
    return (
      <div className="text-gray-600">No teams available</div>
    );
  }

  const selectedTeam = draftState.teams.find(team => team.id === selectedTeamId);
  
  if (!selectedTeam) {
    return (
      <div className="text-gray-600">Team not found</div>
    );
  }

  // Position caps for fantasy football
  const POSITION_CAPS = {
    QB: 2,
    RB: 8,
    WR: 8,
    TE: 3,
    K: 1,
    DST: 1
  };

  // Group players by position
  const playersByPosition = {};
  selectedTeam.roster.forEach(player => {
    if (!playersByPosition[player.position]) {
      playersByPosition[player.position] = [];
    }
    playersByPosition[player.position].push(player);
  });

  // Get position color
  const getPositionColor = (position) => {
    switch (position) {
      case 'QB': return 'bg-red-100 border-red-300';
      case 'RB': return 'bg-blue-100 border-blue-300';
      case 'WR': return 'bg-green-100 border-green-300';
      case 'TE': return 'bg-orange-100 border-orange-300';
      case 'K': return 'bg-gray-100 border-gray-300';
      case 'DST': return 'bg-gray-100 border-gray-300';
      default: return 'bg-gray-100 border-gray-300';
    }
  };

  // Sort positions in a logical order
  const positionOrder = ['QB', 'RB', 'WR', 'TE', 'K', 'DST'];

  return (
    <div>
      {/* Team Selector */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Select Team</label>
        <select
          value={selectedTeamId}
          onChange={(e) => setSelectedTeamId(Number(e.target.value))}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {draftState.teams.map((team) => (
            <option key={team.id} value={team.id}>
              {team.name}
            </option>
          ))}
        </select>
      </div>

      {/* Team Info */}
      <div className="mb-4 p-3 bg-gray-50 rounded-md">
        <h3 className="font-semibold text-gray-800">{selectedTeam.name}</h3>
        <p className="text-sm text-gray-600">{selectedTeam.email}</p>
        <p className="text-sm text-gray-600">
          Time Extension Tokens: {selectedTeam.timeExtensionTokens}
        </p>
      </div>

      {/* Roster by Position */}
      <div className="space-y-4">
        {positionOrder.map((position) => {
          const players = playersByPosition[position] || [];
          const currentCount = players.length;
          const maxCount = POSITION_CAPS[position];
          const remaining = maxCount - currentCount;

          return (
            <div key={position} className="border border-gray-200 rounded-md">
              <div className={`px-3 py-2 ${getPositionColor(position)} border-b border-gray-200`}>
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-gray-800">{position}</span>
                  <span className="text-sm text-gray-600">
                    {currentCount}/{maxCount} {remaining > 0 && `(${remaining} remaining)`}
                  </span>
                </div>
              </div>
              
              <div className="p-3">
                {players.length > 0 ? (
                  <div className="space-y-2">
                    {players.map((player) => (
                      <div key={player.rank} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                        <div>
                          <div className="font-medium text-gray-800">{player.player_name}</div>
                          <div className="text-sm text-gray-600">{player.team}</div>
                        </div>
                        <div className="text-sm text-gray-600">
                          Rank: {player.rank}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-gray-500 text-sm italic">
                    No {position} players drafted yet
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary */}
      <div className="mt-4 p-3 bg-blue-50 rounded-md">
        <div className="text-sm text-gray-700">
          <div className="font-medium">Roster Summary:</div>
          <div>Total Players: {selectedTeam.roster.length}</div>
          <div>Remaining Slots: {Object.values(POSITION_CAPS).reduce((sum, cap) => sum + cap, 0) - selectedTeam.roster.length}</div>
        </div>
      </div>
    </div>
  );
};

export default TeamRoster;
