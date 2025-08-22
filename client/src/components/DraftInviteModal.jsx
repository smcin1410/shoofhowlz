import React, { useState } from 'react';

const DraftInviteModal = ({ 
  isOpen, 
  onClose, 
  draft,
  user 
}) => {
  const [inviteMethod, setInviteMethod] = useState('link'); // 'link', 'email'
  const [emailAddresses, setEmailAddresses] = useState('');
  const [customMessage, setCustomMessage] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  if (!isOpen || !draft) return null;

  const baseUrl = window.location.origin;
  const draftLink = `${baseUrl}/drafts/${draft.id}`;
  
  const generateEmailInvite = () => {
    const subject = `Fantasy Draft Invitation - ${draft.leagueName}`;
    const defaultMessage = customMessage || `You're invited to join our fantasy football draft!

🏈 League: ${draft.leagueName}
📅 Draft Type: ${draft.draftType || 'Snake'} Draft
👥 Teams: ${draft.leagueSize || draft.teams?.length || 'TBD'}
⏰ Time Limit: ${draft.timeClock || 2} minutes per pick
📊 Rounds: ${draft.rounds || 16}

Join the draft here:
${draftLink}

Once you join, you'll be able to claim a team in the lobby and participate in the draft.

Good luck and may the best team win!

---
Invited by: ${user?.username}
Draft ID: ${draft.id}`;

    return {
      subject,
      body: defaultMessage
    };
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(draftLink).then(() => {
      alert('✅ Draft link copied to clipboard!');
    }).catch(() => {
      alert(`📱 Draft Link:\n\n${draftLink}`);
    });
  };

  const handleEmailInvite = () => {
    setIsGenerating(true);
    const emailInvite = generateEmailInvite();
    
    const emails = emailAddresses.split(',').map(email => email.trim()).filter(email => email);
    const emailList = emails.length > 0 ? emails.join(',') : '';
    
    const mailto = `mailto:${emailList}?subject=${encodeURIComponent(emailInvite.subject)}&body=${encodeURIComponent(emailInvite.body)}`;
    window.open(mailto);
    
    setIsGenerating(false);
    alert('📧 Email invitation opened in your default email client!');
  };

  const handleShareNative = () => {
    if (navigator.share) {
      navigator.share({
        title: `Fantasy Draft - ${draft.leagueName}`,
        text: `Join our fantasy football draft: ${draft.leagueName}`,
        url: draftLink
      });
    } else {
      handleCopyLink();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">📨 Invite to Draft</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl"
          >
            ×
          </button>
        </div>

        {/* Draft Info */}
        <div className="mb-6 p-4 bg-gray-900 border border-gray-600 rounded">
          <h3 className="text-white font-medium mb-2">{draft.leagueName}</h3>
          <div className="text-sm text-gray-300 space-y-1">
            <div>📅 {draft.draftType || 'Snake'} Draft</div>
            <div>👥 {draft.leagueSize || draft.teams?.length || 'TBD'} Teams</div>
            <div>⏰ {draft.timeClock || 2} minutes per pick</div>
            <div>📊 {draft.rounds || 16} rounds</div>
            <div className="pt-2 border-t border-gray-700">
              <div className="font-mono text-xs break-all text-blue-400">{draftLink}</div>
            </div>
          </div>
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
              <div className="font-medium">📋 Copy Link</div>
              <div className="text-sm opacity-75">Copy draft link to clipboard</div>
            </button>
            
            <button
              onClick={() => setInviteMethod('email')}
              className={`p-3 rounded border-2 text-left ${
                inviteMethod === 'email'
                  ? 'border-blue-500 bg-blue-900 text-blue-100'
                  : 'border-gray-600 bg-gray-700 text-gray-300 hover:border-gray-500'
              }`}
            >
              <div className="font-medium">📧 Email Invite</div>
              <div className="text-sm opacity-75">Open email client with invitation</div>
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
                  Email Addresses (comma separated)
                </label>
                <textarea
                  value={emailAddresses}
                  onChange={(e) => setEmailAddresses(e.target.value)}
                  placeholder="participant1@email.com, participant2@email.com"
                  className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                  rows="2"
                />
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

        {/* Instructions */}
        <div className="mb-6">
          <div className="bg-blue-900 border border-blue-700 rounded p-4">
            <h4 className="text-blue-200 font-medium mb-2">💡 How it works:</h4>
            <ul className="text-blue-200 text-sm space-y-1">
              <li>• Participants use the link to access the draft</li>
              <li>• They can claim any available team in the lobby</li>
              <li>• Pre-assigned teams are protected for specific users</li>
              <li>• Draft starts when the commissioner is ready</li>
            </ul>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={inviteMethod === 'email' ? handleEmailInvite : 
                     inviteMethod === 'share' ? handleShareNative : 
                     handleCopyLink}
            disabled={isGenerating}
            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-6 py-3 rounded font-medium"
          >
            {isGenerating ? 'Generating...' : 
             inviteMethod === 'email' ? '📧 Send Email Invite' :
             inviteMethod === 'share' ? '📱 Share Draft' :
             '📋 Copy Draft Link'}
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

export default DraftInviteModal;