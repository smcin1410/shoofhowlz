import React, { useState, useEffect } from 'react';

const DraftSettingsModal = ({ 
  isOpen, 
  onClose, 
  currentDraft, 
  socket, 
  isCommissioner,
  onSettingsUpdate 
}) => {
  const [settings, setSettings] = useState({
    timeClock: 90,
    tokens: 3,
    totalRounds: 16,
    draftType: 'snake', // snake or linear
    pickTimeout: 'auto', // auto, manual
    allowTrades: false,
    pauseEnabled: true
  });

  const [isSaving, setIsSaving] = useState(false);

  // Load current settings when modal opens
  useEffect(() => {
    if (isOpen && currentDraft) {
      setSettings({
        timeClock: currentDraft.timeClock || currentDraft.defaultTimeClock || 90,
        tokens: currentDraft.tokens || 3,
        totalRounds: currentDraft.totalRounds || 16,
        draftType: currentDraft.draftType || 'snake',
        pickTimeout: currentDraft.pickTimeout || 'auto',
        allowTrades: currentDraft.allowTrades || false,
        pauseEnabled: currentDraft.pauseEnabled !== undefined ? currentDraft.pauseEnabled : true
      });
    }
  }, [isOpen, currentDraft]);

  const handleSaveSettings = async () => {
    if (!socket || !isCommissioner) {
      alert('Only the commissioner can change draft settings.');
      return;
    }

    setIsSaving(true);

    try {
      // Emit settings update to server
      socket.emit('update-draft-settings', {
        draftId: currentDraft.id,
        settings,
        updatedBy: socket.id
      });

      // Wait for confirmation or timeout
      const confirmationPromise = new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Settings update timeout'));
        }, 5000);

        const handleConfirmation = (response) => {
          clearTimeout(timeout);
          socket.off('draft-settings-updated', handleConfirmation);
          socket.off('draft-settings-error', handleError);
          resolve(response);
        };

        const handleError = (error) => {
          clearTimeout(timeout);
          socket.off('draft-settings-updated', handleConfirmation);
          socket.off('draft-settings-error', handleError);
          reject(new Error(error.message || 'Failed to update settings'));
        };

        socket.on('draft-settings-updated', handleConfirmation);
        socket.on('draft-settings-error', handleError);
      });

      await confirmationPromise;
      
      // Update local state
      if (onSettingsUpdate) {
        onSettingsUpdate(settings);
      }

      console.log('✅ Draft settings updated successfully');
      onClose();
      
    } catch (error) {
      console.error('❌ Failed to update draft settings:', error);
      alert(`Failed to update settings: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white">Draft Settings</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white text-2xl"
              aria-label="Close"
            >
              ×
            </button>
          </div>

          <div className="space-y-6">
            {/* Pick Timer */}
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">
                Pick Timer (seconds)
              </label>
              <select
                value={settings.timeClock}
                onChange={(e) => setSettings({...settings, timeClock: parseInt(e.target.value)})}
                className="w-full bg-gray-700 text-white rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={!isCommissioner}
              >
                <option value={30}>30 seconds</option>
                <option value={60}>1 minute</option>
                <option value={90}>1.5 minutes</option>
                <option value={120}>2 minutes</option>
                <option value={180}>3 minutes</option>
                <option value={300}>5 minutes</option>
              </select>
            </div>

            {/* Time Extension Tokens */}
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">
                Time Extension Tokens per Team
              </label>
              <input
                type="number"
                min="0"
                max="10"
                value={settings.tokens}
                onChange={(e) => setSettings({...settings, tokens: parseInt(e.target.value) || 0})}
                className="w-full bg-gray-700 text-white rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={!isCommissioner}
              />
              <p className="text-gray-400 text-xs mt-1">Each token adds 30 seconds to the pick timer</p>
            </div>

            {/* Total Rounds */}
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">
                Total Rounds
              </label>
              <input
                type="number"
                min="10"
                max="20"
                value={settings.totalRounds}
                onChange={(e) => setSettings({...settings, totalRounds: parseInt(e.target.value) || 16})}
                className="w-full bg-gray-700 text-white rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={!isCommissioner}
              />
            </div>

            {/* Draft Type */}
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">
                Draft Type
              </label>
              <select
                value={settings.draftType}
                onChange={(e) => setSettings({...settings, draftType: e.target.value})}
                className="w-full bg-gray-700 text-white rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={!isCommissioner}
              >
                <option value="snake">Snake Draft (Reverse order each round)</option>
                <option value="linear">Linear Draft (Same order each round)</option>
              </select>
            </div>

            {/* Pick Timeout Behavior */}
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">
                When Pick Timer Expires
              </label>
              <select
                value={settings.pickTimeout}
                onChange={(e) => setSettings({...settings, pickTimeout: e.target.value})}
                className="w-full bg-gray-700 text-white rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={!isCommissioner}
              >
                <option value="auto">Auto-pick best available player</option>
                <option value="manual">Wait for manual pick</option>
              </select>
            </div>

            {/* Additional Settings */}
            <div className="space-y-3">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings.allowTrades}
                  onChange={(e) => setSettings({...settings, allowTrades: e.target.checked})}
                  className="mr-3 w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                  disabled={!isCommissioner}
                />
                <span className="text-gray-300">Allow trades during draft</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings.pauseEnabled}
                  onChange={(e) => setSettings({...settings, pauseEnabled: e.target.checked})}
                  className="mr-3 w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                  disabled={!isCommissioner}
                />
                <span className="text-gray-300">Allow commissioner to pause draft</span>
              </label>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3 mt-8">
            <button
              onClick={onClose}
              className="flex-1 bg-gray-600 text-white px-4 py-3 rounded-lg hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveSettings}
              disabled={!isCommissioner || isSaving}
              className="flex-1 bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
            >
              {isSaving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Saving...
                </>
              ) : (
                'Save Settings'
              )}
            </button>
          </div>

          {!isCommissioner && (
            <p className="text-yellow-400 text-sm text-center mt-4">
              ⚠️ Only the commissioner can modify draft settings
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default DraftSettingsModal;