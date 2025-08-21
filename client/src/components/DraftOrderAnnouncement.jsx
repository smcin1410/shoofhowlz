import React, { useState, useEffect, useRef } from 'react';

const DraftOrderAnnouncement = ({ draftOrder, teams, onClose, onStartDraft }) => {
  const [currentPickIndex, setCurrentPickIndex] = useState(teams.length - 1); // Start from last pick (reverse order)
  const [currentTeamIndex, setCurrentTeamIndex] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [selectedTeams, setSelectedTeams] = useState([]);
  const [availableTeams, setAvailableTeams] = useState([]);
  const [animationPhase, setAnimationPhase] = useState('waiting'); // 'waiting', 'ready', 'spinning', 'slowing', 'stopped', 'announcing', 'final-two-setup', 'final-two-animating', 'final-two-landed', 'final-two-revealed', 'complete'
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [showStartButton, setShowStartButton] = useState(false);
  const [firstOverallPick, setFirstOverallPick] = useState(null);
  const [secondOverallPick, setSecondOverallPick] = useState(null);
  const [highlightedTeam, setHighlightedTeam] = useState(0); // 0 or 1 (left/right)
  const [animationSpeed, setAnimationSpeed] = useState(200); // Current interval speed
  const [suspenseText, setSuspenseText] = useState('');
  const [isStartingDraft, setIsStartingDraft] = useState(false);
  const intervalRef = useRef(null);
  const finalTwoRef = useRef(null);

  useEffect(() => {
    // Get the first round order (unique teams only)
    const firstRoundOrder = draftOrder.slice(0, teams.length);
    
    // Create team objects for each position in the first round
    const draftingTeams = firstRoundOrder.map(teamId => {
      const team = teams.find(t => t.id === teamId);
      return team || { id: teamId, name: `Team ${teamId}` };
    });
    
    console.log('🎯 Setting up simple carousel teams:', {
      'Teams array length': teams.length,
      'Draft order length': draftOrder.length,
      'First round order': firstRoundOrder,
      'Teams data': teams.map(t => ({ id: t.id, name: t.name })),
      'Drafting teams': draftingTeams.map(t => ({ id: t.id, name: t.name }))
    });
    
    // Keep all teams for the carousel
    setAvailableTeams(draftingTeams);
  }, [teams, draftOrder]);

  useEffect(() => {
    console.log('Animation phase changed to:', animationPhase, 'Available teams:', availableTeams.length);
    
    if (animationPhase === 'ready' && availableTeams.length > 0) {
      console.log('Starting pick animation...');
      // Small delay to ensure the popup renders first
      setTimeout(() => {
        startPickAnimation();
      }, 50);
    }
  }, [animationPhase, availableTeams.length]);

  const handleFinalTwoReveal = () => {
    setAnimationPhase('final-two-setup');
    
    // Get remaining two teams
    const unselectedTeams = availableTeams.filter(team => 
      !selectedTeams.find(selected => selected.team.id === team.id)
    );
    
    console.log('🏆 Final Two Teams:', unselectedTeams.map(t => t.name));
    
    // Determine picks based on draft order
    const firstRoundOrder = draftOrder.slice(0, teams.length);
    const firstOverallTeamId = firstRoundOrder[0];  // Position 0 = #1 pick
    const secondOverallTeamId = firstRoundOrder[1]; // Position 1 = #2 pick
    
    const firstOverallTeam = teams.find(t => t.id === firstOverallTeamId);
    const secondOverallTeam = teams.find(t => t.id === secondOverallTeamId);
    
    // Store the final picks (but don't reveal yet)
    setFirstOverallPick(firstOverallTeam);
    setSecondOverallPick(secondOverallTeam);
    
    // Determine which team index wins (0 = left, 1 = right)
    const winnerTeamIndex = unselectedTeams[0].id === firstOverallTeamId ? 0 : 1;
    
    console.log('🎭 Final Two Animation Setup:', {
      'First Overall': firstOverallTeam?.name,
      'Second Overall': secondOverallTeam?.name,
      'Winner Index': winnerTeamIndex,
      'Unselected Teams': unselectedTeams.map(t => t.name)
    });
    
    // Start the suspenseful animation after brief setup
    setTimeout(() => {
      startFinalTwoAnimation(winnerTeamIndex);
    }, 500);
  };

  const startFinalTwoAnimation = (winnerIndex) => {
    setAnimationPhase('final-two-animating');
    setSuspenseText('🎵 Analyzing teams... *tick-tick-tick*');
    
    let switchCount = 0;
    let currentSpeed = 200; // Start fast
    const totalSwitches = 18 + Math.floor(Math.random() * 8); // 18-25 total switches
    
    // Speed phases for dramatic effect
    const getSpeedForSwitch = (count) => {
      if (count < 10) return 200;  // Fast start
      if (count < 18) return 400;  // Medium
      return 800;                  // Slow dramatic finish
    };
    
    const getSuspenseText = (speed) => {
      if (speed === 200) return '🎵 Analyzing teams... *tick-tick-tick*';
      if (speed === 400) return '🎵 Evaluating options... *tick...tick...tick*';
      return '🎵 Making final decision... *tick........tick........*';
    };
    
    const switchHighlight = () => {
      // Toggle between 0 and 1
      setHighlightedTeam(prev => prev === 0 ? 1 : 0);
      switchCount++;
      
      // Update speed and text for current phase
      currentSpeed = getSpeedForSwitch(switchCount);
      setSuspenseText(getSuspenseText(currentSpeed));
      setAnimationSpeed(currentSpeed);
      
      console.log(`🔄 Switch ${switchCount}/${totalSwitches}, Speed: ${currentSpeed}ms, Highlighted: ${switchCount % 2}`);
      
      if (switchCount >= totalSwitches) {
        // Land on predetermined winner
        landOnWinner(winnerIndex);
      } else {
        // Schedule next switch
        finalTwoRef.current = setTimeout(switchHighlight, currentSpeed);
      }
    };
    
    // Start the switching animation
    switchHighlight();
  };
  
  const landOnWinner = (winnerIndex) => {
    // Ensure we land on the correct winner
    setHighlightedTeam(winnerIndex);
    setAnimationPhase('final-two-landed');
    setSuspenseText('🎯 The #1 Overall Pick goes to...');
    
    console.log('🎯 Landing on winner! Index:', winnerIndex);
    
    // Brief dramatic pause on winner before full reveal
    setTimeout(() => {
      setAnimationPhase('final-two-revealed');
      setSuspenseText('');
      
      console.log('🎉 Final Two Revealed!', {
        'First Overall': firstOverallPick?.name,
        'Second Overall': secondOverallPick?.name,
        'Winner Index': winnerIndex
      });
    }, 2000); // 2 second dramatic pause
  };

  const startPickAnimation = () => {
    if (currentPickIndex < 0) {
      setAnimationPhase('complete');
      setShowStartButton(true);
      return;
    }

    // Special case: Final two picks (when currentPickIndex === 1)
    if (currentPickIndex === 1) {
      handleFinalTwoReveal();
      return;
    }

    setAnimationPhase('spinning');
    setIsSpinning(true);
    
    if (availableTeams.length === 0) return;
    
    // Get the team that should be selected according to first round draft order
    const firstRoundOrder = draftOrder.slice(0, teams.length);
    const selectedTeamId = firstRoundOrder[currentPickIndex];
    const selectedTeamData = teams.find(t => t.id === selectedTeamId);
    
    if (!selectedTeamData) {
      console.error('Selected team not found:', selectedTeamId);
      return;
    }
    
    // Find the target team index in available teams
    const targetTeamIndex = availableTeams.findIndex(t => t.id === selectedTeamId);
    
    if (targetTeamIndex === -1) {
      console.error('Selected team not found in available teams:', selectedTeamId);
      return;
    }
    
    console.log('🎯 Starting Simple Carousel Animation:', {
      'Current Pick': currentPickIndex + 1,
      'Target Team': selectedTeamData.name,
      'Target Index': targetTeamIndex,
      'Total Teams': availableTeams.length
    });
    
    // Start fast cycling
    let cycleCount = 0;
    let currentInterval = 100; // Start fast (100ms)
    const maxCycles = 20 + Math.floor(Math.random() * 15); // 20-35 cycles total
    const slowDownStart = maxCycles - 8; // Start slowing down in last 8 cycles
    
    const cycle = () => {
      // Move to next team
      setCurrentTeamIndex(prevIndex => (prevIndex + 1) % availableTeams.length);
      cycleCount++;
      
      // Check if we should start slowing down
      if (cycleCount >= slowDownStart) {
        setAnimationPhase('slowing');
        
        // Gradually increase interval to slow down
        const slowdownProgress = (cycleCount - slowDownStart) / (maxCycles - slowDownStart);
        currentInterval = 100 + (slowdownProgress * 400); // 100ms → 500ms
      }
      
      // Stop when we reach max cycles and land on target team
      if (cycleCount >= maxCycles) {
        // Ensure we land on the correct target team
        setCurrentTeamIndex(targetTeamIndex);
        setIsSpinning(false);
        setAnimationPhase('stopped'); // New phase for the pause
        
        console.log('🎯 Carousel Stopped on Target!', {
          'Cycles completed': cycleCount,
          'Final team': selectedTeamData.name,
          'Target achieved': true,
          'Status': 'Adding delay before announcement...'
        });
        
        // Clear interval
        if (intervalRef.current) {
          clearTimeout(intervalRef.current);
          intervalRef.current = null;
        }
        
        // Add dramatic pause before showing announcement
        setTimeout(() => {
          setAnimationPhase('announcing');
          setSelectedTeam(selectedTeamData);
          
          console.log('🎉 Announcement Revealed!', {
            'Team': selectedTeamData.name,
            'Pick': currentPickIndex + 1
          });
        }, 800); // 800ms delay for dramatic effect
        
        return;
      }
      
      // Schedule next cycle
      intervalRef.current = setTimeout(cycle, currentInterval);
    };
    
    // Start the cycling animation
    cycle();
  };

  const handleStartDraft = () => {
    console.log('🎯 DraftOrderAnnouncement: handleStartDraft called');
    console.log('🔍 Debug Info:', {
      'onStartDraft function exists': !!onStartDraft,
      'onClose function exists': !!onClose,
      'Current animation phase': animationPhase,
      'Current pick index': currentPickIndex,
      'Teams count': teams.length,
      'Draft order length': draftOrder.length
    });
    
    // Set loading state
    setIsStartingDraft(true);
    
    try {
      if (onStartDraft) {
        console.log('🚀 Calling onStartDraft function...');
        onStartDraft();
        console.log('✅ onStartDraft function called successfully');
      } else {
        console.error('❌ onStartDraft function is not provided');
        setIsStartingDraft(false);
        alert('❌ Error: Draft start function not available. Please try again.');
        return;
      }
      
      if (onClose) {
        console.log('🔒 Calling onClose function...');
        onClose();
        console.log('✅ onClose function called successfully');
      } else {
        console.error('❌ onClose function is not provided');
      }
    } catch (error) {
      console.error('💥 Error in handleStartDraft:', error);
      setIsStartingDraft(false);
      alert('❌ Error: Failed to start draft. Please try again.');
    }
  };

  const handleStartSpinning = () => {
    console.log('Starting simple carousel animation');
    setAnimationPhase('ready');
  };

  const handleContinue = () => {
    console.log('Continue to next pick');
    
    // Add selected team to the list
    if (selectedTeam) {
      setSelectedTeams(prev => [...prev, { 
        pick: currentPickIndex + 1, 
        team: selectedTeam 
      }]);
    }
    
    // Move to next pick (REVERSE ORDER: decrement)
    setCurrentPickIndex(prev => prev - 1);
    setSelectedTeam(null);
    setAnimationPhase('waiting');
  };

  const handleCompleteDraft = () => {
    // Add both final picks to selected teams
    if (firstOverallPick && secondOverallPick) {
      setSelectedTeams(prev => [
        ...prev,
        { pick: 2, team: secondOverallPick },
        { pick: 1, team: firstOverallPick }
      ]);
    }
    
    // Mark draft as complete
    setCurrentPickIndex(-1);
    setAnimationPhase('complete');
  };

  // Cleanup intervals on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearTimeout(intervalRef.current);
      }
      if (finalTwoRef.current) {
        clearTimeout(finalTwoRef.current);
      }
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-gray-900 text-white overflow-auto">
      {/* Background Draft Order List */}
      <div className="flex-1 p-4 sm:p-6 pb-24">
        
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-blue-400 mb-2">
            🏈 Draft Order Reveal
          </h1>
          <p className="text-gray-300 text-lg">
            {teams.length} Teams • {draftOrder.length / teams.length} Rounds
          </p>
        </div>

        {/* Progress */}
        <div className="mb-8">
          <div className="flex justify-between text-sm text-gray-400 mb-2">
            <span>Progress</span>
            <span>{teams.length - currentPickIndex}/{teams.length} picks revealed</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((teams.length - currentPickIndex) / teams.length) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Draft Order Grid */}
        {currentPickIndex === teams.length - 1 && animationPhase === 'waiting' && (
          <div className="text-center mb-8">
            <button
              onClick={handleStartSpinning}
              className="bg-green-600 hover:bg-green-700 text-white px-8 py-4 rounded-xl font-bold text-xl transition-all duration-200 transform hover:scale-105 shadow-lg"
            >
              🎲 START DRAFT ORDER REVEAL! 🎲
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-8">
          {Array.from({length: teams.length}, (_, index) => {
            const isCurrentPick = index === currentPickIndex;
            const isCompleted = index > currentPickIndex; // Already revealed (reverse logic)
            const isPending = index < currentPickIndex;   // Not yet revealed
            
            // Handle final two special case
            const getPickTeam = () => {
              if (animationPhase === 'final-two-revealed') {
                if (index === 0) return firstOverallPick;
                if (index === 1) return secondOverallPick;
              }
              return selectedTeams.find(st => st.pick === index + 1)?.team;
            };
            
            const getPickStatus = () => {
              if (animationPhase === 'final-two-revealed' && (index === 0 || index === 1)) {
                return 'REVEALED';
              }
              if (isCurrentPick) return 'REVEALING NOW';
              if (isCompleted) return 'REVEALED';
              return 'PENDING';
            };
            
            const selectedTeamForPick = getPickTeam();
            const pickStatus = getPickStatus();
            
            return (
              <div
                key={index}
                className={`p-4 rounded-lg border-2 transition-all duration-300 ${
                  isCurrentPick
                    ? 'border-orange-400 bg-orange-900 bg-opacity-30 animate-pulse'
                    : isCompleted || (animationPhase === 'final-two-revealed' && (index === 0 || index === 1))
                    ? 'border-green-400 bg-green-900 bg-opacity-30'
                    : 'border-gray-600 bg-gray-800'
                }`}
              >
                <div className="text-center">
                  <div className="text-2xl font-bold mb-2">
                    #{index + 1}
                  </div>
                  <div className="text-sm text-gray-400 mb-1">
                    {pickStatus}
                  </div>
                  <div className="font-medium">
                    {selectedTeamForPick ? selectedTeamForPick.name : '???'}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom Actions */}
        <div className="flex-shrink-0 sticky bottom-0 left-0 right-0 bg-gray-900 p-4 border-t border-gray-700">
          {currentPickIndex < 0 ? (
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
                             <button
                 onClick={handleStartDraft}
                 disabled={isStartingDraft}
                 className={`px-6 sm:px-8 py-3 sm:py-4 rounded-xl font-bold text-lg sm:text-xl transition-all duration-200 transform shadow-lg ${
                   isStartingDraft 
                     ? 'bg-gray-500 text-white cursor-not-allowed opacity-75' 
                     : 'bg-green-600 hover:bg-green-700 text-white hover:scale-105'
                 }`}
               >
                 {isStartingDraft ? (
                   <>
                     <span className="animate-spin mr-2">⏳</span>
                     Starting Draft...
                   </>
                 ) : (
                   '🏈 Start the Draft!'
                 )}
               </button>
              
              <button
                onClick={onClose}
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 sm:px-6 py-3 sm:py-4 rounded-xl font-medium text-sm sm:text-lg transition-all duration-200"
              >
                📋 View Order Only
              </button>
            </div>
          ) : (
            /* Draft in Progress or Waiting - Show Control Buttons */
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
              {animationPhase === 'waiting' && currentPickIndex < teams.length - 1 ? (
                <button
                  onClick={handleStartSpinning}
                  className="bg-green-600 hover:bg-green-700 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-xl font-bold text-lg sm:text-xl transition-all duration-200 transform hover:scale-105 shadow-lg"
                >
                  {currentPickIndex === 1 ? '🏆 DETERMINE #1 PICK!' : `🏈 Reveal Pick #${currentPickIndex + 1}!`}
                </button>
              ) : (
                <button
                  disabled={isSpinning}
                  className="bg-gray-500 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-xl font-bold text-lg sm:text-xl cursor-not-allowed opacity-75"
                >
                  {isSpinning ? '🏈 Revealing...' : '🏈 Order Revealing'}
                </button>
              )}
              
              <button
                onClick={onClose}
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 sm:px-6 py-3 sm:py-4 rounded-xl font-medium text-sm sm:text-lg transition-all duration-200"
              >
                ❌ Close
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Popup Carousel Window - Only show when spinning */}
      {(() => {
        const shouldShow = (animationPhase === 'ready' || animationPhase === 'spinning' || animationPhase === 'slowing' || animationPhase === 'stopped' || animationPhase === 'announcing' || animationPhase === 'final-two-setup' || animationPhase === 'final-two-animating' || animationPhase === 'final-two-landed' || animationPhase === 'final-two-revealed');
        return shouldShow;
      })() && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center" style={{zIndex: 9999}}>
          <div className="bg-gray-800 rounded-2xl shadow-2xl p-6 max-w-lg w-full mx-4">
            
            {/* Carousel Header */}
            <div className="text-center mb-6">
              <h2 className="text-2xl sm:text-3xl font-bold text-blue-400 mb-2">
                🏈 {animationPhase === 'announcing' ? 'Selected!' : 
                     animationPhase === 'stopped' ? 'Locked In!' :
                     animationPhase === 'final-two-setup' ? 'Determining #1 Pick...' :
                     animationPhase === 'final-two-animating' ? 'Selecting #1 Pick...' :
                     animationPhase === 'final-two-landed' ? 'Locked In!' :
                     animationPhase === 'final-two-revealed' ? 'Draft Complete!' :
                     isSpinning ? 'Selecting...' : 'Draft Picker'}
              </h2>
              {!(animationPhase === 'final-two-setup' || animationPhase === 'final-two-animating' || animationPhase === 'final-two-landed' || animationPhase === 'final-two-revealed') && (
                <p className="text-gray-300">
                  Pick #{currentPickIndex + 1}
                </p>
              )}
            </div>

            {/* Normal Carousel for Regular Picks */}
            {!(animationPhase === 'final-two-setup' || animationPhase === 'final-two-animating' || animationPhase === 'final-two-landed' || animationPhase === 'final-two-revealed') && (
              <div className="relative w-full max-w-lg mx-auto mb-6">
                {/* Carousel Container */}
                <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-xl border-4 border-orange-400 shadow-2xl p-8">
                  
                  {/* Team Name Display */}
                  <div className="text-center">
                    <div className={`text-4xl sm:text-5xl font-bold mb-4 min-h-[4rem] flex items-center justify-center transition-all duration-300 ${
                      animationPhase === 'stopped' 
                        ? 'text-yellow-300 scale-110 drop-shadow-lg' 
                        : 'text-white'
                    }`}>
                      {availableTeams.length === 0 ? (
                        'NO TEAMS'
                      ) : (
                        availableTeams[currentTeamIndex]?.name || `Team ${availableTeams[currentTeamIndex]?.id}` || 'Unknown Team'
                      )}
                    </div>
                    
                    {/* Selection Indicator */}
                    <div className="flex items-center justify-center space-x-4">
                      <div className="text-2xl">🏈</div>
                      <div className="bg-orange-500 text-white px-4 py-2 rounded-lg font-bold">
                        PICK #{currentPickIndex + 1}
                      </div>
                      <div className="text-2xl">🏈</div>
                    </div>
                    
                    {/* Cycling Status */}
                    {(animationPhase === 'spinning' || animationPhase === 'slowing' || animationPhase === 'stopped') && (
                      <div className="mt-4 text-orange-300 animate-pulse">
                        {animationPhase === 'spinning' ? 'Cycling through teams...' : 
                         animationPhase === 'slowing' ? 'Slowing down...' :
                         animationPhase === 'stopped' ? 'Locked in! Preparing announcement...' : ''}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Enhanced Final Two Suspense UI */}
            {(animationPhase === 'final-two-setup' || animationPhase === 'final-two-animating' || animationPhase === 'final-two-landed' || animationPhase === 'final-two-revealed') && (
              <div className="mb-6">
                
                {/* Main Focus Area - #1 Pick Selection */}
                <div className="text-center mb-6">
                  <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-xl border-4 border-orange-400 shadow-2xl p-6 mb-4">
                    <div className="text-center">
                      <div className="text-4xl sm:text-5xl font-bold text-white mb-4 min-h-[4rem] flex items-center justify-center">
                        {animationPhase === 'final-two-setup' ? '🤔 Determining...' :
                         animationPhase === 'final-two-animating' ? '🔥 Selecting...' :
                         animationPhase === 'final-two-landed' ? '🎯 Locked In!' :
                         animationPhase === 'final-two-revealed' ? `${firstOverallPick?.name}` : 'Determining...'}
                      </div>
                      <div className="flex items-center justify-center space-x-4">
                        <div className="text-2xl">🏈</div>
                        <div className="bg-orange-500 text-white px-4 py-2 rounded-lg font-bold">#1 OVERALL PICK</div>
                        <div className="text-2xl">🏈</div>
                      </div>
                      {(animationPhase === 'final-two-setup' || animationPhase === 'final-two-animating') && (
                        <div className="mt-4 text-orange-300 animate-pulse">
                          {animationPhase === 'final-two-setup' ? 'Preparing selection...' : 'Analyzing teams...'}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Suspense Text */}
                {suspenseText && (
                  <div className="text-center mb-4">
                    <div className="text-lg text-orange-300 animate-pulse">
                      {suspenseText}
                    </div>
                    {(animationPhase === 'final-two-animating' || animationPhase === 'final-two-landed') && (
                      <div className="text-sm text-gray-400 mt-2">
                        {highlightedTeam === 0 ? '👈 FOCUSING...' : '👉 FOCUSING...'}
                      </div>
                    )}
                  </div>
                )}

                {/* Final Two Teams Display */}
                <div className="text-center mb-6">
                  <h3 className="text-xl text-orange-300 mb-4">🏆 Final Two Teams 🏆</h3>
                  
                  {animationPhase === 'final-two-revealed' ? (
                    // Final Reveal State - Integrated Results
                    <div>
                      {/* Confetti Animation */}
                      <div className="relative mb-6">
                        <div className="absolute inset-0 overflow-hidden pointer-events-none">
                          {[...Array(12)].map((_, i) => (
                            <div 
                              key={i} 
                              className="absolute animate-ping text-2xl" 
                              style={{
                                left: `${Math.random() * 100}%`,
                                top: `${Math.random() * 100}%`,
                                animationDelay: `${i * 150}ms`,
                                animationDuration: '2s'
                              }}
                            >
                              🎉
                            </div>
                          ))}
                        </div>
                        
                        <div className="grid grid-cols-2 gap-6 relative">
                          {/* #2 Pick - Silver Theme */}
                          <div className="bg-gray-600 p-4 rounded-xl border-2 border-gray-400 opacity-75 transform scale-95">
                            <div className="text-center">
                              <h4 className="text-lg text-gray-300">#2 Overall Pick</h4>
                              <h3 className="text-xl font-bold text-white">{secondOverallPick?.name}</h3>
                              <div className="text-3xl mt-2">🥈</div>
                            </div>
                          </div>
                          
                          {/* #1 Pick - Gold Theme with Maximum Emphasis */}
                          <div className="bg-gradient-to-r from-yellow-400 to-yellow-600 p-6 rounded-xl border-4 border-yellow-300 transform scale-125 shadow-2xl">
                            <div className="text-center">
                              <div className="text-6xl animate-bounce mb-2">👑</div>
                              <h4 className="text-lg text-yellow-900 font-bold">🏆 #1 OVERALL PICK! 🏆</h4>
                              <h3 className="text-2xl font-black text-yellow-900">{firstOverallPick?.name}</h3>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Complete Draft Button */}
                      <div className="mt-6 text-center">
                        <button
                          onClick={handleCompleteDraft}
                          className="bg-green-600 hover:bg-green-700 text-white px-8 py-4 rounded-xl font-bold text-xl transition-all duration-200 transform hover:scale-105 shadow-lg"
                        >
                          🏁 Complete Draft Order!
                        </button>
                      </div>
                    </div>
                  ) : (
                    // Animation States (setup, animating, landed)
                    <div className="grid grid-cols-2 gap-6">
                      {availableTeams
                        .filter(team => !selectedTeams.find(selected => selected.team.id === team.id))
                        .map((team, index) => {
                          const isHighlighted = highlightedTeam === index;
                          const isWinner = animationPhase === 'final-two-landed' && highlightedTeam === index;
                          
                          // Card styling based on state
                          let cardClass = "p-6 rounded-xl border-2 transition-all duration-300 transform";
                          let textClass = "text-center";
                          let teamEmoji = "🤔";
                          let statusText = "Waiting...";
                          
                          if (animationPhase === 'final-two-setup') {
                            cardClass += " bg-gray-700 border-gray-500";
                          } else if (isWinner) {
                            // Winner state during landing
                            cardClass += " bg-gradient-to-r from-yellow-500 to-yellow-600 border-4 border-yellow-300 scale-125 shadow-2xl";
                            teamEmoji = "👑";
                            statusText = "#1 OVERALL PICK!";
                            textClass += " text-yellow-900";
                          } else if (isHighlighted && animationPhase === 'final-two-animating') {
                            // Highlighted during animation
                            cardClass += " bg-gradient-to-r from-orange-500 to-red-500 border-4 border-yellow-400 scale-110 shadow-xl animate-pulse";
                            teamEmoji = "🔥";
                            statusText = "SELECTED?";
                          } else if (animationPhase === 'final-two-landed' && !isWinner) {
                            // Loser state during landing
                            cardClass += " bg-gray-600 border-gray-500 opacity-60 scale-90";
                            teamEmoji = "😔";
                            statusText = "#2 Overall Pick";
                            textClass += " text-gray-400";
                          } else {
                            // Normal state
                            cardClass += " bg-gray-700 border-gray-500";
                          }
                          
                          return (
                            <div key={team.id} className={cardClass}>
                              <div className={textClass}>
                                <div className="text-6xl mb-2">{teamEmoji}</div>
                                <h4 className="text-lg font-bold">{team.name}</h4>
                                <p className="text-sm mt-1">{statusText}</p>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Current Selection Announcement */}
            {selectedTeam && animationPhase === 'announcing' && (
              <div className="text-center">
                {/* Big Celebration Announcement */}
                <div className="p-4 bg-gradient-to-r from-green-600 to-blue-600 rounded-xl border-4 border-yellow-400 shadow-2xl animate-bounce">
                  <div className="text-4xl mb-2">🎉</div>
                  <div className="text-lg font-bold text-yellow-200 mb-1">
                    PICK #{currentPickIndex + 1}
                  </div>
                  <div className="text-2xl font-black text-white mb-2">
                    {selectedTeam.name}
                  </div>
                  <div className="text-sm text-yellow-200">
                    {currentPickIndex === 0 ? 'FIRST OVERALL PICK!' : 
                     currentPickIndex === 1 ? 'SECOND OVERALL PICK!' :
                     currentPickIndex === 2 ? 'THIRD OVERALL PICK!' :
                     `${currentPickIndex + 1}${['TH', 'ST', 'ND', 'RD'][Math.min(3, currentPickIndex + 1 - Math.floor((currentPickIndex + 1) / 10) * 10)]} OVERALL PICK!`}
                  </div>
                </div>
                
                {/* Continue Button */}
                <div className="mt-6">
                  <button
                    onClick={handleContinue}
                    className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-bold text-lg transition-all duration-200 transform hover:scale-105"
                  >
                    {currentPickIndex === 0 ? '🏁 Finish' : '➡️ Continue'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DraftOrderAnnouncement;