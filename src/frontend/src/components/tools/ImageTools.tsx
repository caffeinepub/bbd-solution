import { Download, RotateCcw } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Slider } from "../ui/slider";

type Props = { tool: string; img?: HTMLImageElement; file?: File };

function NoFileMsg({ type = "image" }: { type?: string }) {
  return (
    <div
      className="flex flex-col items-center justify-center h-48 text-center"
      data-ocid="tool.empty_state"
    >
      <div className="w-12 h-12 rounded-full bg-gray-800 flex items-center justify-center mb-3">
        <span className="text-2xl">📁</span>
      </div>
      <p className="text-gray-400 text-sm">
        Upload {type === "image" ? "an image" : "a file"} on the left to get
        started
      </p>
    </div>
  );
}

function downloadCanvas(canvas: HTMLCanvasElement, name = "result.png") {
  const a = document.createElement("a");
  a.href = canvas.toDataURL("image/png");
  a.download = name;
  a.click();
}

// BG Remove
function BgRemoveTool({ img: externalImg }: { img?: HTMLImageElement }) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [tolerance, setTolerance] = useState(30);
  const [status, setStatus] = useState("");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const origData = useRef<ImageData | null>(null);

  const initFromImg = useCallback((i: HTMLImageElement) => {
    setImg(i);
    setStatus("");
    // Canvas drawing happens in effect below
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
  }, [img]);

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
    ctx.putImageData(origData.current, 0, 0);
    const id = ctx.getImageData(0, 0, c.width, c.height);
    const d = id.data;
    const w = c.width;
    const h = c.height;
    const si = (startY * w + startX) * 4;
    const tr = d[si];
    const tg = d[si + 1];
    const tb = d[si + 2];
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
      if (
        Math.abs(d[pi] - tr) > tol ||
        Math.abs(d[pi + 1] - tg) > tol ||
        Math.abs(d[pi + 2] - tb) > tol
      )
        continue;
      d[pi + 3] = 0;
      queue.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]);
    }
    ctx.putImageData(id, 0, 0);
    setStatus("Done! Click more areas to remove.");
  };

  return (
    <div className="space-y-4">
      <div className="bg-gray-900 rounded-xl p-4 space-y-3">
        <h2 className="text-white font-semibold">Remove Background</h2>
        <p className="text-gray-400 text-sm">
          Click on background areas in the canvas to remove them. Adjust
          tolerance for similar colors.
        </p>
        {!img ? (
          <NoFileMsg />
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-4">
              <Label className="text-gray-300 w-32">
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
            <div
              className="overflow-auto max-h-96 rounded-lg border border-gray-700"
              style={{
                background:
                  "repeating-conic-gradient(#444 0% 25%,#555 0% 50%) 0 0/20px 20px",
              }}
            >
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
                className="cursor-crosshair max-w-full"
                style={{ display: "block" }}
                data-ocid="tool.canvas_target"
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => {
                  const ctx = canvasRef.current!.getContext("2d")!;
                  ctx.putImageData(origData.current!, 0, 0);
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
                onClick={() => downloadCanvas(canvasRef.current!)}
                size="sm"
                data-ocid="tool.primary_button"
              >
                <Download className="w-4 h-4 mr-1" />
                Download PNG
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Perspective Crop
function PerspectiveCropTool({ img: externalImg }: { img?: HTMLImageElement }) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [corners, setCorners] = useState<[number, number][]>([]);
  const [dragging, setDragging] = useState<number | null>(null);
  const displayRef = useRef<HTMLCanvasElement>(null);
  const imgSize = useRef({ w: 0, h: 0 });
  const HANDLE_R = 10;

  useEffect(() => {
    if (!externalImg) return;
    setImg(externalImg);
    imgSize.current = { w: externalImg.width, h: externalImg.height };
    setCorners([
      [0, 0],
      [externalImg.width, 0],
      [externalImg.width, externalImg.height],
      [0, externalImg.height],
    ]);
  }, [externalImg]);

  useEffect(() => {
    if (!img || !displayRef.current || corners.length !== 4) return;
    const canvas = displayRef.current;
    const MAX = 700;
    const scale = Math.min(1, MAX / img.width);
    canvas.width = img.width * scale;
    canvas.height = img.height * scale;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const sc = corners.map(([x, y]) => [x * scale, y * scale]);
    ctx.strokeStyle = "#3b82f6";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(sc[0][0], sc[0][1]);
    ctx.lineTo(sc[1][0], sc[1][1]);
    ctx.lineTo(sc[2][0], sc[2][1]);
    ctx.lineTo(sc[3][0], sc[3][1]);
    ctx.closePath();
    ctx.stroke();
    sc.forEach(([cx, cy], i) => {
      ctx.beginPath();
      ctx.arc(cx, cy, HANDLE_R, 0, Math.PI * 2);
      ctx.fillStyle = i === dragging ? "#f59e0b" : "#3b82f6";
      ctx.fill();
      ctx.strokeStyle = "white";
      ctx.lineWidth = 2;
      ctx.stroke();
    });
  }, [img, corners, dragging]);

  const getImgPos = (
    e: React.MouseEvent<HTMLCanvasElement>,
  ): [number, number] => {
    const c = displayRef.current!;
    const r = c.getBoundingClientRect();
    const s = c.width / r.width;
    const px = (e.clientX - r.left) * s;
    const py = (e.clientY - r.top) * s;
    const scale = c.width / imgSize.current.w;
    return [px / scale, py / scale];
  };

  const onMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!displayRef.current) return;
    const [px, py] = getImgPos(e);
    const c = displayRef.current;
    const scale = c.width / imgSize.current.w;
    for (let i = 0; i < corners.length; i++) {
      const [cx, cy] = corners[i];
      if (Math.hypot((px - cx) * scale, (py - cy) * scale) < HANDLE_R + 5) {
        setDragging(i);
        return;
      }
    }
  };

  const onMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (dragging === null) return;
    const [px, py] = getImgPos(e);
    setCorners((prev) => {
      const next = [...prev] as [number, number][];
      next[dragging] = [
        Math.max(0, Math.min(imgSize.current.w, px)),
        Math.max(0, Math.min(imgSize.current.h, py)),
      ];
      return next;
    });
  };

  const applyPerspective = () => {
    if (!img || corners.length !== 4) return;
    const [p0, p1, p2, p3] = corners;
    const maxW = Math.max(
      Math.hypot(p1[0] - p0[0], p1[1] - p0[1]),
      Math.hypot(p2[0] - p3[0], p2[1] - p3[1]),
    );
    const maxH = Math.max(
      Math.hypot(p3[0] - p0[0], p3[1] - p0[1]),
      Math.hypot(p2[0] - p1[0], p2[1] - p1[1]),
    );
    const out = document.createElement("canvas");
    out.width = Math.round(maxW);
    out.height = Math.round(maxH);
    const ctx = out.getContext("2d")!;
    const STEPS = 64;
    const drawTri = (
      d0: number[],
      d1: number[],
      d2: number[],
      s0: number[],
      s1: number[],
      s2: number[],
    ) => {
      for (let j = 0; j < STEPS; j++) {
        for (let k = 0; k < STEPS; k++) {
          const u = j / STEPS;
          const v = k / STEPS;
          if (u + v > 1) continue;
          const dx0 = d0[0] + (d1[0] - d0[0]) * u + (d2[0] - d0[0]) * v;
          const dy0 = d0[1] + (d1[1] - d0[1]) * u + (d2[1] - d0[1]) * v;
          const dx1 = dx0 + (d1[0] - d0[0]) / STEPS;
          const dy1 = dy0;
          const den =
            (s1[0] - s0[0]) * (s2[1] - s0[1]) -
            (s2[0] - s0[0]) * (s1[1] - s0[1]);
          if (Math.abs(den) < 1e-6) continue;
          const a =
            ((s1[1] - s0[1]) * (s2[0] - s0[0]) -
              (s2[1] - s0[1]) * (s1[0] - s0[0])) /
            den;
          const b =
            ((s2[1] - s0[1]) * (s1[1] - s0[1]) -
              (s1[1] - s0[1]) * (s2[1] - s0[1])) /
            den;
          const c2 = s0[0] - a * d0[0] - b * d0[1];
          const dd =
            ((s1[1] - s0[1]) * (s2[1] - s0[1]) -
              (s2[1] - s0[1]) * (s1[1] - s0[1])) /
            den;
          const ef =
            ((s2[1] - s0[1]) * (s1[0] - s0[0]) -
              (s1[1] - s0[1]) * (s2[0] - s0[0])) /
            den;
          const ff = s0[1] - dd * d0[0] - ef * d0[1];
          ctx.save();
          ctx.beginPath();
          ctx.moveTo(dx0, dy0);
          ctx.lineTo(dx1, dy1);
          ctx.lineTo(dx0, dy0 + (d2[1] - d0[1]) / STEPS);
          ctx.closePath();
          ctx.clip();
          ctx.transform(a, dd, b, ef, c2, ff);
          ctx.drawImage(img, 0, 0);
          ctx.restore();
        }
      }
    };
    const [dx0, dy0] = [0, 0];
    const [dx1, dy1] = [out.width, out.height];
    drawTri([dx0, dy0], [dx1, dy0], [dx1, dy1], p0, p1, p2);
    drawTri([dx0, dy0], [dx1, dy1], [dx0, dy1], p0, p2, p3);
    downloadCanvas(out, "perspective.png");
  };

  return (
    <div className="bg-gray-900 rounded-xl p-4 space-y-3">
      <h2 className="text-white font-semibold">Perspective Crop</h2>
      <p className="text-gray-400 text-sm">
        Drag the 4 blue corner handles to align with document edges, then apply.
      </p>
      {!img ? (
        <NoFileMsg />
      ) : (
        <div className="space-y-3">
          <p className="text-blue-400 text-sm">
            Drag corners to match your document
          </p>
          <div className="overflow-auto border border-gray-700 rounded-lg">
            <canvas
              ref={displayRef}
              onMouseDown={onMouseDown}
              onMouseMove={onMouseMove}
              onMouseUp={() => setDragging(null)}
              onMouseLeave={() => setDragging(null)}
              className="cursor-crosshair select-none"
              style={{ display: "block", maxWidth: "100%" }}
              data-ocid="tool.canvas_target"
            />
          </div>
          <div className="flex gap-2">
            <Button
              onClick={applyPerspective}
              size="sm"
              data-ocid="tool.primary_button"
            >
              <Download className="w-4 h-4 mr-1" />
              Apply & Download
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// Crop
function CropTool({ img: externalImg }: { img?: HTMLImageElement }) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0, w: 100, h: 100 });
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!externalImg) return;
    setImg(externalImg);
    setCrop({ x: 0, y: 0, w: externalImg.width, h: externalImg.height });
  }, [externalImg]);

  useEffect(() => {
    if (!img || !canvasRef.current) return;
    const c = canvasRef.current;
    const MAX = 700;
    const scale = Math.min(1, MAX / img.width);
    c.width = img.width * scale;
    c.height = img.height * scale;
    const ctx = c.getContext("2d")!;
    ctx.drawImage(img, 0, 0, c.width, c.height);
    const s = scale;
    ctx.strokeStyle = "#3b82f6";
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 3]);
    ctx.strokeRect(crop.x * s, crop.y * s, crop.w * s, crop.h * s);
    ctx.fillStyle = "rgba(59,130,246,0.1)";
    ctx.fillRect(crop.x * s, crop.y * s, crop.w * s, crop.h * s);
  }, [img, crop]);

  const apply = () => {
    if (!img) return;
    const out = document.createElement("canvas");
    out.width = crop.w;
    out.height = crop.h;
    out
      .getContext("2d")!
      .drawImage(img, crop.x, crop.y, crop.w, crop.h, 0, 0, crop.w, crop.h);
    downloadCanvas(out, "cropped.png");
  };

  return (
    <div className="bg-gray-900 rounded-xl p-4 space-y-3">
      <h2 className="text-white font-semibold">Crop</h2>
      {!img ? (
        <NoFileMsg />
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {(["x", "y", "w", "h"] as const).map((k) => (
              <div key={k}>
                <Label className="text-gray-300 text-xs mb-1 block">
                  {k === "x"
                    ? "Left"
                    : k === "y"
                      ? "Top"
                      : k === "w"
                        ? "Width"
                        : "Height"}
                </Label>
                <Input
                  type="number"
                  value={crop[k]}
                  onChange={(e) =>
                    setCrop((p) => ({ ...p, [k]: Number(e.target.value) }))
                  }
                  className="bg-gray-800 border-gray-700 text-white"
                />
              </div>
            ))}
          </div>
          <canvas
            ref={canvasRef}
            className="max-w-full border border-gray-700 rounded"
          />
          <Button onClick={apply} size="sm" data-ocid="tool.primary_button">
            <Download className="w-4 h-4 mr-1" />
            Crop & Download
          </Button>
        </div>
      )}
    </div>
  );
}

// Resize
function ResizeTool({ img: externalImg }: { img?: HTMLImageElement }) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [w, setW] = useState(0);
  const [h, setH] = useState(0);
  const [lock, setLock] = useState(true);

  useEffect(() => {
    if (!externalImg) return;
    setImg(externalImg);
    setW(externalImg.width);
    setH(externalImg.height);
  }, [externalImg]);

  const apply = () => {
    if (!img) return;
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    c.getContext("2d")!.drawImage(img, 0, 0, w, h);
    downloadCanvas(c, "resized.png");
  };

  return (
    <div className="bg-gray-900 rounded-xl p-4 space-y-3">
      <h2 className="text-white font-semibold">Resize</h2>
      {!img ? (
        <NoFileMsg />
      ) : (
        <div className="space-y-3">
          <div className="flex gap-3 items-end">
            <div>
              <Label className="text-gray-300 text-xs mb-1 block">Width</Label>
              <Input
                type="number"
                value={w}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setW(v);
                  if (lock && img)
                    setH(Math.round((v * img.height) / img.width));
                }}
                className="bg-gray-800 border-gray-700 text-white w-28"
              />
            </div>
            <div>
              <Label className="text-gray-300 text-xs mb-1 block">Height</Label>
              <Input
                type="number"
                value={h}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setH(v);
                  if (lock && img)
                    setW(Math.round((v * img.width) / img.height));
                }}
                className="bg-gray-800 border-gray-700 text-white w-28"
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
          <p className="text-gray-500 text-xs">
            Original: {img.width} x {img.height}
          </p>
          <Button onClick={apply} size="sm" data-ocid="tool.primary_button">
            <Download className="w-4 h-4 mr-1" />
            Resize & Download
          </Button>
        </div>
      )}
    </div>
  );
}

// Rotate
function RotateTool({ img: externalImg }: { img?: HTMLImageElement }) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [angle, setAngle] = useState(0);
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

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
    <div className="bg-gray-900 rounded-xl p-4 space-y-3">
      <h2 className="text-white font-semibold">Rotate & Flip</h2>
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
            className="max-w-full border border-gray-700 rounded"
            style={{ maxHeight: 300 }}
          />
          <Button
            size="sm"
            onClick={() => downloadCanvas(canvasRef.current!)}
            data-ocid="tool.primary_button"
          >
            <Download className="w-4 h-4 mr-1" />
            Download
          </Button>
        </div>
      )}
    </div>
  );
}

// Adjust
function AdjustTool({ img: externalImg }: { img?: HTMLImageElement }) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [b, setB] = useState(100);
  const [c, setC] = useState(100);
  const [s, setS] = useState(100);
  const canvasRef = useRef<HTMLCanvasElement>(null);

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
    <div className="bg-gray-900 rounded-xl p-4 space-y-3">
      <h2 className="text-white font-semibold">
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
              <Label className="text-gray-300 w-32">
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
            className="max-w-full border border-gray-700 rounded"
            style={{ maxHeight: 300 }}
          />
          <div className="flex gap-2">
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
              onClick={() => downloadCanvas(canvasRef.current!)}
              data-ocid="tool.primary_button"
            >
              <Download className="w-4 h-4 mr-1" />
              Download
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// Sharpen/Blur
function FilterTool({ img: externalImg }: { img?: HTMLImageElement }) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [mode, setMode] = useState<"blur" | "sharpen">("blur");
  const [strength, setStrength] = useState(2);
  const canvasRef = useRef<HTMLCanvasElement>(null);

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
    <div className="bg-gray-900 rounded-xl p-4 space-y-3">
      <h2 className="text-white font-semibold">Sharpen / Blur</h2>
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
            <Label className="text-gray-300 w-24">Strength: {strength}</Label>
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
            className="max-w-full border border-gray-700 rounded"
            style={{ display: "none" }}
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={apply} data-ocid="tool.secondary_button">
              Apply
            </Button>
            <Button
              size="sm"
              onClick={() => downloadCanvas(canvasRef.current!)}
              data-ocid="tool.primary_button"
            >
              <Download className="w-4 h-4 mr-1" />
              Download
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// Format Convert
function ConvertTool({ img: externalImg }: { img?: HTMLImageElement }) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [fmt, setFmt] = useState<"image/jpeg" | "image/png" | "image/webp">(
    "image/jpeg",
  );
  const [quality, setQuality] = useState(90);

  useEffect(() => {
    if (!externalImg) return;
    setImg(externalImg);
  }, [externalImg]);

  const convert = () => {
    if (!img) return;
    const c = document.createElement("canvas");
    c.width = img.width;
    c.height = img.height;
    c.getContext("2d")!.drawImage(img, 0, 0);
    const ext = fmt.split("/")[1];
    const a = document.createElement("a");
    a.href = c.toDataURL(fmt, quality / 100);
    a.download = `converted.${ext}`;
    a.click();
  };

  return (
    <div className="bg-gray-900 rounded-xl p-4 space-y-3">
      <h2 className="text-white font-semibold">Format Convert</h2>
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
              <Label className="text-gray-300 w-24">Quality: {quality}%</Label>
              <Slider
                min={10}
                max={100}
                value={[quality]}
                onValueChange={([v]) => setQuality(v)}
                className="flex-1"
              />
            </div>
          )}
          <Button size="sm" onClick={convert} data-ocid="tool.primary_button">
            <Download className="w-4 h-4 mr-1" />
            Convert & Download
          </Button>
        </div>
      )}
    </div>
  );
}

// Compress
function CompressTool({ img: externalImg }: { img?: HTMLImageElement }) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [quality, setQuality] = useState(60);

  useEffect(() => {
    if (!externalImg) return;
    setImg(externalImg);
  }, [externalImg]);

  const compress = () => {
    if (!img) return;
    const c = document.createElement("canvas");
    c.width = img.width;
    c.height = img.height;
    c.getContext("2d")!.drawImage(img, 0, 0);
    const a = document.createElement("a");
    a.href = c.toDataURL("image/jpeg", quality / 100);
    a.download = "compressed.jpg";
    a.click();
  };

  return (
    <div className="bg-gray-900 rounded-xl p-4 space-y-3">
      <h2 className="text-white font-semibold">Image Compression</h2>
      {!img ? (
        <NoFileMsg />
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-4">
            <Label className="text-gray-300 w-24">Quality: {quality}%</Label>
            <Slider
              min={5}
              max={100}
              value={[quality]}
              onValueChange={([v]) => setQuality(v)}
              className="flex-1"
            />
          </div>
          <Button size="sm" onClick={compress} data-ocid="tool.primary_button">
            <Download className="w-4 h-4 mr-1" />
            Compress & Download
          </Button>
        </div>
      )}
    </div>
  );
}

// Watermark
function WatermarkTool({ img: externalImg }: { img?: HTMLImageElement }) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [text, setText] = useState("BBD Solution");
  const [size, setSize] = useState(32);
  const [opacity, setOpacity] = useState(50);
  const [pos, setPos] = useState<"tl" | "tr" | "bl" | "br" | "center">("br");
  const canvasRef = useRef<HTMLCanvasElement>(null);

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
    <div className="bg-gray-900 rounded-xl p-4 space-y-3">
      <h2 className="text-white font-semibold">Watermark</h2>
      {!img ? (
        <NoFileMsg />
      ) : (
        <div className="space-y-3">
          <div>
            <Label className="text-gray-300 text-xs mb-1 block">Text</Label>
            <Input
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="bg-gray-800 border-gray-700 text-white"
            />
          </div>
          <div className="flex items-center gap-4">
            <Label className="text-gray-300 w-20">Size: {size}</Label>
            <Slider
              min={10}
              max={100}
              value={[size]}
              onValueChange={([v]) => setSize(v)}
              className="flex-1"
            />
          </div>
          <div className="flex items-center gap-4">
            <Label className="text-gray-300 w-24">Opacity: {opacity}%</Label>
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
            className="max-w-full border border-gray-700 rounded"
            style={{ maxHeight: 300 }}
          />
          <Button
            size="sm"
            onClick={() => downloadCanvas(canvasRef.current!)}
            data-ocid="tool.primary_button"
          >
            <Download className="w-4 h-4 mr-1" />
            Download
          </Button>
        </div>
      )}
    </div>
  );
}

// Passport
function PassportTool({ img: externalImg }: { img?: HTMLImageElement }) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [pSize, setPSize] = useState({ w: 413, h: 531, label: "35x45mm" });
  const canvasRef = useRef<HTMLCanvasElement>(null);
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
    <div className="bg-gray-900 rounded-xl p-4 space-y-3">
      <h2 className="text-white font-semibold">Passport Photo Maker</h2>
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
            className="max-w-full border border-gray-700 rounded"
            style={{ maxHeight: 300 }}
          />
          <Button
            size="sm"
            onClick={() => downloadCanvas(canvasRef.current!)}
            data-ocid="tool.primary_button"
          >
            <Download className="w-4 h-4 mr-1" />
            Download
          </Button>
        </div>
      )}
    </div>
  );
}

// DPI Tool
function DpiTool({ img: externalImg }: { img?: HTMLImageElement }) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [dpi, setDpi] = useState(300);

  useEffect(() => {
    if (!externalImg) return;
    setImg(externalImg);
  }, [externalImg]);

  const apply = () => {
    if (!img) return;
    const scale = dpi / 72;
    const c = document.createElement("canvas");
    c.width = Math.round(img.width * scale);
    c.height = Math.round(img.height * scale);
    c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
    downloadCanvas(c, `image-${dpi}dpi.png`);
  };

  return (
    <div className="bg-gray-900 rounded-xl p-4 space-y-3">
      <h2 className="text-white font-semibold">DPI Change</h2>
      <p className="text-gray-400 text-sm">
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
          <p className="text-gray-400 text-sm">
            Output: {Math.round((img.width * dpi) / 72)} x{" "}
            {Math.round((img.height * dpi) / 72)} px
          </p>
          <Button size="sm" onClick={apply} data-ocid="tool.primary_button">
            <Download className="w-4 h-4 mr-1" />
            Apply & Download
          </Button>
        </div>
      )}
    </div>
  );
}

export default function ImageTools({ tool, img, file: _file }: Props) {
  switch (tool) {
    case "img-crop":
      return <CropTool img={img} />;
    case "img-perspective":
      return <PerspectiveCropTool img={img} />;
    case "img-bgremove":
      return <BgRemoveTool img={img} />;
    case "img-resize":
      return <ResizeTool img={img} />;
    case "img-rotate":
      return <RotateTool img={img} />;
    case "img-adjust":
      return <AdjustTool img={img} />;
    case "img-filter":
      return <FilterTool img={img} />;
    case "img-convert":
      return <ConvertTool img={img} />;
    case "img-compress":
      return <CompressTool img={img} />;
    case "img-watermark":
      return <WatermarkTool img={img} />;
    case "img-passport":
      return <PassportTool img={img} />;
    case "img-dpi":
      return <DpiTool img={img} />;
    default:
      return <div className="text-gray-400">Select a tool</div>;
  }
}
