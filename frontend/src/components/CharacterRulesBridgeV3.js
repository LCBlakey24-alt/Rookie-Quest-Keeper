import React, { useCallback, useEffect, useMemo, useState } from 'react';

import CharacterRulesBridgeV2 from '@/components/CharacterRulesBridgeV2';
import StartingLevelClassSpecificChoices from '@/components/StartingLevelClassSpecificChoices';
import {
  applyClassSpecificChoicesToPayload,
  buildClassSpecificChoicePlan,
  normaliseClassSpecificSelection,
} from '@/data/classSpecificChoiceEngine';
import apiClient from '@/lib/apiClient';

const DRAFT_KEY = 'rqk.full_character_creator_v2.safe';
const LEVEL_KEY = 'rqk.full_character_creator_v2.starting_level';
const SUBCLASS_KEY = 'rqk.full_character_creator_v2.starting_subclass';
const DETAIL_CHOICES_KEY = 'rqk.full_character_creator_v2.detail_choices';

const clampLevel = (value) => Math.max(1, Math.min(20, Number.parseInt(value, 10) || 1));

function readDraft() {
  try {
    return JSON.parse(localStorage.getItem(DRAFT_KEY) || '{}') || {};
  } catch {
    return {};
  }
}

function readDetailChoices() {
  try {
    return JSON.parse(sessionStorage.getItem(DETAIL_CHOICES_KEY) || '{}') || {};
  } catch {
    return {};
  }
}

function writeDetailChoices(next) {
  sessionStorage.setItem(DETAIL_CHOICES_KEY, JSON.stringify(next || {}));
}

function readBridgeState() {
  const draft = readDraft();
  const detailChoices = readDetailChoices();
  return {
    draft,
    detailChoices,
    className: draft.characterClass || draft.character_class || 'Fighter',
    level: clampLevel(sessionStorage.getItem(LEVEL_KEY) || draft.level || 1),
    subclassName: sessionStorage.getItem(SUBCLASS_KEY) || draft.subclass || '',
  };
}

export default function CharacterRulesBridgeV3(props) {
  const [bridgeState, setBridgeState] = useState(readBridgeState);
  const [classSpecificSelection, setClassSpecificSelection] = useState(() => readBridgeState().detailChoices.classSpecific || {});

  useEffect(() => {
    const sync = () => {
      const next = readBridgeState();
      setBridgeState(next);
      setClassSpecificSelection(next.detailChoices.classSpecific || {});
    };
    sync();
    const interval = window.setInterval(sync, 700);
    window.addEventListener('focus', sync);
    window.addEventListener('storage', sync);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const classSpecificPlan = useMemo(() => buildClassSpecificChoicePlan({
    className: bridgeState.className,
    level: bridgeState.level,
    subclassName: bridgeState.subclassName,
  }), [bridgeState.className, bridgeState.level, bridgeState.subclassName]);

  const updateClassSpecificSelection = useCallback((selection) => {
    const nextSelection = normaliseClassSpecificSelection(selection, classSpecificPlan);
    setClassSpecificSelection(nextSelection);
    const current = readDetailChoices();
    writeDetailChoices({ ...current, classSpecific: nextSelection });
  }, [classSpecificPlan]);

  const enhancePayload = useCallback((payload) => applyClassSpecificChoicesToPayload(
    payload,
    classSpecificSelection,
    classSpecificPlan,
  ), [classSpecificSelection, classSpecificPlan]);

  useEffect(() => {
    const originalPost = apiClient.post.bind(apiClient);
    const originalPatch = apiClient.patch.bind(apiClient);

    apiClient.post = (url, data, ...rest) => originalPost(url, url === '/characters' ? enhancePayload(data) : data, ...rest);
    apiClient.patch = (url, data, ...rest) => originalPatch(url, /^\/characters\/[^/]+$/.test(String(url || '')) ? enhancePayload(data) : data, ...rest);

    return () => {
      apiClient.post = originalPost;
      apiClient.patch = originalPatch;
    };
  }, [enhancePayload]);

  return (
    <>
      <StartingLevelClassSpecificChoices
        plan={classSpecificPlan}
        selection={classSpecificSelection}
        onChange={updateClassSpecificSelection}
      />
      <CharacterRulesBridgeV2 {...props} />
    </>
  );
}
