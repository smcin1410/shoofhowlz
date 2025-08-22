import React, { useState } from 'react';

const AdminPanel = ({ socket, draftState }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!draftState || !draftState.isDraftStarted) {
    return null;
  }

  return (
    <div className="bg-gray-800 rounded-lg border border-yellow-500">
      {/* Header with toggle */}
      <div 
        className="p-4 cursor-pointer flex items-center justify-between"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <h3 className="text-lg font-bold text-yellow-400">Commissioner Controls</h3>
        <svg 
          className={`w-5 h-5 text-yellow-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {/* Collapsible content */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-gray-700">
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
              disabled={!draftState?.pickHistory || draftState.pickHistory.length === 0}
              className={`w-full px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                draftState?.pickHistory && draftState.pickHistory.length > 0
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-gray-500 text-gray-300 cursor-not-allowed'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
              </svg>
              Undo Last Pick
              {draftState?.pickHistory && draftState.pickHistory.length > 0 && (
                <span className="bg-red-800 text-white px-2 py-0.5 rounded text-xs">
                  {draftState.pickHistory.length}
                </span>
              )}
            </button>
            <p className="text-xs text-gray-400 mt-1">
              Removes the last pick and returns the player to the available pool. Timer resets for the team.
            </p>
          </div>

          {/* Timer Recovery */}
          <div>
            <h4 className="font-semibold text-white mb-2">Timer Recovery</h4>
            <button
              onClick={() => {
                if (window.confirm('Recover timer state? This will reset and restart the current timer.')) {
                  socket.emit('admin-recover-timer');
                }
              }}
              className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Recover Timer
            </button>
            <p className="text-xs text-gray-400 mt-1">
              Fixes timer issues by resetting and restarting the current timer. Use if timer gets stuck.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
