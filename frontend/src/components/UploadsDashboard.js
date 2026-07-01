import { FileText, FileUp, Image, Map, UploadCloud } from 'lucide-react';

const uploadOptions = [
  {
    title: 'Campaign documents',
    text: 'Notes, PDFs, summaries, session plans, lore documents, and world files.',
    icon: FileText,
  },
  {
    title: 'Maps and images',
    text: 'Battle maps, location art, NPC portraits, item images, clues, and visual references.',
    icon: Map,
  },
  {
    title: 'Homebrew data',
    text: 'Classes, species, backgrounds, magic items, monsters, NPCs, and custom rules.',
    icon: Image,
  },
];

const acceptedFiles = [
  'Images: PNG, JPG, WEBP',
  'Documents: PDF, DOCX, TXT, MD',
  'Character sheets: PDF or image uploads',
  'Homebrew imports: class, species, item, spell, monster, NPC, or rule notes',
];

export default function UploadsDashboard() {
  return (
    <main className="uploads-dashboard-page">
      <section className="uploads-dashboard-hero">
        <div>
          <p className="uploads-dashboard-eyebrow">Upload</p>
          <h1>Your file library.</h1>
          <p>
            Upload campaign files, maps, images, character sheets, handouts, and homebrew notes before attaching them to campaigns, characters, or your homebrew builder.
          </p>
        </div>
      </section>

      <section className="uploads-dashboard-dropzone" aria-label="Upload files">
        <UploadCloud size={34} aria-hidden="true" />
        <div>
          <h2>Drop files here</h2>
          <p>Drag-and-drop upload will live here. For now this page is the cleaned upload hub and file flow plan.</p>
        </div>
        <button type="button" disabled>
          <FileUp size={16} />
          Upload coming soon
        </button>
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
    </main>
  );
}
