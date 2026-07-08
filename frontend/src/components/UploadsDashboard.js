import { Link } from 'react-router-dom';
import { Archive, BookOpen, CheckCircle2, FileText, FileUp, Map, ShieldCheck, Sparkles, UploadCloud, Wand2 } from 'lucide-react';

const uploadOptions = [
  {
    title: 'Campaign documents',
    text: 'Notes, PDFs, summaries, session plans, lore documents, and world files.',
    icon: FileText,
    status: 'Prep ready',
  },
  {
    title: 'Maps and images',
    text: 'Battle maps, location art, NPC portraits, item images, clues, and visual references.',
    icon: Map,
    status: 'Visual assets',
  },
  {
    title: 'Homebrew data',
    text: 'Classes, species, backgrounds, magic items, monsters, NPCs, and custom rules.',
    icon: Wand2,
    status: 'Rook parser',
  },
];

const acceptedFiles = [
  'Images: PNG, JPG, WEBP',
  'Documents: PDF, DOCX, TXT, MD',
  'Character sheets: JSON, TXT, MD, PDF, or image uploads',
  'Homebrew imports: class, species, item, spell, monster, NPC, or rule notes',
];

const uploadRoutes = [
  {
    label: 'Character import',
    title: 'Bring in an existing sheet',
    text: 'Use the player-side import route for JSON, text, PDF, or image-based character references.',
    to: '/characters/import',
    icon: FileUp,
    cta: 'Import Character',
  },
  {
    label: 'Homebrew parser',
    title: 'Turn rough rules into structured content',
    text: 'Send subclasses, feats, spells, items, monsters, NPCs, and custom table rules through Rook.',
    to: '/homebrew',
    icon: Wand2,
    cta: 'Open Workshop',
  },
  {
    label: 'Campaign prep',
    title: 'Attach assets to your table workflow',
    text: 'Keep maps, handouts, clues, and lore ready to connect into campaigns and live play screens.',
    to: '/campaigns',
    icon: BookOpen,
    cta: 'My Campaigns',
  },
];

const uploadChecklist = [
  'Keep player-facing files clear and table-safe.',
  'Use campaign names in filenames so assets are easy to find later.',
  'Send homebrew rules through the Workshop before wiring them into sheets.',
];

export default function UploadsDashboard() {
  return (
    <main className="uploads-dashboard-page">
      <section className="uploads-dashboard-hero">
        <div>
          <p className="uploads-dashboard-eyebrow">Asset library</p>
          <h1>Your file library.</h1>
          <p>
            Upload campaign files, maps, images, character sheets, handouts, and homebrew notes before attaching them to campaigns, characters, or your homebrew builder.
          </p>
        </div>
        <div className="uploads-dashboard-hero-card" aria-label="Upload readiness">
          <Sparkles size={22} aria-hidden="true" />
          <strong>Ready for table prep</strong>
          <span>Character import, homebrew parsing, and campaign assets now have clearer routes.</span>
        </div>
      </section>

      <section className="uploads-dashboard-dropzone" aria-label="Upload files">
        <UploadCloud size={38} aria-hidden="true" />
        <div>
          <p className="uploads-dashboard-eyebrow">Choose the right route</p>
          <h2>Send files into the right player tool</h2>
          <p>Character sheets now have a player-side import/free-build route. Homebrew notes still go through the Homebrew Workshop parser and editor.</p>
        </div>
        <div className="uploads-dashboard-action-row">
          <Link to="/characters/import" className="library-page-button library-page-button-primary">
            <FileUp size={16} />
            Import Character
          </Link>
          <Link to="/homebrew" className="library-page-button-secondary">
            <Wand2 size={16} />
            Homebrew Workshop
          </Link>
        </div>
      </section>

      <section className="uploads-dashboard-route-grid" aria-label="Recommended upload routes">
        {uploadRoutes.map((route) => {
          const Icon = route.icon;
          return (
            <Link key={route.title} to={route.to} className="uploads-dashboard-route-card">
              <span className="uploads-dashboard-route-icon" aria-hidden="true"><Icon size={20} /></span>
              <span className="uploads-dashboard-route-label">{route.label}</span>
              <strong>{route.title}</strong>
              <span>{route.text}</span>
              <em>{route.cta}</em>
            </Link>
          );
        })}
      </section>

      <section className="uploads-dashboard-grid" aria-label="Upload areas">
        {uploadOptions.map((option) => {
          const Icon = option.icon;

          return (
            <article key={option.title} className="uploads-dashboard-card">
              <Icon size={22} aria-hidden="true" />
              <div>
                <span className="uploads-dashboard-card-status">{option.status}</span>
                <h2>{option.title}</h2>
                <p>{option.text}</p>
              </div>
            </article>
          );
        })}
      </section>

      <section className="uploads-dashboard-next">
        <FileText size={22} aria-hidden="true" />
        <div>
          <h2>What uploads should support</h2>
          <ul>
            {acceptedFiles.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="uploads-dashboard-safety-grid" aria-label="Upload safety and workflow notes">
        <article>
          <ShieldCheck size={22} aria-hidden="true" />
          <h2>Table-safe asset flow</h2>
          <p>Uploads should eventually know whether an asset is private, campaign-visible, or ready for player display.</p>
        </article>
        <article>
          <Archive size={22} aria-hidden="true" />
          <h2>Future library controls</h2>
          <p>Next step is saved asset lists with filters, tags, campaign links, and quick attach buttons.</p>
        </article>
        <article>
          <CheckCircle2 size={22} aria-hidden="true" />
          <h2>Prep checklist</h2>
          <ul>
            {uploadChecklist.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </article>
      </section>
    </main>
  );
}
