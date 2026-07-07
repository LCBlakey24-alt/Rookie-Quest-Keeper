import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';

import FullCharacterCreatorV2 from '@/components/FullCharacterCreatorV2';
import apiClient from '@/lib/apiClient';
import { CLASSES } from '@/data/characterRules5e';
import { extractHomebrewCollection } from '@/data/homebrewContent';

const normalizeKey = (value = '') => String(value || '')
  .replace(/\(homebrew\)/gi, '')
  .trim()
  .toLowerCase();

const displayName = (value) => (typeof value === 'string'
  ? value
  : value?.name || value?.title || value?.label || value?.value || String(value || '')
);

function findClassKey(baseClass = '') {
  const wanted = normalizeKey(baseClass);
  return Object.keys(CLASSES).find((className) => normalizeKey(className) === wanted) || '';
}

function installHomebrewSubclassChoices(homebrewItems = []) {
  const grouped = homebrewItems.reduce((acc, item) => {
    if (item.contentType !== 'subclass' || !item.name || !item.baseClass) return acc;
    const classKey = findClassKey(item.baseClass);
    if (!classKey) return acc;
    acc[classKey] = [...(acc[classKey] || []), item];
    return acc;
  }, {});

  Object.entries(grouped).forEach(([classKey, items]) => {
    const classData = CLASSES[classKey] || {};
    const existing = Array.isArray(classData.subclasses) ? classData.subclasses : [];
    const seen = new Set(existing.map((option) => normalizeKey(displayName(option))));
    const additions = items
      .filter((item) => !seen.has(normalizeKey(item.name)))
      .map((item) => `${item.name} (Homebrew)`);

    if (!additions.length) return;
    CLASSES[classKey] = {
      ...classData,
      subclasses: [...existing, ...additions],
    };
  });
}

export default function HomebrewAwareFullCharacterCreator(props) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadHomebrewChoices() {
      try {
        const response = await apiClient.get('/homebrew?content_type=subclass');
        if (cancelled) return;
        installHomebrewSubclassChoices(extractHomebrewCollection(response, 'subclass'));
      } catch (error) {
        if (!cancelled) {
          toast.info('Homebrew subclasses could not be loaded. Official choices are still available.');
        }
      } finally {
        if (!cancelled) setReady(true);
      }
    }

    loadHomebrewChoices();
    return () => { cancelled = true; };
  }, []);

  if (!ready) {
    return (
      <main className="full-creator-page">
        <div className="full-creator-loading">Loading homebrew choices…</div>
      </main>
    );
  }

  return <FullCharacterCreatorV2 {...props} />;
}
