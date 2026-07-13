import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import apiClient from '@/lib/apiClient';
import {
  User, Mail, Lock, ArrowLeft, Save, Trash2, Shield,
  AlertTriangle, CheckCircle, Eye, EyeOff, RefreshCw
} from 'lucide-react';

function AccountSettings({ username, onLogout, onUsernameChange }) {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingAction, setSavingAction] = useState('');

  const [newUsername, setNewUsername] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  const saving = Boolean(savingAction);
  const profileSaving = savingAction === 'profile';
  const passwordSaving = savingAction === 'password';
  const deleteSaving = savingAction === 'delete';
  const profileEmail = profile?.email || '';
  const profileChanged = useMemo(() => newEmail.trim() !== profileEmail, [newEmail, profileEmail]);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/account/profile');
      setProfile(response.data);
      setNewUsername(response.data.username || username || '');
      setNewEmail(response.data.email || '');
    } catch (error) {
      toast.error(error?.formattedDetail || error?.response?.data?.detail || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();

    const updates = {};
    if (newEmail.trim() !== profileEmail) updates.email = newEmail.trim();

    if (Object.keys(updates).length === 0) {
      toast.info('No changes to save');
      return;
    }

    setSavingAction('profile');
    try {
      const response = await apiClient.put('/account/update', updates);
      const nextProfile = {
        ...profile,
        username: response.data.username || profile?.username || newUsername,
        email: response.data.email || '',
      };
      setProfile(nextProfile);
      setNewEmail(nextProfile.email || '');
      if (response.data.username && response.data.username !== username) onUsernameChange?.(response.data.username);
      toast.success('Profile updated successfully!');
    } catch (error) {
      toast.error(error?.formattedDetail || error?.response?.data?.detail || 'Failed to update profile');
    } finally {
      setSavingAction('');
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

    setSavingAction('password');
    try {
      await apiClient.post('/account/change-password', {
        current_password: currentPassword,
        new_password: newPassword,
      });

      toast.success('Password changed successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowCurrentPassword(false);
      setShowNewPassword(false);
    } catch (error) {
      toast.error(error?.formattedDetail || error?.response?.data?.detail || 'Failed to change password');
    } finally {
      setSavingAction('');
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') {
      toast.error('Please type DELETE to confirm');
      return;
    }

    setSavingAction('delete');
    try {
      await apiClient.delete('/account/delete');
      toast.success('Account deleted. Farewell, adventurer!');
      onLogout();
      navigate('/');
    } catch (error) {
      toast.error(error?.formattedDetail || error?.response?.data?.detail || 'Failed to delete account');
      setSavingAction('');
    }
  };

  if (loading) return <AccountSettingsLoading />;

  return (
    <div className="account-settings-page" style={pageStyle} aria-busy={saving ? 'true' : 'false'}>
      <div className="account-settings-container" style={containerStyle}>
        <div className="account-settings-header" style={headerStyle}>
          <Button onClick={() => navigate('/home')} className="btn-outline account-settings-back" style={backButtonStyle} data-testid="back-btn" disabled={saving}>
            <ArrowLeft size={18} />
          </Button>
          <div>
            <h1 style={pageTitleStyle}>Account Settings</h1>
            <p style={pageSubtitleStyle}>Manage your profile, password, and account safety.</p>
          </div>
        </div>

        <section className="account-settings-panel" style={panelStyle} aria-busy={profileSaving ? 'true' : 'false'}>
          <SectionHeader icon={User} title="Profile Information" />
          <form onSubmit={handleUpdateProfile}>
            <div style={{ display: 'grid', gap: '20px' }}>
              <FieldLabel icon={User} text="Username" />
              <Input type="text" value={newUsername} disabled readOnly placeholder="Username" data-testid="profile-username" />
              <p style={helpTextStyle}>Username changes are paused for now so campaign, character, handout, and private playtest records stay safely linked to the account.</p>

              <FieldLabel icon={Mail} text="Recovery Email (optional)" />
              <Input type="email" value={newEmail} disabled={saving} onChange={(e) => setNewEmail(e.target.value)} placeholder="parent-or-guardian@email.com" data-testid="profile-email" />
              <p style={helpTextStyle}>Existing accounts can keep using their original email to sign in. New accounts can leave this blank unless they want password recovery.</p>

              <Button type="submit" disabled={saving || !profileChanged} className="btn-primary account-settings-primary" style={busyButtonStyle(profileSaving, !profileChanged)} data-testid="save-profile-btn">
                {profileSaving ? <RefreshCw size={16} style={spinStyle} /> : <Save size={16} />}
                {profileSaving ? 'Saving profile…' : profileChanged ? 'Save profile changes' : 'Profile up to date'}
              </Button>
            </div>
          </form>
        </section>

        <section className="account-settings-panel" style={panelStyle} aria-busy={passwordSaving ? 'true' : 'false'}>
          <SectionHeader icon={Shield} title="Change Password" />
          <form onSubmit={handleChangePassword}>
            <div style={{ display: 'grid', gap: '20px' }}>
              <div>
                <FieldLabel icon={Lock} text="Current Password" />
                <PasswordInput value={currentPassword} setValue={setCurrentPassword} show={showCurrentPassword} setShow={setShowCurrentPassword} placeholder="Enter current password" testId="current-password" disabled={saving} />
              </div>

              <div>
                <FieldLabel icon={Lock} text="New Password" />
                <PasswordInput value={newPassword} setValue={setNewPassword} show={showNewPassword} setShow={setShowNewPassword} placeholder="Enter new password (min. 6 characters)" testId="new-password" disabled={saving} />
              </div>

              <div>
                <FieldLabel icon={CheckCircle} text="Confirm New Password" />
                <Input type="password" value={confirmPassword} disabled={saving} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm new password" data-testid="confirm-password" />
                {newPassword && confirmPassword && (
                  <div style={{ marginTop: '8px', fontSize: '12px', color: newPassword === confirmPassword ? 'var(--rq-success, #2E8B57)' : 'var(--rq-danger, #C1121F)', fontWeight: 800 }}>
                    {newPassword === confirmPassword ? '✓ Passwords match' : '✗ Passwords do not match'}
                  </div>
                )}
              </div>

              <Button type="submit" disabled={saving || !currentPassword || !newPassword || newPassword !== confirmPassword} className="btn-primary account-settings-primary" style={busyButtonStyle(passwordSaving)} data-testid="change-password-btn">
                {passwordSaving ? <RefreshCw size={16} style={spinStyle} /> : <Lock size={16} />}
                {passwordSaving ? 'Changing password…' : 'Change Password'}
              </Button>
            </div>
          </form>
        </section>

        <section className="account-settings-panel account-settings-danger" style={dangerPanelStyle} aria-busy={deleteSaving ? 'true' : 'false'}>
          <SectionHeader icon={AlertTriangle} title="Danger Zone" danger />
          <p style={dangerTextStyle}>
            Once you delete your account, there is no going back. All your campaigns, characters, and data will be permanently removed. Please be certain.
          </p>

          {!showDeleteConfirm ? (
            <Button onClick={() => setShowDeleteConfirm(true)} disabled={saving} className="account-settings-danger-button" style={dangerButtonStyle} data-testid="delete-account-btn">
              <Trash2 size={16} style={{ marginRight: '8px' }} />
              Delete Account
            </Button>
          ) : (
            <div style={confirmBoxStyle}>
              <p style={{ color: 'var(--rq-danger, #C1121F)', marginBottom: '12px', fontWeight: 900 }}>
                Type "DELETE" to confirm:
              </p>
              <Input type="text" value={deleteConfirmText} disabled={saving} onChange={(e) => setDeleteConfirmText(e.target.value.toUpperCase())} placeholder="Type DELETE" style={{ marginBottom: '12px' }} data-testid="delete-confirm-input" />
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <Button onClick={handleDeleteAccount} disabled={saving || deleteConfirmText !== 'DELETE'} className="account-settings-danger-button" style={busyDeleteButtonStyle(deleteSaving)} data-testid="confirm-delete-btn">
                  {deleteSaving ? <RefreshCw size={16} style={spinStyle} /> : <Trash2 size={16} />}
                  {deleteSaving ? 'Deleting account…' : 'Permanently Delete'}
                </Button>
                <Button onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText(''); }} disabled={saving} className="btn-outline">
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </section>
      </div>
      <style>{accountSettingsCss}</style>
    </div>
  );
}

function AccountSettingsLoading() {
  return (
    <main className="loading-screen account-settings-loading" role="status" aria-live="polite" aria-busy="true">
      <section className="loading-card" aria-label="Account settings are loading">
        <div className="loading-brand-mark" aria-hidden="true">AC</div>
        <div className="loading-spinner" aria-hidden="true" />
        <p className="loading-kicker">Account settings</p>
        <h1 className="loading-title">Opening your account vault…</h1>
        <p className="loading-tip">Checking profile details, recovery email, and account safety controls.</p>
      </section>
    </main>
  );
}

function SectionHeader({ icon: Icon, title, danger = false }) {
  return (
    <div style={sectionHeaderStyle}>
      <Icon size={24} color={danger ? 'var(--rq-danger, #C1121F)' : 'var(--rq-accent-primary, #C1121F)'} />
      <h2 style={{ ...sectionTitleStyle, color: danger ? 'var(--rq-danger, #C1121F)' : 'var(--rq-text-primary, #FFFFFF)' }}>{title}</h2>
    </div>
  );
}

function FieldLabel({ icon: Icon, text }) {
  return (
    <label style={labelStyle}>
      <Icon size={14} />
      {text}
    </label>
  );
}

function PasswordInput({ value, setValue, show, setShow, placeholder, testId, disabled = false }) {
  return (
    <div className="account-password-wrap" style={{ position: 'relative' }}>
      <Input type={show ? 'text' : 'password'} value={value} disabled={disabled} onChange={(e) => setValue(e.target.value)} placeholder={placeholder} data-testid={testId} />
      <button type="button" onClick={() => setShow(!show)} disabled={disabled} className="account-password-toggle" style={eyeButtonStyle} aria-label={show ? 'Hide password' : 'Show password'}>
        {show ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
}

const pageStyle = { minHeight: '100vh', background: 'var(--rq-bg-main, #1A1A1A)', padding: '20px' };
const containerStyle = { maxWidth: '800px', margin: '0 auto' };
const headerStyle = { display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' };
const backButtonStyle = { padding: '8px 16px', borderRadius: 'var(--rq-radius-sm, 4px)' };
const pageTitleStyle = { fontSize: '28px', fontWeight: 900, color: 'var(--rq-text-primary, #FFFFFF)', fontFamily: "'Montserrat', sans-serif", margin: 0 };
const pageSubtitleStyle = { color: 'var(--rq-text-muted, #A0A0A0)', fontSize: '14px', margin: '6px 0 0' };
const panelStyle = { background: 'var(--rq-bg-panel, #242424)', border: '1px solid var(--rq-accent-border, rgba(193,18,31,0.35))', borderRadius: 'var(--rq-radius-md, 6px)', padding: '24px', marginBottom: '24px', boxShadow: 'var(--rq-shadow-panel, 0 4px 14px rgba(0,0,0,0.22))' };
const sectionHeaderStyle = { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' };
const sectionTitleStyle = { fontSize: '20px', fontWeight: 900, fontFamily: "'Montserrat', sans-serif", margin: 0 };
const labelStyle = { color: 'var(--rq-text-secondary, #D6D6D6)', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', fontWeight: 800 };
const helpTextStyle = { margin: '-10px 0 0', color: 'var(--rq-text-muted, #A8A8A8)', fontSize: '13px', lineHeight: 1.45 };
const buttonFitStyle = { width: 'fit-content', borderRadius: 'var(--rq-radius-sm, 4px)', display: 'inline-flex', alignItems: 'center', gap: 8 };
const eyeButtonStyle = { position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--rq-text-muted, #A0A0A0)', cursor: 'pointer' };
const dangerPanelStyle = { ...panelStyle, background: 'var(--rq-accent-soft, rgba(193,18,31,0.12))', border: '1px solid var(--rq-accent-border, rgba(193,18,31,0.35))' };
const dangerTextStyle = { color: 'var(--rq-text-secondary, #D6D6D6)', marginBottom: '16px', fontSize: '14px', lineHeight: 1.55 };
const dangerButtonStyle = { background: 'transparent', border: '1px solid var(--rq-danger, #C1121F)', color: 'var(--rq-danger, #C1121F)', borderRadius: 'var(--rq-radius-sm, 4px)' };
const confirmBoxStyle = { background: 'rgba(0, 0, 0, 0.3)', padding: '20px', borderRadius: 'var(--rq-radius-sm, 4px)', border: '1px solid var(--rq-accent-border, rgba(193,18,31,0.35))' };
const confirmDeleteButtonStyle = { background: 'var(--rq-danger, #C1121F)', border: 'none', color: 'white', borderRadius: 'var(--rq-radius-sm, 4px)', display: 'inline-flex', alignItems: 'center', gap: 8 };
const spinStyle = { animation: 'rqAccountSettingsSpin 0.9s linear infinite' };
const accountSettingsCss = `
  @keyframes rqAccountSettingsSpin { to { transform: rotate(360deg); } }
  @media (prefers-reduced-motion: reduce) {
    .account-settings-page svg { animation: none !important; }
  }
`;

function busyButtonStyle(isBusy, isQuiet = false) {
  return { ...buttonFitStyle, opacity: isBusy || isQuiet ? 0.72 : 1, cursor: isBusy ? 'progress' : isQuiet ? 'not-allowed' : 'pointer' };
}

function busyDeleteButtonStyle(isBusy) {
  return { ...confirmDeleteButtonStyle, opacity: isBusy ? 0.78 : 1, cursor: isBusy ? 'progress' : 'pointer' };
}

export default AccountSettings;
