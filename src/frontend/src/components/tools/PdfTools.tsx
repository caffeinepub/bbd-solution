import { Download, Upload } from "lucide-react";
import { useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";

type Props = { tool: string; file?: File };

// Dynamically load pdf-lib from CDN
let pdfLibPromise: Promise<typeof import("pdf-lib")> | null = null;
async function getPdfLib(): Promise<typeof import("pdf-lib")> {
  if (!pdfLibPromise) {
    pdfLibPromise = new Promise((resolve, reject) => {
      if ((window as any).PDFLib) {
        resolve((window as any).PDFLib as typeof import("pdf-lib"));
        return;
      }
      const script = document.createElement("script");
      script.src =
        "https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js";
      script.onload = () => {
        resolve((window as any).PDFLib as typeof import("pdf-lib"));
      };
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }
  return pdfLibPromise;
}

async function getPdfjsLib(): Promise<any> {
  return new Promise((resolve, reject) => {
    if ((window as any).pdfjsLib) {
      resolve((window as any).pdfjsLib);
      return;
    }
    const script = document.createElement("script");
    script.src =
      "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
    script.onload = () => {
      const lib = (window as any).pdfjsLib;
      lib.GlobalWorkerOptions.workerSrc =
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
      resolve(lib);
    };
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

async function getJSZip(): Promise<any> {
  return new Promise((resolve, reject) => {
    if ((window as any).JSZip) {
      resolve((window as any).JSZip);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js";
    script.onload = () => resolve((window as any).JSZip);
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

function dlBytes(bytes: Uint8Array, name: string, mime = "application/pdf") {
  const blob = new Blob([bytes.buffer as ArrayBuffer], { type: mime });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

function dlUrl(url: string, name: string) {
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
}
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function NoFileMsg() {
  return (
    <div className="flex flex-col items-center justify-center h-48 text-center">
      <span className="text-4xl mb-3">📄</span>
      <p className="text-gray-500 text-sm">
        Upload a PDF on the left to get started
      </p>
    </div>
  );
}

function ViewPdf({ file }: { file?: File }) {
  const activeUrl = file ? URL.createObjectURL(file) : "";
  return (
    <div className="p-4 space-y-3">
      <h2 className="font-semibold text-gray-800">View PDF</h2>
      {!file ? (
        <NoFileMsg />
      ) : (
        <>
          <p className="text-xs mb-2">
            <span style={{ color: "#e0e0e0" }}>{file.name}</span>
            <span className="ml-2" style={{ color: "#64b5f6" }}>
              {formatFileSize(file.size)}
            </span>
          </p>
          <iframe
            title="PDF Viewer"
            src={activeUrl}
            className="w-full border border-gray-200 rounded"
            style={{ height: "70vh" }}
          />
        </>
      )}
    </div>
  );
}

function Img2Pdf() {
  const [imgs, setImgs] = useState<File[]>([]);
  const [status, setStatus] = useState("");

  const build = async () => {
    if (!imgs.length) return;
    setStatus("Loading pdf-lib...");
    try {
      const { PDFDocument } = await getPdfLib();
      setStatus("Building PDF...");
      const pdf = await PDFDocument.create();
      for (const f of imgs) {
        const buf = await f.arrayBuffer();
        const bytes = new Uint8Array(buf);
        const img =
          f.type === "image/png"
            ? await pdf.embedPng(bytes)
            : await pdf.embedJpg(bytes);
        const page = pdf.addPage([img.width, img.height]);
        page.drawImage(img, {
          x: 0,
          y: 0,
          width: img.width,
          height: img.height,
        });
      }
      dlBytes(await pdf.save(), "images.pdf");
      setStatus("Done!");
    } catch {
      setStatus(
        "Error: could not load PDF library. Check internet connection.",
      );
    }
  };

  return (
    <div className="p-4 space-y-4">
      <h2 className="font-semibold">JPG / PNG → PDF</h2>
      <p className="text-sm" style={{ color: "#888" }}>
        Add multiple images to combine into a single PDF.
      </p>
      <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-600 rounded-lg p-6 cursor-pointer hover:border-blue-400 transition-colors">
        <Upload className="w-7 h-7 mb-1" style={{ color: "#555" }} />
        <span className="text-sm" style={{ color: "#888" }}>
          Add JPG/PNG images
        </span>
        <input
          type="file"
          accept="image/jpeg,image/png"
          multiple
          className="hidden"
          onChange={(e) =>
            e.target.files &&
            setImgs((p) => [...p, ...Array.from(e.target.files!)])
          }
        />
      </label>
      {imgs.length > 0 && (
        <div className="space-y-2">
          <ul className="text-sm space-y-1">
            {imgs.map((f, i) => (
              <li
                key={f.name + String(i)}
                className="flex items-center justify-between px-2 py-1 rounded"
                style={{ background: "#2a2a2a" }}
              >
                <span className="truncate text-xs" style={{ color: "#e0e0e0" }}>
                  {f.name}
                </span>
                <span
                  className="ml-2 text-xs flex-shrink-0"
                  style={{ color: "#64b5f6" }}
                >
                  {formatFileSize(f.size)}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setImgs((p) => p.filter((_, j) => j !== i))}
                >
                  ✕
                </Button>
              </li>
            ))}
          </ul>
          <Button size="sm" onClick={build}>
            <Download className="w-4 h-4 mr-1" />
            Generate PDF ({imgs.length} images)
          </Button>
          {status && (
            <p
              className="text-xs"
              style={{
                color: status.startsWith("Error") ? "#e05050" : "#4caf50",
              }}
            >
              {status}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function BatchPdfToJpg() {
  const [files, setFiles] = useState<File[]>([]);
  const [status, setStatus] = useState("");
  const [progress, setProgress] = useState(0);

  const convert = async () => {
    if (!files.length) return;
    setStatus("Loading libraries...");
    setProgress(0);
    try {
      const [pdfjsLib, JSZip] = await Promise.all([getPdfjsLib(), getJSZip()]);
      const zip = new JSZip();
      let total = 0;
      let done = 0;

      // First pass: count total pages
      const pdfDocs: any[] = [];
      for (const f of files) {
        const buf = await f.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
        total += pdf.numPages;
        pdfDocs.push({ pdf, name: f.name.replace(/\.pdf$/i, "") });
      }

      setStatus(`Converting ${total} pages from ${files.length} PDF(s)...`);

      for (const { pdf, name } of pdfDocs) {
        for (let p = 1; p <= pdf.numPages; p++) {
          const page = await pdf.getPage(p);
          const vp = page.getViewport({ scale: 1.5 });
          const canvas = document.createElement("canvas");
          canvas.width = vp.width;
          canvas.height = vp.height;
          await page.render({
            canvasContext: canvas.getContext("2d") as CanvasRenderingContext2D,
            viewport: vp,
          }).promise;
          const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
          const base64 = dataUrl.split(",")[1];
          const filename =
            files.length === 1 ? `page-${p}.jpg` : `${name}_page-${p}.jpg`;
          zip.file(filename, base64, { base64: true });
          done++;
          setProgress(Math.round((done / total) * 100));
          setStatus(`Converting... ${done}/${total} pages`);
        }
      }

      setStatus("Creating ZIP...");
      const zipBlob = await zip.generateAsync({ type: "blob" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(zipBlob);
      a.download =
        files.length === 1 ? `${pdfDocs[0].name}_pages.zip` : "pdf_pages.zip";
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 3000);
      setStatus(`Done! ${done} JPG files in ZIP.`);
      setProgress(100);
    } catch (e) {
      console.error(e);
      setStatus("Error: check internet connection.");
    }
  };

  return (
    <div className="p-4 space-y-4">
      <h2 className="font-semibold">Batch PDF → JPG</h2>
      <p className="text-sm" style={{ color: "#888" }}>
        Convert one or more PDFs to JPG images. All pages are packed into a ZIP
        file.
      </p>
      <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-600 rounded-lg p-6 cursor-pointer hover:border-blue-400 transition-colors">
        <Upload className="w-7 h-7 mb-1" style={{ color: "#555" }} />
        <span className="text-sm" style={{ color: "#888" }}>
          Add PDF files
        </span>
        <input
          type="file"
          accept=".pdf"
          multiple
          className="hidden"
          onChange={(e) =>
            e.target.files &&
            setFiles((p) => [...p, ...Array.from(e.target.files!)])
          }
        />
      </label>
      {files.length > 0 && (
        <div className="space-y-2">
          <ul className="text-sm space-y-1">
            {files.map((f, i) => (
              <li
                key={f.name + String(i)}
                className="flex items-center justify-between px-2 py-1 rounded"
                style={{ background: "#2a2a2a" }}
              >
                <span className="truncate text-xs" style={{ color: "#e0e0e0" }}>
                  {f.name}
                </span>
                <span
                  className="ml-2 text-xs flex-shrink-0"
                  style={{ color: "#64b5f6" }}
                >
                  {formatFileSize(f.size)}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setFiles((p) => p.filter((_, j) => j !== i))}
                >
                  ✕
                </Button>
              </li>
            ))}
          </ul>
          {progress > 0 && progress < 100 && (
            <div
              className="w-full rounded-full h-1.5"
              style={{ background: "#333" }}
            >
              <div
                className="h-1.5 rounded-full transition-all"
                style={{ width: `${progress}%`, background: "#0078d4" }}
              />
            </div>
          )}
          <Button size="sm" onClick={convert}>
            <Download className="w-4 h-4 mr-1" />
            Convert & Download ZIP
          </Button>
          {status && (
            <p
              className="text-xs"
              style={{
                color: status.startsWith("Error") ? "#e05050" : "#4caf50",
              }}
            >
              {status}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function SingleJpgDownload() {
  const [file, setFile] = useState<File | null>(null);
  const [quality, setQuality] = useState(92);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleFile = (f: File) => {
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
  };

  const download = () => {
    if (!file || !previewUrl) return;
    const img = new window.Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0);
      const dataUrl = canvas.toDataURL("image/jpeg", quality / 100);
      const baseName = file.name.replace(/\.[^.]+$/, "");
      dlUrl(dataUrl, `${baseName}.jpg`);
    };
    img.src = previewUrl;
  };

  return (
    <div className="p-4 space-y-4">
      <h2 className="font-semibold">Single JPG Download</h2>
      <p className="text-sm" style={{ color: "#888" }}>
        Load any image and download it as a JPG with chosen quality.
      </p>
      <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-600 rounded-lg p-6 cursor-pointer hover:border-blue-400 transition-colors">
        <Upload className="w-7 h-7 mb-1" style={{ color: "#555" }} />
        <span className="text-sm" style={{ color: "#888" }}>
          {file ? file.name : "Select an image"}
        </span>
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        />
      </label>
      {previewUrl && (
        <img
          src={previewUrl}
          alt="preview"
          className="rounded max-h-48 object-contain"
        />
      )}
      {file && (
        <div className="space-y-3">
          <div>
            <Label className="text-xs mb-1 block" style={{ color: "#888" }}>
              Quality: {quality}%
            </Label>
            <input
              type="range"
              min={10}
              max={100}
              value={quality}
              onChange={(e) => setQuality(Number(e.target.value))}
              className="w-full"
            />
          </div>
          <Button size="sm" onClick={download}>
            <Download className="w-4 h-4 mr-1" />
            Download JPG
          </Button>
        </div>
      )}
    </div>
  );
}

function MergePdf() {
  const [files, setFiles] = useState<File[]>([]);
  const [status, setStatus] = useState("");

  const merge = async () => {
    if (files.length < 2) return;
    setStatus("Loading pdf-lib...");
    try {
      const { PDFDocument } = await getPdfLib();
      setStatus("Merging...");
      const out = await PDFDocument.create();
      for (const f of files) {
        const buf = await f.arrayBuffer();
        const src = await PDFDocument.load(buf);
        const pages = await out.copyPages(src, src.getPageIndices());
        for (const p of pages) out.addPage(p);
      }
      dlBytes(await out.save(), "merged.pdf");
      setStatus("Done!");
    } catch {
      setStatus("Error: could not load PDF library.");
    }
  };

  return (
    <div className="p-4 space-y-4">
      <h2 className="font-semibold">Merge PDF</h2>
      <p className="text-sm" style={{ color: "#888" }}>
        Add multiple PDF files to merge them into one.
      </p>
      <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-600 rounded-lg p-6 cursor-pointer hover:border-blue-400 transition-colors">
        <Upload className="w-7 h-7 mb-1" style={{ color: "#555" }} />
        <span className="text-sm" style={{ color: "#888" }}>
          Add PDF files
        </span>
        <input
          type="file"
          accept=".pdf"
          multiple
          className="hidden"
          onChange={(e) =>
            e.target.files &&
            setFiles((p) => [...p, ...Array.from(e.target.files!)])
          }
        />
      </label>
      {files.length > 0 && (
        <div className="space-y-2">
          <ul className="text-sm space-y-1">
            {files.map((f, i) => (
              <li
                key={f.name + String(i)}
                className="flex items-center justify-between px-2 py-1 rounded"
                style={{ background: "#2a2a2a" }}
              >
                <span className="truncate text-xs" style={{ color: "#e0e0e0" }}>
                  {f.name}
                </span>
                <span
                  className="ml-2 text-xs flex-shrink-0"
                  style={{ color: "#64b5f6" }}
                >
                  {formatFileSize(f.size)}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setFiles((p) => p.filter((_, j) => j !== i))}
                >
                  ✕
                </Button>
              </li>
            ))}
          </ul>
          <Button size="sm" onClick={merge} disabled={files.length < 2}>
            <Download className="w-4 h-4 mr-1" />
            Merge & Download
          </Button>
          {status && (
            <p
              className="text-xs"
              style={{
                color: status.startsWith("Error") ? "#e05050" : "#4caf50",
              }}
            >
              {status}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function parsePageRange(s: string, max: number): number[] {
  const pages: number[] = [];
  for (const part of s.split(",")) {
    const t = part.trim();
    if (t.includes("-")) {
      const [a, b] = t.split("-").map(Number);
      for (let i = a; i <= Math.min(b, max); i++) pages.push(i - 1);
    } else {
      const n = Number(t);
      if (n >= 1 && n <= max) pages.push(n - 1);
    }
  }
  return [...new Set(pages)].sort((a, b) => a - b);
}

function SplitPdf({ file }: { file?: File }) {
  const [range, setRange] = useState("1-3");
  const [status, setStatus] = useState("");

  const split = async () => {
    if (!file) return;
    setStatus("Loading pdf-lib...");
    try {
      const { PDFDocument } = await getPdfLib();
      setStatus("Splitting...");
      const buf = await file.arrayBuffer();
      const src = await PDFDocument.load(buf);
      const total = src.getPageCount();
      const indices = parsePageRange(range, total);
      const out = await PDFDocument.create();
      const pages = await out.copyPages(src, indices);
      for (const p of pages) out.addPage(p);
      dlBytes(await out.save(), "split.pdf");
      setStatus("Done!");
    } catch {
      setStatus("Error: could not process PDF.");
    }
  };

  return (
    <div className="p-4 space-y-4">
      <h2 className="font-semibold">Split PDF</h2>
      {!file ? (
        <NoFileMsg />
      ) : (
        <div className="space-y-3">
          <p className="text-sm" style={{ color: "#888" }}>
            <span style={{ color: "#e0e0e0" }}>{file.name}</span>
            <span className="ml-2 text-xs" style={{ color: "#64b5f6" }}>
              {formatFileSize(file.size)}
            </span>
          </p>
          <div>
            <Label className="text-xs mb-1 block" style={{ color: "#888" }}>
              Page Range (e.g. 1-3, 5, 7-9)
            </Label>
            <Input value={range} onChange={(e) => setRange(e.target.value)} />
          </div>
          <Button size="sm" onClick={split}>
            <Download className="w-4 h-4 mr-1" />
            Split & Download
          </Button>
          {status && (
            <p
              className="text-xs"
              style={{
                color: status.startsWith("Error") ? "#e05050" : "#4caf50",
              }}
            >
              {status}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

const COMPRESS_PRESETS = [
  {
    label: "Low",
    desc: "Smallest file, lower quality",
    quality: 40,
    scale: 1.0,
  },
  { label: "Medium", desc: "Balanced size & quality", quality: 65, scale: 1.2 },
  { label: "High", desc: "Best quality, larger file", quality: 85, scale: 1.5 },
];

function CompressPdf({ file }: { file?: File }) {
  const [status, setStatus] = useState("");
  const [progress, setProgress] = useState(0);
  const [mode, setMode] = useState<"preset" | "custom">("preset");
  const [preset, setPreset] = useState(1); // Medium default
  const [customQuality, setCustomQuality] = useState(65);
  const [customScale, setCustomScale] = useState(1.2);
  const [estimating, setEstimating] = useState(false);
  const [estimatedKB, setEstimatedKB] = useState<number | null>(null);

  const getParams = () => {
    if (mode === "preset") {
      return COMPRESS_PRESETS[preset];
    }
    return { quality: customQuality, scale: customScale };
  };

  const estimateSize = async () => {
    if (!file) return;
    setEstimating(true);
    setEstimatedKB(null);
    try {
      const pdfjsLib = await getPdfjsLib();
      const buf = await file.arrayBuffer();
      const srcPdf = await pdfjsLib.getDocument({ data: buf }).promise;
      const numPages = srcPdf.numPages;
      const page = await srcPdf.getPage(1);
      const vp = page.getViewport({ scale: customScale });
      const canvas = document.createElement("canvas");
      canvas.width = vp.width;
      canvas.height = vp.height;
      await page.render({
        canvasContext: canvas.getContext("2d") as CanvasRenderingContext2D,
        viewport: vp,
      }).promise;
      const dataUrl = canvas.toDataURL("image/jpeg", customQuality / 100);
      const base64 = dataUrl.split(",")[1];
      const page1Bytes = Math.round((base64.length * 3) / 4);
      const estimatedBytes = page1Bytes * numPages;
      setEstimatedKB(Math.round(estimatedBytes / 1024));
    } catch (e) {
      console.error(e);
    } finally {
      setEstimating(false);
    }
  };

  const compress = async () => {
    if (!file) return;
    const { quality, scale } = getParams();
    setStatus("Loading libraries...");
    setProgress(0);
    try {
      const [pdfjsLib, { PDFDocument }] = await Promise.all([
        getPdfjsLib(),
        getPdfLib(),
      ]);
      const buf = await file.arrayBuffer();
      const srcPdf = await pdfjsLib.getDocument({ data: buf.slice(0) }).promise;
      const totalPages = srcPdf.numPages;
      setStatus(`Compressing ${totalPages} pages...`);

      const outPdf = await PDFDocument.create();

      for (let p = 1; p <= totalPages; p++) {
        const page = await srcPdf.getPage(p);
        const vp = page.getViewport({ scale });
        const canvas = document.createElement("canvas");
        canvas.width = vp.width;
        canvas.height = vp.height;
        await page.render({
          canvasContext: canvas.getContext("2d") as CanvasRenderingContext2D,
          viewport: vp,
        }).promise;
        const dataUrl = canvas.toDataURL("image/jpeg", quality / 100);
        const base64 = dataUrl.split(",")[1];
        const jpgBytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
        const jpgImg = await outPdf.embedJpg(jpgBytes);
        const outPage = outPdf.addPage([vp.width, vp.height]);
        outPage.drawImage(jpgImg, {
          x: 0,
          y: 0,
          width: vp.width,
          height: vp.height,
        });
        setProgress(Math.round((p / totalPages) * 100));
        setStatus(`Compressing... ${p}/${totalPages} pages`);
      }

      const out = await outPdf.save();
      dlBytes(out, "compressed.pdf");
      const origKB = (file.size / 1024).toFixed(0);
      const newKB = (out.length / 1024).toFixed(0);
      const saved = Math.max(0, Math.round((1 - out.length / file.size) * 100));
      setStatus(`Done! ${origKB} KB → ${newKB} KB (${saved}% smaller)`);
      setProgress(100);
    } catch (e) {
      console.error(e);
      setStatus("Error: could not compress PDF. Check internet connection.");
    }
  };

  return (
    <div className="p-4 space-y-4">
      <h2 className="font-semibold">Compress PDF</h2>
      {!file ? (
        <NoFileMsg />
      ) : (
        <div className="space-y-4">
          <p className="text-sm" style={{ color: "#888" }}>
            <span style={{ color: "#e0e0e0" }}>{file.name}</span>
            <span className="ml-2 text-xs" style={{ color: "#64b5f6" }}>
              {formatFileSize(file.size)}
            </span>
          </p>

          {/* Mode toggle */}
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={mode === "preset" ? "default" : "outline"}
              onClick={() => setMode("preset")}
            >
              Presets
            </Button>
            <Button
              size="sm"
              variant={mode === "custom" ? "default" : "outline"}
              onClick={() => setMode("custom")}
            >
              Custom Range
            </Button>
          </div>

          {mode === "preset" && (
            <div className="space-y-2">
              {COMPRESS_PRESETS.map((p, i) => (
                <button
                  type="button"
                  key={p.label}
                  onClick={() => setPreset(i)}
                  className="w-full text-left px-3 py-2 rounded border transition-colors"
                  style={{
                    background: preset === i ? "#0078d4" : "#1e1e1e",
                    borderColor: preset === i ? "#0078d4" : "#444",
                    color: preset === i ? "#fff" : "#ccc",
                  }}
                >
                  <span className="font-medium text-sm">{p.label}</span>
                  <span className="text-xs ml-2" style={{ opacity: 0.75 }}>
                    {p.desc}
                  </span>
                </button>
              ))}
            </div>
          )}

          {mode === "custom" && (
            <div className="space-y-3">
              <div>
                <Label className="text-xs mb-1 block" style={{ color: "#888" }}>
                  Image Quality: {customQuality}%
                  <span className="ml-2" style={{ color: "#555" }}>
                    (lower = smaller file)
                  </span>
                </Label>
                <input
                  type="range"
                  min={10}
                  max={100}
                  value={customQuality}
                  onChange={(e) => {
                    setCustomQuality(Number(e.target.value));
                    setEstimatedKB(null);
                  }}
                  className="w-full"
                />
                <div
                  className="flex justify-between text-xs mt-0.5"
                  style={{ color: "#555" }}
                >
                  <span>10% (tiny)</span>
                  <span>100% (original)</span>
                </div>
              </div>
              <div>
                <Label className="text-xs mb-1 block" style={{ color: "#888" }}>
                  Render Scale: {customScale.toFixed(1)}x
                  <span className="ml-2" style={{ color: "#555" }}>
                    (lower = smaller file)
                  </span>
                </Label>
                <input
                  type="range"
                  min={5}
                  max={20}
                  value={Math.round(customScale * 10)}
                  onChange={(e) => {
                    setCustomScale(Number(e.target.value) / 10);
                    setEstimatedKB(null);
                  }}
                  className="w-full"
                />
                <div
                  className="flex justify-between text-xs mt-0.5"
                  style={{ color: "#555" }}
                >
                  <span>0.5x (smallest)</span>
                  <span>2.0x (sharpest)</span>
                </div>
              </div>

              {/* Size preview */}
              <div className="flex items-center gap-2 mt-1">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={estimateSize}
                  disabled={estimating}
                  data-ocid="compress.estimate_size.button"
                >
                  {estimating ? "Estimating..." : "Estimate Size"}
                </Button>
                {estimatedKB !== null && !estimating && (
                  <span className="text-xs" style={{ color: "#4caf50" }}>
                    ~{estimatedKB} KB estimated &bull; original{" "}
                    {(file.size / 1024).toFixed(0)} KB
                    {file.size > 0 && estimatedKB < file.size / 1024
                      ? ` (≈${Math.round((1 - estimatedKB / (file.size / 1024)) * 100)}% smaller)`
                      : ""}
                  </span>
                )}
              </div>
            </div>
          )}

          {progress > 0 && progress < 100 && (
            <div
              className="w-full rounded-full h-1.5"
              style={{ background: "#333" }}
            >
              <div
                className="h-1.5 rounded-full transition-all"
                style={{ width: `${progress}%`, background: "#0078d4" }}
              />
            </div>
          )}

          <Button size="sm" onClick={compress}>
            <Download className="w-4 h-4 mr-1" />
            Compress & Download
          </Button>

          {status && (
            <p
              className="text-xs"
              style={{
                color: status.startsWith("Error") ? "#e05050" : "#4caf50",
              }}
            >
              {status}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function RotatePdf({ file }: { file?: File }) {
  const [angle, setAngle] = useState(90);
  const [pageInput, setPageInput] = useState("all");
  const [status, setStatus] = useState("");

  const apply = async () => {
    if (!file) return;
    setStatus("Loading pdf-lib...");
    try {
      const { PDFDocument, degrees } = await getPdfLib();
      setStatus("Rotating...");
      const buf = await file.arrayBuffer();
      const pdf = await PDFDocument.load(buf);
      const total = pdf.getPageCount();
      let indices: number[];
      if (pageInput.trim() === "all") {
        indices = Array.from({ length: total }, (_, i) => i);
      } else {
        indices = parsePageRange(pageInput, total);
      }
      for (const i of indices) {
        if (i >= 0 && i < total) {
          const page = pdf.getPage(i);
          page.setRotation(degrees((page.getRotation().angle + angle) % 360));
        }
      }
      dlBytes(await pdf.save(), "rotated.pdf");
      setStatus("Done!");
    } catch {
      setStatus("Error: could not process PDF.");
    }
  };

  return (
    <div className="p-4 space-y-4">
      <h2 className="font-semibold">Rotate PDF Pages</h2>
      {!file ? (
        <NoFileMsg />
      ) : (
        <div className="space-y-3">
          <p className="text-sm" style={{ color: "#888" }}>
            <span style={{ color: "#e0e0e0" }}>{file.name}</span>
            <span className="ml-2 text-xs" style={{ color: "#64b5f6" }}>
              {formatFileSize(file.size)}
            </span>
          </p>
          <div>
            <Label className="text-xs mb-1 block" style={{ color: "#888" }}>
              Pages ("all" or e.g. 1,3,5)
            </Label>
            <Input
              value={pageInput}
              onChange={(e) => setPageInput(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            {[90, 180, 270].map((a) => (
              <Button
                key={a}
                size="sm"
                variant={angle === a ? "default" : "outline"}
                onClick={() => setAngle(a)}
              >
                +{a}°
              </Button>
            ))}
          </div>
          <Button size="sm" onClick={apply}>
            <Download className="w-4 h-4 mr-1" />
            Rotate & Download
          </Button>
          {status && (
            <p
              className="text-xs"
              style={{
                color: status.startsWith("Error") ? "#e05050" : "#4caf50",
              }}
            >
              {status}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function DeletePages({ file }: { file?: File }) {
  const [pageInput, setPageInput] = useState("2");
  const [status, setStatus] = useState("");

  const apply = async () => {
    if (!file) return;
    setStatus("Loading pdf-lib...");
    try {
      const { PDFDocument } = await getPdfLib();
      setStatus("Processing...");
      const buf = await file.arrayBuffer();
      const src = await PDFDocument.load(buf);
      const total = src.getPageCount();
      const toDel = new Set(
        pageInput.split(",").map((p) => Number(p.trim()) - 1),
      );
      const keep = Array.from({ length: total }, (_, i) => i).filter(
        (i) => !toDel.has(i),
      );
      const out = await PDFDocument.create();
      const pages = await out.copyPages(src, keep);
      for (const p of pages) out.addPage(p);
      dlBytes(await out.save(), "deleted.pdf");
      setStatus("Done!");
    } catch {
      setStatus("Error: could not process PDF.");
    }
  };

  return (
    <div className="p-4 space-y-4">
      <h2 className="font-semibold">Delete PDF Pages</h2>
      {!file ? (
        <NoFileMsg />
      ) : (
        <div className="space-y-3">
          <p className="text-sm" style={{ color: "#888" }}>
            <span style={{ color: "#e0e0e0" }}>{file.name}</span>
            <span className="ml-2 text-xs" style={{ color: "#64b5f6" }}>
              {formatFileSize(file.size)}
            </span>
          </p>
          <div>
            <Label className="text-xs mb-1 block" style={{ color: "#888" }}>
              Pages to delete (e.g. 2, 4)
            </Label>
            <Input
              value={pageInput}
              onChange={(e) => setPageInput(e.target.value)}
            />
          </div>
          <Button size="sm" onClick={apply}>
            <Download className="w-4 h-4 mr-1" />
            Delete & Download
          </Button>
          {status && (
            <p
              className="text-xs"
              style={{
                color: status.startsWith("Error") ? "#e05050" : "#4caf50",
              }}
            >
              {status}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

type PageEntry = { jpg: string; png: string };

function PdfToImages({ file }: { file?: File }) {
  const [status, setStatus] = useState("");
  const [pages, setPages] = useState<PageEntry[]>([]);
  const [zipping, setZipping] = useState(false);

  const convert = async () => {
    if (!file) return;
    setStatus("Loading PDF renderer...");
    setPages([]);
    try {
      const pdfjsLib = await getPdfjsLib();
      const buf = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
      setStatus(`Rendering ${pdf.numPages} pages...`);
      const rendered: PageEntry[] = [];
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const vp = page.getViewport({ scale: 1.5 });
        const c = document.createElement("canvas");
        c.width = vp.width;
        c.height = vp.height;
        await page.render({
          canvasContext: c.getContext("2d") as CanvasRenderingContext2D,
          viewport: vp,
        }).promise;
        rendered.push({
          jpg: c.toDataURL("image/jpeg", 0.92),
          png: c.toDataURL("image/png"),
        });
        setStatus(`Rendering... ${i}/${pdf.numPages}`);
      }
      setPages(rendered);
      setStatus(`${rendered.length} pages rendered.`);
    } catch {
      setStatus("Error: could not render PDF. Check internet connection.");
    }
  };

  const downloadAllZip = async () => {
    if (!pages.length) return;
    setZipping(true);
    setStatus("Creating ZIP...");
    try {
      const JSZip = await getJSZip();
      const zip = new JSZip();
      pages.forEach((entry, i) => {
        const base64 = entry.jpg.split(",")[1];
        zip.file(`page-${i + 1}.jpg`, base64, { base64: true });
      });
      const zipBlob = await zip.generateAsync({ type: "blob" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(zipBlob);
      const baseName = file?.name.replace(/\.pdf$/i, "") ?? "pages";
      a.download = `${baseName}_pages.zip`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 3000);
      setStatus(`ZIP downloaded (${pages.length} pages).`);
    } catch {
      setStatus("Error: could not create ZIP.");
    } finally {
      setZipping(false);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <h2 className="font-semibold">PDF to Images</h2>
      {!file ? (
        <NoFileMsg />
      ) : (
        <div className="space-y-3">
          <p className="text-sm" style={{ color: "#888" }}>
            <span style={{ color: "#e0e0e0" }}>{file.name}</span>
            <span className="ml-2 text-xs" style={{ color: "#64b5f6" }}>
              {formatFileSize(file.size)}
            </span>
          </p>
          <Button
            size="sm"
            onClick={convert}
            data-ocid="pdf_toimg.primary_button"
          >
            Convert to Images
          </Button>
          {status && (
            <p
              className="text-xs"
              style={{
                color: status.startsWith("Error") ? "#e05050" : "#64b5f6",
              }}
            >
              {status}
            </p>
          )}
          {pages.length > 0 && (
            <div className="space-y-3">
              {/* Download All ZIP button */}
              <Button
                size="sm"
                onClick={downloadAllZip}
                disabled={zipping}
                data-ocid="pdf_toimg.download_all.button"
                className="flex items-center gap-1"
              >
                <Download className="w-4 h-4" />
                {zipping
                  ? "Zipping..."
                  : `Download All as ZIP (${pages.length} pages)`}
              </Button>

              {/* Page grid */}
              <div className="grid grid-cols-3 gap-2">
                {pages.map((entry, pageIdx) => (
                  <div
                    key={entry.jpg.slice(-20)}
                    className="space-y-1"
                    data-ocid={`pdf_toimg.item.${pageIdx + 1}`}
                  >
                    <img
                      src={entry.jpg}
                      className="rounded w-full border"
                      style={{ borderColor: "#333" }}
                      alt={`page ${pageIdx + 1}`}
                    />
                    <p
                      className="text-center text-xs"
                      style={{ color: "#888" }}
                    >
                      p.{pageIdx + 1}
                    </p>
                    {/* JPG + PNG side-by-side */}
                    <div className="flex gap-1">
                      <a
                        href={entry.jpg}
                        download={`page-${pageIdx + 1}.jpg`}
                        className="flex-1"
                        data-ocid={`pdf_toimg.download_jpg.button.${pageIdx + 1}`}
                      >
                        <Button
                          size="sm"
                          className="w-full text-xs"
                          style={{
                            background: "#0078d4",
                            color: "#fff",
                          }}
                        >
                          JPG
                        </Button>
                      </a>
                      <a
                        href={entry.png}
                        download={`page-${pageIdx + 1}.png`}
                        className="flex-1"
                        data-ocid={`pdf_toimg.download_png.button.${pageIdx + 1}`}
                      >
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full text-xs"
                          style={{
                            borderColor: "#444",
                            color: "#e0e0e0",
                          }}
                        >
                          PNG
                        </Button>
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function PdfTools({ tool, file }: Props) {
  switch (tool) {
    case "pdf-view":
      return <ViewPdf file={file} />;
    case "pdf-img2pdf":
      return <Img2Pdf />;
    case "pdf-batch-toimg":
      return <BatchPdfToJpg />;
    case "pdf-single-jpg":
      return <SingleJpgDownload />;
    case "pdf-merge":
      return <MergePdf />;
    case "pdf-split":
      return <SplitPdf file={file} />;
    case "pdf-compress":
      return <CompressPdf file={file} />;
    case "pdf-toimg":
      return <PdfToImages file={file} />;
    case "pdf-rotate":
      return <RotatePdf file={file} />;
    case "pdf-delete":
      return <DeletePages file={file} />;
    default:
      return <div className="text-gray-500 p-4">Select a tool</div>;
  }
}
