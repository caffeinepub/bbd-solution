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
      <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
        <span className="text-2xl">📁</span>
      </div>
      <p className="text-gray-500 text-sm">
        Upload a file on the left to get started
      </p>
    </div>
  );
}

function FileRename({ file: externalFile }: { file?: File }) {
  const [name, setName] = useState("");
  const [initialized, setInitialized] = useState(false);

  const activeFile = externalFile ?? null;

  if (activeFile && !initialized) {
    setName(activeFile.name);
    setInitialized(true);
  }
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
    <div className="p-5 space-y-4">
      <h2 className="font-semibold text-gray-800">File Rename</h2>
      {!activeFile ? (
        <NoFileMsg />
      ) : (
        <div className="space-y-3">
          <p className="text-gray-500 text-sm">Original: {activeFile.name}</p>
          <div>
            <Label className="text-gray-700 text-xs mb-1 block">New Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="border-gray-300"
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

function BatchResize() {
  const [files, setFiles] = useState<File[]>([]);
  const [maxW, setMaxW] = useState(800);
  const [status, setStatus] = useState("");

  const processOne = async (f: File, index: number) => {
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
    URL.revokeObjectURL(url);
    // Delay each download slightly so browsers don't block
    await new Promise((r) => setTimeout(r, index * 400));
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = f.name.replace(/\.[^.]+$/, "_resized.jpg");
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  const process = async () => {
    if (!files.length) return;
    setStatus("Processing...");
    await Promise.all(files.map((f, i) => processOne(f, i)));
    setStatus(`Done! ${files.length} file(s) downloaded.`);
  };

  return (
    <div className="p-5 space-y-4">
      <h2 className="font-semibold text-gray-800">Batch Image Resize</h2>
      <p className="text-gray-500 text-sm">
        Select multiple images to resize. Each will download individually.
      </p>
      <label
        className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-8 cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
        data-ocid="tool.dropzone"
      >
        <Upload className="w-8 h-8 text-gray-400 mb-2" />
        <span className="text-gray-500 text-sm">Add images</span>
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
        <div className="space-y-3">
          <p className="text-gray-600 text-sm">
            {files.length} file(s) selected
          </p>
          <div className="flex items-center gap-4">
            <Label className="text-gray-700 w-32">Max Width (px)</Label>
            <Input
              type="number"
              value={maxW}
              onChange={(e) => setMaxW(Number(e.target.value))}
              className="border-gray-300 w-28"
              data-ocid="tool.input"
            />
          </div>
          <Button size="sm" onClick={process} data-ocid="tool.primary_button">
            <Download className="w-4 h-4 mr-1" />
            Process & Download
          </Button>
          {status && <p className="text-green-600 text-sm">{status}</p>}
        </div>
      )}
    </div>
  );
}

function FileInfo({ file: externalFile }: { file?: File }) {
  const [dims, setDims] = useState<string | null>(null);
  const [prevFile, setPrevFile] = useState<File | null>(null);

  const activeFile = externalFile ?? null;

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
    <div className="p-5 space-y-4">
      <h2 className="font-semibold text-gray-800">File Info</h2>
      {!activeFile ? (
        <NoFileMsg />
      ) : (
        <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 space-y-2">
          {[
            { label: "Name", val: activeFile.name },
            { label: "Size", val: formatSize(activeFile.size) },
            { label: "Type", val: activeFile.type || "unknown" },
            ...(dims ? [{ label: "Dimensions", val: dims }] : []),
          ].map(({ label, val }) => (
            <div key={label} className="flex">
              <span className="text-gray-500 w-28 text-sm">{label}:</span>
              <span className="text-gray-800 text-sm">{val}</span>
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
      return <div className="text-gray-500 p-4">Select a tool</div>;
  }
}
