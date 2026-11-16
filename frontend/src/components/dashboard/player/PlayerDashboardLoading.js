import React from 'react';
import RouteLoadingScreen from '@/components/RouteLoadingScreen';

export default function PlayerDashboardLoading() {
  return (
    <RouteLoadingScreen
      label="Player dashboard is loading"
      status="Opening player dashboard…"
      description="Gathering your characters, campaigns, notes and handouts."
    />
  );
}
