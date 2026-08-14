# sealed-lists

## 0.2.3

### Patch Changes

- 612386d: Restore realtime. Centrifugo's connect proxy calls the app over the loopback interface, and the canonical-host redirect was answering it with a 301. Go's client follows that redirect and downgrades the POST to a GET, which matches no route and returns the page shell, so Centrifugo was parsing HTML as JSON and reporting `internal server error` to every browser. ras-stack 0.39.1 leaves loopback requests alone; this releases that upgrade so the production image is rebuilt with it.

## 0.2.2

### Patch Changes

- e0df835: Publish and deploy release images by immutable digest.

## 0.2.1

### Patch Changes

- 71e87fb: Capture anonymous server telemetry for key game milestones and operational failures.

## 0.2.0

### Minor Changes

- affda6a: Add privacy-safe product analytics, session replay, feature flags, error tracking, and account identity.

## 0.1.1

### Patch Changes

- 78003e5: Adopt automated versioned releases for Sealed Lists.
