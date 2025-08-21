import { useState, useEffect } from 'react';
import CreateDraftModal from './CreateDraftModal';

const Dashboard = ({ user, onJoinDraft, onCreateDraft, onLogout }) => {
  const [drafts, setDrafts] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Load drafts from localStorage on component mount
  useEffect(() => {
    const savedDrafts = JSON.parse(localStorage.getItem('drafts') || '[]');
    setDrafts(savedDrafts);
  }, []);

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

  const handleDeleteDraft = (draftId, draftName) => {
    if (window.confirm(`Are you sure you want to delete "${draftName}"? This cannot be undone.`)) {
      const updatedDrafts = drafts.filter(d => d.id !== draftId);
      setDrafts(updatedDrafts);
      localStorage.setItem('drafts', JSON.stringify(updatedDrafts));
    }
  };

  const canJoinDraft = (draft) => {
    // User can join if they created it or were invited
    return draft.createdBy === user.id || 
           draft.invitedUsers.includes(user.email) ||
           draft.invitedUsers.length === 0; // Open drafts
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
        {drafts.length === 0 ? (
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

                  <div className="space-y-2 text-sm text-gray-300 mb-4">
                    <div className="flex justify-between">
                      <span>Teams:</span>
                      <span>{draft.leagueSize}</span>
                    </div>
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
                      <span>{draft.timeClock} min</span>
                    </div>
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
                        <button
                          onClick={() => handleJoinDraft(draft.id)}
                          className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-md text-sm transition-colors duration-200"
                        >
                          Join Draft
                        </button>
                      )}
                      
                      {draft.createdBy === user.id && (
                        <button
                          onClick={() => handleDeleteDraft(draft.id, draft.leagueName)}
                          className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-3 rounded-md text-sm transition-colors duration-200"
                          title="Delete Draft"
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
