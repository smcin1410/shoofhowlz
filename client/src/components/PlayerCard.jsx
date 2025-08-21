import { useState, useEffect } from 'react';

const PlayerCard = ({ player, socket, draftState }) => {
  const [showExpandedModal, setShowExpandedModal] = useState(false);
  const [showDraftModal, setShowDraftModal] = useState(false);
  const [draftError, setDraftError] = useState(null);

  // Listen for draft errors and successful drafts
  useEffect(() => {
    if (!socket) return;

    const handleDraftError = (error) => {
      console.error('🔴 Draft error received:', error);
      setDraftError(error.message);
      setTimeout(() => setDraftError(null), 5000); // Clear error after 5 seconds
    };

    const handleDraftState = (state) => {
      // If draft state updated and we have a new pick, close the modal
      if (state.pickHistory && state.pickHistory.length > 0) {
        const lastPick = state.pickHistory[state.pickHistory.length - 1];
        if (lastPick.player && lastPick.player.rank === player.rank) {
          console.log('✅ Player successfully drafted, closing modal');
          setShowDraftModal(false);
          setShowExpandedModal(false);
          setDraftError(null);
        }
      }
    };

    socket.on('draft-error', handleDraftError);
    socket.on('draft-state', handleDraftState);

    return () => {
      socket.off('draft-error', handleDraftError);
      socket.off('draft-state', handleDraftState);
    };
  }, [socket, player.rank]);

  const getPositionColor = (position) => {
    switch (position) {
      case 'QB':
        return 'bg-red-900/20 border-red-500/30 hover:bg-red-900/30';
      case 'RB':
        return 'bg-blue-900/20 border-blue-500/30 hover:bg-blue-900/30';
      case 'WR':
        return 'bg-green-900/20 border-green-500/30 hover:bg-green-900/30';
      case 'TE':
        return 'bg-yellow-900/20 border-yellow-500/30 hover:bg-yellow-900/30';
      case 'K':
      case 'DST':
        return 'bg-purple-900/20 border-purple-500/30 hover:bg-purple-900/30';
      default:
        return 'bg-gray-700 border-gray-600 hover:bg-gray-600';
    }
  };

  const getPositionTextColor = (position) => {
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

  const getPositionBadgeColor = (position) => {
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
        return 'bg-purple-600 text-white';
      default:
        return 'bg-gray-600 text-white';
    }
  };

  // Helper function to get 2025 projected FPTS
  const getProjectedFPTS = () => {
    if (player.projections_2025 && player.projections_2025.FPTS) {
      return player.projections_2025.FPTS;
    }
    return player.projected_points || 'N/A';
  };

  // Helper function to get 2024 fantasy points
  const get2024FantasyPoints = () => {
    if (player.statistics_2024 && player.statistics_2024.FPTS) {
      return player.statistics_2024.FPTS;
    }
    return 'N/A';
  };

  const handleCardClick = () => {
    setShowExpandedModal(true);
  };

  const handleCloseModal = () => {
    setShowExpandedModal(false);
  };

  const handleDraftClick = (e) => {
    e.stopPropagation();
    setShowDraftModal(true);
  };

  const handleConfirmDraft = () => {
    console.log('🎯 Draft confirmation - Player data:', player);
    console.log('🎯 Sending draft-player with:', { 
      playerId: player.rank,
      draftId: draftState?.id 
    });
    
    // Clear any previous errors
    setDraftError(null);
    
    if (socket && draftState?.id) {
      socket.emit('draft-player', { 
        playerId: player.rank,
        draftId: draftState.id 
      });
      
      // Don't close modal immediately - wait for success or error
      // The modal will close when draft-state updates or show error if draft-error received
    } else {
      setDraftError('No connection to server or missing draft information');
    }
  };

  const handleCancelDraft = () => {
    setShowDraftModal(false);
  };

  // Draft confirmation modal
  if (showDraftModal) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fade-in p-4">
        <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4 shadow-strong animate-bounce-in border border-gray-700">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-900 mb-4">
              <svg className="h-6 w-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-white mb-4">
              Confirm Draft Pick
            </h3>
            <p className="text-gray-300 mb-6">
              Are you sure you want to draft <span className="font-semibold text-white">{player.player_name}</span>?
            </p>
            {draftError && (
              <div className="mb-4 p-3 bg-red-900/20 border border-red-500/30 rounded-lg">
                <p className="text-red-400 text-sm">{draftError}</p>
              </div>
            )}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleCancelDraft}
                className="flex-1 px-4 py-3 bg-gray-600 hover:bg-gray-500 text-white rounded-lg font-medium transition-colors duration-200"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDraft}
                className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors duration-200"
              >
                Draft Player
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Player Card - Mobile Optimized */}
      <div 
        onClick={handleCardClick}
        className={`${getPositionColor(player.position)} border rounded-lg p-4 cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] min-h-[120px] flex flex-col justify-between`}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-sm sm:text-base font-semibold text-white truncate">
              {player.player_name}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <span className={`px-2 py-1 rounded text-xs font-medium ${getPositionBadgeColor(player.position)}`}>
                {player.position}
              </span>
              <span className="text-xs text-gray-300">
                {player.team}
              </span>
            </div>
          </div>
          
          {/* Rank */}
          <div className="text-xs text-gray-400 font-mono ml-2">
            #{player.rank}
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="text-center">
            <div className="text-xs text-gray-400">Projected</div>
            <div className="text-sm font-semibold text-white">
              {getProjectedFPTS()}
            </div>
          </div>
          <div className="text-center">
            <div className="text-xs text-gray-400">2024 FPTS</div>
            <div className="text-sm font-semibold text-white">
              {get2024FantasyPoints()}
            </div>
          </div>
        </div>

        {/* Draft Button */}
        <button
          onClick={handleDraftClick}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-3 rounded text-sm font-medium transition-colors duration-200 flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Draft
        </button>
      </div>

      {/* Expanded Player Modal */}
      {showExpandedModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fade-in p-4">
          <div className="bg-gray-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-strong animate-bounce-in border border-gray-700">
            {/* Modal Header */}
            <div className="sticky top-0 bg-gray-800 border-b border-gray-700 p-6 rounded-t-xl">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-white mb-2">
                    {player.player_name}
                  </h2>
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getPositionBadgeColor(player.position)}`}>
                      {player.position}
                    </span>
                    <span className="text-gray-300 text-sm">
                      {player.team}
                    </span>
                    <span className="text-gray-400 text-sm">
                      Rank #{player.rank}
                    </span>
                  </div>
                </div>
                
                <button
                  onClick={handleCloseModal}
                  className="ml-4 p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors duration-200"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {/* 2025 Projections */}
              {player.projections_2025 && Object.keys(player.projections_2025).length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">2025 Projections</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {Object.entries(player.projections_2025).map(([key, value]) => {
                      if (!value || value === null || value === undefined || value === '') {
                        return null;
                      }

                      let displayValue = value;
                      if (typeof value === 'number') {
                        displayValue = value.toLocaleString();
                      } else if (typeof value === 'string') {
                        displayValue = value;
                      } else {
                        displayValue = String(value);
                      }

                      return (
                        <div key={key} className="bg-gray-700 rounded-lg p-3">
                          <div className="text-xs text-gray-400 mb-1 capitalize">
                            {key.replace(/_/g, ' ')}
                          </div>
                          <div className="text-sm font-semibold text-white">
                            {displayValue}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 2024 Statistics */}
              {player.statistics_2024 && Object.keys(player.statistics_2024).length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">2024 Statistics</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {Object.entries(player.statistics_2024).map(([key, value]) => {
                      if (!value || value === null || value === undefined || value === '') {
                        return null;
                      }

                      let displayValue = value;
                      if (typeof value === 'number') {
                        displayValue = value.toLocaleString();
                      } else if (typeof value === 'string') {
                        displayValue = value;
                      } else {
                        displayValue = String(value);
                      }

                      return (
                        <div key={key} className="bg-gray-700 rounded-lg p-3">
                          <div className="text-xs text-gray-400 mb-1 capitalize">
                            {key.replace(/_/g, ' ')}
                          </div>
                          <div className="text-sm font-semibold text-white">
                            {displayValue}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Outlook 2025 */}
              {player.outlook_2025 && (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-3">Outlook 2025</h3>
                  <div className="bg-gray-700 rounded-lg p-4 w-full">
                    <p className="text-gray-300 text-sm leading-relaxed">
                      {player.outlook_2025}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 bg-gray-800 border-t border-gray-700 p-6 rounded-b-xl">
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleCloseModal}
                  className="flex-1 px-4 py-3 bg-gray-600 hover:bg-gray-500 text-white rounded-lg font-medium transition-colors duration-200"
                >
                  Close
                </button>
                <button
                  onClick={handleDraftClick}
                  className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors duration-200 flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Draft Player
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default PlayerCard;
