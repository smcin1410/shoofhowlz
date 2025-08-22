import React, { useState } from 'react';

const InvitationModal = ({ 
  isOpen, 
  onClose, 
  currentDraft, 
  teamAssignments, 
  user 
}) => {
  const [selectedTeams, setSelectedTeams] = useState([]);
  const [inviteMethod, setInviteMethod] = useState('link'); // 'link', 'email', 'both'
  const [emailAddresses, setEmailAddresses] = useState('');
  const [customMessage, setCustomMessage] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  if (!isOpen) return null;

  const baseUrl = window.location.origin;
  
  // Get available teams (either all teams or selected teams)
  const teamsToInvite = selectedTeams.length > 0 
    ? teamAssignments.filter(team => selectedTeams.includes(team.teamId))
    : teamAssignments;

  const generateInviteLinks = () => {
    return teamsToInvite.map(team => ({
      teamId: team.teamId,
      teamName: team.teamName,
      directLink: `${baseUrl}/join/${currentDraft?.id}/team/${team.teamId}`,
      isAssigned: !!team.assignedUser,
      assignedUser: team.assignedUser
    }));
  };

  const generateEmailInvite = (team) => {
    const subject = `Fantasy Draft Invitation - ${team.teamName} in ${currentDraft?.leagueName}`;
    const defaultMessage = customMessage || `You're invited to join our fantasy football draft!

🏈 League: ${currentDraft?.leagueName}
👥 Team: ${team.teamName}
📅 Draft Type: ${currentDraft?.draftType || 'Snake'} Draft
⏰ Time Limit: ${currentDraft?.timeClock || 2} minutes per pick

Join directly using this link:
${team.directLink}

This link will take you straight to your team - no need to search for the draft!

Good luck and may the best team win!

---
Invited by: ${user?.username}
Draft ID: ${currentDraft?.id}`;

    return {
      subject,
      body: defaultMessage
    };
  };

  const handleCopyLinks = () => {
    const links = generateInviteLinks();
    const linkText = links.map(link => 
      `${link.teamName}: ${link.directLink}${link.isAssigned ? ' (Assigned)' : ''}`
    ).join('\n\n');

    navigator.clipboard.writeText(linkText).then(() => {
      alert('✅ Invitation links copied to clipboard!');
    }).catch(() => {
      alert(`📱 Invitation Links:\n\n${linkText}`);
    });
  };

  const handleEmailInvites = () => {
    setIsGenerating(true);
    const links = generateInviteLinks();
    
    if (emailAddresses.trim()) {
      // Handle custom email addresses
      const emails = emailAddresses.split(',').map(email => email.trim()).filter(email => email);
      const teamEmail = generateEmailInvite(links[0]); // Use first team as template
      
      const mailto = `mailto:${emails.join(',')}?subject=${encodeURIComponent(teamEmail.subject)}&body=${encodeURIComponent(teamEmail.body)}`;
      window.open(mailto);
    } else {
      // Generate individual team emails
      links.forEach(team => {
        const emailInvite = generateEmailInvite(team);
        const mailto = `mailto:?subject=${encodeURIComponent(emailInvite.subject)}&body=${encodeURIComponent(emailInvite.body)}`;
        
        setTimeout(() => {
          window.open(mailto);
        }, 500); // Small delay between emails
      });
    }
    
    setIsGenerating(false);
    alert('📧 Email invitations opened in your default email client!');
  };

  const handleShareNative = () => {
    if (navigator.share) {
      const links = generateInviteLinks();
      const shareText = `Join our fantasy football draft!\n\n${links.map(link => 
        `${link.teamName}: ${link.directLink}`
      ).join('\n\n')}`;

      navigator.share({
        title: `Fantasy Draft - ${currentDraft?.leagueName}`,
        text: shareText,
        url: links[0]?.directLink
      });
    } else {
      handleCopyLinks();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">📨 Send Draft Invitations</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl"
          >
            ×
          </button>
        </div>

        {/* Team Selection */}
        <div className="mb-6">
          <h3 className="text-white font-medium mb-3">Select Teams to Invite</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 mb-4">
            <button
              onClick={() => setSelectedTeams([])}
              className={`p-2 rounded text-sm ${
                selectedTeams.length === 0 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              All Teams ({teamAssignments.length})
            </button>
            {teamAssignments.map(team => (
              <button
                key={team.teamId}
                onClick={() => {
                  if (selectedTeams.includes(team.teamId)) {
                    setSelectedTeams(selectedTeams.filter(id => id !== team.teamId));
                  } else {
                    setSelectedTeams([...selectedTeams, team.teamId]);
                  }
                }}
                className={`p-2 rounded text-sm ${
                  selectedTeams.includes(team.teamId)
                    ? 'bg-green-600 text-white'
                    : team.assignedUser
                    ? 'bg-yellow-700 text-yellow-100'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {team.teamName}
                {team.assignedUser && <span className="block text-xs">✓ Assigned</span>}
              </button>
            ))}
          </div>
          <p className="text-gray-400 text-sm">
            {selectedTeams.length === 0 
              ? `Inviting all ${teamAssignments.length} teams`
              : `Inviting ${selectedTeams.length} selected teams`
            }
          </p>
        </div>

        {/* Invitation Method */}
        <div className="mb-6">
          <h3 className="text-white font-medium mb-3">Invitation Method</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <button
              onClick={() => setInviteMethod('link')}
              className={`p-3 rounded border-2 text-left ${
                inviteMethod === 'link'
                  ? 'border-blue-500 bg-blue-900 text-blue-100'
                  : 'border-gray-600 bg-gray-700 text-gray-300 hover:border-gray-500'
              }`}
            >
              <div className="font-medium">📋 Copy Links</div>
              <div className="text-sm opacity-75">Copy invitation links to clipboard</div>
            </button>
            
            <button
              onClick={() => setInviteMethod('email')}
              className={`p-3 rounded border-2 text-left ${
                inviteMethod === 'email'
                  ? 'border-blue-500 bg-blue-900 text-blue-100'
                  : 'border-gray-600 bg-gray-700 text-gray-300 hover:border-gray-500'
              }`}
            >
              <div className="font-medium">📧 Email Invites</div>
              <div className="text-sm opacity-75">Open email client with invitations</div>
            </button>
            
            <button
              onClick={() => setInviteMethod('share')}
              className={`p-3 rounded border-2 text-left ${
                inviteMethod === 'share'
                  ? 'border-blue-500 bg-blue-900 text-blue-100'
                  : 'border-gray-600 bg-gray-700 text-gray-300 hover:border-gray-500'
              }`}
            >
              <div className="font-medium">📱 Share</div>
              <div className="text-sm opacity-75">Use device share options</div>
            </button>
          </div>
        </div>

        {/* Email Options */}
        {inviteMethod === 'email' && (
          <div className="mb-6">
            <h4 className="text-white font-medium mb-3">Email Settings</h4>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Email Addresses (optional - comma separated)
                </label>
                <textarea
                  value={emailAddresses}
                  onChange={(e) => setEmailAddresses(e.target.value)}
                  placeholder="participant1@email.com, participant2@email.com"
                  className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                  rows="2"
                />
                <p className="text-gray-400 text-xs mt-1">
                  Leave blank to generate individual invites for each team
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Custom Message (optional)
                </label>
                <textarea
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  placeholder="Add a personal message to your invitation..."
                  className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                  rows="3"
                />
              </div>
            </div>
          </div>
        )}

        {/* Preview */}
        <div className="mb-6">
          <h4 className="text-white font-medium mb-3">Preview</h4>
          <div className="bg-gray-900 border border-gray-600 rounded p-4 max-h-40 overflow-y-auto">
            {generateInviteLinks().slice(0, 3).map(team => (
              <div key={team.teamId} className="mb-2 text-sm">
                <span className="text-gray-300">{team.teamName}:</span>
                <span className="text-blue-400 ml-2 break-all">{team.directLink}</span>
                {team.isAssigned && <span className="text-yellow-400 ml-2">(Assigned)</span>}
              </div>
            ))}
            {generateInviteLinks().length > 3 && (
              <div className="text-gray-500 text-sm">
                ... and {generateInviteLinks().length - 3} more teams
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={inviteMethod === 'email' ? handleEmailInvites : 
                     inviteMethod === 'share' ? handleShareNative : 
                     handleCopyLinks}
            disabled={isGenerating}
            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-6 py-3 rounded font-medium"
          >
            {isGenerating ? 'Generating...' : 
             inviteMethod === 'email' ? '📧 Send Email Invites' :
             inviteMethod === 'share' ? '📱 Share Invitations' :
             '📋 Copy Links'}
          </button>
          
          <button
            onClick={onClose}
            className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default InvitationModal;