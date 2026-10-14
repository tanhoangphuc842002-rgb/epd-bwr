Web v61.11 + CE 2.9 v19.0 Vietnamese font installation fix
Date: 2026-10-12

The supplied web only allowed resource installation for 2.13 profile 0x21,
versions 127..131. CE 2.9 v19.0 reports app version 133 and profile 0x29.
It was rejected by the web before a font-upload command was sent.

This package recognizes profile 0x29 from the firmware configuration reply
and enables the existing EA 56 4E resource protocol for that exact identity.
The 2.9 TODO preview/wrapping uses 194px and the countdown title limit 228px.
Existing 2.13 support stays at the original widths/version allowlist. Unknown
versions/profiles, DA14585 and 7.5 are not allowed to receive these resource
write commands. Normal picture upload, album, DFU, BLE write queue and LUT
logic have not been changed. Album support is not expanded by this patch.

The default font already includes all 134 accented Vietnamese letters, both
uppercase and lowercase, ASCII U+0020..U+007E and the degree symbol: 230
glyphs each at line heights 16 and 18, two font sections, 11978 bytes total.
It is shared by these compatible firmwares; no separate resolution-dependent
font format is needed. Font bytes are regenerated/verified without changing
the existing glyph artwork. The firmware checks the payload before committing.

Installation
------------
Unzip and publish ALL web files/directories together, keeping their layout.
Do not publish firmware sources, factory tools, keys or chip backups.
Open the updated page, reload without cache, connect the 2.9 CE v19.0 device,
then open the firmware update tab and choose Vietnamese data installation.
Keep a complete 512KB backup of that exact device before any resource write.
Keep power and BLE connected through verification. Font .bin is not an OTA
firmware file and must not be selected in the DFU firmware upload control.

No firmware change/reflash is needed for this web gate fix. A full MCU HEX
does not itself install external-flash fonts. If the device reports that the
external flash is absent/locked/busy, stop and retain the log. This source
expects FM25Q04B JEDEC A1 40 13 with CS12/MISO13/SCK14/MOSI15, and those pins
on the user's 2.9 hardware still require physical confirmation. A font file
or web change cannot fix missing flash or different wiring.

Software tests use simulated flash/BLE; a real device test is still required.
