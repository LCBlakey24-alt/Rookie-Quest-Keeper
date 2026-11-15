# Rookie Quest Keeper Character Sheet V7 — Reviewed prototype

Four A4 fillable PDFs: D&D 5e 2014 and 2024 × Colour and BW. Each is eight pages and includes 504 editable AcroForm fields. All four passed the structural overlap, page-boundary, text/field collision and save/reopen form tests. Colour variants use the user's exact supplied RQK badge. BW variants use the same badge in grayscale.

**Quick start:** Open the edition/variant PDF in an AcroForm-capable PDF reader, type into the boxes and check the small hexagons. Save a copy. For handwriting, print at A4 actual size / 100% if the printer permits it; use Fit to Printable Area only if the printer cannot reach the PDF's safe margins.

**Pages:** 1 core play sheet, 2 actions/bonus actions/reactions, 3 expanded combat and resources, 4 spells, 5 inventory, 6 features/story, 7 session journal, 8 edition-specific rules reference.

**For Rook/Keeper:** Field-map JSON gives actual PDF field names and locations. The source scripts are provided only as a design/prototyping reference; no website export has been deployed and the current GitHub draft PR #911 still expects the previous V6 schema. Commercial server-side use of PyMuPDF needs a compatible AGPL/commercial licensing decision; consider MIT-licensed pdf-lib for browser-side exports. Do not redistribute font files separately. Real user account isolation, dynamic continuation pages, Unicode/font mapping and physical tablet QA remain to be completed.

**Known limitations:** Static AcroForms don't automatically recalculate modified ability scores/skills. A filled export should use the authoritative Keeper character engine. Spell-list slots and fields are finite and extra pages need to be generated for longer character content. Common action names and condition/exhaustion reference text are edition-specific and based on SRD 5.1 and 5.2.1, with visible source credit on page 8.

See RQK_V7_Playtable_Design_and_Rules_Audit.md for detailed QA and unresolved concerns.