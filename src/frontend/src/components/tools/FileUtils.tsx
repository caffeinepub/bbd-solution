import JSZip from "jszip";
import { Download, Upload } from "lucide-react";
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
        <span className="text-2xl">📁</span>
      </div>
      <p className="text-gray-400 text-sm">
        Upload a file on the left to get started
      </p>
    </div>
  );
}

function FileRename({ file: externalFile }: { file?: File }) {
  const [name, setName] = useState("");
  const [initialized, setInitialized] = useState(false);

  const activeFile = externalFile ?? null;

  // Initialize name from file
  if (activeFile && !initialized) {
    setName(activeFile.name);
    setInitialized(true);
  }

  // Reset when file changes
  if (!activeFile && initialized) {
    setInitialized(false);
  }

  const dl = () => {
    if (!activeFile) return;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(activeFile);
    a.download = name;
    a.click();
  };

  return (
    <div className="bg-gray-900 rounded-xl p-4 space-y-3">
      <h2 className="text-white font-semibold">File Rename</h2>
      {!activeFile ? (
        <NoFileMsg />
      ) : (
        <div className="space-y-3">
          <p className="text-gray-400 text-sm">Original: {activeFile.name}</p>
          <div>
            <Label className="text-gray-300 text-xs mb-1 block">New Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-gray-800 border-gray-700 text-white"
              data-ocid="tool.input"
            />
          </div>
          <Button size="sm" onClick={dl} data-ocid="tool.primary_button">
            <Download className="w-4 h-4 mr-1" />
            Download Renamed
          </Button>
        </div>
      )}
    </div>
  );
}

// Batch resize still needs its own multi-file upload
function BatchResize() {
  const [files, setFiles] = useState<File[]>([]);
  const [maxW, setMaxW] = useState(800);
  const [status, setStatus] = useState("");
  const process = async () => {
    if (!files.length) return;
    setStatus("Processing...");
    const zip = new JSZip();
    for (const f of files) {
      const url = URL.createObjectURL(f);
      const img = await new Promise<HTMLImageElement>((res) => {
        const i = new window.Image();
        i.onload = () => res(i);
        i.src = url;
      });
      const scale = Math.min(1, maxW / img.width);
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * scale);
      c.height = Math.round(img.height * scale);
      c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
      const blob = await new Promise<Blob>((res) =>
        c.toBlob((b) => res(b!), "image/jpeg", 0.9),
      );
      zip.file(f.name.replace(/\.[^.]+$/, ".jpg"), blob);
    }
    const out = await zip.generateAsync({ type: "blob" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(out);
    a.download = "batch-resized.zip";
    a.click();
    setStatus("Done!");
  };
  return (
    <div className="bg-gray-900 rounded-xl p-4 space-y-3">
      <h2 className="text-white font-semibold">Batch Image Resize</h2>
      <p className="text-gray-400 text-sm">
        Select multiple images to resize and download as ZIP.
      </p>
      <label
        className="flex flex-col items-center justify-center border-2 border-dashed border-gray-700 rounded-xl p-8 cursor-pointer hover:border-blue-500 bg-gray-800"
        data-ocid="tool.dropzone"
      >
        <Upload className="w-8 h-8 text-gray-500 mb-2" />
        <span className="text-gray-400 text-sm">Add images</span>
        <input
          type="file"
          accept="image/*"
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
          <p className="text-gray-400 text-sm">{files.length} file(s)</p>
          <div className="flex items-center gap-4">
            <Label className="text-gray-300 w-32">Max Width (px)</Label>
            <Input
              type="number"
              value={maxW}
              onChange={(e) => setMaxW(Number(e.target.value))}
              className="bg-gray-800 border-gray-700 text-white w-28"
              data-ocid="tool.input"
            />
          </div>
          <Button size="sm" onClick={process} data-ocid="tool.primary_button">
            <Download className="w-4 h-4 mr-1" />
            Process & Download ZIP
          </Button>
          {status && <p className="text-green-400 text-sm">{status}</p>}
        </div>
      )}
    </div>
  );
}

function FileInfo({ file: externalFile }: { file?: File }) {
  const [dims, setDims] = useState<string | null>(null);
  const [prevFile, setPrevFile] = useState<File | null>(null);

  const activeFile = externalFile ?? null;

  // Compute dims when image file changes
  if (activeFile !== prevFile) {
    setPrevFile(activeFile);
    setDims(null);
    if (activeFile?.type.startsWith("image/")) {
      const url = URL.createObjectURL(activeFile);
      const img = new window.Image();
      img.onload = () => setDims(`${img.width} x ${img.height} px`);
      img.src = url;
    }
  }

  const formatSize = (s: number) =>
    s > 1024 * 1024
      ? `${(s / 1024 / 1024).toFixed(2)} MB`
      : `${(s / 1024).toFixed(1)} KB`;

  return (
    <div className="bg-gray-900 rounded-xl p-4 space-y-3">
      <h2 className="text-white font-semibold">File Info</h2>
      {!activeFile ? (
        <NoFileMsg />
      ) : (
        <div className="bg-gray-800 rounded-lg p-4 space-y-2">
          {[
            { label: "Name", val: activeFile.name },
            { label: "Size", val: formatSize(activeFile.size) },
            { label: "Type", val: activeFile.type || "unknown" },
            ...(dims ? [{ label: "Dimensions", val: dims }] : []),
          ].map(({ label, val }) => (
            <div key={label} className="flex">
              <span className="text-gray-400 w-28">{label}:</span>
              <span className="text-white">{val}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function FileUtils({ tool, file }: Props) {
  switch (tool) {
    case "file-rename":
      return <FileRename file={file} />;
    case "file-batch":
      return <BatchResize />;
    case "file-info":
      return <FileInfo file={file} />;
    default:
      return <div className="text-gray-400">Select a tool</div>;
  }
}
