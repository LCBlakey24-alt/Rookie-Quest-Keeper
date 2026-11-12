import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

import '@/styles/guildTokens.css';
import './CreditsPage.css';

/*
 * Credits and licences. The rules content Rookie Quest Keeper ships comes
 * from Wizards of the Coast's System Reference Documents, which are licensed
 * under Creative Commons Attribution 4.0: the notices below are the
 * attribution that licence requires, worded as Wizards of the Coast asks.
 * See docs/licensing/ for what may ship and what belongs in homebrew.
 */
export const SRD_51_NOTICE = 'This work includes material taken from the System Reference Document 5.1 (“SRD 5.1”) by Wizards of the Coast LLC and available at https://dnd.wizards.com/resources/systems-reference-document. The SRD 5.1 is licensed under the Creative Commons Attribution 4.0 International License available at https://creativecommons.org/licenses/by/4.0/legalcode.';
export const SRD_52_NOTICE = 'This work includes material from the System Reference Document 5.2 (“SRD 5.2”) by Wizards of the Coast LLC, available at https://www.dndbeyond.com/srd. The SRD 5.2 is licensed under the Creative Commons Attribution 4.0 International License, available at https://creativecommons.org/licenses/by/4.0/legalcode.';
export const UNOFFICIAL_NOTICE = 'Rookie Quest Keeper is an independent, unofficial tool. It is not affiliated with, endorsed, sponsored or approved by Wizards of the Coast LLC. Dungeons & Dragons, D&D and D&D Beyond are trademarks of Wizards of the Coast LLC.';

export default function CreditsPage() {
  useEffect(() => {
    const previous = document.title;
    document.title = 'Credits & licences | Rookie Quest Keeper';
    return () => { document.title = previous; };
  }, []);

  return (
    <main className="rq-credits" data-testid="credits-page">
      <Link to="/" className="rq-credits__back"><ArrowLeft size={16} aria-hidden="true" /> Back</Link>
      <h1>Credits &amp; licences</h1>

      <section aria-labelledby="credits-rules">
        <h2 id="credits-rules">Rules content</h2>
        <p>
          Rules content built into Rookie Quest Keeper includes material from the open System Reference Documents.
          Anything else your table uses is your own homebrew, added to your account.
        </p>
        <p className="rq-credits__notice" data-testid="srd-51-notice">{SRD_51_NOTICE}</p>
        <p className="rq-credits__notice" data-testid="srd-52-notice">{SRD_52_NOTICE}</p>
        <p>
          Some rules text has been shortened or reworded to fit the app, and records have been reformatted into the
          app&apos;s own data.
        </p>
      </section>

      <section aria-labelledby="credits-trademarks">
        <h2 id="credits-trademarks">Trademarks</h2>
        <p data-testid="unofficial-notice">{UNOFFICIAL_NOTICE}</p>
      </section>

      <section aria-labelledby="credits-data">
        <h2 id="credits-data">Data sources</h2>
        <p>
          The offline bestiary was normalised from the open 5e-bits 5e-database (MIT licence for its code; SRD rules
          content under CC BY 4.0).
        </p>
      </section>
    </main>
  );
}
