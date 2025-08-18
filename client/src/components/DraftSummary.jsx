import { useState } from 'react';
import DraftBoard from './DraftBoard';
import pako from 'pako';

const DraftSummary = ({ draftState }) => {
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [shareableLink, setShareableLink] = useState('');

  const generateShareableLink = () => {
    const jsonString = JSON.stringify(draftState);
    const compressed = pako.deflate(jsonString, { to: 'string' });
    const encoded = btoa(compressed);
    const url = `${window.location.origin}/results?data=${encoded}`;
    setShareableLink(url);
  };

  const handleGeneratePDF = async () => {
    setIsGeneratingPDF(true);
    
    try {
      // Import jsPDF dynamically to avoid SSR issues
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF();
      
      // Add title
      doc.setFontSize(20);
      doc.text('Fantasy Football Draft Results', 20, 20);
      
      // Add draft board data
      doc.setFontSize(12);
      let yPosition = 40;
      
      // Create a simple table representation
      const teams = draftState.teams;
      const rounds = 16;
      
      // Add team headers
      let xPosition = 20;
      teams.forEach((team, index) => {
        doc.text(team.name, xPosition, yPosition);
        xPosition += 25;
      });
      
      yPosition += 10;
      
      // Add draft picks
      for (let round = 0; round < rounds; round++) {
        xPosition = 20;
        doc.text(`R${round + 1}`, 10, yPosition);
        
        for (let teamIndex = 0; teamIndex < teams.length; teamIndex++) {
          const pickIndex = round * teams.length + teamIndex;
          if (pickIndex < draftState.pickHistory.length) {
            const pick = draftState.pickHistory[pickIndex];
            const player = pick.player;
            doc.text(player.player_name, xPosition, yPosition);
          }
          xPosition += 25;
        }
        yPosition += 8;
        
        // Add new page if needed
        if (yPosition > 280) {
          doc.addPage();
          yPosition = 20;
        }
      }
      
      // Save the PDF
      doc.save('fantasy-football-draft-results.pdf');
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generating PDF. Please try again.');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleCopyEmails = () => {
    const emails = draftState.teams.map(team => team.email).join(', ');
    navigator.clipboard.writeText(emails).then(() => {
      alert('Email addresses copied to clipboard!');
    }).catch(() => {
      alert('Failed to copy emails. Please copy manually.');
    });
  };

  if (!draftState) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto px-4 py-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">Draft Complete!</h1>
        
        {/* Action Buttons */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">Draft Actions</h2>
          <div className="flex gap-4">
            <button
              onClick={handleGeneratePDF}
              disabled={isGeneratingPDF}
              className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white px-6 py-3 rounded-md font-medium transition-colors"
            >
              {isGeneratingPDF ? 'Generating PDF...' : 'Generate PDF'}
            </button>
            <button
              onClick={handleCopyEmails}
              className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-md font-medium transition-colors"
            >
              Copy All Emails
            </button>
            <button
              onClick={generateShareableLink}
              className="bg-purple-500 hover:bg-purple-600 text-white px-6 py-3 rounded-md font-medium transition-colors"
            >
              Generate Shareable Link
            </button>
          </div>
          {shareableLink && (
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700">Shareable Link:</label>
              <div className="flex gap-2 mt-1">
                <input type="text" readOnly value={shareableLink} className="w-full px-3 py-2 bg-gray-200 border border-gray-300 rounded-md" />
                <button onClick={() => navigator.clipboard.writeText(shareableLink)} className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md">Copy</button>
              </div>
            </div>
          )}
        </div>

        {/* Final Draft Board */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">Final Draft Board</h2>
          <DraftBoard draftState={draftState} />
        </div>

        {/* Email List */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">League Participants</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {draftState.teams.map((team, index) => (
              <div key={team.id} className="border border-gray-200 rounded-md p-4">
                <h3 className="font-semibold text-gray-800 mb-2">{team.name}</h3>
                <p className="text-gray-600 text-sm">{team.email}</p>
                <p className="text-gray-500 text-xs mt-1">
                  {team.roster.length} players drafted
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DraftSummary;
