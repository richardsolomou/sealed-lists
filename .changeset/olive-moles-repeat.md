---
'sealed-lists': patch
---

Restore realtime. Centrifugo's connect proxy calls the app over the loopback interface, and the canonical-host redirect was answering it with a 301. Go's client follows that redirect and downgrades the POST to a GET, which matches no route and returns the page shell, so Centrifugo was parsing HTML as JSON and reporting `internal server error` to every browser. ras-stack 0.39.1 leaves loopback requests alone; this releases that upgrade so the production image is rebuilt with it.
