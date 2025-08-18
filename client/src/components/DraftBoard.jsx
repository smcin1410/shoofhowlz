import React from 'react';

const DraftBoard = ({ draftState }) => {
  if (!draftState || !draftState.teams || !draftState.draftOrder) {
    return (
      <div className="text-gray-600">Loading draft board...</div>
    );
  }

  const { teams, draftOrder, currentPick, draftedPlayers, pickHistory } = draftState;
  const totalRounds = 16;
  const totalTeams = 12;

  // Function to get position color
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

  // Function to get player for a specific pick
  const getPlayerForPick = (round, teamIndex) => {
    const pickIndex = (round - 1) * totalTeams + teamIndex;
    if (pickIndex >= draftOrder.length) return null;
    
    // Find the pick in history
    const pickRecord = pickHistory.find(pick => pick.pickNumber === pickIndex);
    if (pickRecord) {
      return pickRecord.player;
    }
    
    return null;
  };

  // Function to check if this is the current pick
  const isCurrentPick = (round, teamIndex) => {
    const pickIndex = (round - 1) * totalTeams + teamIndex;
    return pickIndex === currentPick;
  };

  return (
    <div className="overflow-x-auto">
      <div className="min-w-full" style={{ display: 'grid', gridTemplateColumns: '80px repeat(12, 1fr)', gap: '4px' }}>
        {/* Header row with team names */}
        <div className="font-semibold text-sm text-gray-700 p-2 text-center bg-gray-50 rounded">Round</div>
        {teams.map((team) => (
          <div key={team.id} className="font-semibold text-xs text-gray-700 p-2 text-center bg-gray-50 rounded">
            {team.name}
          </div>
        ))}

        {/* Draft rounds */}
        {Array.from({ length: totalRounds }, (_, roundIndex) => {
          const round = roundIndex + 1;
          return (
            <React.Fragment key={round}>
              {/* Round number */}
              <div className="font-medium text-sm text-gray-700 p-2 text-center bg-gray-50 rounded">
                {round}
              </div>
              
              {/* Team picks for this round */}
              {Array.from({ length: totalTeams }, (_, teamIndex) => {
                const player = getPlayerForPick(round, teamIndex);
                const isCurrent = isCurrentPick(round, teamIndex);
                
                return (
                  <div
                    key={`${round}-${teamIndex}`}
                    className={`
                      p-2 text-xs text-center rounded border min-h-[3rem] flex items-center justify-center
                      ${player ? getPositionColor(player.position) : 'bg-white border-gray-200'}
                      ${isCurrent ? 'ring-2 ring-blue-500 ring-opacity-50' : ''}
                      ${!player && isCurrent ? 'bg-blue-50 border-blue-300' : ''}
                    `}
                  >
                    {player ? (
                      <div>
                        <div className="font-medium text-gray-800 truncate">
                          {player.player_name}
                        </div>
                        <div className="text-gray-600">
                          {player.position} - {player.team}
                        </div>
                      </div>
                    ) : isCurrent ? (
                      <div className="text-blue-600 font-medium">
                        Current Pick
                      </div>
                    ) : (
                      <div className="text-gray-400">
                        -
                      </div>
                    )}
                  </div>
                );
              })}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

export default DraftBoard;
