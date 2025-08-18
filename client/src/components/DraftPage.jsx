import { useState } from 'react';
import Header from './Header';
import MainContent from './MainContent';
import Sidebar from './Sidebar';

const DraftPage = ({ socket, draftState, onReturnToLobby, isCommissioner, onAdminLogin, isMuted, setIsMuted }) => {
  const [activeTab, setActiveTab] = useState('player-pool');

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
      {/* Fixed Sticky Header */}
      <Header 
        socket={socket} 
        draftState={draftState} 
        onReturnToLobby={onReturnToLobby}
        isCommissioner={isCommissioner}
        onAdminLogin={onAdminLogin}
        isMuted={isMuted}
        setIsMuted={setIsMuted}
      />
      
      {/* Main Content Area with top padding for fixed header */}
      <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-6 pt-20 sm:pt-24">
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
    </div>
  );
};

export default DraftPage;
