import { useState, useEffect } from 'react';
import Header from './Header';
import MainContent from './MainContent';
import Sidebar from './Sidebar';
import DraftCompletionModal from './DraftCompletionModal';
import DraftProgressBar from './DraftProgressBar';

const DraftPage = ({ socket, draftState, isCommissioner, user, onReturnToDashboard, onReturnToLobby, onForceCompleteDraft, onAdminAutoDraft }) => {
  const [activeTab, setActiveTab] = useState('player-pool');
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [hasShownCompletionModal, setHasShownCompletionModal] = useState(false);

  // Check for draft completion and show modal
  useEffect(() => {
    const isDraftComplete = draftState?.isComplete || 
                           draftState?.status === 'completed' ||
                           (draftState?.currentPick >= draftState?.draftOrder?.length && draftState?.draftOrder?.length > 0);
    
    if (isDraftComplete && !hasShownCompletionModal) {
      console.log('🏆 Draft completed! Showing completion modal');
      setShowCompletionModal(true);
      setHasShownCompletionModal(true);
    }
  }, [draftState?.isComplete, draftState?.status, draftState?.currentPick, draftState?.draftOrder?.length, hasShownCompletionModal]);

  const handleVerifyCompletion = () => {
    console.log('✅ Draft completion verified');
    setShowCompletionModal(false);
    // Switch to draft board view to show completed picks
    setActiveTab('draft-board');
  };

  if (!draftState) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <div className="text-xl font-semibold text-white">Connecting to draft...</div>
        </div>
      </div>
    );
  }

  const showSidebar = activeTab === 'player-pool';

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Draft Progress Bar */}
      <DraftProgressBar draftState={draftState} />
      
      {/* Fixed Sticky Header */}
      <Header 
        socket={socket} 
        draftState={draftState} 
        onReturnToDashboard={onReturnToDashboard}
        isCommissioner={isCommissioner}
        user={user}
        onAdminAutoDraft={onAdminAutoDraft}
        onReturnToLobby={onReturnToLobby}
        onForceCompleteDraft={onForceCompleteDraft}
      />
      
      {/* Main Content Area with top padding for fixed header and progress bar */}
      <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-6 pt-32 sm:pt-36">
        <div className="flex flex-col lg:flex-row gap-4 sm:gap-6">
          {/* Main Content (Left Column) */}
          <MainContent 
            socket={socket} 
            draftState={draftState} 
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            fullWidth={!showSidebar}
          />
          
          {/* Sidebar (Right Column) - Only show when Player Pool tab is active */}
          {showSidebar && <Sidebar socket={socket} draftState={draftState} isCommissioner={isCommissioner} />}
        </div>
      </div>

      {/* Draft Completion Modal */}
      <DraftCompletionModal
        isOpen={showCompletionModal}
        onClose={() => setShowCompletionModal(false)}
        onVerifyCompletion={handleVerifyCompletion}
        draftState={draftState}
      />
    </div>
  );
};

export default DraftPage;
