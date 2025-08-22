import { useState, useEffect } from 'react';
import CreateDraftModal from './CreateDraftModal';
import { formatTimeDisplay } from '../utils/timeUtils';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:4000';

const Dashboard = ({ user, socket, onJoinDraft, onCreateDraft, onLogout, sessionRecovery, onManualRecovery }) => {
  const [drafts, setDrafts] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isLoadingDrafts, setIsLoadingDrafts] = useState(true);
  const [loadError, setLoadError] = useState(null);

  // Load drafts from server and localStorage
  useEffect(() => {
    const loadDrafts = async () => {
      setIsLoadingDrafts(true);
      setLoadError(null);
      
      try {
        // First, load from localStorage (user's personal drafts)
        const savedDrafts = JSON.parse(localStorage.getItem('drafts') || '[]');
        
        // Then fetch all available drafts from server
        const response = await fetch(`${SERVER_URL}/api/drafts`);
        if (response.ok) {
          const serverDrafts = await response.json();
          
          // Combine server drafts with local drafts, avoiding duplicates
          const combinedDrafts = [...serverDrafts];
          
          // Add any local drafts that aren't on the server yet
          savedDrafts.forEach(localDraft => {
            if (!serverDrafts.find(serverDraft => serverDraft.id === localDraft.id)) {
              combinedDrafts.push(localDraft);
            }
          });
          
          setDrafts(combinedDrafts);
          console.log(`📋 Loaded ${combinedDrafts.length} total drafts (${serverDrafts.length} from server, ${savedDrafts.length} from local)`);
        } else {
          console.warn('⚠️ Failed to fetch server drafts, using localStorage only');
          setDrafts(savedDrafts);
        }
      } catch (error) {
        console.error('❌ Error loading drafts:', error);
        setLoadError(error.message);
        // Fallback to localStorage
        const savedDrafts = JSON.parse(localStorage.getItem('drafts') || '[]');
        setDrafts(savedDrafts);
      } finally {
        setIsLoadingDrafts(false);
      }
    };

    loadDrafts();
    
    // Refresh drafts every 30 seconds to show new drafts and status updates
    const interval = setInterval(loadDrafts, 30000);
    return () => clearInterval(interval);
  }, []);

  // Listen for real-time draft events
  useEffect(() => {
    const handleDraftCreated = (data) => {
      console.log('📢 Received draft-created event:', data);
      
      if (data.draftInfo) {
        setDrafts(prevDrafts => {
          // Check if draft already exists
          const exists = prevDrafts.find(d => d.id === data.draftInfo.id);
          if (exists) {
            return prevDrafts;
          }
          
          // Add new draft to the list
          return [...prevDrafts, data.draftInfo];
        });
      }
    };

    const handleDraftDeleted = (data) => {
      console.log('🗑️ Received draft-deleted event:', data);
      
      if (data.draftId) {
        setDrafts(prevDrafts => {
          // Remove the deleted draft from the list
          return prevDrafts.filter(d => d.id !== data.draftId);
        });
        
        // Also remove from localStorage if it exists there
        const savedDrafts = JSON.parse(localStorage.getItem('drafts') || '[]');
        const updatedSavedDrafts = savedDrafts.filter(d => d.id !== data.draftId);
        localStorage.setItem('drafts', JSON.stringify(updatedSavedDrafts));
      }
    };

    // Check if socket exists and add listeners
    if (socket) {
      socket.on('draft-created', handleDraftCreated);
      socket.on('draft-deleted', handleDraftDeleted);
      console.log('👂 Listening for draft-created and draft-deleted events');
      
      // Cleanup listeners on unmount
      return () => {
        socket.off('draft-created', handleDraftCreated);
        socket.off('draft-deleted', handleDraftDeleted);
      };
    }
  }, [socket]);

  const handleCreateDraft = (draftConfig) => {
    console.log('📝 Dashboard.handleCreateDraft called with:', draftConfig);
    
    const newDraft = {
      id: Date.now().toString(),
      ...draftConfig,
      createdBy: user.id,
      createdAt: new Date().toISOString(),
      status: 'scheduled', // scheduled, in_progress, completed
      participants: [],
      invitedUsers: draftConfig.invitedEmails || []
    };

    console.log('📝 Created newDraft object:', newDraft);

    const updatedDrafts = [...drafts, newDraft];
    setDrafts(updatedDrafts);
    localStorage.setItem('drafts', JSON.stringify(updatedDrafts));
    setShowCreateModal(false);

    console.log('📝 Calling onCreateDraft with newDraft...');
    // Trigger the draft creation in the parent component
    onCreateDraft(newDraft);
  };

  const handleJoinDraft = (draftId) => {
    const draft = drafts.find(d => d.id === draftId);
    if (draft) {
      onJoinDraft(draft);
    }
  };



  const handleDeleteDraft = async (draftId, draftName) => {
    if (window.confirm(`Are you sure you want to delete "${draftName}"? This cannot be undone.`)) {
      try {
        console.log('🔍 DELETE DEBUG: Starting delete request');
        console.log('🔍 DELETE DEBUG: SERVER_URL:', SERVER_URL);
        console.log('🔍 DELETE DEBUG: draftId:', draftId);
        console.log('🔍 DELETE DEBUG: user:', { id: user.id, isAdmin: user.isAdmin });
        
        const requestBody = {
          userId: user.id,
          isAdmin: user.isAdmin
        };
        console.log('🔍 DELETE DEBUG: Request body:', requestBody);
        
        // Call server to delete the draft
        const response = await fetch(`${SERVER_URL}/api/drafts/${draftId}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody)
        });
        
        console.log('🔍 DELETE DEBUG: Response status:', response.status);
        console.log('🔍 DELETE DEBUG: Response ok:', response.ok);

        if (response.ok) {
          // Remove from local state
          const updatedDrafts = drafts.filter(d => d.id !== draftId);
          setDrafts(updatedDrafts);
          
          // Also remove from localStorage if it exists there
          const savedDrafts = JSON.parse(localStorage.getItem('drafts') || '[]');
          const updatedSavedDrafts = savedDrafts.filter(d => d.id !== draftId);
          localStorage.setItem('drafts', JSON.stringify(updatedSavedDrafts));
          
          console.log(`✅ Draft "${draftName}" deleted successfully`);
        } else {
          console.log('🔍 DELETE DEBUG: Response not ok, trying to get error data');
          try {
            const errorData = await response.json();
            console.error('❌ Failed to delete draft:', errorData.error);
            alert(`Failed to delete draft: ${errorData.error}`);
          } catch (jsonError) {
            console.error('❌ Failed to parse error response:', jsonError);
            console.error('❌ Response text:', await response.text());
            alert('Failed to delete draft: Unknown error');
          }
        }
      } catch (error) {
        console.error('❌ Error deleting draft:', error);
        console.error('❌ Error details:', error.message, error.stack);
        alert('Failed to delete draft. Please try again.');
      }
    }
  };

  const handlePrintResults = (draftId) => {
    // Open results page in a new window/tab for printing
    const resultsUrl = `/results?draftId=${draftId}`;
    window.open(resultsUrl, '_blank');
  };



  const canJoinDraft = (draft) => {
    // All drafts are public - anyone can join
    return true;
  };

  const getDraftSource = (draft) => {
    if (draft.createdBy === user.id || draft.createdBy === user.username) {
      return 'My Draft';
    }
    return 'Public Draft';
  };

  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'scheduled': return 'text-blue-400';
      case 'in_progress': return 'text-green-400';
      case 'completed': return 'text-gray-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'scheduled': return 'Scheduled';
      case 'in_progress': return 'In Progress';
      case 'completed': return 'Completed';
      default: return 'Unknown';
    }
  };

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-white">Fantasy Football Drafts</h1>
              <p className="text-gray-300">Welcome back, {user.username}</p>
            </div>
                         <div className="flex items-center space-x-4">
               {user.isAdmin && (
                 <span className="bg-yellow-600 text-yellow-100 px-2 py-1 rounded text-sm font-medium">
                   Admin
                 </span>
               )}
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors duration-200"
              >
                🏈 Create Draft
              </button>
              <button
                onClick={onLogout}
                className="bg-gray-600 hover:bg-gray-500 text-white font-medium py-2 px-4 rounded-md transition-colors duration-200"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Manual Session Recovery Section */}
        {sessionRecovery && sessionRecovery.session && !sessionRecovery.isAttempting && (
          <div className="mb-8 bg-blue-900 border border-blue-700 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-blue-200 mb-2">
                  🔄 Active Draft Session Found
                </h3>
                <p className="text-blue-300 mb-2">
                  You have an active session in draft: <span className="font-medium">{sessionRecovery.session.draftId}</span>
                </p>
                <p className="text-blue-300 text-sm">
                  Joined: {new Date(sessionRecovery.session.joinedAt).toLocaleString()}
                </p>
              </div>
              <button
                onClick={() => onManualRecovery && onManualRecovery(sessionRecovery.session)}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-md transition-colors duration-200"
              >
                🔄 Rejoin Draft
              </button>
            </div>
          </div>
        )}
        
        {isLoadingDrafts ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <h2 className="text-xl text-gray-400 mb-2">Loading drafts...</h2>
            <p className="text-gray-500">Checking for available drafts to join</p>
          </div>
        ) : loadError ? (
          <div className="text-center py-12">
            <h2 className="text-xl text-red-400 mb-4">⚠️ Error Loading Drafts</h2>
            <p className="text-gray-500 mb-6">{loadError}</p>
            <button
              onClick={() => window.location.reload()}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-md transition-colors duration-200"
            >
              🔄 Retry
            </button>
          </div>
        ) : drafts.length === 0 ? (
          <div className="text-center py-12">
            <h2 className="text-xl text-gray-400 mb-4">No drafts available</h2>
            <p className="text-gray-500 mb-6">Create your first draft to get started!</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-md transition-colors duration-200"
            >
              🏈 Create Your First Draft
            </button>
          </div>
        ) : (
          <div>
            <h2 className="text-xl font-semibold text-white mb-6">Available Drafts</h2>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {drafts.map((draft) => (
                <div
                  key={draft.id}
                  className="bg-gray-800 rounded-lg border border-gray-700 p-6 hover:border-gray-600 transition-colors duration-200"
                >
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-lg font-semibold text-white">{draft.leagueName}</h3>
                    <span className={`text-sm font-medium ${getStatusColor(draft.status)}`}>
                      {getStatusText(draft.status)}
                    </span>
                  </div>

                  {/* Draft Source Badge */}
                  <div className="mb-3">
                    <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                      getDraftSource(draft) === 'My Draft' 
                        ? 'bg-yellow-600 text-yellow-100' 
                        : 'bg-blue-600 text-blue-100'
                    }`}>
                      {getDraftSource(draft)}
                    </span>
                    {draft.createdBy && getDraftSource(draft) === 'Public Draft' && (
                      <span className="ml-2 text-xs text-gray-400">
                        by {draft.createdBy}
                      </span>
                    )}
                  </div>

                  <div className="space-y-2 text-sm text-gray-300 mb-4">
                    <div className="flex justify-between">
                      <span>Teams:</span>
                      <span>{draft.leagueSize}</span>
                    </div>
                    {draft.participants && (
                      <div className="flex justify-between">
                        <span>Participants:</span>
                        <span className="text-green-400">{draft.participants.length}/{draft.leagueSize}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span>Draft Type:</span>
                      <span>{draft.draftType}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Rounds:</span>
                      <span>{draft.totalRounds}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Timer:</span>
                      <span>{formatTimeDisplay(draft.timeClock)}</span>
                    </div>
                    {draft.status === 'in_progress' && draft.currentPick && draft.totalPicks && (
                      <div className="flex justify-between">
                        <span>Progress:</span>
                        <span className="text-blue-400">
                          Pick {draft.currentPick} of {draft.totalPicks}
                        </span>
                      </div>
                    )}
                    {draft.draftDateTime && (
                      <div className="flex justify-between">
                        <span>Scheduled:</span>
                        <span className="text-blue-400">{formatDateTime(draft.draftDateTime)}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between items-center">
                    <div className="text-xs text-gray-400">
                      {draft.createdBy === user.id ? (
                        <span className="text-yellow-400 font-medium">👑 Commissioner</span>
                      ) : (
                        <span>Invited</span>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {canJoinDraft(draft) && (
                        <>
                          {draft.status === 'scheduled' && (
                            <button
                              onClick={() => handleJoinDraft(draft.id)}
                              className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-md text-sm transition-colors duration-200"
                            >
                              Enter Lobby
                            </button>
                          )}
                          {draft.status === 'in_progress' && (
                            <button
                              onClick={() => handleJoinDraft(draft.id)}
                              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md text-sm transition-colors duration-200"
                            >
                              Enter Lobby
                            </button>
                          )}
                          {draft.status === 'completed' && (
                            <>
                              <button
                                onClick={() => handleJoinDraft(draft.id)}
                                className="bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded-md text-sm transition-colors duration-200"
                              >
                                Review Completed Draft
                              </button>
                              <button
                                onClick={() => handlePrintResults(draft.id)}
                                className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-3 rounded-md text-sm transition-colors duration-200"
                                title="Print Draft Results"
                              >
                                🖨️
                              </button>
                            </>
                          )}
                        </>
                      )}
                      
                      {(draft.createdBy === user.id || user.isAdmin) && (
                        <button
                          onClick={() => handleDeleteDraft(draft.id, draft.leagueName)}
                          className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-3 rounded-md text-sm transition-colors duration-200"
                          title={user.isAdmin ? "Delete Draft (Admin)" : "Delete Draft"}
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Create Draft Modal */}
      {showCreateModal && (
        <CreateDraftModal
          user={user}
          onClose={() => setShowCreateModal(false)}
          onCreateDraft={handleCreateDraft}
        />
      )}


    </div>
  );
};

export default Dashboard;
