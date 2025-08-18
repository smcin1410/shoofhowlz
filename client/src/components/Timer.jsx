import { useState, useEffect } from 'react';

const Timer = ({ socket, draftState }) => {
  const [timeRemaining, setTimeRemaining] = useState(90);
  const [canExtend, setCanExtend] = useState(false);

  useEffect(() => {
    if (!socket) return;

    const handleTimerUpdate = (data) => {
      setTimeRemaining(data.timeRemaining);
      setCanExtend(data.canExtend);
    };

    socket.on('timer-update', handleTimerUpdate);

    return () => {
      socket.off('timer-update', handleTimerUpdate);
    };
  }, [socket]);

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

  // Don't show timer if draft hasn't started or is complete
  if (!draftState?.isDraftStarted || draftState.currentPick >= draftState.draftOrder.length) {
    return null;
  }

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimerColor = () => {
    if (timeRemaining <= 15) return 'text-red-600';
    if (timeRemaining <= 30) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getTimerBgColor = () => {
    if (timeRemaining <= 15) return 'bg-red-50 border-red-200';
    if (timeRemaining <= 30) return 'bg-yellow-50 border-yellow-200';
    return 'bg-green-50 border-green-200';
  };

  const getProgressColor = () => {
    if (timeRemaining <= 15) return 'bg-red-500';
    if (timeRemaining <= 30) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const progressPercentage = ((90 - timeRemaining) / 90) * 100;

  return (
    <div className={`bg-white rounded-xl shadow-soft p-6 mb-6 border-2 ${getTimerBgColor()} animate-fade-in`}>
      <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-3 h-3 bg-primary-600 rounded-full animate-pulse"></div>
            <h3 className="text-xl font-bold text-gray-800">Draft Timer</h3>
          </div>
          
          <div className="space-y-1">
            <p className="text-sm text-gray-600">
              Pick <span className="font-semibold text-primary-600">#{draftState.currentPick + 1}</span> of {draftState.draftOrder.length}
            </p>
            {currentTeam && (
              <p className="text-sm text-gray-600">
                On the clock: <span className="font-bold text-gray-800">{currentTeam.name}</span>
              </p>
            )}
          </div>
        </div>
        
        <div className="text-center">
          <div className="relative">
            {/* Timer Display */}
            <div className={`text-5xl font-bold ${getTimerColor()} mb-2 ${timeRemaining <= 15 ? 'animate-pulse-slow' : ''}`}>
              {formatTime(timeRemaining)}
            </div>
            
            {/* Progress Bar */}
            <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
              <div 
                className={`h-2 rounded-full transition-all duration-1000 ease-out ${getProgressColor()}`}
                style={{ width: `${progressPercentage}%` }}
              ></div>
            </div>
          </div>
          
          {/* Extension Button */}
          {canExtend && currentTeam && currentTeam.timeExtensionTokens > 0 && (
            <button
              onClick={handleExtendTime}
              className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg transition-all duration-200 text-sm font-semibold shadow-soft hover:shadow-medium transform hover:scale-105 animate-bounce-in"
            >
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Extend Time (+30s)
              </div>
            </button>
          )}
          
          {/* Token Display */}
          {currentTeam && (
            <div className="flex items-center justify-center gap-1 mt-2">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
              <span className="text-xs text-gray-500 font-medium">
                {currentTeam.timeExtensionTokens} token{currentTeam.timeExtensionTokens !== 1 ? 's' : ''} remaining
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Timer;
