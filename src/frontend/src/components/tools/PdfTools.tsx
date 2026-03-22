import { Download, Upload } from "lucide-react";
import { PDFDocument, degrees } from "pdf-lib";
import { useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";

type Props = { tool: string; file?: File };

function NoFileMsg() {
  return (
    <div
      className="flex flex-col items-center justify-center h-48 text-center"
      data-ocid="tool.empty_state"
    >
      <div className="w-12 h-12 rounded-full bg-gray-800 flex items-center justify-center mb-3">
        <span className="text-2xl">📄</span>
      </div>
      <p className="text-gray-400 text-sm">
        Upload a PDF on the left to get started
      </p>
    </div>
  );
}

function dlBytes(bytes: Uint8Array, name: string) {
  const blob = new Blob([bytes.buffer as ArrayBuffer], {
    type: "application/pdf",
  });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
}

function ViewPdf({ file }: { file?: File }) {
  const [url, setUrl] = useState("");
  // If a new file is passed, auto-show it
  const activeUrl = url || (file ? URL.createObjectURL(file) : "");
  return (
    <div className="bg-gray-900 rounded-xl p-4 space-y-3">
      <h2 className="text-white font-semibold">View PDF</h2>
      {!file && !url ? (
        <NoFileMsg />
      ) : (
        <div className="space-y-2">
          <iframe
            title="PDF Viewer"
            src={activeUrl}
            className="w-full border border-gray-700 rounded"
            style={{ height: "70vh" }}
          />
          <Button size="sm" variant="outline" onClick={() => setUrl("")}>
            Close
          </Button>
        </div>
      )}
    </div>
  );
}

// Image to PDF - needs multiple images, keep its own upload
function Img2Pdf() {
  const [imgs, setImgs] = useState<File[]>([]);
  const [status, setStatus] = useState("");
  const build = async () => {
    if (!imgs.length) return;
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
      page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
    }
    dlBytes(await pdf.save(), "images.pdf");
    setStatus("Done!");
  };
  return (
    <div className="bg-gray-900 rounded-xl p-4 space-y-3">
      <h2 className="text-white font-semibold">Image to PDF</h2>
      <p className="text-gray-400 text-sm">
        Select multiple images to combine into a PDF.
      </p>
      <label
        className="flex flex-col items-center justify-center border-2 border-dashed border-gray-700 rounded-xl p-8 cursor-pointer hover:border-blue-500 bg-gray-800"
        data-ocid="tool.dropzone"
      >
        <Upload className="w-8 h-8 text-gray-500 mb-2" />
        <span className="text-gray-400 text-sm">Add JPG/PNG images</span>
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
          <ul className="text-gray-300 text-sm space-y-1">
            {imgs.map((f, i) => (
              <li key={f.name} className="flex items-center justify-between">
                <span>{f.name}</span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setImgs((p) => p.filter((_, j) => j !== i))}
                >
                  x
                </Button>
              </li>
            ))}
          </ul>
          <Button size="sm" onClick={build} data-ocid="tool.primary_button">
            <Download className="w-4 h-4 mr-1" />
            Generate PDF
          </Button>
          {status && <p className="text-green-400 text-sm">{status}</p>}
        </div>
      )}
    </div>
  );
}

// Merge PDF - needs multiple PDFs, keep its own upload
function MergePdf() {
  const [files, setFiles] = useState<File[]>([]);
  const [status, setStatus] = useState("");
  const merge = async () => {
    if (files.length < 2) return;
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
  };
  return (
    <div className="bg-gray-900 rounded-xl p-4 space-y-3">
      <h2 className="text-white font-semibold">Merge PDF</h2>
      <p className="text-gray-400 text-sm">
        Add multiple PDF files to merge them into one.
      </p>
      <label
        className="flex flex-col items-center justify-center border-2 border-dashed border-gray-700 rounded-xl p-8 cursor-pointer hover:border-blue-500 bg-gray-800"
        data-ocid="tool.dropzone"
      >
        <Upload className="w-8 h-8 text-gray-500 mb-2" />
        <span className="text-gray-400 text-sm">Add PDF files</span>
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
          <ul className="text-gray-300 text-sm space-y-1">
            {files.map((f, i) => (
              <li key={f.name} className="flex items-center justify-between">
                <span>{f.name}</span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setFiles((p) => p.filter((_, j) => j !== i))}
                >
                  x
                </Button>
              </li>
            ))}
          </ul>
          <Button
            size="sm"
            onClick={merge}
            disabled={files.length < 2}
            data-ocid="tool.primary_button"
          >
            <Download className="w-4 h-4 mr-1" />
            Merge & Download
          </Button>
          {status && <p className="text-green-400 text-sm">{status}</p>}
        </div>
      )}
    </div>
  );
}

function SplitPdf({ file: externalFile }: { file?: File }) {
  const [file, setFile] = useState<File | null>(null);
  const [range, setRange] = useState("1-3");
  const [pageCount, setPageCount] = useState(0);
  const [status, setStatus] = useState("");

  const activeFile = file ?? externalFile ?? null;

  const loadPageCount = async (f: File) => {
    const buf = await f.arrayBuffer();
    const pdf = await PDFDocument.load(buf);
    setPageCount(pdf.getPageCount());
  };

  // When external file changes, load page count
  if (externalFile && !file && pageCount === 0) {
    loadPageCount(externalFile);
  }

  const parseRange = (s: string, max: number): number[] => {
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
  };

  const split = async () => {
    if (!activeFile) return;
    setStatus("Splitting...");
    const buf = await activeFile.arrayBuffer();
    const src = await PDFDocument.load(buf);
    const indices = parseRange(range, pageCount);
    const out = await PDFDocument.create();
    const pages = await out.copyPages(src, indices);
    for (const p of pages) out.addPage(p);
    dlBytes(await out.save(), "split.pdf");
    setStatus("Done!");
  };

  return (
    <div className="bg-gray-900 rounded-xl p-4 space-y-3">
      <h2 className="text-white font-semibold">Split PDF</h2>
      {!activeFile ? (
        <NoFileMsg />
      ) : (
        <div className="space-y-3">
          <p className="text-gray-400 text-sm">
            {activeFile.name} {pageCount > 0 && `• ${pageCount} pages`}
          </p>
          <div>
            <Label className="text-gray-300 text-xs mb-1 block">
              Page Range (e.g. 1-3, 5, 7-9)
            </Label>
            <Input
              value={range}
              onChange={(e) => setRange(e.target.value)}
              className="bg-gray-800 border-gray-700 text-white"
            />
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={split} data-ocid="tool.primary_button">
              <Download className="w-4 h-4 mr-1" />
              Split & Download
            </Button>
            {file && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setFile(null);
                  setPageCount(0);
                }}
              >
                Clear
              </Button>
            )}
          </div>
          {status && <p className="text-green-400 text-sm">{status}</p>}
        </div>
      )}
    </div>
  );
}

function RotatePdf({ file: externalFile }: { file?: File }) {
  const [pageCount, setPageCount] = useState(0);
  const [angle, setAngle] = useState(90);
  const [pageInput, setPageInput] = useState("all");
  const [status, setStatus] = useState("");

  const activeFile = externalFile ?? null;

  const ensurePageCount = async () => {
    if (activeFile && pageCount === 0) {
      const buf = await activeFile.arrayBuffer();
      const pdf = await PDFDocument.load(buf);
      setPageCount(pdf.getPageCount());
    }
  };

  const apply = async () => {
    if (!activeFile) return;
    await ensurePageCount();
    setStatus("Rotating...");
    const buf = await activeFile.arrayBuffer();
    const pdf = await PDFDocument.load(buf);
    const total = pdf.getPageCount();
    let indices: number[];
    if (pageInput.trim() === "all") {
      indices = Array.from({ length: total }, (_, i) => i);
    } else {
      indices = pageInput.split(",").flatMap((p) => {
        const t = p.trim();
        if (t.includes("-")) {
          const [a, b] = t.split("-").map(Number);
          return Array.from({ length: b - a + 1 }, (_, i) => a + i - 1);
        }
        return [Number(t) - 1];
      });
    }
    for (const i of indices) {
      if (i >= 0 && i < total) {
        const page = pdf.getPage(i);
        page.setRotation(degrees((page.getRotation().angle + angle) % 360));
      }
    }
    dlBytes(await pdf.save(), "rotated.pdf");
    setStatus("Done!");
  };

  return (
    <div className="bg-gray-900 rounded-xl p-4 space-y-3">
      <h2 className="text-white font-semibold">Rotate PDF Pages</h2>
      {!activeFile ? (
        <NoFileMsg />
      ) : (
        <div className="space-y-3">
          <p className="text-gray-400 text-sm">{activeFile.name}</p>
          <div>
            <Label className="text-gray-300 text-xs mb-1 block">
              Pages ("all" or e.g. 1,3,5)
            </Label>
            <Input
              value={pageInput}
              onChange={(e) => setPageInput(e.target.value)}
              className="bg-gray-800 border-gray-700 text-white"
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
          <Button size="sm" onClick={apply} data-ocid="tool.primary_button">
            <Download className="w-4 h-4 mr-1" />
            Rotate & Download
          </Button>
          {status && <p className="text-green-400 text-sm">{status}</p>}
        </div>
      )}
    </div>
  );
}

function DeletePages({ file: externalFile }: { file?: File }) {
  const [pageCount, setPageCount] = useState(0);
  const [pageInput, setPageInput] = useState("2");
  const [status, setStatus] = useState("");

  const activeFile = externalFile ?? null;

  const apply = async () => {
    if (!activeFile) return;
    setStatus("Processing...");
    const buf = await activeFile.arrayBuffer();
    const src = await PDFDocument.load(buf);
    const total = src.getPageCount();
    if (pageCount === 0) setPageCount(total);
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
  };

  return (
    <div className="bg-gray-900 rounded-xl p-4 space-y-3">
      <h2 className="text-white font-semibold">Delete PDF Pages</h2>
      {!activeFile ? (
        <NoFileMsg />
      ) : (
        <div className="space-y-3">
          <p className="text-gray-400 text-sm">{activeFile.name}</p>
          <div>
            <Label className="text-gray-300 text-xs mb-1 block">
              Pages to delete (e.g. 2, 4)
            </Label>
            <Input
              value={pageInput}
              onChange={(e) => setPageInput(e.target.value)}
              className="bg-gray-800 border-gray-700 text-white"
            />
          </div>
          <Button size="sm" onClick={apply} data-ocid="tool.primary_button">
            <Download className="w-4 h-4 mr-1" />
            Delete & Download
          </Button>
          {status && <p className="text-green-400 text-sm">{status}</p>}
        </div>
      )}
    </div>
  );
}

function CompressPdf({ file: externalFile }: { file?: File }) {
  const [status, setStatus] = useState("");

  const activeFile = externalFile ?? null;

  const compress = async () => {
    if (!activeFile) return;
    setStatus("Compressing...");
    const buf = await activeFile.arrayBuffer();
    const pdf = await PDFDocument.load(buf);
    const out = await pdf.save({ useObjectStreams: true });
    dlBytes(out, "compressed.pdf");
    setStatus(`Done! ~${(out.length / 1024).toFixed(0)} KB`);
  };

  return (
    <div className="bg-gray-900 rounded-xl p-4 space-y-3">
      <h2 className="text-white font-semibold">Compress PDF</h2>
      <p className="text-gray-400 text-sm">
        Re-saves with object streams to reduce size.
      </p>
      {!activeFile ? (
        <NoFileMsg />
      ) : (
        <div className="space-y-3">
          <p className="text-gray-400 text-sm">
            {activeFile.name} &bull; {(activeFile.size / 1024).toFixed(0)} KB
          </p>
          <Button size="sm" onClick={compress} data-ocid="tool.primary_button">
            <Download className="w-4 h-4 mr-1" />
            Compress & Download
          </Button>
          {status && <p className="text-green-400 text-sm">{status}</p>}
        </div>
      )}
    </div>
  );
}

function PdfToImages({ file: externalFile }: { file?: File }) {
  const [status, setStatus] = useState("");
  const [pages, setPages] = useState<string[]>([]);

  const activeFile = externalFile ?? null;

  const convert = async () => {
    if (!activeFile) return;
    setStatus("Rendering...");
    setPages([]);
    const pdfjsLib = await import("pdfjs-dist");
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
    const buf = await activeFile.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
    const rendered: string[] = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const vp = page.getViewport({ scale: 1.5 });
      const c = document.createElement("canvas");
      c.width = vp.width;
      c.height = vp.height;
      await page.render({
        canvasContext: c.getContext("2d") as CanvasRenderingContext2D,
        viewport: vp,
        canvas: c,
      }).promise;
      rendered.push(c.toDataURL("image/png"));
    }
    setPages(rendered);
    setStatus(`${rendered.length} pages rendered.`);
  };

  return (
    <div className="bg-gray-900 rounded-xl p-4 space-y-3">
      <h2 className="text-white font-semibold">PDF to Images</h2>
      {!activeFile ? (
        <NoFileMsg />
      ) : (
        <div className="space-y-3">
          <p className="text-gray-400 text-sm">{activeFile.name}</p>
          <Button size="sm" onClick={convert} data-ocid="tool.primary_button">
            Convert to Images
          </Button>
          {status && <p className="text-blue-400 text-sm">{status}</p>}
          {pages.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {pages.map((url, i) => (
                <div key={url.slice(-20)} className="space-y-1">
                  <img
                    src={url}
                    className="border border-gray-700 rounded w-full"
                    alt={`page ${i + 1}`}
                  />
                  <a href={url} download={`page-${i + 1}.png`}>
                    <Button size="sm" className="w-full text-xs">
                      Download p.{i + 1}
                    </Button>
                  </a>
                </div>
              ))}
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
      return <div className="text-gray-400">Select a tool</div>;
  }
}
