import { metrics, type Attributes, type Counter, type Histogram, type Meter, type UpDownCounter } from "@opentelemetry/api";

/** What happened to one PIN attempt: opened, wrong, the wrong one that started a lockout, or tried while locked out. */
export type PinResult = "ok" | "wrong" | "locked_out" | "blocked";

/**
 * MoveEasy's own metrics (#104). Every data point carries `environment` and `version`, so the dashboard
 * and the alerts can filter on them without joining resource attributes. Names become Prometheus names like
 * `moveeasy_tags_created_total`. A no-op when the OpenTelemetry SDK is not started.
 */
export class AppMetrics {
  private readonly base: Attributes;
  private readonly tagsCreated: Counter;
  private readonly tagViews: Counter;
  private readonly tagScans: Counter;
  private readonly pinAttempts: Counter;
  private readonly mediaUploads: Counter;
  private readonly mediaUploadSize: Histogram;
  private readonly replies: Counter;
  private readonly signups: Counter;
  private readonly logins: Counter;
  private readonly failures: Counter;
  private readonly inFlight: UpDownCounter;
  private readonly duration: Histogram;

  constructor(meter: Meter, labels: { environment: string; version: string }) {
    this.base = { ...labels };
    this.tagsCreated = meter.createCounter("moveeasy.tags.created", { description: "Tags created, by kind (gift, box, keepsake)" });
    this.tagViews = meter.createCounter("moveeasy.tag.views", { description: "Public tag page loads, by what the visitor got (open, pinRequired, timeLocked, private, archived, unknown)" });
    this.tagScans = meter.createCounter("moveeasy.tag.scans", { description: "Scans counted on a tag (one per visitor per 30 minutes), by kind" });
    this.pinAttempts = meter.createCounter("moveeasy.pin.attempts", { description: "PIN attempts on protected tags, by result (ok, wrong, locked_out, blocked)" });
    this.mediaUploads = meter.createCounter("moveeasy.media.uploads", { description: "Media uploads, by type and result (ok or the rejection code)" });
    this.mediaUploadSize = meter.createHistogram("moveeasy.media.upload.size", {
      description: "Size of accepted media files",
      unit: "By",
      advice: { explicitBucketBoundaries: [100e3, 500e3, 1e6, 5e6, 10e6, 25e6, 50e6] },
    });
    this.replies = meter.createCounter("moveeasy.replies.created", { description: "Replies visitors left on tags" });
    this.signups = meter.createCounter("moveeasy.users.signups", { description: "New accounts" });
    this.logins = meter.createCounter("moveeasy.users.logins", { description: "Log-in attempts, by result (ok, bad_credentials)" });
    this.failures = meter.createCounter("moveeasy.operation.failures", { description: "Requests that failed with an unexpected server error (5xx), by operation" });
    this.inFlight = meter.createUpDownCounter("moveeasy.http.requests.in_flight", { description: "API requests being handled right now" });
    this.duration = meter.createHistogram("moveeasy.http.request.duration", {
      description: "API request time, by operation and status class",
      unit: "s",
      advice: { explicitBucketBoundaries: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10] },
    });
  }

  private with(extra: Attributes = {}): Attributes {
    return { ...this.base, ...extra };
  }

  tagCreated(kind: string) { this.tagsCreated.add(1, this.with({ kind })); }
  tagViewed(state: string) { this.tagViews.add(1, this.with({ state })); }
  tagScanned(kind: string) { this.tagScans.add(1, this.with({ kind })); }
  pinAttempt(result: PinResult) { this.pinAttempts.add(1, this.with({ result })); }
  mediaUploaded(type: string, bytes: number) {
    this.mediaUploads.add(1, this.with({ type, result: "ok" }));
    this.mediaUploadSize.record(bytes, this.with({ type }));
  }
  mediaRejected(type: string, reason: string) { this.mediaUploads.add(1, this.with({ type, result: reason })); }
  replyCreated() { this.replies.add(1, this.with()); }
  signedUp() { this.signups.add(1, this.with()); }
  loggedIn(result: "ok" | "bad_credentials") { this.logins.add(1, this.with({ result })); }
  failed(operation: string) { this.failures.add(1, this.with({ operation })); }
  requestStarted() { this.inFlight.add(1, this.with()); }
  requestEnded(operation: string, status: number, seconds: number) {
    this.inFlight.add(-1, this.with());
    this.duration.record(seconds, this.with({ operation, status_class: `${Math.floor(status / 100)}xx` }));
  }
}

/** The metrics of this process, on the global meter provider the SDK registered (or the no-op one). */
export const appMetrics = (labels: { environment: string; version: string }, meter: Meter = metrics.getMeter("moveeasy", labels.version)) =>
  new AppMetrics(meter, labels);
