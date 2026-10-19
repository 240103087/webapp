import QRCode from "qrcode";

export const publicUrl = (code: string, origin = window.location.origin) => `${origin}/t/${code}`;
const OPTS = { errorCorrectionLevel: "M" as const, margin: 2, color: { dark: "#1B1A17", light: "#FFFFFF" } };

export function qrSvg(text: string): Promise<string> {
  return QRCode.toString(text, { ...OPTS, type: "svg" });
}
export function qrPngDataUrl(text: string, width = 1024): Promise<string> {
  return QRCode.toDataURL(text, { ...OPTS, width });
}
export const svgDataUrl = (svg: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

export function download(href: string, filename: string) {
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}
