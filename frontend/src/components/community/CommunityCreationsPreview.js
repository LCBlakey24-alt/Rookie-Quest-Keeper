
import { Link } from 'react-router-dom';
import { Globe2, ShieldCheck, ArrowLeft } from 'lucide-react';
import '@/styles/guildTokens.css';
import '@/styles/homebrewGuild.css';

export default function CommunityCreationsPreview() {
  return (
    <main className="library-page community-preview" style={{ width: 'min(100%, 1020px)', margin: '0 auto', padding: 'clamp(16px, 3vw, 30px)', color: 'var(--guild-text)' }}>
      <section className="hb-panel" style={{ borderRadius: 16, padding: 'clamp(20px, 4vw, 34px)', display: 'grid', gap: 18 }}>
        <Globe2 size={35} color="var(--guild-hi)" aria-hidden="true" />
        <div>
          <p style={{ color: 'var(--guild-hi)', fontSize: 11, fontWeight: 800, letterSpacing: '.1em' }}>COMING SOON</p>
          <h1 className="hb-title" style={{ fontSize: 'clamp(27px, 4vw, 38px)', margin: '5px 0 10px' }}>Community Creations</h1>
          <p style={{ color: 'var(--guild-muted)', lineHeight: 1.6 }}>A home for original, user-shared homebrew, downloads and community voting. The public gallery, moderation and upvotes are still being built.</p>
        </div>
        <p style={{ display: 'flex', alignItems: 'center', gap: 9, color: 'var(--guild-muted)', fontSize: 13 }}><ShieldCheck size={18} color="var(--guild-hi)" /> Your private creations are never published automatically.</p>
        <Link to="/home" className="hb-back" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, width: 'fit-content', color: 'var(--guild-hi)' }}><ArrowLeft size={17} /> Back to Home</Link>
      </section>
    </main>
  );
}
