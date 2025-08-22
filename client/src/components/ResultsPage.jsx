import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import DraftBoard from './DraftBoard';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:4000';

const ResultsPage = () => {
  const [draftState, setDraftState] = useState(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [activeTab, setActiveTab] = useState('draft-board');

  const [loadingError, setLoadingError] = useState(null); // Add error state
  const location = useLocation();
  const draftBoardRef = useRef(null);

  // Add debugging on component mount
  useEffect(() => {
    console.log('🔍 ResultsPage mounted');
    console.log('🔍 Current URL:', window.location.href);
    console.log('🔍 Location search:', location.search);
    
    const params = new URLSearchParams(location.search);
    const draftId = params.get('draftId');
    console.log('🔍 Draft ID from URL:', draftId);
    
    // Check localStorage immediately
    if (draftId) {
      const storageKey = `draft-results-${draftId}`;
      const localData = localStorage.getItem(storageKey);
      const sessionData = sessionStorage.getItem(storageKey);
      const metaData = localStorage.getItem(`${storageKey}-meta`);
      
      console.log('🔍 Storage check:', {
        draftId,
        storageKey,
        hasLocalData: !!localData,
        hasSessionData: !!sessionData,
        hasMetaData: !!metaData,
        localDataSize: localData ? localData.length : 0,
        sessionDataSize: sessionData ? sessionData.length : 0
      });
    }
  }, [location]);

  // Helper function to normalize optimized data format back to original format
  const normalizeOptimizedData = (data) => {
    if (!data) return null;
    
    // Check if data is already in optimized format (has shortened property names)
    const isOptimized = data.pickHistory && data.pickHistory.length > 0 && 
                        data.pickHistory[0].p && typeof data.pickHistory[0].p === 'object';
    
    if (!isOptimized) {
      // Data is already in original format or doesn't need normalization
      return data;
    }
    
    console.log('📊 Normalizing optimized data format back to original format');
    
    return {
      ...data,
      // Normalize pick history from optimized format
      pickHistory: data.pickHistory.map(pick => ({
        pickIndex: pick.idx,
        pickNumber: pick.num,
        player: {
          id: pick.p.id,
          player_name: pick.p.n,
          position: pick.p.pos,
          team: pick.p.tm,
          rank: pick.p.r
        },
        team: {
          id: pick.t.id,
          name: pick.t.n
        },
        isAutoPick: pick.auto || false,
        timestamp: pick.ts
      }))
    };
  };

  useEffect(() => {
    const loadDraftData = async () => {
      try {
        setLoadingError(null); // Clear previous errors
        
        const params = new URLSearchParams(location.search);
        const draftId = params.get('draftId');
        
        if (!draftId) {
          const error = 'No draftId provided in URL parameters';
          console.error('❌', error);
          setLoadingError(error);
          return;
        }
        
        let draftData = null;
        let dataSource = '';
        
        // Try server storage first
        try {
          console.log('📡 Checking server storage for draft data...');
          const response = await fetch(`${SERVER_URL}/api/get-draft-results/${draftId}`);
          if (response.ok) {
            const result = await response.json();
            if (result.success) {
              draftData = result.data;
              dataSource = 'server';
              console.log('✅ Draft data loaded from server');
            }
          } else if (response.status === 404) {
            console.log('📄 Draft data not found on server, trying local storage...');
          } else {
            throw new Error(`Server error: ${response.status}`);
          }
        } catch (serverError) {
          console.log('⚠️ Server storage not available, trying local storage:', serverError.message);
        }
        
        // Fallback to local storage if server fails
        if (!draftData) {
          const storageKey = `draft-results-${draftId}`;
          let storedData = null;
          
          // Check if there's a server reference
          const serverRef = localStorage.getItem(storageKey);
          if (serverRef) {
            try {
              const ref = JSON.parse(serverRef);
              if (ref.storedOnServer) {
                console.log('📄 Found server reference but server data not available');
                // Continue to local storage fallback
              }
            } catch (e) {
              // Not a server reference, treat as regular data
              storedData = serverRef;
              dataSource = 'localStorage';
            }
          }
          
          // Try different local storage methods
          if (!storedData) {
            storedData = localStorage.getItem(storageKey);
            if (storedData && !storedData.includes('storedOnServer')) {
              dataSource = 'localStorage';
            }
          }
          
          if (!storedData) {
            storedData = sessionStorage.getItem(storageKey);
            if (storedData) {
              dataSource = 'sessionStorage';
            }
          }
          
          // Try chunked storage
          if (!storedData) {
            const metadataStr = localStorage.getItem(`${storageKey}-meta`);
            if (metadataStr) {
              try {
                const metadata = JSON.parse(metadataStr);
                console.log('📄 Found chunked data metadata:', metadata);
                
                const chunks = [];
                let missingChunks = 0;
                
                for (let i = 0; i < metadata.chunks; i++) {
                  const chunk = localStorage.getItem(`${storageKey}-chunk-${i}`);
                  if (chunk) {
                    chunks.push(chunk);
                  } else {
                    missingChunks++;
                  }
                }
                
                if (missingChunks === 0) {
                  const compressedData = chunks.join('');
                  storedData = decodeURIComponent(escape(atob(compressedData)));
                  dataSource = 'chunked-localStorage';
                }
              } catch (chunkError) {
                console.error('Error reconstructing chunked data:', chunkError);
              }
            }
          }
          
          if (storedData) {
            try {
              draftData = JSON.parse(storedData);
            } catch (parseError) {
              console.error('Error parsing local draft data:', parseError);
              throw new Error('Draft data is corrupted');
            }
          }
        }
        
        // Process and set the data if found
        if (draftData) {
          // Normalize optimized data format
          const normalizedData = normalizeOptimizedData(draftData);
          setDraftState(normalizedData);
          
          console.log(`📄 Draft data loaded from ${dataSource}:`, {
            leagueName: normalizedData.leagueName,
            teams: normalizedData.teams?.length || 0,
            picks: normalizedData.pickHistory?.length || 0,
            complete: normalizedData.isComplete,
            limited: normalizedData.limited || false
          });
          
          if (normalizedData.limited) {
            console.warn('⚠️ Draft data is limited - not all picks may be shown');
          }
        } else {
          // No data found anywhere
          const error = `No draft data found for ID: ${draftId}`;
          console.error('❌', error);
          console.log('Checked storage locations:', {
            server: 'attempted',
            localStorage: !!localStorage.getItem(storageKey),
            sessionStorage: !!sessionStorage.getItem(storageKey),
            chunkedStorage: !!localStorage.getItem(`${storageKey}-meta`)
          });
          setLoadingError(error);
        }
        
      } catch (error) {
        console.error("Failed to load draft data:", error);
        setLoadingError(error.message);
      }
    };
    
    loadDraftData();
  }, [location]);

    const handleSaveAsPNG = async () => {
    if (!draftBoardRef.current) {
      alert('Draft board not ready. Please wait for the page to fully load.');
      return;
    }
    
    setIsGeneratingImage(true);
    
    try {
      // Import html2canvas dynamically
      const html2canvas = (await import('html2canvas')).default;
      
      // Find the draft board element more reliably
      const draftBoardElement = draftBoardRef.current.querySelector('.draft-board') || draftBoardRef.current;
      
      // Calculate optimal dimensions for the entire draft
      const totalTeams = draftState?.teams?.length || 12;
      const totalRounds = draftState?.draftOrder ? Math.ceil(draftState.draftOrder.length / totalTeams) : 16;
      
      // Calculate optimal cell sizes based on content
      const cellWidth = Math.max(120, 800 / totalTeams); // Minimum 120px, max 800px total width
      const cellHeight = 80; // Fixed height for consistency
      const headerHeight = 60;
      const roundColumnWidth = 80;
      
      // Calculate total dimensions
      const totalWidth = roundColumnWidth + (totalTeams * cellWidth);
      const totalHeight = headerHeight + (totalRounds * cellHeight);
      
      console.log('📐 Calculated dimensions:', {
        totalTeams,
        totalRounds,
        cellWidth,
        cellHeight,
        totalWidth,
        totalHeight,
        aspectRatio: totalWidth / totalHeight
      });
      
      // Generate the image with optimized settings
      const canvas = await html2canvas(draftBoardElement, {
        backgroundColor: '#1f2937',
        scale: 2, // Higher quality for better text rendering
        useCORS: true,
        allowTaint: true,
        logging: false,
        width: totalWidth,
        height: totalHeight,
        scrollX: 0,
        scrollY: 0,
        // Ensure we capture the full content
        foreignObjectRendering: true,
        // Optimize for text rendering
        imageTimeout: 0,
        // Remove any clipping
        removeContainer: true
      });
      
      // Convert to PNG and download
      const link = document.createElement('a');
      link.download = `${draftState.leagueName?.replace(/\s+/g, '-') || 'fantasy'}-draft-board.png`;
      link.href = canvas.toDataURL('image/png', 0.95);
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      console.log('✅ PNG generated successfully with dimensions:', {
        canvasWidth: canvas.width,
        canvasHeight: canvas.height,
        actualWidth: canvas.width / 2, // Account for scale factor
        actualHeight: canvas.height / 2
      });
      
    } catch (error) {
      console.error('Error generating PNG:', error);
      alert(`Error generating image: ${error.message}. Please try again or use your browser's print function.`);
    } finally {
      setIsGeneratingImage(false);
    }
  };



  const handleCopyEmails = () => {
    const emails = draftState.teams?.map(team => team.email).join(', ') || '';
    navigator.clipboard.writeText(emails).then(() => {
      alert('Email addresses copied to clipboard!');
    }).catch(() => {
      alert('Failed to copy emails. Please copy manually.');
    });
  };

  // Position color function for DraftBoard
  const getPositionColor = (position) => {
    switch (position?.toUpperCase()) {
      case 'QB':
        return 'bg-blue-600 border-blue-500';
      case 'RB':
        return 'bg-green-600 border-green-500';
      case 'WR':
        return 'bg-purple-600 border-purple-500';
      case 'TE':
        return 'bg-orange-600 border-orange-500';
      case 'K':
        return 'bg-yellow-600 border-yellow-500';
      case 'DEF':
        return 'bg-red-600 border-red-500';
      default:
        return 'bg-gray-600 border-gray-500';
    }
  };

  if (loadingError) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold mb-4">Draft Data Not Found</h1>
          <p className="text-gray-300 mb-6">{loadingError}</p>
          <div className="space-y-3">
            <button
              onClick={() => window.history.back()}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-md font-medium"
            >
              ← Go Back
            </button>
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-md font-medium"
            >
              🔄 Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!draftState) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <div className="text-xl font-semibold">Loading draft data...</div>
          <div className="text-gray-400 text-sm mt-2">Please wait while we retrieve your draft results</div>
        </div>
      </div>
    );
  }

  return (
         <div className="min-h-screen bg-gray-900 text-white">
                    {/* Header */}
       <div className="bg-gray-800 border-b border-gray-700 p-6">
          <div className="max-w-7xl mx-auto">
            <h1 className="text-4xl font-bold text-center mb-4">
              {draftState.leagueName || 'Draft Results'}
            </h1>
            <p className="text-gray-300 text-center mb-6">
              Printer-Friendly Draft Board
            </p>
            
                         {/* Action Buttons */}
             <div className="flex justify-center gap-4 flex-wrap">
               <button
                 onClick={handleSaveAsPNG}
                 disabled={isGeneratingImage}
                 className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-6 py-3 rounded-md font-medium transition-colors"
               >
                 {isGeneratingImage ? 'Generating Image...' : '📷 Save as PNG'}
               </button>
               <button
                 onClick={handleCopyEmails}
                 className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-md font-medium transition-colors"
               >
                 📧 Copy All Emails
               </button>
             </div>
          </div>
        </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto p-6">
        {/* Tab Navigation */}
        <div className="flex border-b border-gray-700 mb-6">
            <button
              onClick={() => setActiveTab('draft-board')}
              className={`px-4 py-2 font-medium transition-colors ${
                activeTab === 'draft-board'
                  ? 'text-blue-400 border-b-2 border-blue-400'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Draft Board
            </button>
            <button
              onClick={() => setActiveTab('team-rosters')}
              className={`px-4 py-2 font-medium transition-colors ${
                activeTab === 'team-rosters'
                  ? 'text-blue-400 border-b-2 border-blue-400'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Team Rosters
            </button>
          </div>

        {/* Tab Content */}
        {activeTab === 'draft-board' && (
          <div 
            ref={draftBoardRef}
            className="bg-gray-800 rounded-lg p-6 print-draft-board"
            style={{
              // Ensure proper sizing for image generation
              minWidth: 'fit-content',
              overflow: 'visible'
            }}
          >
            <DraftBoard 
              draftState={draftState} 
              getPositionColor={getPositionColor}
            />
          </div>
        )}

        {activeTab === 'team-rosters' && (
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-2xl font-bold mb-6">Team Rosters</h2>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {draftState.teams?.map((team, index) => (
                <div key={index} className="bg-gray-700 rounded-lg p-4">
                  <h3 className="text-lg font-semibold mb-3 text-blue-400">{team.name}</h3>
                  <div className="space-y-2">
                    {team.roster?.map((player, playerIndex) => (
                      <div key={playerIndex} className="flex justify-between text-sm">
                        <span className="text-gray-300">{player.player_name}</span>
                        <span className="text-gray-400">{player.position}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

             
    </div>
  );
};

export default ResultsPage;
