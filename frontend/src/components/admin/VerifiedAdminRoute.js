import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import apiClient from '@/lib/apiClient';

// The server is authoritative. Merely guessing /admin or modifying browser
// storage must never grant admin access to this route.
export default function VerifiedAdminRoute({ children }) {
  const [access, setAccess] = useState('checking');
  useEffect(() => {
    let active = true;
    apiClient.get('/admin/check')
      .then((response) => {
        if (active) setAccess(response.data?.is_admin === true ? 'allowed' : 'denied');
      })
      .catch(() => { if (active) setAccess('denied'); });
    return () => { active = false; };
  }, []);

  if (access === 'checking') return <main role="status" className="rqk-admin-checking">Checking admin access…</main>;
  if (access === 'denied') return <Navigate to="/home" replace />;
  return children;
}
