import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import pako from 'pako';
import DraftBoard from './DraftBoard';

const ResultsPage = () => {
  const [draftState, setDraftState] = useState(null);
  const location = useLocation();

  useEffect(() => {
    try {
      const params = new URLSearchParams(location.search);
      const data = params.get('data');
      if (data) {
        const decoded = atob(data);
        const inflated = pako.inflate(decoded, { to: 'string' });
        setDraftState(JSON.parse(inflated));
      }
    } catch (error) {
      console.error("Failed to parse draft data from URL:", error);
    }
  }, [location]);

  if (!draftState) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <h1 className="text-2xl">Invalid or missing draft data.</h1>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <h1 className="text-4xl font-bold text-center mb-8">{draftState.leagueName || 'Draft Results'}</h1>
      <DraftBoard draftState={draftState} />
    </div>
  );
};

export default ResultsPage;
