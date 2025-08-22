import { useState } from 'react';
import AdminPanel from './AdminPanel';

const Sidebar = ({ socket, draftState, isCommissioner }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const getPositionSlots = (position) => {
    const caps = {
      'QB': 4,
      'RB': 8,
      'WR': 8,
      'TE': 3,
      'K': 3,
      'D/ST': 3
    };
    return caps[position] || 0;
  };

  const getCurrentTeam = () => {
    if (!draftState?.teams || !draftState?.draftOrder || draftState.currentPick >= draftState.draftOrder.length) {
      return null;
    }
    const teamIndex = draftState.draftOrder[draftState.currentPick] - 1;
    return draftState.teams[teamIndex];
  };

  const getCurrentRoster = () => {
    if (!draftState?.pickHistory) return [];
    
    const currentTeam = getCurrentTeam();
    if (!currentTeam) return [];
    
    // Show only the current team's drafted players
    return draftState.pickHistory
      .filter(pick => pick.team && pick.team.id === currentTeam.id)
      .map(pick => ({
        player: pick.player,
        pickIndex: pick.pickIndex
      }));
  };

  const currentRoster = getCurrentRoster();

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <div className="lg:w-[20%]">
      {/* Mobile Toggle Button */}
      <div className="lg:hidden mb-4">
        <button
          onClick={toggleCollapse}
          className="w-full bg-gray-800 hover:bg-gray-700 text-white px-4 py-3 rounded-lg flex items-center justify-between transition-colors duration-200 border border-gray-700"
        >
          <span className="font-medium">Current Team Roster</span>
          <svg 
            className={`w-5 h-5 transition-transform duration-200 ${isCollapsed ? 'rotate-180' : ''}`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* Sidebar Content */}
      <div className={`lg:block ${isCollapsed ? 'hidden' : 'block'}`}>
        {/* Admin Panel */}
        {isCommissioner && (
          <div className="mb-4">
            <AdminPanel socket={socket} draftState={draftState} />
          </div>
        )}

        {/* My Roster Module */}
        <div className="bg-gray-800 rounded-lg shadow-lg border border-gray-700 lg:sticky lg:top-6">
          <div className="p-4">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              Current Team Roster
            </h2>
            
            {/* Current Team Display */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">Current Team</label>
              <div className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm">
                {getCurrentTeam()?.name || 'Draft Complete'}
              </div>
            </div>

            {/* Roster Summary */}
            <div className="mb-4 p-3 bg-gray-700 rounded-lg">
              <div className="text-sm text-gray-300 mb-2">Roster Summary</div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {['QB', 'RB', 'WR', 'TE', 'K', 'D/ST'].map((position) => {
                  const positionPlayers = currentRoster.filter(pick => pick.player.position === position);
                  const maxSlots = getPositionSlots(position);
                  const currentCount = positionPlayers.length;
                  
                  return (
                    <div key={position} className="flex justify-between">
                      <span className="text-gray-400">{position}:</span>
                      <span className={`font-medium ${currentCount >= maxSlots ? 'text-red-400' : 'text-green-400'}`}>
                        {currentCount}/{maxSlots}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Roster Slots */}
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {['QB', 'RB', 'WR', 'TE', 'K', 'D/ST'].map((position) => {
                const positionPlayers = currentRoster.filter(pick => pick.player.position === position);
                const maxSlots = getPositionSlots(position);
                const currentCount = positionPlayers.length;
                const remainingSlots = maxSlots - currentCount;

                // Only show positions that have drafted players
                if (currentCount === 0) {
                  return null;
                }

                return (
                  <div key={position} className="border border-gray-600 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-semibold text-white">{position}</h3>
                      <span className="text-xs text-gray-400">
                        {currentCount}/{maxSlots}
                        {remainingSlots > 0 && (
                          <span className="text-green-400 ml-1">(+{remainingSlots})</span>
                        )}
                      </span>
                    </div>
                    
                    <div className="space-y-1">
                      {positionPlayers.map((pick, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-gray-700 rounded text-xs">
                          <div className="flex-1 min-w-0">
                            <div className="text-white font-medium truncate">
                              {pick.player.player_name}
                            </div>
                            <div className="text-gray-400 text-xs">
                              {pick.player.team} • Pick {Math.floor(pick.pickIndex / (draftState?.teams?.length || 1)) + 1}.{(pick.pickIndex % (draftState?.teams?.length || 1)) + 1}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Total Players */}
            <div className="mt-4 pt-3 border-t border-gray-600">
              <div className="text-sm text-gray-300">
                Total Players: <span className="text-white font-semibold">{currentRoster.length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
