import React from 'react';
import { useNavigate } from 'react-router-dom';

import LatestUpdatesPanel from '@/components/LatestUpdatesPanel';
import { DesktopDashboard, MobileDashboardTabs } from '@/components/dashboard/DashboardActionCards';
import CreateCampaignModal from '@/components/dashboard/CreateCampaignModal';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import DashboardLoading from '@/components/dashboard/DashboardLoading';
import DashboardNotice from '@/components/dashboard/DashboardNotice';
import useCampaignCreation from '@/components/dashboard/useCampaignCreation';
import useDashboardData from '@/components/dashboard/useDashboardData';
import { pageStyle } from '@/components/dashboard/dashboardStyles';
import '@/components/dashboard/DashboardMinimal.css';

export default function UnifiedDashboard({ username, onLogout }) {
  const navigate = useNavigate();
  const {
    characters,
    campaigns,
    siteSettings,
    loading,
    slowLoad,
    refreshing,
    isAdmin,
    smallScreen,
    mobileTab,
    setMobileTab,
    recentCharacters,
    recentCampaigns,
    loadDashboard,
  } = useDashboardData();

  const {
    showCreateCampaignModal,
    campaignForm,
    creatingCampaign,
    createCharacter,
    openCampaignCreate,
    closeCampaignCreate,
    updateCampaignForm,
    toggleCampaignClass,
    handleCreateCampaign,
  } = useCampaignCreation({ siteSettings, navigate });

  if (loading) return <DashboardLoading slowLoad={slowLoad} />;

  const dashboardProps = {
    characters,
    campaigns,
    recentCharacters,
    recentCampaigns,
    siteSettings,
    isAdmin,
    navigate,
    createCharacter,
    openCampaignCreate,
  };

  return (
    <main style={pageStyle} className="rq-dashboard-minimal">
      <DashboardHeader
        username={username}
        isAdmin={isAdmin}
        refreshing={refreshing}
        onRefresh={loadDashboard}
        onNavigate={navigate}
        onLogout={onLogout}
      />

      {smallScreen ? (
        <MobileDashboardTabs
          {...dashboardProps}
          tab={mobileTab}
          setTab={setMobileTab}
        />
      ) : (
        <DesktopDashboard {...dashboardProps} />
      )}

      <LatestUpdatesPanel limit={smallScreen ? 2 : 3} />

      {slowLoad && <DashboardNotice />}

      <CreateCampaignModal
        open={showCreateCampaignModal}
        form={campaignForm}
        creating={creatingCampaign}
        onClose={closeCampaignCreate}
        onChange={updateCampaignForm}
        onToggleClass={toggleCampaignClass}
        onSubmit={handleCreateCampaign}
      />
    </main>
  );
}
