import { useEffect, useRef, useState } from "react";
import { computeCentering, type Rect } from "../lib/centering";
import { detectCardRects } from "../lib/cv";
import { isLikelyBorderless } from "../lib/geometry";
import { CenteringResult } from "../components/CenteringResult";
import { CompsPanel } from "../components/CompsPanel";

type Edges = { left: number; top: number; right: number; bottom: number };

const DEFAULT_OUTER = (w: number, h: number): Rect => ({ left: w * 0.05, top: h * 0.05, right: w * 0.95, bottom: h * 0.95 });
const DEFAULT_INNER = (w: number, h: number): Rect => ({ left: w * 0.14, top: h * 0.14, right: w * 0.86, bottom: h * 0.86 });

export function ScanPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [outer, setOuter] = useState<Rect | null>(null);
  const [inner, setInner] = useState<Rect | null>(null);
  const [confidence, setConfidence] = useState<number | null>(null);
  const [detecting, setDetecting] = useState(false);
  const [detectError, setDetectError] = useState<string | null>(null);

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const image = new Image();
    image.onload = () => {
      setImg(image);
      setOuter(DEFAULT_OUTER(image.width, image.height));
      setInner(DEFAULT_INNER(image.width, image.height));
      setConfidence(null);
      setDetectError(null);
    };
    image.src = URL.createObjectURL(file);
  }

  // Redraw whenever the image or rects change.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !img) return;
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(img, 0, 0);
    const drawRect = (r: Rect, color: string) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = Math.max(2, img.width / 250);
      ctx.strokeRect(r.left, r.top, r.right - r.left, r.bottom - r.top);
    };
    if (outer) drawRect(outer, "#3b82f6");
    if (inner) drawRect(inner, "#22c55e");
  }, [img, outer, inner]);

  async function autoDetect() {
    const canvas = canvasRef.current;
    if (!canvas || !img) return;
    setDetecting(true);
    setDetectError(null);
    try {
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("no canvas context");
      ctx.drawImage(img, 0, 0);
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const result = await detectCardRects(data);
      setOuter(result.outer);
      setInner(result.inner);
      setConfidence(result.confidence);
    } catch (err) {
      setDetectError(err instanceof Error ? err.message : "Detection failed — adjust the lines manually.");
    } finally {
      setDetecting(false);
    }
  }

  function updateEdge(which: "outer" | "inner", edge: keyof Edges, value: number) {
    const setter = which === "outer" ? setOuter : setInner;
    setter((prev) => (prev ? { ...prev, [edge]: value } : prev));
  }

  const ready = img && outer && inner;
  const borderless = ready ? isLikelyBorderless(outer, inner) : false;
  const result = ready && !borderless ? computeCentering(outer, inner) : null;

  return (
    <div className="page">
      <h1>Scan a card</h1>

      <div className="card">
        <input type="file" accept="image/*" capture="environment" onChange={onFile} />
        <p className="muted" style={{ marginTop: 8 }}>
          Lay the card flat, fill the frame, shoot straight-on for accurate centering.
        </p>
      </div>

      {img && (
        <>
          <div className="card">
            <div className="canvas-wrap">
              <canvas ref={canvasRef} />
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
              <button onClick={autoDetect} disabled={detecting}>
                {detecting ? "Detecting…" : "Auto-detect borders"}
              </button>
            </div>
            {confidence !== null && (
              <p className="muted" style={{ marginTop: 8 }}>
                Detection confidence: {Math.round(confidence * 100)}%
                {confidence < 0.6 ? " — low, please nudge the lines below." : " — looks good. Fine-tune if needed."}
              </p>
            )}
            {detectError && <p style={{ color: "var(--warn)", marginTop: 8 }}>{detectError}</p>}
          </div>

          {outer && inner && (
            <div className="card">
              <h2 style={{ fontSize: 16, marginTop: 0 }}>Adjust borders</h2>
              <p className="muted">Blue = card edge, green = print frame. Drag to match exactly.</p>
              {(["left", "top", "right", "bottom"] as const).map((edge) => (
                <div key={`o-${edge}`}>
                  <label className="slider">Card {edge}: {Math.round(outer[edge])}px</label>
                  <input
                    type="range" min={0} max={edge === "left" || edge === "right" ? img.width : img.height}
                    value={outer[edge]} onChange={(e) => updateEdge("outer", edge, Number(e.target.value))}
                  />
                </div>
              ))}
              {(["left", "top", "right", "bottom"] as const).map((edge) => (
                <div key={`i-${edge}`}>
                  <label className="slider">Frame {edge}: {Math.round(inner[edge])}px</label>
                  <input
                    type="range" min={0} max={edge === "left" || edge === "right" ? img.width : img.height}
                    value={inner[edge]} onChange={(e) => updateEdge("inner", edge, Number(e.target.value))}
                  />
                </div>
              ))}
            </div>
          )}

          {result && <CenteringResult result={result} borderless={false} />}
          {borderless && <CenteringResult result={computeCentering(outer!, inner!)} borderless={true} />}

          <CompsPanel />
        </>
      )}
    </div>
  );
}
