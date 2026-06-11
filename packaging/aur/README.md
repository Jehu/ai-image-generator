# AUR-Paket: image-style-studio-bin

Paketiert das offizielle Release-`.deb` für Arch-basierte Distributionen
(CachyOS, EndeavourOS, Manjaro, …). Nutzer installieren dann einfach:

```bash
yay -S image-style-studio-bin    # oder paru -S …
```

## Erstmalige Veröffentlichung im AUR (einmalig, von Marco)

Das AUR ist ein eigenes Git-Remote — die Dateien hier sind die Quelle, gepusht
wird in ein separates AUR-Repository:

1. AUR-Account anlegen (https://aur.archlinux.org) und SSH-Public-Key im
   Profil hinterlegen.
2. AUR-Repo klonen (legt bei Erstpush das Paket an):
   ```bash
   git clone ssh://aur@aur.archlinux.org/image-style-studio-bin.git
   cd image-style-studio-bin
   ```
3. `PKGBUILD` und `.SRCINFO` aus diesem Verzeichnis hineinkopieren,
   committen, pushen:
   ```bash
   cp /pfad/zum/repo/packaging/aur/{PKGBUILD,.SRCINFO} .
   git add PKGBUILD .SRCINFO
   git commit -m "Initial release 0.1.0"
   git push
   ```

## Bei jedem neuen App-Release aktualisieren

**Automatisch:** Der CI-Job `update-aur-pkgbuild`
(`.github/workflows/desktop-build.yml`) bumpt bei jedem `v*`-Tag nach
erfolgreichem Build `pkgver` und `sha256sums` in PKGBUILD + .SRCINFO und
committet das auf `main`. Manuell ist hier nichts zu tun.

Wer das Paket zusätzlich im AUR pflegt, spiegelt die aktualisierten Dateien
von hier ins AUR-Repo (`git push` dorthin bleibt ein manueller Schritt).
Lokaler Testbau auf einem Arch-System: `makepkg -si`.

## Hinweise

- **Auto-Updater:** Der eingebaute Tauri-Updater aktualisiert unter Linux nur
  AppImages. Die pacman-Installation bekommt Updates über das AUR
  (Versions-Bump dieses Pakets) — der Update-Dialog in der App schlägt bei
  Paket-Installationen still fehl, das ist erwartet.
- Das `.deb` ist nicht self-contained (anders als das AppImage) — daher die
  `depends` auf webkit2gtk-4.1 & Co.
