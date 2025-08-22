import React from 'react';

const DraftProgressBar = ({ draftState }) => {
  if (!draftState?.draftOrder?.length) return null;
  
  const totalPicks = draftState.draftOrder.length;
  const currentPick = draftState.currentPick || 0;
  const completedPicks = draftState.pickHistory?.length || 0;
  const progress = (completedPicks / totalPicks) * 100;
  
  // Determine status
  const isComplete = draftState.isComplete || draftState.status === 'completed';
  const isDraftStarted = draftState.isDraftStarted || completedPicks > 0;
  
  // Calculate current team info
  const currentPickIndex = (currentPick || 1) - 1;
  const currentTeam = draftState.draftOrder?.[currentPickIndex];
  const currentTeamName = currentTeam ? 
    draftState.teams?.find(t => t.id === currentTeam.teamId)?.name || `Team ${currentTeam.teamId}` : 
    'Unknown Team';
  
  // Calculate current round
  const teamsCount = draftState.teams?.length || 0;
  const currentRound = teamsCount > 0 ? Math.ceil(currentPick / teamsCount) : 1;
  const totalRounds = Math.ceil(totalPicks / teamsCount);
  
  return (
    <div className="fixed top-0 left-0 right-0 z-40 bg-gray-800 border-b border-gray-700 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between text-sm mb-2">
          <div className="flex items-center space-x-4">
            <span className="text-gray-300 font-medium">
              {isComplete ? '🏆 Draft Complete!' : isDraftStarted ? '⚡ Live Draft' : '⏸️ Draft Pending'}
            </span>
            {!isComplete && isDraftStarted && (
              <span className="text-blue-400">
                {currentTeamName} on the clock
              </span>
            )}
          </div>
          <div className="flex items-center space-x-4 text-gray-300">
            <span>Round {currentRound} of {totalRounds}</span>
            <span>{completedPicks} / {totalPicks} picks ({Math.round(progress)}%)</span>
          </div>
        </div>
        
        <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
          <div 
            className={`h-3 rounded-full transition-all duration-500 ${
              isComplete ? 'bg-green-500' : 
              isDraftStarted ? 'bg-blue-500' : 'bg-gray-500'
            }`}
            style={{ width: `${Math.max(progress, 2)}%` }}
          >
            {/* Animated pulse effect for active draft */}
            {!isComplete && isDraftStarted && (
              <div className="h-full w-full bg-gradient-to-r from-transparent via-white to-transparent opacity-20 animate-pulse"></div>
            )}
          </div>
        </div>
        
        {/* Time remaining indicator (if timer info is available) */}
        {!isComplete && isDraftStarted && draftState.timeRemaining > 0 && (
          <div className="flex justify-center mt-2">
            <span className={`text-xs px-2 py-1 rounded-full ${
              draftState.timeRemaining <= 10 ? 'bg-red-900 text-red-200' :
              draftState.timeRemaining <= 30 ? 'bg-yellow-900 text-yellow-200' :
              'bg-gray-700 text-gray-300'
            }`}>
              ⏰ {draftState.timeRemaining}s remaining
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default DraftProgressBar;