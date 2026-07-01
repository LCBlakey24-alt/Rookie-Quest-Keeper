import { FileText, Image, Map, UploadCloud } from 'lucide-react';

const uploadOptions = [
  {
    title: 'Campaign files',
    text: 'Prepare a place for Tia Karta campaign notes, PDFs, summaries, and world documents.',
    icon: FileText,
  },
  {
    title: 'Maps and images',
    text: 'Collect maps, NPC art, battle images, and session visuals before linking them into a campaign.',
    icon: Map,
  },
  {
    title: 'Handouts',
    text: 'Stage player-facing clues, letters, images, and lore drops ready for GM handout tools.',
    icon: Image,
  },
];

export default function UploadsDashboard() {
  return (
    <main className="uploads-dashboard-page">
      <section className="uploads-dashboard-hero">
        <p className="uploads-dashboard-eyebrow">Upload hub</p>
        <h1>Bring campaign material into Rookie Quest Keeper.</h1>
        <p>
          This is the first app-shell landing page for future uploads. It gives the left rail a real Upload section while the actual file import flow is built next.
        </p>
      </section>

      <section className="uploads-dashboard-grid" aria-label="Upload areas">
        {uploadOptions.map((option) => {
          const Icon = option.icon;

          return (
            <article key={option.title} className="uploads-dashboard-card">
              <Icon size={22} aria-hidden="true" />
              <div>
                <h2>{option.title}</h2>
                <p>{option.text}</p>
              </div>
            </article>
          );
        })}
      </section>

      <section className="uploads-dashboard-next">
        <UploadCloud size={22} aria-hidden="true" />
        <div>
          <h2>Next build step</h2>
          <p>
            Add drag-and-drop upload, campaign selection, file type tagging, and a review step before anything is saved into a campaign.
          </p>
        </div>
      </section>
    </main>
  );
}
