# Fighter Character Shape Helper

`fighterCharacterShape` centralises common checks for whether a character should be treated as having Fighter data.

It recognises:

- direct Fighter class names
- `fighter_level`
- `fighterLevel`
- class level maps
- multiclass level maps
- class entry arrays

The next cleanup pass can swap older local Fighter checks to this shared helper one component at a time.
