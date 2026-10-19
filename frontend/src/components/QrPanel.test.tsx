import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { QrPanel } from "./QrPanel";
import { qrSvg, publicUrl } from "./qr";

describe("QR panel", () => {
  it("shows the code, the link and an SVG QR", async () => {
    render(<MemoryRouter><QrPanel code="7KQ4M2XP" title="Keys" /></MemoryRouter>);
    expect(screen.getByText("7KQ4 M2XP")).toBeInTheDocument();
    expect(screen.getByText("http://localhost:3000/t/7KQ4M2XP")).toBeInTheDocument();
    const img = await screen.findByTestId("qr");
    expect(img.getAttribute("src")).toMatch(/^data:image\/svg\+xml/);
    expect(screen.getByRole("link", { name: "Open" })).toHaveAttribute("href", "/t/7KQ4M2XP");
    expect(screen.getByRole("button", { name: "PNG" })).toBeInTheDocument();
  });
  it("encodes the full public URL", async () => {
    expect(publicUrl("ABCD2345", "https://moveeasy.kz")).toBe("https://moveeasy.kz/t/ABCD2345");
    expect(await qrSvg("https://moveeasy.kz/t/ABCD2345")).toContain("<svg");
  });
});
