import React from 'react';

const DraftCompletionModal = ({ isOpen, onClose, onVerifyCompletion, draftState }) => {
  if (!isOpen) return null;

  const totalPicks = draftState?.draftOrder?.length || 0;
  const completedPicks = draftState?.pickHistory?.length || 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-8 max-w-md w-full mx-4 text-center border border-gray-600">
        <div className="text-6xl mb-4">🏆</div>
        <h2 className="text-2xl font-bold text-white mb-4">Draft Complete!</h2>
        <p className="text-gray-300 mb-2">
          Congratulations! All {totalPicks} picks have been made.
        </p>
        <p className="text-gray-400 text-sm mb-6">
          {completedPicks} players drafted across {draftState?.teams?.length || 0} teams
        </p>
        
        <div className="space-y-3">
          <button
            onClick={onVerifyCompletion}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-6 rounded-md transition-colors"
          >
            ✅ Review Completed Draft
          </button>
          
          <button
            onClick={() => {
              // Ensure draft data is saved before navigating
              const storageKey = `draft-results-${draftState?.id}`;
              
              try {
                // Save complete draft state to localStorage for results page
                const completeState = {
                  ...draftState,
                  isComplete: true,
                  completedAt: new Date().toISOString(),
                  version: '2.0'
                };
                
                localStorage.setItem(storageKey, JSON.stringify(completeState));
                console.log('✅ Draft state saved to localStorage for results page');
                
                // Navigate to results page - opens in new tab for printing
                const url = `/results?draftId=${draftState?.id}`;
                window.open(url, '_blank', 'width=1200,height=800');
                
              } catch (error) {
                console.error('Error saving draft state or opening results:', error);
                alert('Error opening results page. Please try again.');
              }
            }}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-md transition-colors"
          >
            📄 Print Draft Results
          </button>
          
          <button
            onClick={onClose}
            className="w-full bg-gray-600 hover:bg-gray-700 text-white font-medium py-3 px-6 rounded-md transition-colors"
          >
            Continue Viewing Draft
          </button>
        </div>
      </div>
    </div>
  );
};

export default DraftCompletionModal;