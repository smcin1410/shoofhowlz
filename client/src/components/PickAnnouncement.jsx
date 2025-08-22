import { useEffect } from 'react';

const PickAnnouncement = ({ pick, onClose, draftState, socket }) => {
  // Removed auto-dismiss functionality - modal will only close when Continue is clicked

  const getPositionColor = (position) => {
    switch (position) {
      case 'QB':
        return 'text-red-400';
      case 'RB':
        return 'text-blue-400';
      case 'WR':
        return 'text-green-400';
      case 'TE':
        return 'text-yellow-400';
      case 'K':
      case 'DST':
        return 'text-purple-400';
      default:
        return 'text-gray-300';
    }
  };

  const getPositionBgColor = (position) => {
    switch (position) {
      case 'QB':
        return 'bg-red-600';
      case 'RB':
        return 'bg-blue-600';
      case 'WR':
        return 'bg-green-600';
      case 'TE':
        return 'bg-yellow-600';
      case 'K':
      case 'DST':
        return 'bg-purple-600';
      default:
        return 'bg-gray-600';
    }
  };

  const getNextTeam = () => {
    if (!draftState || draftState.currentPick >= draftState.draftOrder.length) {
      return null;
    }
    const nextTeamIndex = draftState.draftOrder[draftState.currentPick] - 1;
    return draftState.teams[nextTeamIndex];
  };

  const handleContinue = () => {
    if (socket && draftState?.id) {
      socket.emit('continue-draft', { draftId: draftState.id });
    }
    onClose();
  };

  const nextTeam = getNextTeam();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 animate-fade-in">
      <div className="bg-gray-800 rounded-2xl p-6 max-w-md mx-4 shadow-strong animate-bounce-in border border-gray-700">
        <div className="text-center">
          {/* Pick Number Badge */}
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-900 mb-4">
            <span className="text-lg font-bold text-blue-400">#{pick.pickNumber + 1}</span>
          </div>
          
          {/* Team Name */}
          <h2 className="text-2xl font-bold text-white mb-3">
            {pick.team?.name || `Team ${pick.teamId}`}
          </h2>
          
          {/* Announcement Text */}
          <p className="text-lg text-gray-300 mb-4">
            selects...
          </p>
          
          {/* Player Card */}
          <div className="bg-gray-700 rounded-xl p-4 mb-4 border-2 border-gray-600">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xl font-bold text-white">
                {pick.player.player_name}
              </h3>
              <span className={`px-2 py-1 rounded-full text-white font-semibold text-xs ${getPositionBgColor(pick.player.position)}`}>
                {pick.player.position}
              </span>
            </div>
            
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-gray-400">Team:</span>
                <span className="ml-2 font-medium text-white">{pick.player.team}</span>
              </div>
              <div>
                <span className="text-gray-400">Rank:</span>
                <span className="ml-2 font-medium text-white">#{pick.player.rank}</span>
              </div>
            </div>
          </div>

          {/* Next Team Up */}
          {nextTeam && (
            <div className="bg-blue-900/20 border border-blue-500/30 rounded-xl p-3 mb-4">
              <h3 className="text-base font-semibold text-blue-400 mb-1">Next Up:</h3>
              <p className="text-white font-medium text-sm">{nextTeam.name}</p>
              <p className="text-xs text-gray-300 mt-1">Please click Continue to start the timer</p>
            </div>
          )}
          
          {/* Continue Button */}
          <button
            onClick={handleContinue}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-all duration-200 shadow-soft hover:shadow-medium transform hover:scale-105"
          >
            Continue
          </button>
          

        </div>
      </div>
    </div>
  );
};

export default PickAnnouncement;

