import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  User, Mail, Lock, ArrowLeft, Save, Trash2, Shield, 
  AlertTriangle, CheckCircle, Eye, EyeOff, Share2, Edit3, Copy, Check
} from 'lucide-react';
import { API_BASE } from '@/lib/api';

const API = API_BASE;

function AccountSettings({ username, onLogout, onUsernameChange }) {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Form states
  const [newUsername, setNewUsername] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  
  // Referral code states
  const [editingReferral, setEditingReferral] = useState(false);
  const [newReferralCode, setNewReferralCode] = useState('');
  const [savingReferral, setSavingReferral] = useState(false);
  const [copiedReferral, setCopiedReferral] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await axios.get(`${API}/account/profile`);
      setProfile(response.data);
      setNewUsername(response.data.username);
      setNewEmail(response.data.email);
    } catch (error) {
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      const updates = {};
      if (newUsername !== profile.username) updates.username = newUsername;
      if (newEmail !== profile.email) updates.email = newEmail;
      
      if (Object.keys(updates).length === 0) {
        toast.info('No changes to save');
        setSaving(false);
        return;
      }
      
      const response = await axios.put(`${API}/account/update`, updates);
      
      // Update local storage and state if username changed
      if (response.data.username !== username) {
        localStorage.setItem('dm_username', response.data.username);
        localStorage.setItem('dm_token', response.data.token);
        onUsernameChange(response.data.username);
      }
      
      setProfile({
        ...profile,
        username: response.data.username,
        email: response.data.email
      });
      
      toast.success('Profile updated successfully!');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveReferralCode = async () => {
    if (!newReferralCode.trim()) {
      toast.error('Please enter a referral code');
      return;
    }
    
    setSavingReferral(true);
    try {
      const response = await axios.put(`${API}/referral/code`, {
        new_code: newReferralCode.trim()
      });
      
      // Update profile with new code
      setProfile({
        ...profile,
        subscription: {
          ...profile.subscription,
          referral_code: response.data.referral_code
        }
      });
      
      setEditingReferral(false);
      setNewReferralCode('');
      toast.success('Referral code updated!');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update referral code');
    } finally {
      setSavingReferral(false);
    }
  };

  const copyReferralCode = () => {
    const code = profile?.subscription?.referral_code;
    if (code) {
      navigator.clipboard.writeText(code);
      setCopiedReferral(true);
      toast.success('Referral code copied!');
      setTimeout(() => setCopiedReferral(false), 2000);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    
    if (!currentPassword || !newPassword) {
      toast.error('Please fill in all password fields');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    
    setSaving(true);
    try {
      await axios.post(`${API}/account/change-password`, {
        current_password: currentPassword,
        new_password: newPassword
      });
      
      toast.success('Password changed successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to change password');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') {
      toast.error('Please type DELETE to confirm');
      return;
    }
    
    setSaving(true);
    try {
      await axios.delete(`${API}/account/delete`);
      toast.success('Account deleted. Farewell, adventurer!');
      onLogout();
      navigate('/');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete account');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #030014 0%, #0a0a2e 50%, #030014 100%)',
      padding: '20px'
    }}>
      <div style={{
        maxWidth: '800px',
        margin: '0 auto'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          marginBottom: '32px'
        }}>
          <Button
            onClick={() => navigate('/home')}
            className="btn-outline"
            style={{ padding: '8px 16px' }}
            data-testid="back-btn"
          >
            <ArrowLeft size={18} />
          </Button>
          <h1 style={{
            fontSize: '28px',
            fontWeight: '800',
            color: '#ffffff',
            fontFamily: "Eros Book, sans-serif"
          }}>
            Account Settings
          </h1>
        </div>

        {/* Profile Section */}
        <div className="glow-panel" style={{ padding: '24px', marginBottom: '24px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '24px'
          }}>
            <User size={24} className="text-teal-400" />
            <h2 style={{
              fontSize: '20px',
              fontWeight: '400',
              color: '#ffffff',
              fontFamily: "Eros Book, sans-serif"
            }}>
              Profile Information
            </h2>
          </div>

          <form onSubmit={handleUpdateProfile}>
            <div style={{ display: 'grid', gap: '20px' }}>
              <div>
                <label style={{ 
                  color: '#94a3b8', 
                  fontSize: '13px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '6px',
                  marginBottom: '8px' 
                }}>
                  <User size={14} />
                  Display Name
                </label>
                <Input
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="Your display name"
                  data-testid="profile-username"
                />
              </div>

              <div>
                <label style={{ 
                  color: '#94a3b8', 
                  fontSize: '13px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '6px',
                  marginBottom: '8px' 
                }}>
                  <Mail size={14} />
                  Email Address
                </label>
                <Input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="your@email.com"
                  data-testid="profile-email"
                />
              </div>

              <Button
                type="submit"
                disabled={saving}
                className="btn-primary"
                style={{ width: 'fit-content' }}
                data-testid="save-profile-btn"
              >
                <Save size={16} style={{ marginRight: '8px' }} />
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </div>

        {/* Password Section */}
        <div className="glow-panel" style={{ padding: '24px', marginBottom: '24px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '24px'
          }}>
            <Shield size={24} className="text-teal-400" />
            <h2 style={{
              fontSize: '20px',
              fontWeight: '400',
              color: '#ffffff',
              fontFamily: "Eros Book, sans-serif"
            }}>
              Change Password
            </h2>
          </div>

          <form onSubmit={handleChangePassword}>
            <div style={{ display: 'grid', gap: '20px' }}>
              <div>
                <label style={{ 
                  color: '#94a3b8', 
                  fontSize: '13px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '6px',
                  marginBottom: '8px' 
                }}>
                  <Lock size={14} />
                  Current Password
                </label>
                <div style={{ position: 'relative' }}>
                  <Input
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    data-testid="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: '#64748b',
                      cursor: 'pointer'
                    }}
                  >
                    {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div>
                <label style={{ 
                  color: '#94a3b8', 
                  fontSize: '13px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '6px',
                  marginBottom: '8px' 
                }}>
                  <Lock size={14} />
                  New Password
                </label>
                <div style={{ position: 'relative' }}>
                  <Input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password (min. 6 characters)"
                    data-testid="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: '#64748b',
                      cursor: 'pointer'
                    }}
                  >
                    {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div>
                <label style={{ 
                  color: '#94a3b8', 
                  fontSize: '13px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '6px',
                  marginBottom: '8px' 
                }}>
                  <CheckCircle size={14} />
                  Confirm New Password
                </label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  data-testid="confirm-password"
                />
                {newPassword && confirmPassword && (
                  <div style={{
                    marginTop: '8px',
                    fontSize: '12px',
                    color: newPassword === confirmPassword ? '#22c55e' : '#ef4444'
                  }}>
                    {newPassword === confirmPassword ? '✓ Passwords match' : '✗ Passwords do not match'}
                  </div>
                )}
              </div>

              <Button
                type="submit"
                disabled={saving || !currentPassword || !newPassword || newPassword !== confirmPassword}
                className="btn-primary"
                style={{ width: 'fit-content' }}
                data-testid="change-password-btn"
              >
                <Lock size={16} style={{ marginRight: '8px' }} />
                {saving ? 'Changing...' : 'Change Password'}
              </Button>
            </div>
          </form>
        </div>

        {/* Danger Zone */}
        <div style={{
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: '12px',
          padding: '24px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '16px'
          }}>
            <AlertTriangle size={24} color="#ef4444" />
            <h2 style={{
              fontSize: '20px',
              fontWeight: '400',
              color: '#ef4444',
              fontFamily: "Eros Book, sans-serif"
            }}>
              Danger Zone
            </h2>
          </div>

          <p style={{ color: '#94a3b8', marginBottom: '16px', fontSize: '14px' }}>
            Once you delete your account, there is no going back. All your campaigns, 
            characters, and data will be permanently removed. Please be certain.
          </p>

          {!showDeleteConfirm ? (
            <Button
              onClick={() => setShowDeleteConfirm(true)}
              style={{
                background: 'rgba(239, 68, 68, 0.2)',
                border: '1px solid #ef4444',
                color: '#ef4444'
              }}
              data-testid="delete-account-btn"
            >
              <Trash2 size={16} style={{ marginRight: '8px' }} />
              Delete Account
            </Button>
          ) : (
            <div style={{
              background: 'rgba(0, 0, 0, 0.3)',
              padding: '20px',
              borderRadius: '8px'
            }}>
              <p style={{ color: '#ef4444', marginBottom: '12px', fontWeight: '400' }}>
                Type "DELETE" to confirm:
              </p>
              <Input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value.toUpperCase())}
                placeholder="Type DELETE"
                style={{ marginBottom: '12px' }}
                data-testid="delete-confirm-input"
              />
              <div style={{ display: 'flex', gap: '12px' }}>
                <Button
                  onClick={handleDeleteAccount}
                  disabled={saving || deleteConfirmText !== 'DELETE'}
                  style={{
                    background: '#ef4444',
                    border: 'none',
                    color: 'white'
                  }}
                  data-testid="confirm-delete-btn"
                >
                  {saving ? 'Deleting...' : 'Permanently Delete'}
                </Button>
                <Button
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setDeleteConfirmText('');
                  }}
                  className="btn-outline"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Subscription Info */}
        {profile?.subscription && (
          <div className="glow-panel" style={{ padding: '24px', marginTop: '24px' }}>
            <h2 style={{
              fontSize: '20px',
              fontWeight: '400',
              color: '#ffffff',
              fontFamily: "Eros Book, sans-serif",
              marginBottom: '16px'
            }}>
              Subscription
            </h2>
            <div style={{ display: 'grid', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#94a3b8' }}>Current Plan:</span>
                <span style={{ 
                  color: profile.subscription.tier === 'adventurer' ? '#14b8a6' : '#ffffff',
                  fontWeight: '400'
                }}>
                  {profile.subscription.tier === 'adventurer' ? 'Adventurer (Premium)' : 'Free'}
                </span>
              </div>
              
              {/* Customizable Referral Code Section */}
              <div style={{ 
                background: 'rgba(34, 197, 94, 0.1)',
                border: '1px solid rgba(34, 197, 94, 0.3)',
                borderRadius: '12px',
                padding: '16px',
                marginTop: '8px'
              }}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px',
                  marginBottom: '12px'
                }}>
                  <Share2 size={18} style={{ color: '#22c55e' }} />
                  <span style={{ color: '#22c55e', fontWeight: '400', fontSize: '14px' }}>
                    Your Referral Code
                  </span>
                </div>
                
                {editingReferral ? (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <Input
                      value={newReferralCode}
                      onChange={(e) => setNewReferralCode(e.target.value.toUpperCase())}
                      placeholder="Enter custom code..."
                      maxLength={20}
                      data-testid="referral-code-input"
                      style={{
                        flex: 1,
                        background: 'rgba(0, 0, 0, 0.3)',
                        border: '2px solid #22c55e',
                        textTransform: 'uppercase',
                        fontFamily: 'monospace',
                        letterSpacing: '1px'
                      }}
                    />
                    <Button
                      onClick={handleSaveReferralCode}
                      disabled={savingReferral || !newReferralCode.trim()}
                      data-testid="save-referral-btn"
                      style={{
                        background: 'linear-gradient(180deg, #22c55e 0%, #16a34a 100%)',
                        padding: '8px 16px'
                      }}
                    >
                      {savingReferral ? 'Saving...' : 'Save'}
                    </Button>
                    <Button
                      onClick={() => {
                        setEditingReferral(false);
                        setNewReferralCode('');
                      }}
                      variant="outline"
                      style={{ padding: '8px 12px' }}
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ 
                      color: '#22c55e', 
                      fontFamily: 'monospace',
                      fontSize: '18px',
                      fontWeight: '400',
                      letterSpacing: '2px',
                      flex: 1
                    }}>
                      {profile.subscription.referral_code || 'Not set'}
                    </span>
                    <button
                      onClick={copyReferralCode}
                      data-testid="copy-referral-btn"
                      style={{
                        background: 'rgba(34, 197, 94, 0.2)',
                        border: '1px solid #22c55e',
                        borderRadius: '8px',
                        padding: '8px 12px',
                        color: '#22c55e',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '12px'
                      }}
                      title="Copy code"
                    >
                      {copiedReferral ? <Check size={14} /> : <Copy size={14} />}
                      {copiedReferral ? 'Copied!' : 'Copy'}
                    </button>
                    <button
                      onClick={() => {
                        setEditingReferral(true);
                        setNewReferralCode(profile.subscription.referral_code || '');
                      }}
                      data-testid="edit-referral-btn"
                      style={{
                        background: 'rgba(59, 130, 246, 0.2)',
                        border: '1px solid #3b82f6',
                        borderRadius: '8px',
                        padding: '8px 12px',
                        color: '#3b82f6',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '12px'
                      }}
                      title="Customize code"
                    >
                      <Edit3 size={14} />
                      Customize
                    </button>
                  </div>
                )}
                
                <p style={{ 
                  color: '#64748b', 
                  fontSize: '11px', 
                  marginTop: '12px',
                  lineHeight: '1.4'
                }}>
                  Share your code with friends! When they sign up using your code, you both get rewards.
                  Customize it to something memorable like your username or campaign name.
                </p>
                
                {profile.subscription.referral_count > 0 && (
                  <div style={{ 
                    marginTop: '12px',
                    padding: '8px 12px',
                    background: 'rgba(34, 197, 94, 0.15)',
                    borderRadius: '8px',
                    display: 'flex',
                    justifyContent: 'space-between'
                  }}>
                    <span style={{ color: '#94a3b8', fontSize: '12px' }}>Friends referred:</span>
                    <span style={{ color: '#22c55e', fontWeight: '400' }}>
                      {profile.subscription.referral_count}
                    </span>
                  </div>
                )}
              </div>
              
              <Button
                onClick={() => navigate('/pricing')}
                className="btn-secondary"
                style={{ marginTop: '8px' }}
              >
                Manage Subscription
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default AccountSettings;
