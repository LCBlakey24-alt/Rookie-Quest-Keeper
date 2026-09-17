import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Castle,
  Compass,
  Crown,
  Landmark,
  Map,
  ScrollText,
  Sparkles,
  Users,
} from 'lucide-react';
import '@/styles/tiaKartaWorldPage.css';

const SETTING_PILLARS = [
  {
    icon: Landmark,
    label: 'History',
    title: 'A world shaped by old powers',
    copy: 'The Sundering War, the Scions and the legacy of Akara give Tia-Karta a deep past without requiring a GM to memorise an encyclopedia before play.',
  },
  {
    icon: Castle,
    label: 'Places',
    title: 'Kingdoms, settlements and dangerous roads',
    copy: 'Tiamina, Neremore and Fortia are part of a growing location library built to become usable setting pages, maps, encounters and adventure material.',
  },
  {
    icon: Crown,
    label: 'Faith & power',
    title: 'Gods, relics and forgotten claims',
    copy: 'The pantheon, the Forsaken gods, Akara and the Scarab of Akara create threads that can sit quietly in the background or become the centre of a campaign.',
  },
  {
    icon: Users,
    label: 'People',
    title: 'Characters with lives beyond the quest board',
    copy: 'Tia-Karta already has a growing cast of rulers, travellers, scholars, innkeepers and other figures designed to make its places feel inhabited.',
  },
];

const PEOPLE = [
  'Merithera',
  'Aldren',
  'Seraphina',
  'Lucian',
  'Jordan Crow',
  'Godfrey',
  'Edwin',
  'Corvin',
];

const DEVELOPMENT_TRACKS = [
  ['Setting guide', 'The shared world canon: history, regions, cultures, faiths and the information a GM actually needs.'],
  ['Atlas & places', 'World, region and settlement pages with maps, landmarks, travel context and adventure-ready details.'],
  ['People & factions', 'Reusable NPCs and groups presented for fast table use rather than buried inside long lore chapters.'],
  ['Adventures', 'Modules and adventure material that use Tia-Karta without requiring every group to follow one fixed campaign timeline.'],
  ['Table tools', 'GM maps, player maps, rumours, handouts and encounter material, with future Keeper and Forge connections where useful.'],
];

export default function TiaKartaWorldPage() {
  const navigate = useNavigate();

  useEffect(() => {
    const previousTitle = document.title;
    document.title = 'Tia-Karta | Rookie Quest Worlds';
    return () => { document.title = previousTitle; };
  }, []);

  return (
    <div className="rq-tk-page">
      <div className="rq-tk-grid" aria-hidden="true" />

      <nav className="rq-tk-nav" aria-label="Tia-Karta navigation">
        <button className="rq-tk-nav-brand" type="button" onClick={() => navigate('/worlds')}>
          <span className="rq-tk-nav-mark"><Compass size={22} strokeWidth={1.45} /></span>
          <span><strong>Rookie Quest</strong><small>Worlds</small></span>
        </button>
        <div className="rq-tk-nav-center">
          <button type="button" onClick={() => document.getElementById('setting')?.scrollIntoView({ behavior: 'smooth' })}>Setting</button>
          <button type="button" onClick={() => document.getElementById('people')?.scrollIntoView({ behavior: 'smooth' })}>People</button>
          <button type="button" onClick={() => document.getElementById('release-plan')?.scrollIntoView({ behavior: 'smooth' })}>Development</button>
        </div>
        <button className="rq-tk-nav-back" type="button" onClick={() => navigate('/worlds')}>
          <ArrowLeft size={15} /> Back to Worlds
        </button>
      </nav>

      <main>
        <section className="rq-tk-hero">
          <div className="rq-tk-hero-copy">
            <div className="rq-tk-badge"><Sparkles size={14} /> First setting prototype · In development</div>
            <p className="rq-tk-overline">Rookie Quest Worlds presents</p>
            <h1>Tia-Karta</h1>
            <h2>Ancient kingdoms. Forgotten powers. Dangerous secrets.</h2>
            <p className="rq-tk-lead">
              Tia-Karta is the first real setting being shaped for Rookie Quest Worlds. The goal is not to turn an existing campaign notebook into a giant lore dump — it is to turn a living world into material another GM can actually pick up and run.
            </p>
            <div className="rq-tk-hero-actions">
              <button className="rq-tk-button rq-tk-button-primary" type="button" onClick={() => document.getElementById('setting')?.scrollIntoView({ behavior: 'smooth' })}>
                Explore the setting <Compass size={17} />
              </button>
              <button className="rq-tk-button rq-tk-button-secondary" type="button" onClick={() => document.getElementById('release-plan')?.scrollIntoView({ behavior: 'smooth' })}>
                See the build plan <ArrowRight size={17} />
              </button>
            </div>
          </div>

          <div className="rq-tk-hero-map" aria-hidden="true">
            <div className="rq-tk-map-frame">
              <span className="rq-tk-map-north">N</span>
              <div className="rq-tk-map-compass"><Compass size={72} strokeWidth={0.8} /></div>
              <div className="rq-tk-land rq-tk-land-west" />
              <div className="rq-tk-land rq-tk-land-east" />
              <div className="rq-tk-land rq-tk-land-south" />
              <span className="rq-tk-map-place rq-tk-map-place-one">Tiamina</span>
              <span className="rq-tk-map-place rq-tk-map-place-two">Neremore</span>
              <span className="rq-tk-map-place rq-tk-map-place-three">Fortia</span>
              <span className="rq-tk-map-title">TIA-KARTA</span>
            </div>
            <p>Concept atlas treatment · final cartography still to come</p>
          </div>
        </section>

        <section className="rq-tk-quickfacts" aria-label="Tia-Karta overview">
          <div><span>Format</span><strong>Campaign setting</strong></div>
          <div><span>Stage</span><strong>Active development</strong></div>
          <div><span>Built for</span><strong>GM-led fantasy campaigns</strong></div>
          <div><span>First goal</span><strong>Usable setting guide + atlas</strong></div>
        </section>

        <section className="rq-tk-section" id="setting">
          <header className="rq-tk-section-head">
            <p>The setting</p>
            <h2>Deep enough to inspire. Clear enough to use.</h2>
            <span>We are separating shared Tia-Karta canon from the events of individual campaigns, so the published world can support many tables without telling them what their players already did.</span>
          </header>

          <div className="rq-tk-pillar-grid">
            {SETTING_PILLARS.map(({ icon: Icon, label, title, copy }) => (
              <article key={title}>
                <div className="rq-tk-pillar-icon"><Icon size={25} strokeWidth={1.45} /></div>
                <p>{label}</p>
                <h3>{title}</h3>
                <span>{copy}</span>
              </article>
            ))}
          </div>
        </section>

        <section className="rq-tk-history-band">
          <div className="rq-tk-history-copy">
            <p className="rq-tk-overline">Threads already in the world</p>
            <h2>The Sundering War. The Scions. Akara.</h2>
            <p>
              Tia-Karta already has history worth uncovering: Prima, Aevon and Koltoro; Akara and the idea of the Thirteenth Scion; a wider pantheon and its Forsaken gods; and relics such as the Scarab of Akara. Worlds will turn those ideas into clean, navigable setting material rather than assuming the reader knows the original campaign.
            </p>
          </div>
          <div className="rq-tk-history-symbol" aria-hidden="true">
            <div className="rq-tk-scarab">
              <span />
              <i className="rq-tk-scarab-wing rq-tk-scarab-wing-left" />
              <i className="rq-tk-scarab-wing rq-tk-scarab-wing-right" />
            </div>
            <small>Relics can become hooks, not homework.</small>
          </div>
        </section>

        <section className="rq-tk-section rq-tk-people-section" id="people">
          <header className="rq-tk-section-head">
            <p>People of Tia-Karta</p>
            <h2>A world is remembered through the people in it.</h2>
            <span>These are existing names from the setting that can gradually become proper public NPC entries, each with role, location, motivation and quick-use GM information.</span>
          </header>

          <div className="rq-tk-people-grid">
            {PEOPLE.map((person, index) => (
              <article key={person}>
                <span>{String(index + 1).padStart(2, '0')}</span>
                <div className="rq-tk-person-seal"><Users size={20} strokeWidth={1.35} /></div>
                <h3>{person}</h3>
                <p>Setting character · public profile to be developed</p>
              </article>
            ))}
          </div>
        </section>

        <section className="rq-tk-release" id="release-plan">
          <div className="rq-tk-release-intro">
            <p className="rq-tk-overline">How this becomes a product</p>
            <h2>Build the useful version first.</h2>
            <p>
              Rather than pretending Tia-Karta is ready for sale, this page shows the actual shape we are working toward. Each layer should be valuable on its own and stronger when combined with the rest.
            </p>
          </div>

          <div className="rq-tk-release-list">
            {DEVELOPMENT_TRACKS.map(([title, copy], index) => (
              <article key={title}>
                <span>{String(index + 1).padStart(2, '0')}</span>
                <div>
                  <h3>{title}</h3>
                  <p>{copy}</p>
                </div>
                <small>Planned</small>
              </article>
            ))}
          </div>
        </section>

        <section className="rq-tk-format-preview">
          <div className="rq-tk-book-mock" aria-hidden="true">
            <div className="rq-tk-book-cover">
              <Compass size={54} strokeWidth={1} />
              <span>Rookie Quest Worlds</span>
              <strong>TIA-KARTA</strong>
              <small>Campaign Setting</small>
            </div>
            <div className="rq-tk-book-pages" />
          </div>
          <div>
            <p className="rq-tk-overline">The end goal</p>
            <h2>A setting you can read like a book and run like a toolkit.</h2>
            <p>
              The presentation can feel like an old atlas and sourcebook, but the structure underneath should stay practical: fast references, clear maps, drop-in content and strong links between lore and playable material.
            </p>
            <div className="rq-tk-format-tags">
              <span><BookOpen size={15} /> Setting guide</span>
              <span><Map size={15} /> GM & player maps</span>
              <span><ScrollText size={15} /> Adventures</span>
              <span><Users size={15} /> NPC references</span>
            </div>
          </div>
        </section>

        <section className="rq-tk-closing">
          <Compass size={54} strokeWidth={1} />
          <p>Rookie Quest Worlds</p>
          <h2>Tia-Karta is our proving ground.</h2>
          <span>As the format becomes stronger, this page can grow into the first full setting page in the Worlds catalogue.</span>
          <button className="rq-tk-button rq-tk-button-secondary" type="button" onClick={() => navigate('/worlds')}>
            <ArrowLeft size={17} /> Return to Worlds
          </button>
        </section>
      </main>

      <footer className="rq-tk-footer">
        <span>Tia-Karta · Rookie Quest Worlds</span>
        <span>Prototype setting page · Not yet released</span>
      </footer>
    </div>
  );
}
