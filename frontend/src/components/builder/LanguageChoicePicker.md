# LanguageChoicePicker

Reusable picker for origin/background language choices in character creation.

This component is intentionally added before wiring it into `CharacterBuilder.js` so the full builder can be updated in a smaller follow-up PR.

## Expected use

```jsx
<LanguageChoicePicker
  budget={backgroundLanguageBudget}
  selectedLanguages={backgroundLanguages}
  knownLanguages={baseLanguages}
  onChange={setBackgroundLanguages}
  theme={theme}
/>
```

## Notes

- `budget` controls how many choices can be selected.
- `knownLanguages` hides languages the character already has.
- `selectedLanguages` is controlled by the parent component.
