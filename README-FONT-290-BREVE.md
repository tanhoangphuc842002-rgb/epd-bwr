# Web v61.13 / CE 2.9 font revision

Based on the unified v61.12 font-recovery web.
For CE 2.9 v19.0, the large lowercase breve is shortened by one pixel at
each upper end for U+0103 and its five tone variants. The lowercase body,
other accents, glyph metrics, all other characters and small font are unchanged.
The CE 2.13 payload is unchanged. The web selects the font by the verified
firmware/profile, including when connecting to another device in the same tab.

After publishing all web files, reload the page without cache. Connect the
CE 2.9, open firmware update / Vietnamese data and select reinstall data.
Previously committed text and event titles are preserved. A firmware OTA
update is not required. For a failed transfer, use the recovery button.

default-font.bin is the unchanged CE 2.13 payload.
default-font-290.bin is the revised CE 2.9 payload.
Both payloads are also embedded in vn-font-data.js for automatic installation.
The standalone font ZIP contains the revised CE 2.9 payload, not OTA firmware.

Tested with mock BLE/flash in a browser; physical device testing is still needed.
