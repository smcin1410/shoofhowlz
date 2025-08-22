import React from 'react';

const ConnectionStatus = ({ serverStatus, onRetry }) => {
  const getStatusInfo = () => {
    switch (serverStatus) {
      case 'connecting':
        return {
          text: 'Connecting to server...',
          color: 'text-blue-600',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          icon: '🔄'
        };
      case 'connected':
        return {
          text: 'Connected to server',
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          icon: '✅'
        };
      case 'waking':
        return {
          text: 'Server is starting up (this may take 1-2 minutes on free tier)',
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          icon: '⏰'
        };
      case 'disconnected':
        return {
          text: 'Connection lost - server may be down',
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          icon: '❌'
        };
      default:
        return {
          text: 'Unknown connection status',
          color: 'text-gray-600',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
          icon: '❓'
        };
    }
  };

  const statusInfo = getStatusInfo();

  // Show compact indicator when connected, full panel when not connected
  if (serverStatus === 'connected') {
    return (
      <div className="fixed top-4 right-4 z-50">
        <div className="flex items-center space-x-2 bg-green-600 text-white px-3 py-2 rounded-lg shadow-lg">
          <div className="w-2 h-2 bg-green-200 rounded-full animate-pulse"></div>
          <span className="text-sm font-medium">Connected</span>
          <span className="text-sm">✅</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg border-2 ${statusInfo.bgColor} ${statusInfo.borderColor} shadow-lg max-w-sm animate-fade-in`}>
      <div className="flex items-center space-x-3">
        <span className="text-2xl">{statusInfo.icon}</span>
        <div className="flex-1">
          <p className={`font-medium ${statusInfo.color}`}>
            {statusInfo.text}
          </p>
          {serverStatus === 'waking' && (
            <p className="text-sm text-gray-600 mt-1">
              Free tier servers sleep after 15 minutes of inactivity
            </p>
          )}
        </div>
        {serverStatus === 'disconnected' && onRetry && (
          <button
            onClick={onRetry}
            className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        )}
      </div>
      
      {serverStatus === 'waking' && (
        <div className="mt-3">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="bg-yellow-500 h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConnectionStatus;


