import React from 'react';

const DraftBoard = ({ 
  draftState, 
  socket, 
  zoomLevel = 1, 
  setZoomLevel, 
  getCurrentPickDisplay, 
  getTeamName, 
  getPositionColor,
  handleZoomIn,
  handleZoomOut,
  handleResetZoom
}) => {
  // Debug logging at the very beginning
  console.log('DraftBoard component called with:', {
    hasDraftState: !!draftState,
    hasTeams: !!draftState?.teams,
    hasDraftOrder: !!draftState?.draftOrder,
    teamsLength: draftState?.teams?.length,
    draftOrderLength: draftState?.draftOrder?.length
  });

  if (!draftState || !draftState.teams || !draftState.draftOrder) {
    console.log('DraftBoard: Returning loading state');
    return (
      <div className="text-gray-600">Loading draft board...</div>
    );
  }

  const { teams, draftOrder, currentPick, draftedPlayers, pickHistory } = draftState;
  const totalRounds = 16;
  const totalTeams = teams.length;

  console.log('DraftBoard: Creating grid with', { totalRounds, totalTeams });

  // Simple function to create pick numbers for snake draft
  const getPickNumber = (round, columnIndex) => {
    if (round % 2 === 1) {
      // Odd rounds: normal order (1.1, 1.2, 1.3, ..., 1.12)
      return `${round}.${columnIndex + 1}`;
    } else {
      // Even rounds: reverse order (2.12, 2.11, 2.10, ..., 2.1)
      return `${round}.${totalTeams - columnIndex}`;
    }
  };

  // Function to get player for a specific pick
  const getPlayerForPick = (pickIndex) => {
    if (pickIndex >= draftOrder.length) return null;
    
    // Find the pick in history
    const pickRecord = pickHistory.find(pick => pick.pickIndex === pickIndex);
    if (pickRecord) {
      return pickRecord.player;
    }
    
    return null;
  };

  // Function to check if this is the current pick
  const isCurrentPick = (pickIndex) => {
    return pickIndex === currentPick;
  };

  // Function to get the team that should be in a specific grid position
  const getTeamForGridPosition = (round, columnIndex) => {
    // For snake draft, even rounds go in reverse order
    let actualPickIndex;
    if (round % 2 === 1) {
      // Odd rounds (1, 3, 5, etc.) - normal order
      actualPickIndex = (round - 1) * totalTeams + columnIndex;
    } else {
      // Even rounds (2, 4, 6, etc.) - reverse order
      actualPickIndex = (round - 1) * totalTeams + (totalTeams - 1 - columnIndex);
    }
    
    if (actualPickIndex >= draftOrder.length) return null;
    return draftOrder[actualPickIndex];
  };

  return (
    <div className="space-y-4 draft-board">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
        <div className="text-sm text-gray-400 text-center sm:text-left">
          Full draft results - {draftState?.pickHistory?.length || 0} picks made
          {draftState?.draftOrder && (
            <span className="ml-2">
              ({Math.ceil(draftState.draftOrder.length / (draftState?.teams?.length || 1))} rounds total)
            </span>
          )}
        </div>
        
        {/* Zoom Controls */}
        <div className="flex items-center justify-center sm:justify-end gap-2 zoom-controls">
          <button
            onClick={handleZoomOut}
            className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
            title="Zoom Out (-)"
          >
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
            </svg>
          </button>
          <span className="text-sm text-gray-300 min-w-[60px] text-center">
            {Math.round(zoomLevel * 100)}%
          </span>
          <button
            onClick={handleZoomIn}
            className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
            title="Zoom In (+)"
          >
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7M13 10H7" />
            </svg>
          </button>
          <button
            onClick={handleResetZoom}
            className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
            title="Reset Zoom (0)"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Draft Board Grid */}
      <div className="bg-gray-800 rounded-lg p-4 overflow-x-auto">
        <div 
          className="min-w-full grid draft-grid"
          style={{ 
            gridTemplateColumns: `80px repeat(${totalTeams}, 1fr)`, 
            gap: '4px',
            transform: `scale(${zoomLevel})`, 
            transformOrigin: 'top left',
            // Ensure minimum cell sizes for better image generation
            minWidth: `${80 + (totalTeams * 120)}px`
          }}
        >
          {/* Header row with team names */}
          <div className="font-semibold text-sm text-gray-300 p-2 text-center bg-gray-700 rounded" style={{ minHeight: '50px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            Round
          </div>
          {teams.map((team) => (
            <div key={team.id} className="font-semibold text-xs text-gray-300 p-2 text-center bg-gray-700 rounded" style={{ minHeight: '50px', minWidth: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {team.name}
            </div>
          ))}

          {/* Draft rounds - just showing pick numbers for now */}
          {Array.from({ length: totalRounds }, (_, roundIndex) => {
            const round = roundIndex + 1;
            
            return (
              <React.Fragment key={round}>
                {/* Round number */}
                <div className="font-medium text-sm text-gray-300 p-2 text-center bg-gray-700 rounded" style={{ minHeight: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {round}
                </div>
                
                {/* Pick numbers for this round */}
                {Array.from({ length: totalTeams }, (_, columnIndex) => {
                  const pickNumber = getPickNumber(round, columnIndex);
                  
                  // Calculate which team should be in this grid position
                  let teamId;
                  if (round % 2 === 1) {
                    // Odd rounds: normal order (1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12)
                    teamId = columnIndex + 1;
                  } else {
                    // Even rounds: reverse order (12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1)
                    teamId = totalTeams - columnIndex;
                  }
                  
                  // Calculate the actual pick index for this position
                  let pickIndex;
                  if (round % 2 === 1) {
                    // Odd rounds: normal order (0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11)
                    pickIndex = (round - 1) * totalTeams + columnIndex;
                  } else {
                    // Even rounds: reverse order (11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0)
                    pickIndex = (round - 1) * totalTeams + (totalTeams - 1 - columnIndex);
                  }
                  
                  // Find the player for this specific pick index
                  const player = getPlayerForPick(pickIndex);
                  const isCurrent = currentPick === pickIndex;
                  const team = teams.find(t => t.id === teamId);
                  
                  console.log(`Round ${round}, Column ${columnIndex}: Pick ${pickNumber}, Team ${teamId}, PickIndex ${pickIndex}, Player: ${player?.player_name || 'none'}`);
                  
                  return (
                    <div
                      key={`${round}-${columnIndex}`}
                      className={`p-2 text-center rounded border min-h-[3rem] flex items-center justify-center relative ${
                        player ? getPositionColor(player.position) : 'bg-gray-700 border-gray-600'
                      } ${isCurrent ? 'ring-2 ring-blue-500 ring-opacity-50' : ''}`}
                      style={{
                        minHeight: '60px',
                        minWidth: '120px'
                      }}
                    >
                      {/* Pick number overlay */}
                      <div className="absolute top-1 left-1 text-xs text-gray-400 font-mono font-bold">
                        {pickNumber}
                      </div>
                      
                      {player ? (
                        <div className="w-full">
                          <div className="font-medium text-white truncate mb-1 text-sm leading-tight">
                            {player.player_name}
                          </div>
                          <div className="flex items-center justify-center gap-1">
                            <span className="px-1.5 py-0.5 rounded text-xs font-semibold bg-black/30 text-white">
                              {player.position}
                            </span>
                            <span className="text-gray-300 text-xs">
                              {player.team}
                            </span>
                          </div>
                        </div>
                      ) : isCurrent ? (
                        <div className="text-blue-400 font-medium text-sm">
                          On Clock
                        </div>
                      ) : (
                        <div className="text-gray-500 font-mono text-xs">
                          {pickNumber}
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
    </div>
  );
};

export default DraftBoard;
