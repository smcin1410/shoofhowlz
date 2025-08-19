import React, { useState, useEffect, useRef } from 'react';

const DraftOrderAnnouncement = ({ draftOrder, teams, onClose, onStartDraft }) => {
  const [currentPickIndex, setCurrentPickIndex] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [selectedTeams, setSelectedTeams] = useState([]);
  const [availableTeams, setAvailableTeams] = useState([]);
  const [animationPhase, setAnimationPhase] = useState('ready'); // 'ready', 'spinning', 'slowing', 'announcing', 'complete'
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [showStartButton, setShowStartButton] = useState(false);
  const carouselRef = useRef(null);
  const animationRef = useRef(null);

  useEffect(() => {
    // Initialize available teams (shuffled for randomness)
    const shuffledTeams = [...teams].sort(() => Math.random() - 0.5);
    setAvailableTeams(shuffledTeams);
  }, [teams]);

  useEffect(() => {
    if (animationPhase === 'ready' && availableTeams.length > 0) {
      startPickAnimation();
    }
    
    // Cleanup animation on unmount
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [animationPhase, availableTeams]);

  const getTeamName = (teamId) => {
    const team = teams.find((t) => t.id === teamId);
    return team ? team.name : `Team ${teamId}`;
  };

  const startPickAnimation = () => {
    if (currentPickIndex >= draftOrder.length) {
      setAnimationPhase('complete');
      setShowStartButton(true);
      return;
    }

    setAnimationPhase('spinning');
    setIsSpinning(true);
    
    if (!carouselRef.current || availableTeams.length === 0) return;
    
    // Get the team that should be selected according to draft order
    const selectedTeamId = draftOrder[currentPickIndex];
    const selectedTeamIndex = availableTeams.findIndex(t => t.id === selectedTeamId);
    
    // Calculate target angle for the selected team
    const segmentAngle = 360 / availableTeams.length;
    const targetAngle = selectedTeamIndex * segmentAngle;
    
    // Add multiple full rotations for dramatic effect (3-5 full spins)
    const fullRotations = 3 + Math.random() * 2; // 3-5 rotations
    const finalAngle = -(fullRotations * 360 + targetAngle);
    
    // Start the spinning animation
    let currentRotation = 0;
    let animationSpeed = 20; // Start very fast
    let isSlowingDown = false;
    
    const spin = () => {
      if (!carouselRef.current) return;
      
      currentRotation -= animationSpeed;
      carouselRef.current.style.transform = `rotate(${currentRotation}deg)`;
      
      // Fast spinning phase (first 3 seconds)
      if (Math.abs(currentRotation) < Math.abs(finalAngle) * 0.7) {
        animationSpeed = Math.max(15, animationSpeed - 0.1); // Gradually get faster
      }
      // Slowing down phase
      else if (!isSlowingDown) {
        setAnimationPhase('slowing');
        isSlowingDown = true;
      }
      
      if (isSlowingDown) {
        animationSpeed = Math.max(0.5, animationSpeed * 0.98); // Exponential slowdown
      }
      
      // Check if we've reached the target
      if (Math.abs(currentRotation - finalAngle) < 2) {
        // Snap to exact position
        carouselRef.current.style.transform = `rotate(${finalAngle}deg)`;
        setIsSpinning(false);
        setAnimationPhase('announcing');
        
        // Get the selected team data
        const selectedTeamData = teams.find(t => t.id === selectedTeamId);
        setSelectedTeam(selectedTeamData);
        
        // Add to selected teams list after announcement
        setTimeout(() => {
          setSelectedTeams(prev => [...prev, {
            position: currentPickIndex + 1,
            team: selectedTeamData
          }]);
          
          // Remove from available teams
          setAvailableTeams(prev => prev.filter(t => t.id !== selectedTeamId));
          
          // Move to next pick after announcement
          setTimeout(() => {
            setCurrentPickIndex(prev => prev + 1);
            setAnimationPhase('ready');
            setSelectedTeam(null);
          }, 3000); // Show announcement for 3 seconds
          
        }, 1000); // Wait 1 second before showing result
        
        return;
      }
      
      // Continue spinning
      animationRef.current = requestAnimationFrame(spin);
    };
    
    // Start the animation
    spin();
  };

  const handleStartDraft = () => {
    if (onStartDraft) {
      onStartDraft();
    }
    if (onClose) {
      onClose();
    }
  };

  const getFirstTeamName = () => {
    if (draftOrder.length > 0) {
      return getTeamName(draftOrder[0]);
    }
    return '';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 flex flex-col items-center justify-center z-50 p-4">
      <div className="bg-gray-800 text-white rounded-2xl shadow-2xl max-w-4xl w-full p-8 text-center">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-5xl font-bold mb-2 text-blue-400">🎲 Draft Order Reveal</h1>
          <p className="text-xl text-gray-300">
            {animationPhase === 'complete' 
              ? 'Draft order is set!' 
              : `Selecting pick #${currentPickIndex + 1}`
            }
          </p>
        </div>

        {/* Main Content Area */}
        <div className="grid lg:grid-cols-2 gap-8 mb-8">
          
          {/* Left: Spinning Carousel */}
          <div className="bg-gray-700 rounded-xl p-6">
            <h2 className="text-2xl font-semibold mb-4">
              {isSpinning ? '🎠 Spinning...' : animationPhase === 'announcing' ? '🎯 Selected!' : '🎪 Ready to Spin'}
            </h2>
            
            {availableTeams.length > 0 && animationPhase !== 'complete' ? (
              <div className="relative w-80 h-80 mx-auto">
                {/* Spinning Wheel Container */}
                <div 
                  ref={carouselRef}
                  className="relative w-full h-full rounded-full border-8 border-yellow-400 bg-gray-600 shadow-2xl overflow-hidden"
                  style={{
                    transform: `rotate(${isSpinning ? '0deg' : '0deg'})`,
                    transition: isSpinning ? 'none' : 'transform 3s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
                  }}
                >
                  {availableTeams.map((team, index) => {
                    const angle = (360 / availableTeams.length) * index;
                    const segmentColor = index % 2 === 0 ? 'bg-blue-600' : 'bg-blue-500';
                    
                    return (
                      <div
                        key={team.id}
                        className="absolute w-full h-full"
                        style={{
                          transform: `rotate(${angle}deg)`,
                          transformOrigin: 'center'
                        }}
                      >
                        {/* Wheel segment background */}
                        <div 
                          className={`absolute w-full h-full ${segmentColor} border-r border-gray-300`}
                          style={{
                            clipPath: `polygon(50% 50%, 
                              ${50 + 50 * Math.cos((0 - 180/availableTeams.length) * Math.PI / 180)}% 
                              ${50 + 50 * Math.sin((0 - 180/availableTeams.length) * Math.PI / 180)}%, 
                              ${50 + 50 * Math.cos((0 + 180/availableTeams.length) * Math.PI / 180)}% 
                              ${50 + 50 * Math.sin((0 + 180/availableTeams.length) * Math.PI / 180)}%)`
                          }}
                        />
                        
                        {/* Team name */}
                        <div 
                          className="absolute text-center"
                          style={{
                            transform: `rotate(${-angle}deg) translateY(-130px)`,
                            transformOrigin: 'center',
                            left: '50%',
                            top: '50%',
                            marginLeft: '-80px',
                            marginTop: '-10px',
                            width: '160px'
                          }}
                        >
                          <div className="px-2 py-1 bg-white bg-opacity-90 rounded shadow font-bold text-sm text-gray-800 border">
                            {team.name}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  
                  {/* Center circle */}
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-gray-800 rounded-full border-4 border-yellow-400 flex items-center justify-center">
                    <div className="text-2xl">🎯</div>
                  </div>
                </div>
                
                {/* Selection Pointer */}
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-2">
                  <div className="w-0 h-0 border-l-4 border-r-4 border-b-8 border-transparent border-b-red-500"></div>
                  <div className="w-2 h-8 bg-red-500 mx-auto"></div>
                </div>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center bg-gray-600 rounded-lg">
                <div className="text-6xl">🏆</div>
              </div>
            )}

            {/* Current Selection Announcement */}
            {selectedTeam && animationPhase === 'announcing' && (
              <div className="mt-6 p-4 bg-green-700 rounded-lg border-2 border-green-500 animate-bounce">
                <div className="text-3xl font-bold text-green-100">
                  Pick #{currentPickIndex + 1}
                </div>
                <div className="text-4xl font-black text-white mt-2">
                  {selectedTeam.name}
                </div>
              </div>
            )}
          </div>

          {/* Right: Draft Order List */}
          <div className="bg-gray-700 rounded-xl p-6">
            <h2 className="text-2xl font-semibold mb-4 flex items-center">
              <span className="text-3xl mr-2">📋</span>
              Draft Order
            </h2>
            
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {selectedTeams.map((pick, index) => (
                <div 
                  key={index}
                  className="flex items-center justify-between p-3 bg-green-600 rounded-lg border border-green-500 animate-slide-in"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <span className="text-lg font-bold text-white">
                    #{pick.position}
                  </span>
                  <span className="text-xl font-semibold text-green-100">
                    {pick.team.name}
                  </span>
                  <span className="text-2xl">✅</span>
                </div>
              ))}
              
              {/* Remaining picks (grayed out) */}
              {Array.from({ length: draftOrder.length - selectedTeams.length }, (_, index) => (
                <div 
                  key={selectedTeams.length + index}
                  className="flex items-center justify-between p-3 bg-gray-600 rounded-lg border border-gray-500"
                >
                  <span className="text-lg font-bold text-gray-400">
                    #{selectedTeams.length + index + 1}
                  </span>
                  <span className="text-xl font-semibold text-gray-400">
                    TBD
                  </span>
                  <span className="text-2xl">⏳</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Actions */}
        {showStartButton && animationPhase === 'complete' && (
          <div className="bg-blue-900 rounded-xl p-6 border-2 border-blue-600">
            <div className="mb-4">
              <h3 className="text-2xl font-bold text-blue-200 mb-2">🚀 Ready to Start Draft!</h3>
              <p className="text-lg text-blue-300">
                <strong>{getFirstTeamName()}</strong> has the first pick - get ready!
              </p>
            </div>
            
            <div className="flex gap-4 justify-center">
              <button
                onClick={handleStartDraft}
                className="bg-green-600 hover:bg-green-700 text-white px-8 py-4 rounded-xl font-bold text-xl transition-all duration-200 transform hover:scale-105 shadow-lg"
              >
                🏈 Start the Draft!
              </button>
              
              <button
                onClick={onClose}
                className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-4 rounded-xl font-medium text-lg transition-all duration-200"
              >
                View Order Only
              </button>
            </div>
          </div>
        )}

        {/* Progress Indicator */}
        {!showStartButton && (
          <div className="mt-6">
            <div className="bg-gray-600 rounded-full h-3 overflow-hidden">
              <div 
                className="bg-blue-500 h-full transition-all duration-500 ease-out"
                style={{ width: `${(selectedTeams.length / draftOrder.length) * 100}%` }}
              ></div>
            </div>
            <p className="text-sm text-gray-400 mt-2">
              {selectedTeams.length} of {draftOrder.length} picks revealed
            </p>
          </div>
        )}
      </div>

      {/* CSS Animations */}
      <style jsx>{`
        @keyframes slide-in {
          from {
            transform: translateX(-100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        
        .animate-slide-in {
          animation: slide-in 0.5s ease-out forwards;
        }
        
        .highlighted {
          background-color: #3B82F6 !important;
          color: white !important;
          transform: scale(1.05);
          box-shadow: 0 0 20px rgba(59, 130, 246, 0.5);
        }
      `}</style>
    </div>
  );
};

export default DraftOrderAnnouncement;
