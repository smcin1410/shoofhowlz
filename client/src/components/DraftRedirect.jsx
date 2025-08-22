import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const DraftRedirect = () => {
  const { draftId } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    // Store the draft ID in localStorage so the main app can access it
    localStorage.setItem('redirectDraftId', draftId);
    
    // Redirect to the main app
    navigate('/', { replace: true });
  }, [draftId, navigate]);

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4">
      <div className="text-center max-w-sm">
        <div className="text-6xl mb-6">🏈</div>
        <h1 className="text-2xl font-bold mb-4">Redirecting...</h1>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
        <p className="text-gray-400 mt-4">Taking you to the draft</p>
      </div>
    </div>
  );
};

export default DraftRedirect;
