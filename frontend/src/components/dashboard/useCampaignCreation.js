import { useState } from 'react';
import { toast } from 'sonner';

import apiClient from '@/lib/apiClient';
import { defaultCampaignForm } from './dashboardConfig';

export default function useCampaignCreation({ siteSettings, navigate }) {
  const [showCreateCampaignModal, setShowCreateCampaignModal] = useState(false);
  const [campaignForm, setCampaignForm] = useState(defaultCampaignForm);
  const [creatingCampaign, setCreatingCampaign] = useState(false);

  const createCharacter = () => {
    if (siteSettings.character_creation_enabled === false) {
      toast.error('Character creation is currently disabled');
      return;
    }
    navigate('/characters/new');
  };

  const openCampaignCreate = () => {
    if (siteSettings.campaign_creation_enabled === false) {
      toast.error('Campaign creation is currently disabled');
      return;
    }
    setShowCreateCampaignModal(true);
  };

  const closeCampaignCreate = () => setShowCreateCampaignModal(false);

  const updateCampaignForm = (field, value) => setCampaignForm(prev => ({ ...prev, [field]: value }));

  const toggleCampaignClass = (className) => {
    setCampaignForm(prev => {
      const current = new Set(prev.available_classes || []);
      if (current.has(className)) current.delete(className);
      else current.add(className);
      return { ...prev, available_classes: Array.from(current) };
    });
  };

  const handleCreateCampaign = async (event) => {
    event.preventDefault();
    if (!campaignForm.name.trim()) {
      toast.error('Campaign name is required');
      return;
    }

    try {
      setCreatingCampaign(true);
      const payload = {
        ...campaignForm,
        name: campaignForm.name.trim(),
        description: campaignForm.description.trim(),
        world_name: campaignForm.world_name.trim(),
        system: campaignForm.rules_edition === '2024' ? '5e 2024 Compatible' : '5e 2014 Compatible',
        max_character_level: campaignForm.allow_epic_levels ? Number(campaignForm.max_character_level) || 20 : 20,
      };
      const response = await apiClient.post('/campaigns', payload);
      toast.success('Campaign created');
      setShowCreateCampaignModal(false);
      setCampaignForm(defaultCampaignForm);
      navigate(`/campaign/${response.data.id}`);
    } catch (error) {
      toast.error(error?.formattedDetail || error?.response?.data?.detail || 'Failed to create campaign');
    } finally {
      setCreatingCampaign(false);
    }
  };

  return {
    showCreateCampaignModal,
    campaignForm,
    creatingCampaign,
    createCharacter,
    openCampaignCreate,
    closeCampaignCreate,
    updateCampaignForm,
    toggleCampaignClass,
    handleCreateCampaign,
  };
}
