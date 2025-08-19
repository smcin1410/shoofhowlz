import React, { useState, useEffect } from 'react';

const DraftOrderAnnouncement = ({ draftOrder, teams, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (currentIndex < draftOrder.length) {
      const timer = setTimeout(() => {
        setCurrentIndex(currentIndex + 1);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [currentIndex, draftOrder.length]);

  const getTeamName = (teamId) => {
    const team = teams.find((t) => t.id === teamId);
    return team ? team.name : '';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-gray-800 text-white p-8 rounded-lg shadow-lg text-center">
        <h2 className="text-3xl font-bold mb-4">Draft Order</h2>
        <div className="overflow-hidden h-24">
          {draftOrder.map((teamId, index) => (
            <div
              key={index}
              className={`transition-transform duration-500 ease-in-out ${
                index === currentIndex ? 'transform -translate-y-full' : ''
              }`}
            >
              <p className="text-2xl">
                {index + 1}. {getTeamName(teamId)}
              </p>
            </div>
          ))}
        </div>
        {currentIndex >= draftOrder.length && (
          <button
            onClick={onClose}
            className="mt-4 px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium"
          >
            Close
          </button>
        )}
      </div>
    </div>
  );
};

export default DraftOrderAnnouncement;
