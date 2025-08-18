import React from 'react';

const RecentPicks = ({ draftState }) => {
  if (!draftState || !draftState.pickHistory || draftState.pickHistory.length === 0) {
    return null;
  }

  const recentPicks = [...draftState.pickHistory].reverse().slice(0, 5);

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <h3 className="text-lg font-bold text-white mb-4">Recent Picks</h3>
      <div className="space-y-2">
        {recentPicks.map((pick) => (
          <div key={pick.pickIndex} className="p-2 bg-gray-700 rounded text-sm">
            <span className="font-bold text-white">{pick.pickIndex + 1}. {pick.team.name}</span>
            <span className="text-gray-300"> - {pick.player.player_name} ({pick.player.position})</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RecentPicks;
