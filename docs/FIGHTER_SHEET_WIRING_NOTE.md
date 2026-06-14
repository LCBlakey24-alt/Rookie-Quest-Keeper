# Fighter Sheet Summary Wiring

The combat sheet now renders the Fighter summary section after the existing Fighter Command panel.

This keeps the first visible UI wiring small:

- import the summary bridge component
- render it below Fighter Command
- leave the older Fighter Command panel untouched for now

A later cleanup pass can remove duplicated local Fighter summary logic after the new shared summary is fully proven in the UI.
