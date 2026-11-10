
import { Link } from 'react-router-dom';
import { Globe2, ShieldCheck, ArrowLeft } from 'lucide-react';

export default function CommunityCreationsPreview() {
  return (
    <main className="library-page" style={{ width: 'min(100%, 1020px)', margin: '0 auto', padding: 'clamp(16px, 3vw, 30px)', color: '#f6f8fa' }}>
      <section style={{ background: '#10283e', border: '1px solid #39546e', borderRadius: 12, padding: 'clamp(20px, 4vw, 34px)', display: 'grid', gap: 18 }}>
        <Globe2 size={35} color="#ff9c44" aria-hidden="true" />
        <div>
          <p style={{ color: '#ffb67a', fontSize: 11, fontWeight: 800, letterSpacing: '.1em' }}>COMING SOON</p>
          <h1 style={{ color: '#fff', fontSize: 'clamp(27px, 4vw, 38px)', margin: '5px 0 10px' }}>Community Creations</h1>
          <p style={{ color: '#c8d9e5', lineHeight: 1.6 }}>A home for original, user-shared homebrew, downloads and community voting. The public gallery, moderation and upvotes are still being built.</p>
        </div>
        <p style={{ display: 'flex', alignItems: 'center', gap: 9, color: '#b8ccdb', fontSize: 13 }}><ShieldCheck size={18} color="#ff9c44" /> Your private creations are never published automatically.</p>
        <Link to="/home" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, width: 'fit-content', color: '#ffb67a' }}><ArrowLeft size={17} /> Back to Home</Link>
      </section>
    </main>
  );
}
