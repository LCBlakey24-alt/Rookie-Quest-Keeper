import { Sparkles } from 'lucide-react';
import '../AuthDemoAccess.css';

export default function ReadOnlyDemoAccess() {
  return (
    <section className="rqk-demo-access" aria-label="Read-only demo account">
      <div className="rqk-demo-access__copy">
        <span className="rqk-demo-access__eyebrow">No account needed</span>
        <strong>Explore the demo first</strong>
        <p>
          Open sample characters, campaigns, player tools, and GM pages without signing in.
          Demo Mode is read-only, so nothing can be saved, edited, or deleted.
        </p>
      </div>
      <a className="rqk-demo-access__button" href="/home?demo=1" data-testid="demo-access-btn">
        <Sparkles size={16} aria-hidden="true" />
        <span>Explore read-only demo</span>
      </a>
    </section>
  );
}
