import React from 'react';

export default function RouteLoadingScreen() {
  return (
    <div className="loading-screen loading-screen--simple" role="status" aria-live="polite">
      <p className="loading-title">Opening Rookie Quest Keeper</p>
    </div>
  );
}
