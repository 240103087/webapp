import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { api } from "../api";
import { loginAs } from "../test/render";
import { VoiceRecorder, MAX_RECORDING_SECONDS } from "./VoiceRecorder";

class FakeRecorder {
  static isTypeSupported = (t: string) => t === "audio/webm";
  state = "inactive";
  mimeType = "audio/webm";
  ondataavailable: ((e: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  constructor(public stream: unknown) {}
  start() { this.state = "recording"; }
  stop() {
    this.state = "inactive";
    this.ondataavailable?.({ data: new Blob(["abc"], { type: "audio/webm" }) });
    this.onstop?.();
  }
}
const stopTrack = vi.fn();

beforeEach(async () => {
  await loginAs();
  (globalThis as Record<string, unknown>).MediaRecorder = FakeRecorder;
  Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: { getUserMedia: vi.fn(async () => ({ getTracks: () => [{ stop: stopTrack }] })) } });
  URL.createObjectURL = () => "blob:rec";
  URL.revokeObjectURL = () => {};
});
afterEach(() => {
  vi.useRealTimers();
  delete (globalThis as Record<string, unknown>).MediaRecorder;
});

describe("voice recorder", () => {
  it("records, stops, and saves as audio", async () => {
    const onSaved = vi.fn();
    render(<VoiceRecorder tagId="t_birthday" count={1} onSaved={onSaved} />);
    await userEvent.click(screen.getByRole("button", { name: "Record voice" }));
    expect(screen.getByText(/Recording/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Stop" }));
    expect(stopTrack).toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(onSaved).toHaveBeenCalledWith(expect.objectContaining({ type: "audio", caption: "Voice message" }));
    expect((await api.getTag("t_birthday")).media.map((m) => m.type)).toContain("audio");
  });

  it("stops by itself at 3 minutes", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    render(<VoiceRecorder tagId="t_birthday" count={1} onSaved={() => {}} />);
    await act(async () => { screen.getByRole("button", { name: "Record voice" }).click(); });
    await act(async () => { vi.advanceTimersByTime((MAX_RECORDING_SECONDS + 1) * 1000); });
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
  });

  it("explains a blocked microphone", async () => {
    (navigator.mediaDevices.getUserMedia as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("NotAllowed"));
    render(<VoiceRecorder tagId="t_birthday" count={1} onSaved={() => {}} />);
    await userEvent.click(screen.getByRole("button", { name: "Record voice" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Microphone access was blocked");
  });

  it("explains an unsupported browser", async () => {
    delete (globalThis as Record<string, unknown>).MediaRecorder;
    render(<VoiceRecorder tagId="t_birthday" count={1} onSaved={() => {}} />);
    await userEvent.click(screen.getByRole("button", { name: "Record voice" }));
    expect(screen.getByRole("alert")).toHaveTextContent("This browser cannot record audio");
  });

  it("is disabled at 20 items", () => {
    render(<VoiceRecorder tagId="t_birthday" count={20} onSaved={() => {}} />);
    expect(screen.getByRole("button", { name: "Record voice" })).toBeDisabled();
  });
});
