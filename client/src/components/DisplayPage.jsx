import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import Header from './Header';
import DraftBoard from './DraftBoard';
import RecentPicks from './RecentPicks';

const SERVER_URL = process.env.REACT_APP_SERVER_URL || 'http://localhost:4000';

const DisplayPage = () => {
  const [draftState, setDraftState] = useState(null);

  useEffect(() => {
    const socket = io(SERVER_URL);

    socket.on('draft-state', (state) => {
      setDraftState(state);
    });

    return () => {
      socket.close();
    };
  }, []);

  if (!draftState || !draftState.isDraftStarted) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <h1 className="text-4xl font-bold">Waiting for draft to start...</h1>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Header draftState={draftState} />
      <div className="p-8 pt-24">
        <div className="flex gap-8">
          <div className="flex-grow">
            <DraftBoard draftState={draftState} />
          </div>
          <div className="w-1/4">
            <RecentPicks draftState={draftState} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default DisplayPage;
