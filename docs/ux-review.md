# UX-Review — Image Style Studio

Visuelles Review des gesamten Web-UI (alle Screens, Desktop + Mobile), durchgeführt am 2026-06-10.
Fokus: leichtere Bedienung, logischer Aufbau, Konsistenz.

Severity-Skala: 🔴 hoch (blockiert/verwirrt aktiv) · 🟡 mittel (Reibung) · 🟢 niedrig (Politur).

---

## Zusammenfassung — Top-Prioritäten

1. 🔴 **Playground: Layout-Ungleichgewicht & CTA unter der Falz.** Die linke Spalte (Stil-Formular) ist ~1900 px hoch, die rechte Ergebnis-Spalte zeigt nur einen kleinen Platzhalter oben — ~1800 px leerer Raum. Der primäre Button „Bilder generieren" liegt ganz unten; nach dem Generieren erscheinen die Ergebnisse oben rechts, weit weg vom Button.
2. 🔴 **Reizüberflutung durch ~30 immer offene Formularfelder.** Für den Kern-Use-Case („Motiv eintippen + generieren") muss man an einer Wand aus Fotografie-Fachbegriffen vorbeiscrollen. Keine Möglichkeit, Feldgruppen einzuklappen.
3. 🟡 **Zwei unterschiedliche Produktions-Flows** (Playground: ein Motiv + „Varianten"; Detail: mehrzeiliger Batch). Wer das eine lernt, trifft beim anderen ein anderes Modell.
4. 🟡 **Inkonsistente Button-Hierarchie & Feedback-Muster** (gefüllt vs. nur Rahmen für Primäraktionen; `confirm()`, `alert()`, grüner Text, Modal — alles gemischt).
5. 🟢 **`<html lang="en">` bei durchgehend deutscher App.**

---

## Global / Navigation

Datei: [`src/routes/__root.tsx`](src/routes/__root.tsx)

- 🟢 **Sprach-Attribut falsch.** `<html lang="en">` ([__root.tsx:63](src/routes/__root.tsx:63)), die App ist komplett deutsch. Auf `lang="de"` ändern (Screenreader, Hyphenation, a11y-Audits).
- 🟢 **Doppelte Marke.** Nav-Brand „🎨 Image Style Studio" + identische H1 „Image Style Studio" auf dem Playground ([index.tsx:104](src/routes/index.tsx:104)). Die anderen Seiten haben eigene H1 (Bibliothek, Einstellungen). Playground-H1 könnte zu „Playground" werden, dann ist die Hierarchie konsistent.
- 🟢 **Container-Breiten uneinheitlich.** Nav und die meisten Seiten nutzen `max-w-7xl`, Einstellungen `max-w-3xl`. Dadurch springt die linke Inhaltskante zwischen den Seiten. Entweder Settings linksbündig zum Nav-Brand oder alle Seiten einheitlich zentrieren.
- 🟢 **TanStack-Devtools-Badge** unten rechts überlagert Inhalt. Nur Dev — aber prüfen, dass es im Prod-Build nicht erscheint.

---

## Playground (`/`)

Datei: [`src/routes/index.tsx`](src/routes/index.tsx)

- 🔴 **Leere rechte Spalte / Layout-Ungleichgewicht.** Die `lg:grid-cols-2`-Aufteilung ([index.tsx:110](src/routes/index.tsx:110)) lässt rechts fast die gesamte Seitenhöhe leer, weil dort nur Ergebnisse stehen, die anfangs leer sind. Vorschlag: Formular einspaltig + breiter, Ergebnisse in einen **Sticky-Bereich** oder unter den CTA; oder rechte Spalte als sticky-Panel verankern, das mit-scrollt.
- 🔴 **Primärer CTA unter der Falz.** „Bilder generieren" ([index.tsx:290](src/routes/index.tsx:290)) erscheint erst nach ~1900 px Scroll. Beim ersten Laden sieht man die Aktion nicht. Vorschlag: **sticky Action-Bar** am unteren Rand (Generieren + Speichern + Kostenhinweis), unabhängig von der Scrollposition.
- 🔴 **Alle Feldgruppen immer offen.** KAMERA, OPTIK, BELEUCHTUNG, FARBE, POST-PROCESSING, KOMPOSITION ([StyleEditor.tsx:115](src/components/StyleEditor.tsx:115)) werden alle gleichzeitig gerendert. Für Einsteiger überwältigend. Vorschlag: Gruppen als `<details>` einklappbar, nur KAMERA + FARBE offen; oder „Einfach / Erweitert"-Umschalter.
- 🟡 **Motiv-Feld steht ganz unten.** Das Motiv ([index.tsx:215](src/routes/index.tsx:215)) ist der Kern jeder Generierung, liegt aber hinter dem gesamten Stil-Formular. Vorschlag: Motiv nahe an den Generieren-Button oder nach oben holen — der Stil ist oft schon gesetzt, das Motiv wechselt häufig.
- 🟡 **Reihenfolge wirkt unlogisch.** Aktuell: Bildart → Vorlage → Stil-aus-Bild → Editor → Motiv → Modell → Params → Prompt-Preview → Generieren. Vorschlag-Gruppierung: (1) Was: Bildart + Vorlage, (2) Stil: Editor, (3) Motiv + Params, (4) Aktion. Modell-Picker und Params logisch zur Aktion ziehen.
- 🟡 **„Stil aus Bild ableiten" verschwindet stillschweigend** bei Illustration/Infografik ([index.tsx:150](src/routes/index.tsx:150)). Nutzer, die es kennen, suchen es vergeblich. Kurzer Hinweis „nur für Foto" wäre klarer.
- 🟢 **Ergebnis-Feedback dünn.** Während des Generierens nur Text „Generiere N Bilder…" ([index.tsx:316](src/routes/index.tsx:316)). Skeleton-Kacheln in der Ergebnis-Grid-Form würden die Wartezeit greifbarer machen.
- 🟢 **„Als Stil speichern" als Rahmen-Button** neben dem gefüllten CTA — Hierarchie ok, aber sekundär ist hier korrekt; konsistent halten mit Detail-Seite (dort ist Speichern nur Rahmen, siehe unten).

---

## Stil-Detail (`/styles/$id`)

Datei: [`src/routes/styles.$id.tsx`](src/routes/styles.$id.tsx)

- 🟡 **Widersprüchliche Überschrift „Stil (fixiert, editierbar)"** ([styles.$id.tsx:271](src/routes/styles.$id.tsx:271)). „Fixiert" und „editierbar" widersprechen sich. Gemeint ist vermutlich „gespeicherter Stil — Änderungen erzeugen neue Version". Klarer formulieren.
- 🟡 **Anderer Produktions-Flow als im Playground.** Hier mehrzeilige „Motive (eine pro Zeile für Batch)" ([styles.$id.tsx:416](src/routes/styles.$id.tsx:416)) statt einem Motiv + „Varianten"-Dropdown. Das Mentale Modell bricht zwischen den beiden Hauptseiten. Vorschlag: beide Seiten angleichen (z. B. überall Batch-fähig, oder Playground auch mehrzeilig).
- 🟡 **Speichern = immer neue Version.** „Stil-Änderungen speichern (neue Version)" ([styles.$id.tsx:337](src/routes/styles.$id.tsx:337)) erzeugt auch bei Mini-Edits eine Version → Versions-Wildwuchs. Zudem ist der Button nur ein Rahmen-Button, obwohl er die zentrale Commit-Aktion ist. Vorschlag: als Primär-Button (gefüllt) und Versionierung nur bei tatsächlicher Änderung des `styleJson`.
- 🟡 **Uneinheitliche Button-Größen in einer Reihe.** Speichern ist `px-4 py-2`, „Stil als JSON exportieren" und „Style-Brief (.md)" sind `px-3 py-1` ([styles.$id.tsx:331-362](src/routes/styles.$id.tsx:331)). Optisch unruhig. Größen vereinheitlichen oder visuell als Gruppe (z. B. Export-Aktionen in ein Menü).
- 🟢 **History-Zeile nur teilweise klickbar.** Nur das Thumbnail öffnet die Lightbox ([styles.$id.tsx:504](src/routes/styles.$id.tsx:504)); der Motiv-Text daneben nicht. Ganze Zeile klickbar machen.
- 🟢 **Keine Einzel-Löschung in der Historie.** Man kann nur „Alle Bilder herunterladen", aber keine einzelne Generierung entfernen.
- 🟢 **Leerer Header-Rechtsbereich.** `justify-between` im Header ([styles.$id.tsx:253](src/routes/styles.$id.tsx:253)) ohne rechtes Element — Layout-Rest; entweder Aktion (z. B. „Duplizieren"/„Löschen") dort platzieren oder `justify-between` entfernen.

---

## Bibliothek (`/styles`)

Datei: [`src/routes/styles.index.tsx`](src/routes/styles.index.tsx)

- 🟡 **Zwei Filterzeilen mit je eigenem „Alle"-Chip.** Bildart-Zeile ([styles.index.tsx:128](src/routes/styles.index.tsx:128)) und Tag-Zeile ([styles.index.tsx:148](src/routes/styles.index.tsx:148)) wirken redundant. Vorschlag: in eine Filterleiste zusammenfassen; Tag-Zeile bekommt analog ein „Tags:"-Label wie „Bildart:".
- 🟡 **Löschen nutzt natives `confirm()`** ([styles.index.tsx:237](src/routes/styles.index.tsx:237)), Speichern dagegen ein gestyltes Modal ([SaveStyleDialog.tsx](src/components/SaveStyleDialog.tsx)). Inkonsistent — destruktive Aktion verdient eher das Modal mit klarer Warnung.
- 🟢 **Doppelte Öffnen-Affordanz.** Karten-Titel ist Link *und* „Öffnen"-Button ([styles.index.tsx:190](src/routes/styles.index.tsx:190), [:222](src/routes/styles.index.tsx:222)). Eines reicht; „Öffnen" könnte entfallen oder die Aktionsleiste auf Duplizieren/Löschen reduziert werden.
- 🟢 **„+ Neuer Stil (Playground)"** ([styles.index.tsx:119](src/routes/styles.index.tsx:119)) verspricht das Anlegen eines Stils, navigiert aber nur zum Playground (ein Stil entsteht erst beim Speichern). Label z. B. „Im Playground erstellen".
- 🟢 **Karten ohne Anker-Bild haben kein Thumbnail** ([styles.index.tsx:186](src/routes/styles.index.tsx:186)) → ungleiche Kartenhöhen in einer Reihe. Platzhalter-Thumbnail (z. B. Bildart-Icon) für gleichmäßiges Raster.
- 🟢 **Kein Ergebniszähler / keine Sortierung.** „3 Stile" und Sortier-Optionen (zuletzt geändert / Name) würden bei wachsender Bibliothek helfen.
- 🟢 **Import-Fehler via `alert()`** ([styles.index.tsx:94](src/routes/styles.index.tsx:94)) — bricht das ansonsten ruhige Feedback-Muster.

---

## Einstellungen (`/settings`)

Datei: [`src/routes/settings.tsx`](src/routes/settings.tsx)

- 🟢 **Keys read-only, kein In-UI-Edit.** Nachvollziehbar (serverseitig/.env), aber die Seite bietet keine Aktion — nur Hinweistext. In Ordnung für ein Dev-Tool; ggf. „.env-Pfad anzeigen/öffnen" als Komfort.
- 🟢 **Key-Länge wird angezeigt** („53 Zeichen" / „164 Zeichen", [settings.tsx:30](src/routes/settings.tsx:30)). Unnötige Information, minimal informationsleck-artig. Maskierung ohne Längenangabe reicht.
- 🟢 **Inhalt `max-w-3xl`** weicht von den `max-w-7xl`-Seiten ab (siehe Global → Container-Breiten).

---

## Komponenten / Cross-Cutting

- 🟡 **Uneinheitliche Feedback-Muster.** Erfolg = grüner Text, Fehler = roter Text, manche Fehler = `alert()`, Löschen = `confirm()`, Speichern = Modal, Analyse-Erfolg = Banner+Flash. Vorschlag: ein einheitliches **Toast-System** für Erfolg/Fehler, Modals nur für Bestätigungen.
- 🟡 **Button-Hierarchie projektweit uneinheitlich.** Primäraktionen mal gefüllt (`bg-primary`), mal nur Rahmen (z. B. Speichern auf Detail). Padding-Größen `px-4 py-2` / `px-3 py-1` / `px-2 py-1` gemischt. Eine kleine Button-Komponente mit `variant` (primary/secondary/ghost) und `size` würde das vereinheitlichen.
- 🟢 **InfoHint** ([InfoHint.tsx](src/components/InfoHint.tsx)) und **Lightbox** ([Lightbox.tsx](src/components/Lightbox.tsx)) sind a11y-seitig sauber (aria-Labels, Esc/Pfeiltasten, Fokus-Outline). Gutes Vorbild für die restlichen interaktiven Elemente.
- 🟢 **Hintergrund-Grünverlauf** liegt über allen Seiten und senkt den Kontrast leicht (vor allem bei `text-muted-foreground`). Falls Branding, ok — sonst Kontrast gegen WCAG AA prüfen.
- 🟢 **Kosten-Transparenz gut.** „~$0.268"-Anzeigen pro Generierung/Historie sind ein Plus und sollten erhalten bleiben.

---

## Konkrete Quick-Wins (geringer Aufwand, hohe Wirkung)

1. `lang="de"` setzen ([__root.tsx:63](src/routes/__root.tsx:63)).
2. Sticky Action-Bar im Playground für „Bilder generieren" + „Als Stil speichern".
3. Formulargruppen im StyleEditor einklappbar (`<details>`), Default: nur 1–2 offen.
4. Speichern-Button auf der Detailseite zum gefüllten Primär-Button machen.
5. „Stil (fixiert, editierbar)" umbenennen in z. B. „Gespeicherter Stil".
6. Bibliothek-Löschen auf das vorhandene Modal-Muster umstellen.
7. Container-Breite der Einstellungen an die übrigen Seiten angleichen.
