import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import '@/styles/guildTokens.css';
import './LegalPages.css';

// Publication gate: these details must be confirmed by the actual operator
// before this draft legal PR can merge. Never publish an invented identity.
const OPERATOR = process.env.REACT_APP_PUBLIC_LEGAL_OPERATOR || '';
const CONTACT = process.env.REACT_APP_PUBLIC_LEGAL_CONTACT || '';
const UPDATED = '14 November 2026';

const sections = {
  privacy: {
    title: 'Privacy Notice',
    intro: 'How Rookie Quest Keeper handles personal information, including when you use campaign tools, offline features and the optional Rook AI assistant.',
    entries: [
      {
        title: 'Who is responsible for your information?',
        body: <>Rookie Quest Keeper is operated by the person or entity identified below. Questions, complaints and requests about your information can be sent to the contact shown on this page. The operator must verify these contact details before this notice is published.</>,
      },
      {
        title: 'Information we handle',
        body: <>Account details such as username, email, authentication and account settings; your characters, campaigns, notes, uploads, images and shared content; operational records such as login/security events and troubleshooting data; optional product analytics where enabled; and requests and contextual information you choose to submit to Rook AI. Some campaign descriptions may contain information about other people: please avoid uploading real personal information about others without an appropriate basis.</>,
      },
      {
        title: 'Why we use information',
        body: <>We use account and campaign information to provide the service you request, maintain availability and security, restore access and support you. Optional analytics are disabled by default. External AI processing requires permission through the app’s AI settings. Where applicable, processing may rely on contractual necessity, legitimate interests, legal obligations or consent; the specific legal basis and jurisdictional disclosures require final operator review.</>,
      },
      {
        title: 'Service providers and international transfers',
        body: <>Service operation can involve hosting, databases, authentication, email delivery and the external AI provider. The current stack includes Vercel, Render, MongoDB Atlas, Resend and OpenAI; PostHog is optional. Data may be transferred outside your country, subject to applicable contractual and legal safeguards. The operator must confirm the actual processing locations, provider contracts and transfer safeguards before this notice goes live.</>,
      },
      {
        title: 'AI and analytics choices',
        body: <>Rook may send your prompt, relevant campaign context and selected files to an external AI processor. You can turn Rook permission off in Account Settings. Optional analytics require your choice, can be disabled, and are not necessary to play. Recording scripts are not loaded automatically in normal or preview sessions.</>,
      },
      {
        title: 'Retention and account deletion',
        body: <>You can delete an account from Account Settings. We remove active account-owned records and clear device caches where possible, while shared player records may be detached rather than deleted. Routine backups, technical logs and provider-held copies may take longer to expire. A documented retention schedule, backup expiry process and third-party deletion process must be approved before this notice is final.</>,
      },
      {
        title: 'Your privacy rights',
        body: <>Depending on where you live, you may be entitled to access, correct, delete, download or restrict use of your information, object to some uses, or withdraw consent. The legal operator must establish a request/contact route and any applicable identity-check process. You may also have the right to complain to your local privacy regulator.</>,
      },
      {
        title: 'Children and family use',
        body: <>Ordinary self-registration is intended for adults. Child accounts and family use require additional safeguards and a parent-managed enrolment process; the service must not treat an ordinary checkbox as parental consent. Age assurance, parental controls and country-specific requirements remain subject to a dedicated assessment before unrestricted access.</>,
      },
      {
        title: 'Changes to this notice',
        body: <>Material changes should be dated and explained before applying them. New optional uses of personal information may require additional choice or notice.</>,
      },
    ],
  },
  terms: {
    title: 'Terms of Use',
    intro: 'The conditions for using the campaign, character, homebrew and GM tools in Rookie Quest Keeper.',
    entries: [
      {
        title: 'The service',
        body: <>Keeper provides tabletop roleplaying utilities, including character records, campaigns, maps, session notes and optional AI assistance. Features may change while the service is in development. Community publishing and paid subscriptions are not included in these terms until separately documented and launched.</>,
      },
      {
        title: 'Accounts and security',
        body: <>Keep login credentials secure, provide accurate account information and do not attempt to access another player’s private data. Ordinary self-registration is intended for adults. Any child or family accounts must be created and managed through approved parent-facing safeguards.</>,
      },
      {
        title: 'Your original work and uploaded material',
        body: <>You retain the rights you hold in content you create. You give the operator a limited licence to host, copy, process and display it to the people you choose within the service, as needed to operate Keeper. Do not upload or share another party’s protected rulebooks, artwork, personal data or other material without lawful permission. Private campaigns must not become public merely because someone creates an account.</>,
      },
      {
        title: 'Other users and safety',
        body: <>Do not harass users, impersonate people, exploit other accounts, spread malware, expose another person’s confidential information or publish unlawful or infringing material. Public sharing, if enabled later, will require a clear reporting and moderation process.</>,
      },
      {
        title: 'Open rules and independent status',
        body: <>Keeper is an independent product. The open SRD rules and third-party licences are credited on the Credits & licences page. Third-party trademarks belong to their owners. The service is not officially endorsed by Wizards of the Coast.</>,
      },
      {
        title: 'AI output',
        body: <>AI-generated campaign ideas and rules advice may be incorrect or incomplete. Review generated information, especially before sharing or publishing. You are responsible for ensuring you have permission to submit material to an external AI processor.</>,
      },
      {
        title: 'Availability and user rights',
        body: <>Keep backups of important original content. We may limit misuse or suspend tools when necessary to protect the service. Nothing in these terms removes mandatory consumer, privacy, accessibility or other legal rights applying in your location.</>,
      },
      {
        title: 'Payments and digital products',
        body: <>Paid plans, merchant licences, digital downloads and subscriptions will have clearly disclosed prices, cancellation conditions and any applicable refund rights before purchases are enabled. No consumer right is waived simply by downloading digital content.</>,
      },
      {
        title: 'Contact and complaints',
        body: <>Use the verified operator contact details below for service, copyright and privacy questions. The legal operator must approve the final dispute-resolution, jurisdiction and statutory notices for every intended launch market.</>,
      },
    ],
  },
  cookies: {
    title: 'Cookies & Device Storage',
    intro: 'What the app stores in your browser or installed Keeper app, and how to control optional tracking.',
    entries: [
      {
        title: 'Essential storage',
        body: <>Keeper uses browser and application storage for login and session continuity, settings, offline campaign caches and app reliability. Removing this data may sign you out or clear offline information. Essential storage is used to deliver features you request, not for optional advertising.</>,
      },
      {
        title: 'Optional analytics',
        body: <>Product analytics use PostHog only after you enable usage analytics in Account Settings. Analytics permission is off by default. You can withdraw it there, which stops further capture by the running tracker. Any historical data retained by a processor is subject to its retention and erasure arrangements.</>,
      },
      {
        title: 'External AI choices',
        body: <>Rook AI permission is separate from cookie/analytics permission. The app asks before sending your prompts, relevant campaign context or selected files to an external AI service.</>,
      },
      {
        title: 'Preview environments',
        body: <>Keeper does not automatically load third-party session-recording scripts on preview, testing or production pages. Synthetic test recordings, if used, must take place in a separately controlled environment.</>,
      },
      {
        title: 'Managing your choice',
        body: <>You can change your optional permissions in Account Settings and clear site data through your browser. The operator must confirm a provider-by-provider inventory of cookies, retention periods and cross-border details before global publication.</>,
      },
    ],
  },
};

export default function LegalPages({ kind = 'privacy' }) {
  const page = sections[kind] || sections.privacy;
  useEffect(() => {
    const original = document.title;
    document.title = `${page.title} | Rookie Quest Keeper`;
    return () => { document.title = original; };
  }, [page.title]);

  return (
    <main className="rqk-legal-page" data-testid={`legal-page-${kind}`}>
      <Link to="/" className="rqk-legal-page__back"><ArrowLeft size={17} /> Back to Keeper</Link>
      <div className="rqk-legal-page__hero">
        <span className="rqk-legal-page__eyebrow"><ShieldCheck size={16} /> Trust &amp; transparency</span>
        <h1>{page.title}</h1>
        <p>{page.intro}</p>
        <small>Last draft update: {UPDATED}</small>
      </div>
      {!OPERATOR || !CONTACT ? (
        <div className="rqk-legal-page__review" role="status">
          <strong>Publication review required</strong>
          <p>Legal operator identification and a working contact route have not yet been verified. This draft is not a final statement of worldwide legal compliance.</p>
        </div>
      ) : null}
      <div className="rqk-legal-page__body">
        {page.entries.map((section) => (
          <section key={section.title}>
            <h2>{section.title}</h2>
            <p>{section.body}</p>
          </section>
        ))}
      </div>
      <footer className="rqk-legal-page__footer">
        <p><strong>Operator:</strong> {OPERATOR || 'Pending operator verification'}</p>
        <p><strong>Contact:</strong> {CONTACT ? <a href={`mailto:${CONTACT}`}>{CONTACT}</a> : 'Pending verified contact address'}</p>
        <nav aria-label="Legal pages">
          <Link to="/privacy">Privacy</Link>
          <Link to="/terms">Terms</Link>
          <Link to="/cookies">Cookies</Link>
          <Link to="/credits">Credits &amp; licences</Link>
        </nav>
      </footer>
    </main>
  );
}
