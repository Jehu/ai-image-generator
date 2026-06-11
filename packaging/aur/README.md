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

Auf einem Arch-System (oder in einer Arch-Distrobox):

```bash
cd image-style-studio-bin          # AUR-Checkout
# pkgver in PKGBUILD anheben, pkgrel auf 1 zurücksetzen
updpkgsums                         # lädt das neue .deb, setzt sha256
makepkg --printsrcinfo > .SRCINFO
makepkg -si                        # lokaler Testbau + Installation
git commit -am "Update to X.Y.Z" && git push
```

Ohne Arch-System: sha256 manuell setzen
(`curl -sL <deb-url> | sha256sum`) und `.SRCINFO` von Hand nachziehen
(Felder `pkgver`, `source_x86_64`, `sha256sums_x86_64`).

Die Kopie hier im Haupt-Repo (`packaging/aur/`) dient als versionierte
Referenz — Änderungen zuerst hier pflegen, dann ins AUR-Repo spiegeln.

## Hinweise

- **Auto-Updater:** Der eingebaute Tauri-Updater aktualisiert unter Linux nur
  AppImages. Die pacman-Installation bekommt Updates über das AUR
  (Versions-Bump dieses Pakets) — der Update-Dialog in der App schlägt bei
  Paket-Installationen still fehl, das ist erwartet.
- Das `.deb` ist nicht self-contained (anders als das AppImage) — daher die
  `depends` auf webkit2gtk-4.1 & Co.
