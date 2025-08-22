import { useState, useEffect } from 'react';
import { createBeepSound } from '../utils/audioUtils';

const Header = ({ socket, draftState, onReturnToDashboard, onReturnToLobby, onForceCompleteDraft, isCommissioner, user, onAdminAutoDraft }) => {
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [canExtend, setCanExtend] = useState(false);
  const [playTimerAlert] = useState(() => createBeepSound(800, 0.5));
  const [isMuted, setIsMuted] = useState(false);
  const [showCommissionerTools, setShowCommissionerTools] = useState(false);

  const handleStartDraftClock = () => {
    if (socket && draftState?.id) {
      socket.emit('start-draft-clock', { draftId: draftState.id });
    }
  };

  useEffect(() => {
    if (!socket) return;

    const handleTimerUpdate = (data) => {
      setTimeRemaining(data.timeRemaining);
      setCanExtend(data.canExtend);
      if (data.timeRemaining === 10 && !isMuted) {
        try {
          playTimerAlert();
        } catch (error) {
          console.warn('🔇 Timer alert sound not available:', error.message);
        }
      }
    };

    socket.on('timer-update', handleTimerUpdate);

    // Reset timer state when draft state changes (draft starts)
    if (draftState?.isDraftStarted && !draftState?.currentPick) {
      setTimeRemaining(0);
      setCanExtend(false);
    }

    return () => {
      socket.off('timer-update', handleTimerUpdate);
    };
  }, [socket, draftState, isMuted, playTimerAlert]);

  // Close commissioner tools dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showCommissionerTools && !event.target.closest('.commissioner-tools')) {
        setShowCommissionerTools(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showCommissionerTools]);

  const handleExtendTime = () => {
    if (socket) {
      socket.emit('extend-time');
    }
  };

  const getCurrentTeam = () => {
    if (!draftState?.isDraftStarted || draftState.currentPick >= draftState.draftOrder.length) {
      return null;
    }
    const teamIndex = draftState.draftOrder[draftState.currentPick] - 1;
    return draftState.teams[teamIndex];
  };

  const currentTeam = getCurrentTeam();

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimerColor = () => {
    if (timeRemaining <= 15) return 'text-red-400';
    if (timeRemaining <= 30) return 'text-yellow-400';
    return 'text-green-400';
  };

  const getCurrentPickDisplay = () => {
    if (!draftState?.isDraftStarted || draftState.currentPick >= draftState.draftOrder.length) {
      return 'Draft Not Started';
    }
    const round = Math.floor(draftState.currentPick / draftState.teams.length) + 1;
    const pickInRound = (draftState.currentPick % draftState.teams.length) + 1;
    const totalRounds = Math.ceil(draftState.draftOrder.length / draftState.teams.length);
    return `Round ${round}/${totalRounds}, Pick ${pickInRound}`;
  };

  // Don't show timer if draft hasn't started or is complete
  const showTimer = draftState?.isDraftStarted && draftState.currentPick < draftState.draftOrder.length;

  // Check if timer is running (timeRemaining > 0 means timer is active)
  const isTimerRunning = timeRemaining > 0;

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-gray-900/95 backdrop-blur-sm text-white shadow-lg border-b border-gray-700">
      <div className="container mx-auto px-4 py-2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          {/* Left Side - Title and Lobby Button */}
          <div className="flex items-center justify-between sm:justify-start gap-3">
            <div className="flex-1 sm:flex-none">
              <h1 className="text-lg sm:text-xl font-bold text-white truncate">
                {draftState?.leagueName || 'Fantasy Football Draft'}
              </h1>
              {draftState?.leagueName && (
                <p className="text-xs text-gray-400 hidden sm:block">
                  {(() => {
                    console.log('🔍 Draft type debug:', {
                      draftType: draftState.draftType,
                      typeofDraftType: typeof draftState.draftType,
                      isSnake: draftState.draftType === 'snake',
                      displayText: draftState.draftType === 'snake' ? 'Snake' : 'Linear'
                    });
                    return `${draftState.leagueSize} teams • ${draftState.draftType === 'snake' ? 'Snake' : 'Linear'} draft • ${draftState.totalRounds || 16} rounds`;
                  })()}
                </p>
              )}
            </div>
            
            {/* Return to Lobby Button - Always show on draft page */}
            {onReturnToLobby && (
              <button
                onClick={onReturnToLobby}
                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-sm font-medium transition-colors duration-200 flex items-center gap-1 border border-blue-700 whitespace-nowrap"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                <span className="hidden sm:inline">Return to Lobby</span>
              </button>
            )}
            
            {/* Lobby Button - Only show when draft is started */}
            {draftState?.isDraftStarted && onReturnToDashboard && (
              <button
                onClick={() => {
                  console.log('Dashboard button clicked!');
                  onReturnToDashboard();
                }}
                className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-1.5 rounded text-sm font-medium transition-colors duration-200 flex items-center gap-1 border border-gray-600 whitespace-nowrap"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                <span className="hidden sm:inline">Dashboard</span>
              </button>
            )}

            {/* Admin Auto Draft Button */}
            {user?.isAdmin && onAdminAutoDraft && (
              <button
                onClick={onAdminAutoDraft}
                className="bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-1.5 rounded text-sm font-medium transition-colors duration-200 flex items-center gap-1 border border-yellow-700 whitespace-nowrap"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <span className="hidden sm:inline">Auto Draft</span>
              </button>
            )}

            {/* Commissioner Tools */}
            {isCommissioner && (
              <div className="relative commissioner-tools">
                <button
                  onClick={() => setShowCommissionerTools(!showCommissionerTools)}
                  className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded text-sm font-medium flex items-center gap-1 border border-green-700 whitespace-nowrap"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="hidden sm:inline">Commissioner Tools</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {/* Commissioner Tools Dropdown */}
                {showCommissionerTools && (
                  <div className="absolute top-full right-0 mt-1 w-64 bg-gray-800 border border-gray-600 rounded-lg shadow-lg z-50">
                    <div className="p-3">
                      <h3 className="text-white font-medium mb-3 text-sm">Commissioner Tools</h3>
                      
                      {/* Draft Controls */}
                      <div className="space-y-2">
                        <button
                          onClick={() => {
                            if (socket && draftState?.id) {
                              socket.emit('pause-draft', { draftId: draftState.id });
                            }
                          }}
                          className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 rounded flex items-center gap-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Pause Draft
                        </button>
                        
                        <button
                          onClick={() => {
                            if (socket && draftState?.id) {
                              socket.emit('resume-draft', { draftId: draftState.id });
                            }
                          }}
                          className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 rounded flex items-center gap-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Resume Draft
                        </button>
                        
                        <button
                          onClick={() => {
                            if (socket && draftState?.id) {
                              socket.emit('reset-timer', { draftId: draftState.id });
                            }
                          }}
                          className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 rounded flex items-center gap-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Reset Timer
                        </button>
                      </div>
                      
                      <div className="border-t border-gray-600 my-2"></div>
                      
                      {/* Admin Controls */}
                      <div className="space-y-2">
                        <button
                          onClick={onForceCompleteDraft}
                          className="w-full text-left px-3 py-2 text-sm text-red-300 hover:bg-red-900/20 rounded flex items-center gap-2 border border-red-600/30"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Force Complete Draft
                        </button>
                      </div>
                      
                      <div className="border-t border-gray-600 my-2"></div>
                      
                      {/* Edit Features */}
                      <div className="space-y-2">
                        <button
                          onClick={() => {
                            // TODO: Implement edit pick functionality
                            alert('Edit pick functionality coming soon!');
                          }}
                          className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 rounded flex items-center gap-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          Edit Last Pick
                        </button>
                        
                        <button
                          onClick={() => {
                            // TODO: Implement undo pick functionality
                            alert('Undo pick functionality coming soon!');
                          }}
                          className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 rounded flex items-center gap-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                          </svg>
                          Undo Last Pick
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            <button onClick={() => setIsMuted(!isMuted)} className="p-2 bg-gray-700 hover:bg-gray-600 rounded">
              {isMuted ? (
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15.172a4 4 0 01-5.656 0M18.414 15.172a4 4 0 00-5.656 0M12 12a4 4 0 014 4m-4-4a4 4 0 00-4 4m0 0l-1.172-1.172a1 1 0 00-1.414 1.414L12 18.586l4.172-4.172a1 1 0 00-1.414-1.414L12 17.172V12z" /></svg>
              ) : (
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.636 8.464a5 5 0 000 7.072m-2.828-9.9a9 9 0 000 12.728" /></svg>
              )}
            </button>
          </div>

          {/* Right Side - Timer and Controls */}
          {showTimer && (
            <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
              {/* Start Clock Button - Show when draft is started but timer is not running */}
              {!isTimerRunning && draftState?.isDraftStarted && (
                <button
                  onClick={handleStartDraftClock}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Start Clock
                </button>
              )}

              {/* Timer Display - Mobile Optimized */}
              <div className="bg-gray-800/90 rounded-lg p-2 sm:p-3 border border-gray-600 w-full sm:w-auto">
                {/* Mobile Layout */}
                <div className="sm:hidden space-y-1.5">
                  {/* Timer Status and Time */}
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-semibold text-gray-300 uppercase tracking-wide">
                      {isTimerRunning ? 'On Clock' : 'Waiting'}
                    </div>
                    {isTimerRunning ? (
                      <div className={`text-xl font-bold ${getTimerColor()} ${timeRemaining <= 15 ? 'animate-pulse' : ''}`}>
                        {formatTime(timeRemaining)}
                      </div>
                    ) : (
                      <div className="text-lg font-bold text-yellow-400">
                        Paused
                      </div>
                    )}
                  </div>
                  
                  {/* Pick Info and Team */}
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-gray-300">
                      {getCurrentPickDisplay()}
                    </div>
                    {currentTeam && (
                      <div className="text-xs font-semibold text-white">
                        {currentTeam.name}
                      </div>
                    )}
                  </div>
                  
                  {/* Continue Message and Controls */}
                  <div className="flex items-center justify-between">
                    {!isTimerRunning && currentTeam && (
                      <div className="text-xs text-yellow-300 bg-yellow-900/20 border border-yellow-500/30 rounded px-2 py-0.5">
                        Click Continue
                      </div>
                    )}
                    
                    {/* Extension Button */}
                    {canExtend && currentTeam && currentTeam.timeExtensionTokens > 0 && isTimerRunning && (
                      <button
                        onClick={handleExtendTime}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-0.5 rounded text-xs font-medium transition-colors duration-200 flex items-center gap-1"
                      >
                        <svg className="w-2 h-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        +30s
                      </button>
                    )}
                    
                    {/* Token Display */}
                    {currentTeam && (
                      <div className="text-xs text-gray-400">
                        {currentTeam.timeExtensionTokens} token{currentTeam.timeExtensionTokens !== 1 ? 's' : ''}
                      </div>
                    )}
                  </div>
                </div>

                {/* Desktop Layout */}
                <div className="hidden sm:flex items-center gap-2">
                  {/* Timer Status */}
                  <div className="text-xs font-semibold text-gray-300 uppercase tracking-wide">
                    {isTimerRunning ? 'On Clock' : 'Waiting'}
                  </div>
                  
                  {/* Timer Display */}
                  {isTimerRunning ? (
                    <div className={`text-lg font-bold ${getTimerColor()} ${timeRemaining <= 15 ? 'animate-pulse' : ''}`}>
                      {formatTime(timeRemaining)}
                    </div>
                  ) : (
                    <div className="text-base font-bold text-yellow-400">
                      {draftState.isPaused ? "Paused by Admin" : "Paused"}
                    </div>
                  )}
                  
                  {/* Pick Info */}
                  <div className="text-xs text-gray-300">
                    {getCurrentPickDisplay()}
                  </div>
                  
                  {/* Team Name */}
                  {currentTeam && (
                    <div className="text-sm font-semibold text-white">
                      {currentTeam.name}
                    </div>
                  )}

                  {/* Continue Message */}
                  {!isTimerRunning && currentTeam && (
                    <div className="text-xs text-yellow-300 bg-yellow-900/20 border border-yellow-500/30 rounded px-2 py-0.5">
                      Click Continue
                    </div>
                  )}
                  
                  {/* Extension Button */}
                  {canExtend && currentTeam && currentTeam.timeExtensionTokens > 0 && isTimerRunning && (
                    <button
                      onClick={handleExtendTime}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-0.5 rounded text-xs font-medium transition-colors duration-200 flex items-center gap-1"
                    >
                      <svg className="w-2 h-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      +30s
                    </button>
                  )}
                  
                  {/* Token Display */}
                  {currentTeam && (
                    <div className="text-xs text-gray-400">
                      {currentTeam.timeExtensionTokens} token{currentTeam.timeExtensionTokens !== 1 ? 's' : ''}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
