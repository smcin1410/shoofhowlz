import { useState, useEffect } from 'react';
import { useSound } from '../hooks/useSound';

const Header = ({ socket, draftState, onReturnToDashboard, isCommissioner, user, onAdminAutoDraft }) => {
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [canExtend, setCanExtend] = useState(false);
  const [playTimerAlert] = useSound('/timer-alert.mp3');
  const [isMuted, setIsMuted] = useState(false);

  const handleStartDraftClock = () => {
    if (socket) {
      socket.emit('start-draft-clock');
    }
  };

  useEffect(() => {
    if (!socket) return;

    const handleTimerUpdate = (data) => {
      setTimeRemaining(data.timeRemaining);
      setCanExtend(data.canExtend);
      if (data.timeRemaining === 10 && !isMuted) {
        playTimerAlert();
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
                  {draftState.leagueSize} teams • {draftState.draftType === 'snake' ? 'Snake' : 'Linear'} draft • {draftState.totalRounds || 16} rounds
                </p>
              )}
            </div>
            
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

            {/* Commissioner Status Indicator */}
            {isCommissioner && (
              <div className="bg-green-600 text-white px-3 py-1.5 rounded text-sm font-medium flex items-center gap-1 border border-green-700 whitespace-nowrap">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="hidden sm:inline">Commissioner</span>
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
