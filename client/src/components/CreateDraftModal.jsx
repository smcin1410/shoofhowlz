import { useState } from 'react';

const CreateDraftModal = ({ user, onClose, onCreateDraft }) => {
  const [formData, setFormData] = useState({
    leagueName: '',
    leagueSize: 12,
    draftType: 'Snake',
    totalRounds: 16,
    timeClock: 1.5,
    tokens: 3,
    draftDateTime: '',
    invitedEmails: [''],
    teamNames: Array(12).fill('').map((_, i) => `Team ${i + 1}`)
  });

  const [errors, setErrors] = useState({});

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'leagueSize') {
      const newSize = parseInt(value);
      setFormData(prev => ({
        ...prev,
        [name]: newSize,
        teamNames: Array(newSize).fill('').map((_, i) => 
          prev.teamNames[i] || `Team ${i + 1}`
        )
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleTeamNameChange = (index, value) => {
    const newTeamNames = [...formData.teamNames];
    newTeamNames[index] = value;
    setFormData(prev => ({
      ...prev,
      teamNames: newTeamNames
    }));
  };

  const handleEmailChange = (index, value) => {
    const newEmails = [...formData.invitedEmails];
    newEmails[index] = value;
    setFormData(prev => ({
      ...prev,
      invitedEmails: newEmails
    }));
  };

  const addEmailField = () => {
    setFormData(prev => ({
      ...prev,
      invitedEmails: [...prev.invitedEmails, '']
    }));
  };

  const removeEmailField = (index) => {
    if (formData.invitedEmails.length > 1) {
      const newEmails = formData.invitedEmails.filter((_, i) => i !== index);
      setFormData(prev => ({
        ...prev,
        invitedEmails: newEmails
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.leagueName.trim()) {
      newErrors.leagueName = 'League name is required';
    }

    if (!formData.draftDateTime) {
      newErrors.draftDateTime = 'Draft date and time is required';
    } else {
      const draftDate = new Date(formData.draftDateTime);
      const now = new Date();
      if (draftDate <= now) {
        newErrors.draftDateTime = 'Draft must be scheduled for a future date/time';
      }
    }

    // Check for empty team names
    const emptyTeams = formData.teamNames.some((name, index) => 
      index < formData.leagueSize && !name.trim()
    );
    if (emptyTeams) {
      newErrors.teamNames = 'All team names must be filled';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (validateForm()) {
      // Filter out empty emails and only include valid ones
      const validEmails = formData.invitedEmails.filter(email => 
        email.trim() && email.includes('@')
      );

      const draftConfig = {
        ...formData,
        invitedEmails: validEmails,
        teamNames: formData.teamNames.slice(0, formData.leagueSize)
      };

      onCreateDraft(draftConfig);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg max-w-4xl w-full max-h-screen overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-white">Create New Draft</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white text-2xl"
            >
              ×
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Configuration */}
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  League Name *
                </label>
                <input
                  type="text"
                  name="leagueName"
                  value={formData.leagueName}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="My Fantasy League"
                />
                {errors.leagueName && (
                  <p className="mt-1 text-sm text-red-400">{errors.leagueName}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Draft Date & Time *
                </label>
                <input
                  type="datetime-local"
                  name="draftDateTime"
                  value={formData.draftDateTime}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {errors.draftDateTime && (
                  <p className="mt-1 text-sm text-red-400">{errors.draftDateTime}</p>
                )}
              </div>
            </div>

            {/* Draft Settings */}
            <div className="grid md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  League Size
                </label>
                <select
                  name="leagueSize"
                  value={formData.leagueSize}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {[8, 10, 12, 14, 16].map(size => (
                    <option key={size} value={size}>{size} Teams</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Draft Type
                </label>
                <select
                  name="draftType"
                  value={formData.draftType}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Snake">Snake</option>
                  <option value="Linear">Linear</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Total Rounds
                </label>
                <select
                  name="totalRounds"
                  value={formData.totalRounds}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {[12, 13, 14, 15, 16, 17, 18, 19, 20].map(rounds => (
                    <option key={rounds} value={rounds}>{rounds} Rounds</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Pick Timer
                </label>
                <select
                  name="timeClock"
                  value={formData.timeClock}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={1}>1:00</option>
                  <option value={1.25}>1:15</option>
                  <option value={1.5}>1:30</option>
                  <option value={1.75}>1:45</option>
                  <option value={2}>2:00</option>
                  <option value={2.5}>2:30</option>
                  <option value={3}>3:00</option>
                  <option value={4}>4:00</option>
                </select>
              </div>
            </div>

            {/* Team Names */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-3">
                Team Names
              </label>
              {errors.teamNames && (
                <p className="mb-2 text-sm text-red-400">{errors.teamNames}</p>
              )}
              <div className="grid md:grid-cols-2 gap-3">
                {formData.teamNames.slice(0, formData.leagueSize).map((teamName, index) => (
                  <input
                    key={index}
                    type="text"
                    value={teamName}
                    onChange={(e) => handleTeamNameChange(index, e.target.value)}
                    className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={`Team ${index + 1}`}
                  />
                ))}
              </div>
            </div>

            {/* Invite Participants */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-3">
                Invite Participants (Optional)
              </label>
              <p className="text-sm text-gray-400 mb-3">
                Leave empty to create an open draft that anyone can join
              </p>
              <div className="space-y-2">
                {formData.invitedEmails.map((email, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => handleEmailChange(index, e.target.value)}
                      className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="participant@example.com"
                    />
                    {formData.invitedEmails.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeEmailField(index)}
                        className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md"
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addEmailField}
                  className="text-blue-400 hover:text-blue-300 text-sm"
                >
                  + Add another email
                </button>
              </div>
            </div>

            {/* Admin Quick Test Feature */}
            {user.isAdmin && (
              <div className="bg-yellow-900 bg-opacity-30 border border-yellow-600 rounded-lg p-4">
                <h3 className="text-yellow-400 font-medium mb-2">🧪 Admin Testing Features</h3>
                <p className="text-yellow-200 text-sm">
                  As an admin, you'll have access to a 1-second auto-draft feature for testing draft flow and order validation.
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end space-x-4 pt-6 border-t border-gray-700">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-md transition-colors duration-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors duration-200"
              >
                🏈 Create Draft
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateDraftModal;
