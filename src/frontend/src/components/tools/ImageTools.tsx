import { Download, RotateCcw, Save } from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Slider } from "../ui/slider";

type OnSave = (img: HTMLImageElement, dataUrl: string) => void;
type Props = {
  tool: string;
  img?: HTMLImageElement;
  file?: File;
  onSave?: OnSave;
};

function NoFileMsg({ type = "image" }: { type?: string }) {
  return (
    <div
      className="flex flex-col items-center justify-center h-48 text-center"
      data-ocid="tool.empty_state"
    >
      <div
        className="w-12 h-12 rounded-full flex items-center justify-center mb-3"
        style={{ background: "#2a2a2a" }}
      >
        <span className="text-2xl">📁</span>
      </div>
      <p className="text-sm" style={{ color: "#888" }}>
        Upload {type === "image" ? "an image" : "a file"} on the left to get
        started
      </p>
    </div>
  );
}

function downloadCanvas(
  canvas: HTMLCanvasElement,
  name = "result.png",
  format: "png" | "jpg" = "png",
) {
  const a = document.createElement("a");
  const mime = format === "jpg" ? "image/jpeg" : "image/png";
  const ext = format === "jpg" ? "jpg" : "png";
  a.href = canvas.toDataURL(mime, format === "jpg" ? 0.92 : 1);
  a.download = `${name.replace(/\.(png|jpg|jpeg)$/i, "")}.${ext}`;
  a.click();
}

function saveCanvas(
  canvas: HTMLCanvasElement,
  onSave: OnSave | undefined,
  mimeType = "image/png",
  quality = 1,
) {
  if (!onSave) return;
  const dataUrl = canvas.toDataURL(mimeType, quality);
  const img = new window.Image();
  img.onload = () => onSave(img, dataUrl);
  img.src = dataUrl;
}

function useSaveNotice() {
  const [saved, setSaved] = useState(false);
  const showSave = useCallback(() => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }, []);
  return { saved, showSave };
}
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function estimateImageSize(img: HTMLImageElement): number {
  // Estimate uncompressed size: width * height * 4 bytes (RGBA)
  // Divide by ~8 as a rough compression estimate for display photos
  return Math.round((img.width * img.height * 4) / 8);
}

function FileSizeBar({
  file,
  img,
}: { file?: File; img?: HTMLImageElement | null }) {
  if (!file && !img) return null;
  const bytes = file ? file.size : img ? estimateImageSize(img) : 0;
  const label = file ? "File Size" : "Est. Size";
  return (
    <div
      className="flex items-center gap-2 px-2 py-1 rounded text-xs"
      style={{ background: "#1a2a1a", border: "1px solid #2a4a2a" }}
    >
      <span style={{ color: "#888" }}>{label}:</span>
      <span className="font-semibold" style={{ color: "#64b5f6" }}>
        {formatFileSize(bytes)}
      </span>
    </div>
  );
}

// ZoomableCanvas: wraps canvas/content with zoom controls
function ZoomableCanvas({ children }: { children: React.ReactNode }) {
  const [zoom, setZoom] = useState(100);
  const containerRef = useRef<HTMLDivElement>(null);

  const step = 25;
  const min = 25;
  const max = 400;

  const zoomIn = () => setZoom((z) => Math.min(z + step, max));
  const zoomOut = () => setZoom((z) => Math.max(z - step, min));
  const fitZoom = () => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    const inner = el.querySelector("[data-zoom-content]") as HTMLElement;
    if (!inner) return;
    const child = inner.firstElementChild as HTMLCanvasElement | null;
    if (!child) return;
    const cw = child.width || child.offsetWidth || 300;
    const ch = child.height || child.offsetHeight || 300;
    const aw = el.clientWidth - 32;
    const ah = el.clientHeight - 32;
    const scale = Math.min(aw / cw, ah / ch, 4);
    setZoom(Math.max(Math.round(scale * 100), min));
  };

  const btnStyle: React.CSSProperties = {
    background: "#2a2a2a",
    border: "1px solid #444",
    color: "#ccc",
    borderRadius: 4,
    padding: "2px 8px",
    fontSize: 12,
    cursor: "pointer",
    lineHeight: "1.4",
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        maxHeight: "calc(100vh - 420px)",
        minHeight: 0,
        overflow: "hidden",
      }}
    >
      {/* Zoom toolbar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 4,
          padding: "4px 0",
          flexShrink: 0,
        }}
      >
        <button
          type="button"
          style={btnStyle}
          onClick={zoomOut}
          title="Zoom Out"
          data-ocid="tool.toggle"
        >
          −
        </button>
        <span
          style={{
            color: "#888",
            fontSize: 12,
            minWidth: 40,
            textAlign: "center",
          }}
        >
          {zoom}%
        </span>
        <button
          type="button"
          style={btnStyle}
          onClick={zoomIn}
          title="Zoom In"
          data-ocid="tool.toggle"
        >
          +
        </button>
        <button
          type="button"
          style={{ ...btnStyle, padding: "2px 10px" }}
          onClick={fitZoom}
          title="Fit to View"
          data-ocid="tool.toggle"
        >
          Fit
        </button>
      </div>
      {/* Scrollable viewport */}
      <div
        ref={containerRef}
        style={{
          flex: 1,
          overflow: "auto",
          background: "#1a1a1a",
          borderRadius: 6,
          border: "1px solid #3a3a3a",
          minHeight: 0,
        }}
      >
        <div
          data-zoom-content
          style={{
            display: "inline-block",
            transformOrigin: "top left",
            transform: `scale(${zoom / 100})`,
            padding: 16,
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

// BG Remove
const BG_SWATCHES = [
  { label: "White", color: "#ffffff" },
  { label: "Black", color: "#000000" },
  { label: "Red", color: "#ef4444" },
  { label: "Blue", color: "#3b82f6" },
  { label: "Green", color: "#22c55e" },
  { label: "Yellow", color: "#facc15" },
];

function applyBgColor(
  canvas: HTMLCanvasElement,
  color: string,
  transparent: boolean,
) {
  if (transparent) return;
  const ctx = canvas.getContext("2d")!;
  const prev = ctx.globalCompositeOperation;
  ctx.globalCompositeOperation = "destination-over";
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.globalCompositeOperation = prev;
}

function BgRemoveTool({
  img: externalImg,
  onSave,
}: { img?: HTMLImageElement; onSave?: OnSave }) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [tolerance, setTolerance] = useState(30);
  const [status, setStatus] = useState("");
  const [bgColor, setBgColor] = useState("#ffffff");
  const [transparentBg, setTransparentBg] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const origData = useRef<ImageData | null>(null);
  const removedData = useRef<ImageData | null>(null);
  const { saved, showSave } = useSaveNotice();

  const initFromImg = useCallback((i: HTMLImageElement) => {
    setImg(i);
    setStatus("");
    removedData.current = null;
  }, []);

  useEffect(() => {
    if (externalImg) initFromImg(externalImg);
  }, [externalImg, initFromImg]);

  useEffect(() => {
    if (!img || !canvasRef.current) return;
    const c = canvasRef.current;
    c.width = img.width;
    c.height = img.height;
    const ctx = c.getContext("2d")!;
    ctx.drawImage(img, 0, 0);
    origData.current = ctx.getImageData(0, 0, img.width, img.height);
    removedData.current = null;
  }, [img]);

  // Re-render when bg color/transparency changes
  useEffect(() => {
    if (!canvasRef.current || !removedData.current) return;
    const c = canvasRef.current;
    const ctx = c.getContext("2d")!;
    ctx.putImageData(removedData.current, 0, 0);
    applyBgColor(c, bgColor, transparentBg);
  }, [bgColor, transparentBg]);

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !origData.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const sx = canvasRef.current.width / rect.width;
    const sy = canvasRef.current.height / rect.height;
    floodFill(
      Math.floor((e.clientX - rect.left) * sx),
      Math.floor((e.clientY - rect.top) * sy),
    );
  };

  const floodFill = (startX: number, startY: number) => {
    if (!canvasRef.current || !origData.current) return;
    const c = canvasRef.current;
    const ctx = c.getContext("2d")!;
    // Start from current removed state (or original) so cumulative clicks work
    const base = removedData.current ?? origData.current;
    ctx.putImageData(base, 0, 0);
    const id = ctx.getImageData(0, 0, c.width, c.height);
    const d = id.data;
    const w = c.width;
    const h = c.height;
    const si = (startY * w + startX) * 4;
    const tr = origData.current.data[si];
    const tg = origData.current.data[si + 1];
    const tb = origData.current.data[si + 2];
    const tol = tolerance;
    const vis = new Uint8Array(w * h);
    const queue: number[][] = [[startX, startY]];
    while (queue.length) {
      const [cx, cy] = queue.pop()!;
      if (cx < 0 || cx >= w || cy < 0 || cy >= h) continue;
      const vi = cy * w + cx;
      if (vis[vi]) continue;
      vis[vi] = 1;
      const pi = (cy * w + cx) * 4;
      const origD = origData.current.data;
      if (
        Math.abs(origD[pi] - tr) > tol ||
        Math.abs(origD[pi + 1] - tg) > tol ||
        Math.abs(origD[pi + 2] - tb) > tol
      )
        continue;
      d[pi + 3] = 0;
      queue.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]);
    }
    ctx.putImageData(id, 0, 0);
    removedData.current = ctx.getImageData(0, 0, c.width, c.height);
    applyBgColor(c, bgColor, transparentBg);
    setStatus("Done! Click more areas to remove.");
  };

  return (
    <div className="space-y-4">
      <div className="p-3 space-y-2">
        <h2 className="font-semibold" style={{ color: "#e0e0e0" }}>
          Remove Background
        </h2>
        <p className="text-sm" style={{ color: "#888" }}>
          Click on background areas in the canvas to remove them. Adjust
          tolerance for similar colors.
        </p>
        {!img ? (
          <NoFileMsg />
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-4">
              <Label className="text-xs w-32" style={{ color: "#aaa" }}>
                Tolerance: {tolerance}
              </Label>
              <Slider
                min={1}
                max={100}
                value={[tolerance]}
                onValueChange={([v]) => setTolerance(v)}
                className="flex-1"
              />
            </div>
            <p className="text-blue-400 text-sm">
              Click on background areas below to remove them
            </p>
            {status && <p className="text-green-400 text-sm">{status}</p>}
            {saved && (
              <p className="text-emerald-400 text-sm font-medium">
                ✅ Saved! Next tool will use this edited image.
              </p>
            )}
            <ZoomableCanvas>
              <canvas
                ref={canvasRef}
                onClick={handleClick}
                onKeyDown={(e) => {
                  if (e.key === "Enter")
                    handleClick(
                      e as unknown as React.MouseEvent<HTMLCanvasElement>,
                    );
                }}
                tabIndex={0}
                className="cursor-crosshair"
                style={{
                  display: "block",
                  background:
                    "repeating-conic-gradient(#444 0% 25%,#555 0% 50%) 0 0/20px 20px",
                }}
                data-ocid="tool.canvas_target"
              />
            </ZoomableCanvas>
            {/* Background Color Section */}
            <div
              className="rounded-lg p-3 space-y-2"
              style={{ background: "#2a2a2a", border: "1px solid #3a3a3a" }}
            >
              <div className="flex items-center justify-between">
                <Label className="text-gray-200 font-medium text-sm">
                  Background Color
                </Label>
                <label
                  className="flex items-center gap-2 cursor-pointer"
                  data-ocid="tool.toggle"
                >
                  <input
                    type="checkbox"
                    checked={transparentBg}
                    onChange={(e) => setTransparentBg(e.target.checked)}
                    className="w-4 h-4 accent-blue-500"
                    data-ocid="tool.checkbox"
                  />
                  <span className="text-sm" style={{ color: "#aaa" }}>
                    Transparent
                  </span>
                </label>
              </div>
              {!transparentBg && (
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2">
                    {BG_SWATCHES.map((s) => (
                      <button
                        type="button"
                        key={s.color}
                        title={s.label}
                        onClick={() => setBgColor(s.color)}
                        className="w-8 h-8 rounded-md border-2 transition-all"
                        style={{
                          backgroundColor: s.color,
                          borderColor:
                            bgColor === s.color ? "#60a5fa" : "#4b5563",
                          boxShadow:
                            bgColor === s.color ? "0 0 0 2px #3b82f6" : "none",
                        }}
                        data-ocid="tool.toggle"
                      />
                    ))}
                    <label
                      className="w-8 h-8 rounded-md border-2 border-gray-600 overflow-hidden cursor-pointer relative"
                      title="Custom color"
                    >
                      <span
                        className="absolute inset-0"
                        style={{
                          background: "linear-gradient(135deg,#f00,#0f0,#00f)",
                        }}
                      />
                      <input
                        type="color"
                        value={bgColor}
                        onChange={(e) => setBgColor(e.target.value)}
                        className="absolute opacity-0 w-full h-full cursor-pointer"
                        data-ocid="tool.input"
                      />
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-6 h-6 rounded border border-gray-500 flex-shrink-0"
                      style={{ backgroundColor: bgColor }}
                    />
                    <span className="text-gray-400 text-xs font-mono">
                      {bgColor}
                    </span>
                  </div>
                </div>
              )}
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button
                onClick={() => {
                  const c = canvasRef.current!;
                  const ctx = c.getContext("2d")!;
                  ctx.putImageData(origData.current!, 0, 0);
                  removedData.current = null;
                  setStatus("");
                }}
                variant="outline"
                size="sm"
                data-ocid="tool.secondary_button"
              >
                <RotateCcw className="w-4 h-4 mr-1" />
                Reset
              </Button>
              <Button
                onClick={() =>
                  downloadCanvas(canvasRef.current!, "result.png", "png")
                }
                size="sm"
                data-ocid="tool.primary_button"
              >
                <Download className="w-4 h-4 mr-1" />
                PNG
              </Button>
              <Button
                onClick={() =>
                  downloadCanvas(canvasRef.current!, "result.jpg", "jpg")
                }
                size="sm"
                variant="outline"
              >
                <Download className="w-4 h-4 mr-1" />
                JPG
              </Button>
              {onSave && (
                <Button
                  onClick={() => {
                    saveCanvas(canvasRef.current!, onSave);
                    showSave();
                  }}
                  size="sm"
                  className="text-white"
                  style={{ background: "#2a7a4a" }}
                  data-ocid="tool.save_button"
                >
                  <Save className="w-4 h-4 mr-1" />
                  Save to Workspace
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Perspective Crop
function PerspectiveCropTool({
  img: externalImg,
  onSave,
}: { img?: HTMLImageElement; onSave?: OnSave }) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [corners, setCorners] = useState<[number, number][]>([]);
  const draggingRef = useRef<number | null>(null);
  const displayRef = useRef<HTMLCanvasElement>(null);
  const imgSize = useRef({ w: 0, h: 0 });
  const cornersHistoryRef = useRef<[number, number][][]>([]);
  const cornersHistoryIdxRef = useRef(-1);
  const cornersRef = useRef<[number, number][]>([]);
  const HANDLE_R = 10;
  const { saved, showSave } = useSaveNotice();

  const pushCornersHistory = useCallback((cs: [number, number][]) => {
    const hist = cornersHistoryRef.current;
    const idx = cornersHistoryIdxRef.current;
    // truncate redo stack
    cornersHistoryRef.current = hist.slice(0, idx + 1);
    cornersHistoryRef.current.push(cs.map((c) => [...c] as [number, number]));
    if (cornersHistoryRef.current.length > 20)
      cornersHistoryRef.current.shift();
    cornersHistoryIdxRef.current = cornersHistoryRef.current.length - 1;
  }, []);

  const getDefaultCorners = useCallback((): [number, number][] => {
    const { w, h } = imgSize.current;
    return [
      [0, 0],
      [w, 0],
      [w, h],
      [0, h],
    ];
  }, []);

  useEffect(() => {
    if (!externalImg) return;
    setImg(externalImg);
    const MAX = 480;
    const scale = Math.min(1, MAX / externalImg.naturalWidth);
    imgSize.current = {
      w: externalImg.naturalWidth * scale,
      h: externalImg.naturalHeight * scale,
    };
    const initial: [number, number][] = [
      [0, 0],
      [externalImg.naturalWidth * scale, 0],
      [externalImg.naturalWidth * scale, externalImg.naturalHeight * scale],
      [0, externalImg.naturalHeight * scale],
    ];
    cornersHistoryRef.current = [
      initial.map((c) => [...c] as [number, number]),
    ];
    cornersHistoryIdxRef.current = 0;
    setCorners(initial);
  }, [externalImg]);

  // keep ref in sync
  useEffect(() => {
    cornersRef.current = corners;
  }, [corners]);

  const redraw = useCallback(
    (cs: [number, number][]) => {
      if (!displayRef.current || !img) return;
      const c = displayRef.current;
      c.width = imgSize.current.w;
      c.height = imgSize.current.h;
      const ctx = c.getContext("2d")!;
      ctx.drawImage(img, 0, 0, c.width, c.height);
      ctx.strokeStyle = "#3b82f6";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cs[0][0], cs[0][1]);
      for (let i = 1; i < 4; i++) ctx.lineTo(cs[i][0], cs[i][1]);
      ctx.closePath();
      ctx.stroke();
      for (const [x, y] of cs) {
        ctx.beginPath();
        ctx.arc(x, y, HANDLE_R, 0, Math.PI * 2);
        ctx.fillStyle = "#3b82f6";
        ctx.fill();
        ctx.strokeStyle = "white";
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    },
    [img],
  );

  useEffect(() => {
    if (corners.length === 4) redraw(corners);
  }, [corners, redraw]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        const idx = cornersHistoryIdxRef.current;
        if (idx > 0) {
          cornersHistoryIdxRef.current = idx - 1;
          const prev = cornersHistoryRef.current[idx - 1].map(
            (c) => [...c] as [number, number],
          );
          setCorners(prev);
        }
      } else if (
        (e.ctrlKey || e.metaKey) &&
        (e.key === "y" || (e.shiftKey && e.key === "z"))
      ) {
        e.preventDefault();
        const idx = cornersHistoryIdxRef.current;
        if (idx < cornersHistoryRef.current.length - 1) {
          cornersHistoryIdxRef.current = idx + 1;
          const next = cornersHistoryRef.current[idx + 1].map(
            (c) => [...c] as [number, number],
          );
          setCorners(next);
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        if (onSave) {
          const out = buildCanvas();
          if (out) {
            saveCanvas(out, onSave);
            showSave();
          }
        }
      } else if (e.key === "Enter") {
        e.preventDefault();
        const out = buildCanvas();
        if (out) downloadCanvas(out, "perspective.png", "png");
      } else if (e.key === "r" || e.key === "R") {
        if (!(e.ctrlKey || e.metaKey)) {
          const def = getDefaultCorners();
          pushCornersHistory(def);
          setCorners(def);
        }
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onSave, showSave, getDefaultCorners, pushCornersHistory]);

  const onMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!displayRef.current) return;
    const rect = displayRef.current.getBoundingClientRect();
    const sx = displayRef.current.width / rect.width;
    const sy = displayRef.current.height / rect.height;
    const mx = (e.clientX - rect.left) * sx;
    const my = (e.clientY - rect.top) * sy;
    const cs = cornersRef.current;
    const idx = cs.findIndex(
      ([cx, cy]) => Math.hypot(cx - mx, cy - my) < HANDLE_R * 1.5,
    );
    if (idx >= 0) draggingRef.current = idx;
  };

  const onMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (draggingRef.current === null || !displayRef.current) return;
    const rect = displayRef.current.getBoundingClientRect();
    const sx = displayRef.current.width / rect.width;
    const sy = displayRef.current.height / rect.height;
    const mx = (e.clientX - rect.left) * sx;
    const my = (e.clientY - rect.top) * sy;
    const di = draggingRef.current;
    setCorners(
      (prev) =>
        prev.map((c, i) => (i === di ? [mx, my] : c)) as [number, number][],
    );
  };

  const onMouseUp = () => {
    if (draggingRef.current !== null) {
      pushCornersHistory(cornersRef.current);
      draggingRef.current = null;
    }
  };

  const buildCanvas = useCallback(() => {
    if (!img || corners.length < 4) return null;
    const sc = imgSize.current.w / img.naturalWidth;
    // convert display-space corners to original image pixel space
    const pts = corners.map(([x, y]): [number, number] => [x / sc, y / sc]) as [
      [number, number],
      [number, number],
      [number, number],
      [number, number],
    ];
    const [p0, p1, p2, p3] = pts; // TL, TR, BR, BL

    const outW = Math.round(
      Math.max(
        Math.hypot(p1[0] - p0[0], p1[1] - p0[1]),
        Math.hypot(p2[0] - p3[0], p2[1] - p3[1]),
      ),
    );
    const outH = Math.round(
      Math.max(
        Math.hypot(p3[0] - p0[0], p3[1] - p0[1]),
        Math.hypot(p2[0] - p1[0], p2[1] - p1[1]),
      ),
    );
    if (!outW || !outH) return null;

    // Read source pixels
    const tmpCanvas = document.createElement("canvas");
    tmpCanvas.width = img.naturalWidth;
    tmpCanvas.height = img.naturalHeight;
    const tmpCtx = tmpCanvas.getContext("2d")!;
    tmpCtx.drawImage(img, 0, 0);
    const srcData = tmpCtx.getImageData(
      0,
      0,
      img.naturalWidth,
      img.naturalHeight,
    );

    const out = document.createElement("canvas");
    out.width = outW;
    out.height = outH;
    const ctx = out.getContext("2d")!;
    const outData = ctx.createImageData(outW, outH);

    // Inverse bilinear interpolation: for each output pixel find source pixel
    for (let oy = 0; oy < outH; oy++) {
      const v = outH > 1 ? oy / (outH - 1) : 0;
      for (let ox = 0; ox < outW; ox++) {
        const u = outW > 1 ? ox / (outW - 1) : 0;
        // Bilinear map from unit square to quad (p0=TL, p1=TR, p2=BR, p3=BL)
        const sx =
          (1 - v) * ((1 - u) * p0[0] + u * p1[0]) +
          v * ((1 - u) * p3[0] + u * p2[0]);
        const sy =
          (1 - v) * ((1 - u) * p0[1] + u * p1[1]) +
          v * ((1 - u) * p3[1] + u * p2[1]);

        const ix = Math.round(sx);
        const iy = Math.round(sy);
        if (
          ix < 0 ||
          ix >= img.naturalWidth ||
          iy < 0 ||
          iy >= img.naturalHeight
        )
          continue;

        const si = (iy * img.naturalWidth + ix) * 4;
        const di = (oy * outW + ox) * 4;
        outData.data[di] = srcData.data[si];
        outData.data[di + 1] = srcData.data[si + 1];
        outData.data[di + 2] = srcData.data[si + 2];
        outData.data[di + 3] = srcData.data[si + 3];
      }
    }

    ctx.putImageData(outData, 0, 0);
    return out;
  }, [img, corners]);

  const applyPerspective = (fmt: "png" | "jpg" = "png") => {
    const out = buildCanvas();
    if (!out) return;
    downloadCanvas(out, "perspective.png", fmt);
  };

  return (
    <div className="p-3 space-y-2">
      <h2 className="font-semibold" style={{ color: "#e0e0e0" }}>
        Perspective Crop
      </h2>
      <div
        className="rounded px-3 py-1.5 text-xs"
        style={{
          background: "#1a2a3a",
          border: "1px solid #2a4a6a",
          color: "#6aa3d4",
        }}
      >
        Drag corners to align •{" "}
        <kbd className="font-mono bg-blue-100 px-1 rounded">Ctrl+Z</kbd> Undo •{" "}
        <kbd className="font-mono bg-blue-100 px-1 rounded">R</kbd> Reset •{" "}
        <kbd className="font-mono bg-blue-100 px-1 rounded">Ctrl+S</kbd> Save •{" "}
        <kbd className="font-mono bg-blue-100 px-1 rounded">Enter</kbd> Apply
      </div>
      {!img ? (
        <NoFileMsg />
      ) : (
        <div className="space-y-3">
          {saved && (
            <p className="text-sm font-medium" style={{ color: "#4caf80" }}>
              ✅ Saved! Next tool will use this edited image.
            </p>
          )}
          <ZoomableCanvas>
            <canvas
              ref={displayRef}
              onMouseDown={onMouseDown}
              onMouseMove={onMouseMove}
              onMouseUp={onMouseUp}
              onMouseLeave={onMouseUp}
              className="cursor-crosshair select-none"
              style={{ display: "block" }}
              data-ocid="tool.canvas_target"
            />
          </ZoomableCanvas>
          <div className="flex gap-2 flex-wrap">
            <Button
              onClick={() => applyPerspective("png")}
              size="sm"
              data-ocid="tool.primary_button"
            >
              <Download className="w-4 h-4 mr-1" />
              Apply PNG
            </Button>
            <Button
              onClick={() => applyPerspective("jpg")}
              size="sm"
              variant="outline"
            >
              <Download className="w-4 h-4 mr-1" />
              Apply JPG
            </Button>
            <Button
              onClick={() => {
                const def = getDefaultCorners();
                pushCornersHistory(def);
                setCorners(def);
              }}
              size="sm"
              variant="outline"
              data-ocid="tool.secondary_button"
            >
              <RotateCcw className="w-4 h-4 mr-1" />
              Reset
            </Button>
            {onSave && (
              <Button
                onClick={() => {
                  const out = buildCanvas();
                  if (!out) return;
                  saveCanvas(out, onSave);
                  showSave();
                }}
                size="sm"
                className="text-white"
                style={{ background: "#2a7a4a" }}
                data-ocid="tool.save_button"
              >
                <Save className="w-4 h-4 mr-1" />
                Save to Workspace
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Crop
function CropTool({
  img: externalImg,
  onSave,
}: { img?: HTMLImageElement; onSave?: OnSave }) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { saved, showSave } = useSaveNotice();

  // Drag state via refs (no re-render lag)
  type CropRect = { x: number; y: number; w: number; h: number };
  const cropRef = useRef<CropRect>({ x: 0, y: 0, w: 0, h: 0 });
  const [cropDisplay, setCropDisplay] = useState<CropRect>({
    x: 0,
    y: 0,
    w: 0,
    h: 0,
  });
  const scaleRef = useRef(1);

  // drag state
  const dragState = useRef<{
    mode: "new" | "move" | "resize";
    startX: number;
    startY: number;
    origCrop: CropRect;
    handleIdx?: number;
  } | null>(null);

  // history
  const historyRef = useRef<CropRect[]>([]);
  const histIdxRef = useRef(-1);

  const pushHistory = useCallback((r: CropRect) => {
    historyRef.current = historyRef.current.slice(0, histIdxRef.current + 1);
    historyRef.current.push({ ...r });
    if (historyRef.current.length > 20) historyRef.current.shift();
    histIdxRef.current = historyRef.current.length - 1;
  }, []);

  const HANDLE_SIZE = 8;

  // Get 8 handle positions [{x,y}] in canvas display coords
  const getHandles = useCallback((r: CropRect, scale: number) => {
    const x = r.x * scale;
    const y = r.y * scale;
    const w = r.w * scale;
    const h = r.h * scale;
    return [
      { x, y }, // TL
      { x: x + w / 2, y }, // TM
      { x: x + w, y }, // TR
      { x: x + w, y: y + h / 2 }, // MR
      { x: x + w, y: y + h }, // BR
      { x: x + w / 2, y: y + h }, // BM
      { x, y: y + h }, // BL
      { x, y: y + h / 2 }, // ML
    ];
  }, []);

  const getCursorForHandle = (idx: number) => {
    const cursors = [
      "nw-resize",
      "n-resize",
      "ne-resize",
      "e-resize",
      "se-resize",
      "s-resize",
      "sw-resize",
      "w-resize",
    ];
    return cursors[idx] ?? "pointer";
  };

  const drawCanvas = useCallback(
    (r: CropRect) => {
      if (!canvasRef.current || !img) return;
      const c = canvasRef.current;
      const ctx = c.getContext("2d")!;
      const scale = scaleRef.current;
      ctx.clearRect(0, 0, c.width, c.height);
      ctx.drawImage(img, 0, 0, c.width, c.height);

      const cx = r.x * scale;
      const cy = r.y * scale;
      const cw = r.w * scale;
      const ch = r.h * scale;

      // dim outside
      ctx.fillStyle = "rgba(0,0,0,0.45)";
      ctx.fillRect(0, 0, c.width, cy);
      ctx.fillRect(0, cy, cx, ch);
      ctx.fillRect(cx + cw, cy, c.width - cx - cw, ch);
      ctx.fillRect(0, cy + ch, c.width, c.height - cy - ch);

      // crop border
      ctx.strokeStyle = "#3b82f6";
      ctx.lineWidth = 2;
      ctx.setLineDash([]);
      ctx.strokeRect(cx, cy, cw, ch);

      // rule of thirds lines
      ctx.strokeStyle = "rgba(255,255,255,0.3)";
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(cx + cw / 3, cy);
      ctx.lineTo(cx + cw / 3, cy + ch);
      ctx.moveTo(cx + (2 * cw) / 3, cy);
      ctx.lineTo(cx + (2 * cw) / 3, cy + ch);
      ctx.moveTo(cx, cy + ch / 3);
      ctx.lineTo(cx + cw, cy + ch / 3);
      ctx.moveTo(cx, cy + (2 * ch) / 3);
      ctx.lineTo(cx + cw, cy + (2 * ch) / 3);
      ctx.stroke();
      ctx.setLineDash([]);

      // handles
      const handles = getHandles(r, scale);
      for (const h of handles) {
        ctx.fillStyle = "#ffffff";
        ctx.strokeStyle = "#3b82f6";
        ctx.lineWidth = 2;
        ctx.fillRect(
          h.x - HANDLE_SIZE / 2,
          h.y - HANDLE_SIZE / 2,
          HANDLE_SIZE,
          HANDLE_SIZE,
        );
        ctx.strokeRect(
          h.x - HANDLE_SIZE / 2,
          h.y - HANDLE_SIZE / 2,
          HANDLE_SIZE,
          HANDLE_SIZE,
        );
      }
    },
    [img, getHandles],
  );

  useEffect(() => {
    if (!externalImg) return;
    setImg(externalImg);
    const MAX = 480;
    const scale = Math.min(1, MAX / externalImg.naturalWidth);
    scaleRef.current = scale;
    const initial: CropRect = {
      x: 0,
      y: 0,
      w: externalImg.naturalWidth,
      h: externalImg.naturalHeight,
    };
    cropRef.current = { ...initial };
    setCropDisplay({ ...initial });
    historyRef.current = [{ ...initial }];
    histIdxRef.current = 0;
  }, [externalImg]);

  // Initialize canvas size when img loads
  useEffect(() => {
    if (!img || !canvasRef.current) return;
    const scale = scaleRef.current;
    canvasRef.current.width = img.naturalWidth * scale;
    canvasRef.current.height = img.naturalHeight * scale;
    drawCanvas(cropRef.current);
  }, [img, drawCanvas]);

  useEffect(() => {
    drawCanvas(cropDisplay);
  }, [cropDisplay, drawCanvas]);

  const getMousePos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = canvasRef.current.width / rect.width;
    const scaleY = canvasRef.current.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const getHitHandle = (mx: number, my: number, r: CropRect) => {
    const handles = getHandles(r, scaleRef.current);
    for (let i = 0; i < handles.length; i++) {
      const hx = handles[i].x;
      const hy = handles[i].y;
      if (Math.abs(mx - hx) <= HANDLE_SIZE && Math.abs(my - hy) <= HANDLE_SIZE)
        return i;
    }
    return -1;
  };

  const isInsideCrop = (mx: number, my: number, r: CropRect) => {
    const s = scaleRef.current;
    return (
      mx > r.x * s &&
      mx < (r.x + r.w) * s &&
      my > r.y * s &&
      my < (r.y + r.h) * s
    );
  };

  const onMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const { x: mx, y: my } = getMousePos(e);
    const r = cropRef.current;
    const handleIdx = getHitHandle(mx, my, r);
    if (handleIdx >= 0) {
      dragState.current = {
        mode: "resize",
        startX: mx,
        startY: my,
        origCrop: { ...r },
        handleIdx,
      };
    } else if (isInsideCrop(mx, my, r)) {
      dragState.current = {
        mode: "move",
        startX: mx,
        startY: my,
        origCrop: { ...r },
      };
    } else {
      const s = scaleRef.current;
      const newR: CropRect = { x: mx / s, y: my / s, w: 0, h: 0 };
      cropRef.current = newR;
      dragState.current = {
        mode: "new",
        startX: mx,
        startY: my,
        origCrop: { ...newR },
      };
    }
  };

  const clamp = (val: number, min: number, max: number) =>
    Math.max(min, Math.min(max, val));

  const onMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!dragState.current || !canvasRef.current || !img) return;
    const { x: mx, y: my } = getMousePos(e);
    const ds = dragState.current;
    const s = scaleRef.current;
    const imgW = img.naturalWidth;
    const imgH = img.naturalHeight;
    let r = { ...ds.origCrop };

    if (ds.mode === "new") {
      const x0 = ds.startX / s;
      const y0 = ds.startY / s;
      const x1 = clamp(mx / s, 0, imgW);
      const y1 = clamp(my / s, 0, imgH);
      r = {
        x: Math.min(x0, x1),
        y: Math.min(y0, y1),
        w: Math.abs(x1 - x0),
        h: Math.abs(y1 - y0),
      };
    } else if (ds.mode === "move") {
      const dx = (mx - ds.startX) / s;
      const dy = (my - ds.startY) / s;
      r = {
        x: clamp(ds.origCrop.x + dx, 0, imgW - ds.origCrop.w),
        y: clamp(ds.origCrop.y + dy, 0, imgH - ds.origCrop.h),
        w: ds.origCrop.w,
        h: ds.origCrop.h,
      };
    } else if (ds.mode === "resize" && ds.handleIdx !== undefined) {
      const dx = (mx - ds.startX) / s;
      const dy = (my - ds.startY) / s;
      const o = ds.origCrop;
      const idx = ds.handleIdx;
      let { x, y, w, h } = o;
      // TL=0 TM=1 TR=2 MR=3 BR=4 BM=5 BL=6 ML=7
      if (idx === 0) {
        x = clamp(o.x + dx, 0, o.x + o.w - 1);
        y = clamp(o.y + dy, 0, o.y + o.h - 1);
        w = o.x + o.w - x;
        h = o.y + o.h - y;
      } else if (idx === 1) {
        y = clamp(o.y + dy, 0, o.y + o.h - 1);
        h = o.y + o.h - y;
      } else if (idx === 2) {
        w = clamp(o.w + dx, 1, imgW - o.x);
        y = clamp(o.y + dy, 0, o.y + o.h - 1);
        h = o.y + o.h - y;
      } else if (idx === 3) {
        w = clamp(o.w + dx, 1, imgW - o.x);
      } else if (idx === 4) {
        w = clamp(o.w + dx, 1, imgW - o.x);
        h = clamp(o.h + dy, 1, imgH - o.y);
      } else if (idx === 5) {
        h = clamp(o.h + dy, 1, imgH - o.y);
      } else if (idx === 6) {
        x = clamp(o.x + dx, 0, o.x + o.w - 1);
        w = o.x + o.w - x;
        h = clamp(o.h + dy, 1, imgH - o.y);
      } else if (idx === 7) {
        x = clamp(o.x + dx, 0, o.x + o.w - 1);
        w = o.x + o.w - x;
      }
      r = { x, y, w, h };
    }

    cropRef.current = r;
    setCropDisplay({ ...r });
  };

  const onMouseUp = () => {
    if (dragState.current) {
      if (cropRef.current.w > 1 && cropRef.current.h > 1) {
        pushHistory(cropRef.current);
      }
      dragState.current = null;
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        const idx = histIdxRef.current;
        if (idx > 0) {
          histIdxRef.current = idx - 1;
          const prev = historyRef.current[idx - 1];
          cropRef.current = { ...prev };
          setCropDisplay({ ...prev });
        }
      } else if (
        (e.ctrlKey || e.metaKey) &&
        (e.key === "y" || (e.shiftKey && e.key === "z"))
      ) {
        e.preventDefault();
        const idx = histIdxRef.current;
        if (idx < historyRef.current.length - 1) {
          histIdxRef.current = idx + 1;
          const next = historyRef.current[idx + 1];
          cropRef.current = { ...next };
          setCropDisplay({ ...next });
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        if (onSave) {
          const out = buildCanvas();
          if (out) {
            saveCanvas(out, onSave);
            showSave();
          }
        }
      } else if (e.key === "Enter") {
        e.preventDefault();
        const out = buildCanvas();
        if (out) downloadCanvas(out, "cropped.png", "png");
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onSave, showSave]);

  const buildCanvas = useCallback(() => {
    if (!img) return null;
    const r = cropRef.current;
    if (r.w < 1 || r.h < 1) return null;
    const out = document.createElement("canvas");
    out.width = Math.round(r.w);
    out.height = Math.round(r.h);
    out.getContext("2d")!.drawImage(img, r.x, r.y, r.w, r.h, 0, 0, r.w, r.h);
    return out;
  }, [img]);

  const apply = (fmt: "png" | "jpg" = "png") => {
    const out = buildCanvas();
    if (!out) return;
    downloadCanvas(out, "cropped.png", fmt);
  };

  const _getCursor = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (dragState.current) return undefined;
    const { x: mx, y: my } = getMousePos(e);
    const r = cropRef.current;
    const handleIdx = getHitHandle(mx, my, r);
    if (handleIdx >= 0) return getCursorForHandle(handleIdx);
    if (isInsideCrop(mx, my, r)) return "move";
    return "crosshair";
  };

  return (
    <div className="p-3 space-y-2">
      <h2 className="font-semibold" style={{ color: "#e0e0e0" }}>
        Crop
      </h2>
      <div
        className="rounded px-3 py-1.5 text-xs"
        style={{
          background: "#1a2a3a",
          border: "1px solid #2a4a6a",
          color: "#6aa3d4",
        }}
      >
        Click & drag to select • Drag handles to resize •{" "}
        <kbd className="font-mono bg-blue-100 px-1 rounded">Ctrl+Z</kbd> Undo •{" "}
        <kbd className="font-mono bg-blue-100 px-1 rounded">Enter</kbd> Apply
      </div>
      {!img ? (
        <NoFileMsg />
      ) : (
        <div className="space-y-3">
          {saved && (
            <p className="text-sm font-medium" style={{ color: "#4caf80" }}>
              ✅ Saved! Next tool will use this edited image.
            </p>
          )}
          <ZoomableCanvas>
            <canvas
              ref={canvasRef}
              onMouseDown={onMouseDown}
              onMouseMove={(e) => {
                onMouseMove(e);
                if (canvasRef.current)
                  canvasRef.current.style.cursor = _getCursor(e) ?? "crosshair";
              }}
              onMouseUp={onMouseUp}
              onMouseLeave={onMouseUp}
              style={{ display: "block" }}
              data-ocid="tool.canvas_target"
            />
          </ZoomableCanvas>
          <p className="text-xs" style={{ color: "#888" }}>
            Selection: {Math.round(cropDisplay.w)} × {Math.round(cropDisplay.h)}{" "}
            px
          </p>
          <div className="flex gap-2 flex-wrap">
            <Button
              onClick={() => apply("png")}
              size="sm"
              data-ocid="tool.primary_button"
            >
              <Download className="w-4 h-4 mr-1" />
              Crop PNG
            </Button>
            <Button onClick={() => apply("jpg")} size="sm" variant="outline">
              <Download className="w-4 h-4 mr-1" />
              Crop JPG
            </Button>
            {onSave && (
              <Button
                onClick={() => {
                  const out = buildCanvas();
                  if (!out) return;
                  saveCanvas(out, onSave);
                  showSave();
                }}
                size="sm"
                className="text-white"
                style={{ background: "#2a7a4a" }}
                data-ocid="tool.save_button"
              >
                <Save className="w-4 h-4 mr-1" />
                Save to Workspace
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Resize
function ResizeTool({
  img: externalImg,
  onSave,
}: { img?: HTMLImageElement; onSave?: OnSave }) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [w, setW] = useState(0);
  const [h, setH] = useState(0);
  const [lock, setLock] = useState(true);
  const { saved, showSave } = useSaveNotice();

  useEffect(() => {
    if (!externalImg) return;
    setImg(externalImg);
    setW(externalImg.width);
    setH(externalImg.height);
  }, [externalImg]);

  const buildCanvas = useCallback(() => {
    if (!img) return null;
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    c.getContext("2d")!.drawImage(img, 0, 0, w, h);
    return c;
  }, [img, w, h]);

  const apply = (fmt: "png" | "jpg" = "png") => {
    const c = buildCanvas();
    if (!c) return;
    downloadCanvas(c, "resized.png", fmt);
  };

  return (
    <div className="p-3 space-y-2">
      <h2 className="font-semibold" style={{ color: "#e0e0e0" }}>
        Resize
      </h2>
      {!img ? (
        <NoFileMsg />
      ) : (
        <div className="space-y-3">
          <div className="flex gap-3 items-end">
            <div>
              <Label className="text-xs mb-1 block" style={{ color: "#aaa" }}>
                Width
              </Label>
              <Input
                type="number"
                value={w}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setW(v);
                  if (lock && img)
                    setH(Math.round((v * img.height) / img.width));
                }}
                className="w-28"
                style={{
                  background: "#333",
                  color: "#e0e0e0",
                  border: "1px solid #555",
                }}
              />
            </div>
            <div>
              <Label className="text-xs mb-1 block" style={{ color: "#aaa" }}>
                Height
              </Label>
              <Input
                type="number"
                value={h}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setH(v);
                  if (lock && img)
                    setW(Math.round((v * img.width) / img.height));
                }}
                className="w-28"
                style={{
                  background: "#333",
                  color: "#e0e0e0",
                  border: "1px solid #555",
                }}
              />
            </div>
            <Button
              variant={lock ? "default" : "outline"}
              size="sm"
              onClick={() => setLock(!lock)}
            >
              {lock ? "🔒" : "🔓"}
            </Button>
          </div>
          <p className="text-xs" style={{ color: "#888" }}>
            Original: {img.width} x {img.height}
          </p>
          {saved && (
            <p className="text-emerald-400 text-sm font-medium">
              ✅ Saved! Next tool will use this edited image.
            </p>
          )}
          <div className="flex gap-2 flex-wrap">
            <Button
              onClick={() => apply("png")}
              size="sm"
              data-ocid="tool.primary_button"
            >
              <Download className="w-4 h-4 mr-1" />
              Resize PNG
            </Button>
            <Button onClick={() => apply("jpg")} size="sm" variant="outline">
              <Download className="w-4 h-4 mr-1" />
              Resize JPG
            </Button>
            {onSave && (
              <Button
                onClick={() => {
                  const c = buildCanvas();
                  if (!c) return;
                  saveCanvas(c, onSave);
                  showSave();
                }}
                size="sm"
                className="text-white"
                style={{ background: "#2a7a4a" }}
                data-ocid="tool.save_button"
              >
                <Save className="w-4 h-4 mr-1" />
                Save to Workspace
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Rotate
function RotateTool({
  img: externalImg,
  onSave,
}: { img?: HTMLImageElement; onSave?: OnSave }) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [angle, setAngle] = useState(0);
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { saved, showSave } = useSaveNotice();

  useEffect(() => {
    if (!externalImg) return;
    setImg(externalImg);
  }, [externalImg]);

  const draw = useCallback(
    (i: HTMLImageElement, a: number, fh: boolean, fv: boolean) => {
      if (!canvasRef.current) return;
      const c = canvasRef.current;
      const rad = (a * Math.PI) / 180;
      const sw = i.width;
      const sh = i.height;
      if (a === 90 || a === 270) {
        c.width = sh;
        c.height = sw;
      } else {
        c.width = sw;
        c.height = sh;
      }
      const ctx = c.getContext("2d")!;
      ctx.save();
      ctx.translate(c.width / 2, c.height / 2);
      ctx.rotate(rad);
      ctx.scale(fh ? -1 : 1, fv ? -1 : 1);
      ctx.drawImage(i, -sw / 2, -sh / 2);
      ctx.restore();
    },
    [],
  );

  useEffect(() => {
    if (img) draw(img, angle, flipH, flipV);
  }, [img, angle, flipH, flipV, draw]);

  return (
    <div className="p-3 space-y-2">
      <h2 className="font-semibold" style={{ color: "#e0e0e0" }}>
        Rotate & Flip
      </h2>
      {!img ? (
        <NoFileMsg />
      ) : (
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            {[0, 90, 180, 270].map((a) => (
              <Button
                key={a}
                size="sm"
                variant={angle === a ? "default" : "outline"}
                onClick={() => setAngle(a)}
              >
                {a}°
              </Button>
            ))}
            <Button
              size="sm"
              variant={flipH ? "default" : "outline"}
              onClick={() => setFlipH(!flipH)}
            >
              Flip H
            </Button>
            <Button
              size="sm"
              variant={flipV ? "default" : "outline"}
              onClick={() => setFlipV(!flipV)}
            >
              Flip V
            </Button>
          </div>
          <canvas
            ref={canvasRef}
            className="max-w-full rounded"
            style={{ border: "1px solid #3a3a3a", maxHeight: 300 }}
          />
          {saved && (
            <p className="text-emerald-400 text-sm font-medium">
              ✅ Saved! Next tool will use this edited image.
            </p>
          )}
          <div className="flex gap-2 flex-wrap">
            <Button
              size="sm"
              onClick={() =>
                downloadCanvas(canvasRef.current!, "result.png", "png")
              }
              data-ocid="tool.primary_button"
            >
              <Download className="w-4 h-4 mr-1" />
              PNG
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                downloadCanvas(canvasRef.current!, "result.jpg", "jpg")
              }
            >
              <Download className="w-4 h-4 mr-1" />
              JPG
            </Button>
            {onSave && (
              <Button
                onClick={() => {
                  saveCanvas(canvasRef.current!, onSave);
                  showSave();
                }}
                size="sm"
                className="text-white"
                style={{ background: "#2a7a4a" }}
                data-ocid="tool.save_button"
              >
                <Save className="w-4 h-4 mr-1" />
                Save to Workspace
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Adjust
function AdjustTool({
  img: externalImg,
  onSave,
}: { img?: HTMLImageElement; onSave?: OnSave }) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [b, setB] = useState(100);
  const [c, setC] = useState(100);
  const [s, setS] = useState(100);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { saved, showSave } = useSaveNotice();

  useEffect(() => {
    if (!externalImg) return;
    setImg(externalImg);
  }, [externalImg]);

  const draw = useCallback(
    (i: HTMLImageElement, bv: number, cv: number, sv: number) => {
      if (!canvasRef.current) return;
      const canvas = canvasRef.current;
      canvas.width = i.width;
      canvas.height = i.height;
      const ctx = canvas.getContext("2d")!;
      ctx.filter = `brightness(${bv}%) contrast(${cv}%) saturate(${sv}%)`;
      ctx.drawImage(i, 0, 0);
      ctx.filter = "none";
    },
    [],
  );

  useEffect(() => {
    if (img) draw(img, b, c, s);
  }, [img, b, c, s, draw]);

  return (
    <div className="p-3 space-y-2">
      <h2 className="font-semibold" style={{ color: "#e0e0e0" }}>
        Brightness / Contrast / Saturation
      </h2>
      {!img ? (
        <NoFileMsg />
      ) : (
        <div className="space-y-3">
          {[
            { label: "Brightness", val: b, set: setB },
            { label: "Contrast", val: c, set: setC },
            { label: "Saturation", val: s, set: setS },
          ].map(({ label, val, set }) => (
            <div key={label} className="flex items-center gap-4">
              <Label className="text-xs w-32" style={{ color: "#aaa" }}>
                {label}: {val}%
              </Label>
              <Slider
                min={0}
                max={200}
                value={[val]}
                onValueChange={([v]) => set(v)}
                className="flex-1"
              />
            </div>
          ))}
          <canvas
            ref={canvasRef}
            className="max-w-full rounded"
            style={{ border: "1px solid #3a3a3a", maxHeight: 300 }}
          />
          {saved && (
            <p className="text-emerald-400 text-sm font-medium">
              ✅ Saved! Next tool will use this edited image.
            </p>
          )}
          <div className="flex gap-2 flex-wrap">
            <Button
              size="sm"
              onClick={() => {
                setB(100);
                setC(100);
                setS(100);
              }}
              data-ocid="tool.secondary_button"
            >
              Reset
            </Button>
            <Button
              size="sm"
              onClick={() =>
                downloadCanvas(canvasRef.current!, "result.png", "png")
              }
              data-ocid="tool.primary_button"
            >
              <Download className="w-4 h-4 mr-1" />
              PNG
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                downloadCanvas(canvasRef.current!, "result.jpg", "jpg")
              }
            >
              <Download className="w-4 h-4 mr-1" />
              JPG
            </Button>
            {onSave && (
              <Button
                onClick={() => {
                  saveCanvas(canvasRef.current!, onSave);
                  showSave();
                }}
                size="sm"
                className="text-white"
                style={{ background: "#2a7a4a" }}
                data-ocid="tool.save_button"
              >
                <Save className="w-4 h-4 mr-1" />
                Save to Workspace
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Sharpen/Blur
function FilterTool({
  img: externalImg,
  onSave,
}: { img?: HTMLImageElement; onSave?: OnSave }) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [mode, setMode] = useState<"blur" | "sharpen">("blur");
  const [strength, setStrength] = useState(2);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { saved, showSave } = useSaveNotice();

  useEffect(() => {
    if (!externalImg) return;
    setImg(externalImg);
    if (canvasRef.current) canvasRef.current.style.display = "none";
  }, [externalImg]);

  const apply = () => {
    if (!img || !canvasRef.current) return;
    const c = canvasRef.current;
    c.width = img.width;
    c.height = img.height;
    const ctx = c.getContext("2d")!;
    if (mode === "blur") {
      ctx.filter = `blur(${strength}px)`;
      ctx.drawImage(img, 0, 0);
      ctx.filter = "none";
    } else {
      ctx.drawImage(img, 0, 0);
      const id = ctx.getImageData(0, 0, c.width, c.height);
      const src = new Uint8ClampedArray(id.data);
      const kern = [-1, -1, -1, -1, 8 + strength, -1, -1, -1, -1];
      const out = id.data;
      const w = c.width;
      const h = c.height;
      for (let y = 1; y < h - 1; y++)
        for (let x = 1; x < w - 1; x++) {
          const i = (y * w + x) * 4;
          for (let ch = 0; ch < 3; ch++) {
            let sum = 0;
            for (let ky = -1; ky <= 1; ky++)
              for (let kx = -1; kx <= 1; kx++)
                sum +=
                  src[((y + ky) * w + (x + kx)) * 4 + ch] *
                  kern[(ky + 1) * 3 + (kx + 1)];
            out[i + ch] = Math.min(255, Math.max(0, sum));
          }
        }
      ctx.putImageData(id, 0, 0);
    }
    c.style.display = "block";
  };

  return (
    <div className="p-3 space-y-2">
      <h2 className="font-semibold" style={{ color: "#e0e0e0" }}>
        Sharpen / Blur
      </h2>
      {!img ? (
        <NoFileMsg />
      ) : (
        <div className="space-y-3">
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={mode === "blur" ? "default" : "outline"}
              onClick={() => setMode("blur")}
            >
              Blur
            </Button>
            <Button
              size="sm"
              variant={mode === "sharpen" ? "default" : "outline"}
              onClick={() => setMode("sharpen")}
            >
              Sharpen
            </Button>
          </div>
          <div className="flex items-center gap-4">
            <Label className="text-xs w-24" style={{ color: "#aaa" }}>
              Strength: {strength}
            </Label>
            <Slider
              min={1}
              max={10}
              value={[strength]}
              onValueChange={([v]) => setStrength(v)}
              className="flex-1"
            />
          </div>
          <canvas
            ref={canvasRef}
            className="max-w-full rounded"
            style={{ border: "1px solid #3a3a3a", display: "none" }}
          />
          {saved && (
            <p className="text-emerald-400 text-sm font-medium">
              ✅ Saved! Next tool will use this edited image.
            </p>
          )}
          <div className="flex gap-2 flex-wrap">
            <Button size="sm" onClick={apply} data-ocid="tool.secondary_button">
              Apply
            </Button>
            <Button
              size="sm"
              onClick={() =>
                downloadCanvas(canvasRef.current!, "result.png", "png")
              }
              data-ocid="tool.primary_button"
            >
              <Download className="w-4 h-4 mr-1" />
              PNG
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                downloadCanvas(canvasRef.current!, "result.jpg", "jpg")
              }
            >
              <Download className="w-4 h-4 mr-1" />
              JPG
            </Button>
            {onSave && (
              <Button
                onClick={() => {
                  if (
                    !canvasRef.current ||
                    canvasRef.current.style.display === "none"
                  ) {
                    apply();
                  }
                  saveCanvas(canvasRef.current!, onSave);
                  showSave();
                }}
                size="sm"
                className="text-white"
                style={{ background: "#2a7a4a" }}
                data-ocid="tool.save_button"
              >
                <Save className="w-4 h-4 mr-1" />
                Save to Workspace
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Format Convert
function ConvertTool({
  img: externalImg,
  onSave,
}: { img?: HTMLImageElement; onSave?: OnSave }) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [fmt, setFmt] = useState<"image/jpeg" | "image/png" | "image/webp">(
    "image/jpeg",
  );
  const [quality, setQuality] = useState(90);
  const { saved, showSave } = useSaveNotice();

  useEffect(() => {
    if (!externalImg) return;
    setImg(externalImg);
  }, [externalImg]);

  const buildCanvas = useCallback(() => {
    if (!img) return null;
    const c = document.createElement("canvas");
    c.width = img.width;
    c.height = img.height;
    c.getContext("2d")!.drawImage(img, 0, 0);
    return c;
  }, [img]);

  const convert = () => {
    const c = buildCanvas();
    if (!c) return;
    const ext = fmt.split("/")[1];
    const a = document.createElement("a");
    a.href = c.toDataURL(fmt, quality / 100);
    a.download = `converted.${ext}`;
    a.click();
  };

  return (
    <div className="p-3 space-y-2">
      <h2 className="font-semibold" style={{ color: "#e0e0e0" }}>
        Format Convert
      </h2>
      {!img ? (
        <NoFileMsg />
      ) : (
        <div className="space-y-3">
          <div className="flex gap-2">
            {(["image/jpeg", "image/png", "image/webp"] as const).map((f) => (
              <Button
                key={f}
                size="sm"
                variant={fmt === f ? "default" : "outline"}
                onClick={() => setFmt(f)}
              >
                {f.split("/")[1].toUpperCase()}
              </Button>
            ))}
          </div>
          {fmt !== "image/png" && (
            <div className="flex items-center gap-4">
              <Label className="text-xs w-24" style={{ color: "#aaa" }}>
                Quality: {quality}%
              </Label>
              <Slider
                min={10}
                max={100}
                value={[quality]}
                onValueChange={([v]) => setQuality(v)}
                className="flex-1"
              />
            </div>
          )}
          {saved && (
            <p className="text-emerald-400 text-sm font-medium">
              ✅ Saved! Next tool will use this edited image.
            </p>
          )}
          <div className="flex gap-2 flex-wrap">
            <Button size="sm" onClick={convert} data-ocid="tool.primary_button">
              <Download className="w-4 h-4 mr-1" />
              Convert & Download
            </Button>
            {onSave && (
              <Button
                onClick={() => {
                  const c = buildCanvas();
                  if (!c) return;
                  saveCanvas(c, onSave, fmt, quality / 100);
                  showSave();
                }}
                size="sm"
                className="text-white"
                style={{ background: "#2a7a4a" }}
                data-ocid="tool.save_button"
              >
                <Save className="w-4 h-4 mr-1" />
                Save to Workspace
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Compress
function CompressTool({
  img: externalImg,
  onSave,
}: { img?: HTMLImageElement; onSave?: OnSave }) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [quality, setQuality] = useState(60);
  const { saved, showSave } = useSaveNotice();

  useEffect(() => {
    if (!externalImg) return;
    setImg(externalImg);
  }, [externalImg]);

  const buildCanvas = useCallback(() => {
    if (!img) return null;
    const c = document.createElement("canvas");
    c.width = img.width;
    c.height = img.height;
    c.getContext("2d")!.drawImage(img, 0, 0);
    return c;
  }, [img]);

  const compress = () => {
    const c = buildCanvas();
    if (!c) return;
    const a = document.createElement("a");
    a.href = c.toDataURL("image/jpeg", quality / 100);
    a.download = "compressed.jpg";
    a.click();
  };

  return (
    <div className="p-3 space-y-2">
      <h2 className="font-semibold" style={{ color: "#e0e0e0" }}>
        Image Compression
      </h2>
      {!img ? (
        <NoFileMsg />
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-4">
            <Label className="text-xs w-24" style={{ color: "#aaa" }}>
              Quality: {quality}%
            </Label>
            <Slider
              min={5}
              max={100}
              value={[quality]}
              onValueChange={([v]) => setQuality(v)}
              className="flex-1"
            />
          </div>
          {saved && (
            <p className="text-emerald-400 text-sm font-medium">
              ✅ Saved! Next tool will use this edited image.
            </p>
          )}
          <div className="flex gap-2 flex-wrap">
            <Button
              size="sm"
              onClick={compress}
              data-ocid="tool.primary_button"
            >
              <Download className="w-4 h-4 mr-1" />
              Compress & Download
            </Button>
            {onSave && (
              <Button
                onClick={() => {
                  const c = buildCanvas();
                  if (!c) return;
                  saveCanvas(c, onSave, "image/jpeg", quality / 100);
                  showSave();
                }}
                size="sm"
                className="text-white"
                style={{ background: "#2a7a4a" }}
                data-ocid="tool.save_button"
              >
                <Save className="w-4 h-4 mr-1" />
                Save to Workspace
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Watermark
function WatermarkTool({
  img: externalImg,
  onSave,
}: { img?: HTMLImageElement; onSave?: OnSave }) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [text, setText] = useState("BBD Solution");
  const [size, setSize] = useState(32);
  const [opacity, setOpacity] = useState(50);
  const [pos, setPos] = useState<"tl" | "tr" | "bl" | "br" | "center">("br");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { saved, showSave } = useSaveNotice();

  useEffect(() => {
    if (!externalImg) return;
    setImg(externalImg);
  }, [externalImg]);

  const draw = useCallback(
    (i: HTMLImageElement) => {
      if (!canvasRef.current) return;
      const c = canvasRef.current;
      c.width = i.width;
      c.height = i.height;
      const ctx = c.getContext("2d")!;
      ctx.drawImage(i, 0, 0);
      ctx.globalAlpha = opacity / 100;
      ctx.fillStyle = "white";
      ctx.font = `bold ${size}px sans-serif`;
      ctx.textBaseline = "middle";
      const tm = ctx.measureText(text);
      const pad = 20;
      let x = 0;
      let y = 0;
      if (pos === "tl") {
        x = pad;
        y = pad + size / 2;
      } else if (pos === "tr") {
        x = c.width - tm.width - pad;
        y = pad + size / 2;
      } else if (pos === "bl") {
        x = pad;
        y = c.height - pad - size / 2;
      } else if (pos === "br") {
        x = c.width - tm.width - pad;
        y = c.height - pad - size / 2;
      } else {
        x = (c.width - tm.width) / 2;
        y = c.height / 2;
      }
      ctx.fillText(text, x, y);
      ctx.globalAlpha = 1;
    },
    [text, size, opacity, pos],
  );

  useEffect(() => {
    if (img) draw(img);
  }, [img, draw]);

  return (
    <div className="p-3 space-y-2">
      <h2 className="font-semibold" style={{ color: "#e0e0e0" }}>
        Watermark
      </h2>
      {!img ? (
        <NoFileMsg />
      ) : (
        <div className="space-y-3">
          <div>
            <Label className="text-xs mb-1 block" style={{ color: "#aaa" }}>
              Text
            </Label>
            <Input
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="border-gray-300 text-gray-800"
            />
          </div>
          <div className="flex items-center gap-4">
            <Label className="text-gray-600 w-20">Size: {size}</Label>
            <Slider
              min={10}
              max={100}
              value={[size]}
              onValueChange={([v]) => setSize(v)}
              className="flex-1"
            />
          </div>
          <div className="flex items-center gap-4">
            <Label className="text-xs w-24" style={{ color: "#aaa" }}>
              Opacity: {opacity}%
            </Label>
            <Slider
              min={10}
              max={100}
              value={[opacity]}
              onValueChange={([v]) => setOpacity(v)}
              className="flex-1"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {(["tl", "tr", "center", "bl", "br"] as const).map((p) => (
              <Button
                key={p}
                size="sm"
                variant={pos === p ? "default" : "outline"}
                onClick={() => setPos(p)}
              >
                {p.toUpperCase()}
              </Button>
            ))}
          </div>
          <canvas
            ref={canvasRef}
            className="max-w-full rounded"
            style={{ border: "1px solid #3a3a3a", maxHeight: 300 }}
          />
          {saved && (
            <p className="text-emerald-400 text-sm font-medium">
              ✅ Saved! Next tool will use this edited image.
            </p>
          )}
          <div className="flex gap-2 flex-wrap">
            <Button
              size="sm"
              onClick={() =>
                downloadCanvas(canvasRef.current!, "result.png", "png")
              }
              data-ocid="tool.primary_button"
            >
              <Download className="w-4 h-4 mr-1" />
              PNG
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                downloadCanvas(canvasRef.current!, "result.jpg", "jpg")
              }
            >
              <Download className="w-4 h-4 mr-1" />
              JPG
            </Button>
            {onSave && (
              <Button
                onClick={() => {
                  saveCanvas(canvasRef.current!, onSave);
                  showSave();
                }}
                size="sm"
                className="text-white"
                style={{ background: "#2a7a4a" }}
                data-ocid="tool.save_button"
              >
                <Save className="w-4 h-4 mr-1" />
                Save to Workspace
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Passport
function PassportTool({
  img: externalImg,
  onSave,
}: { img?: HTMLImageElement; onSave?: OnSave }) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [pSize, setPSize] = useState({ w: 413, h: 531, label: "35x45mm" });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { saved, showSave } = useSaveNotice();
  const SIZES = [
    { w: 413, h: 531, label: "35x45mm" },
    { w: 295, h: 413, label: "25x35mm" },
    { w: 236, h: 295, label: "20x25mm" },
    { w: 600, h: 600, label: "2x2 inch" },
  ];

  useEffect(() => {
    if (!externalImg) return;
    setImg(externalImg);
  }, [externalImg]);

  const draw = useCallback((i: HTMLImageElement, s: typeof pSize) => {
    if (!canvasRef.current) return;
    const c = canvasRef.current;
    c.width = s.w;
    c.height = s.h;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, s.w, s.h);
    const ar = i.width / i.height;
    const tar = s.w / s.h;
    let sx = 0;
    let sy = 0;
    let sw = i.width;
    let sh = i.height;
    if (ar > tar) {
      sw = sh * tar;
      sx = (i.width - sw) / 2;
    } else {
      sh = sw / tar;
      sy = (i.height - sh) / 2;
    }
    ctx.drawImage(i, sx, sy, sw, sh, 0, 0, s.w, s.h);
  }, []);

  useEffect(() => {
    if (img) draw(img, pSize);
  }, [img, pSize, draw]);

  return (
    <div className="p-3 space-y-2">
      <h2 className="font-semibold" style={{ color: "#e0e0e0" }}>
        Passport Photo Maker
      </h2>
      {!img ? (
        <NoFileMsg />
      ) : (
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            {SIZES.map((s) => (
              <Button
                key={s.label}
                size="sm"
                variant={pSize.label === s.label ? "default" : "outline"}
                onClick={() => setPSize(s)}
              >
                {s.label}
              </Button>
            ))}
          </div>
          <canvas
            ref={canvasRef}
            className="max-w-full rounded"
            style={{ border: "1px solid #3a3a3a", maxHeight: 300 }}
          />
          {saved && (
            <p className="text-emerald-400 text-sm font-medium">
              ✅ Saved! Next tool will use this edited image.
            </p>
          )}
          <div className="flex gap-2 flex-wrap">
            <Button
              size="sm"
              onClick={() =>
                downloadCanvas(canvasRef.current!, "result.png", "png")
              }
              data-ocid="tool.primary_button"
            >
              <Download className="w-4 h-4 mr-1" />
              PNG
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                downloadCanvas(canvasRef.current!, "result.jpg", "jpg")
              }
            >
              <Download className="w-4 h-4 mr-1" />
              JPG
            </Button>
            {onSave && (
              <Button
                onClick={() => {
                  saveCanvas(canvasRef.current!, onSave);
                  showSave();
                }}
                size="sm"
                className="text-white"
                style={{ background: "#2a7a4a" }}
                data-ocid="tool.save_button"
              >
                <Save className="w-4 h-4 mr-1" />
                Save to Workspace
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// DPI Tool
function DpiTool({
  img: externalImg,
  onSave,
}: { img?: HTMLImageElement; onSave?: OnSave }) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [dpi, setDpi] = useState(300);
  const { saved, showSave } = useSaveNotice();

  useEffect(() => {
    if (!externalImg) return;
    setImg(externalImg);
  }, [externalImg]);

  const buildCanvas = useCallback(() => {
    if (!img) return null;
    const scale = dpi / 72;
    const c = document.createElement("canvas");
    c.width = Math.round(img.width * scale);
    c.height = Math.round(img.height * scale);
    c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
    return c;
  }, [img, dpi]);

  const apply = (fmt: "png" | "jpg" = "png") => {
    const c = buildCanvas();
    if (!c) return;
    downloadCanvas(c, `image-${dpi}dpi.png`, fmt);
  };

  return (
    <div className="p-3 space-y-2">
      <h2 className="font-semibold" style={{ color: "#e0e0e0" }}>
        DPI Change
      </h2>
      <p className="text-sm" style={{ color: "#888" }}>
        Rescale image to target print DPI (assumes 72 DPI source).
      </p>
      {!img ? (
        <NoFileMsg />
      ) : (
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            {[72, 96, 150, 200, 300, 600].map((d) => (
              <Button
                key={d}
                size="sm"
                variant={dpi === d ? "default" : "outline"}
                onClick={() => setDpi(d)}
              >
                {d}
              </Button>
            ))}
          </div>
          <p className="text-sm" style={{ color: "#888" }}>
            Output: {Math.round((img.width * dpi) / 72)} x{" "}
            {Math.round((img.height * dpi) / 72)} px
          </p>
          {saved && (
            <p className="text-emerald-400 text-sm font-medium">
              ✅ Saved! Next tool will use this edited image.
            </p>
          )}
          <div className="flex gap-2 flex-wrap">
            <Button
              size="sm"
              onClick={() => apply("png")}
              data-ocid="tool.primary_button"
            >
              <Download className="w-4 h-4 mr-1" />
              Apply PNG
            </Button>
            <Button size="sm" variant="outline" onClick={() => apply("jpg")}>
              <Download className="w-4 h-4 mr-1" />
              Apply JPG
            </Button>
            {onSave && (
              <Button
                onClick={() => {
                  const c = buildCanvas();
                  if (!c) return;
                  saveCanvas(c, onSave);
                  showSave();
                }}
                size="sm"
                className="text-white"
                style={{ background: "#2a7a4a" }}
                data-ocid="tool.save_button"
              >
                <Save className="w-4 h-4 mr-1" />
                Save to Workspace
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ImageTools({ tool, img, file, onSave }: Props) {
  return (
    <div>
      {(file || img) && (
        <div className="px-3 pt-2 pb-0">
          <FileSizeBar file={file} img={img} />
        </div>
      )}
      <ImageToolInner tool={tool} img={img} onSave={onSave} />
    </div>
  );
}

function ImageToolInner({
  tool,
  img,
  onSave,
}: { tool: string; img?: HTMLImageElement; onSave?: OnSave }) {
  switch (tool) {
    case "img-crop":
      return <CropTool img={img} onSave={onSave} />;
    case "img-perspective":
      return <PerspectiveCropTool img={img} onSave={onSave} />;
    case "img-bgremove":
      return <BgRemoveTool img={img} onSave={onSave} />;
    case "img-resize":
      return <ResizeTool img={img} onSave={onSave} />;
    case "img-rotate":
      return <RotateTool img={img} onSave={onSave} />;
    case "img-adjust":
      return <AdjustTool img={img} onSave={onSave} />;
    case "img-filter":
      return <FilterTool img={img} onSave={onSave} />;
    case "img-convert":
      return <ConvertTool img={img} onSave={onSave} />;
    case "img-compress":
      return <CompressTool img={img} onSave={onSave} />;
    case "img-watermark":
      return <WatermarkTool img={img} onSave={onSave} />;
    case "img-passport":
      return <PassportTool img={img} onSave={onSave} />;
    case "img-dpi":
      return <DpiTool img={img} onSave={onSave} />;
    default:
      return <div className="text-gray-400">Select a tool</div>;
  }
}
