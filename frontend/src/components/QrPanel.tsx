import { useEffect, useState } from "react";
import { formatCode } from "@moveeasy/shared";
import { Button, ButtonLink } from "../ui/Button";
import { useToast } from "../ui/Toast";
import { IconCopy, IconDownload, IconExternal } from "../ui/icons";
import { download, publicUrl, qrPngDataUrl, qrSvg, svgDataUrl } from "./qr";

export function QrPanel({ code, title }: { code: string; title: string }) {
  const url = publicUrl(code);
  const [svg, setSvg] = useState("");
  const toast = useToast();
  useEffect(() => {
    let alive = true;
    qrSvg(url).then((s) => alive && setSvg(s));
    return () => { alive = false; };
  }, [url]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      toast.show("Link copied");
    } catch {
      toast.show("Could not copy. Select the link and copy it by hand.", { kind: "error" });
    }
  }

  return (
    <section className="card stack qr-panel" aria-labelledby="sec-qr">
      <h2 id="sec-qr" className="section-title">QR code</h2>
      <div className="qr-frame">
        {svg ? <img src={svgDataUrl(svg)} alt={`QR code for ${title}, opens ${url}`} width={240} height={240} data-testid="qr" /> : <div className="skeleton" style={{ width: 240, height: 240 }} />}
        <p className="mono qr-code">{formatCode(code)}</p>
      </div>
      <p className="small muted qr-url">{url}</p>
      <div className="row">
        <Button size="sm" onClick={copy} icon={<IconCopy size={16} />}>Copy link</Button>
        <ButtonLink size="sm" to={`/t/${code}`} target="_blank" rel="noopener" icon={<IconExternal size={16} />}>Open</ButtonLink>
      </div>
      <div className="row">
        <Button size="sm" icon={<IconDownload size={16} />} onClick={async () => download(await qrPngDataUrl(url, 1024), `moveeasy-${code}.png`)}>PNG</Button>
        <Button size="sm" icon={<IconDownload size={16} />} onClick={async () => download(svgDataUrl(await qrSvg(url)), `moveeasy-${code}.svg`)}>SVG</Button>
      </div>
    </section>
  );
}
