import { Button } from "@/components/ui/button";
import {
  ChevronDown,
  ChevronRight,
  FileText,
  FolderOpen,
  Image,
  RefreshCw,
  Star,
  Upload,
} from "lucide-react";
import { useCallback, useRef, useState } from "react";
import FileUtils from "./components/tools/FileUtils";
import ImageTools from "./components/tools/ImageTools";
import PdfTools from "./components/tools/PdfTools";

type ToolId =
  | "img-crop"
  | "img-perspective"
  | "img-resize"
  | "img-rotate"
  | "img-adjust"
  | "img-filter"
  | "img-convert"
  | "img-compress"
  | "img-watermark"
  | "img-passport"
  | "img-bgremove"
  | "img-dpi"
  | "pdf-view"
  | "pdf-img2pdf"
  | "pdf-merge"
  | "pdf-split"
  | "pdf-compress"
  | "pdf-toimg"
  | "pdf-rotate"
  | "pdf-delete"
  | "file-rename"
  | "file-batch"
  | "file-info";

const sidebarGroups = [
  {
    id: "image",
    label: "Image Tools",
    icon: Image,
    tools: [
      { id: "img-bgremove" as ToolId, label: "Remove Background" },
      { id: "img-perspective" as ToolId, label: "Perspective Crop" },
      { id: "img-crop" as ToolId, label: "Crop" },
      { id: "img-resize" as ToolId, label: "Resize" },
      { id: "img-rotate" as ToolId, label: "Rotate & Flip" },
      { id: "img-adjust" as ToolId, label: "Brightness/Contrast" },
      { id: "img-filter" as ToolId, label: "Sharpen / Blur" },
      { id: "img-convert" as ToolId, label: "Format Convert" },
      { id: "img-compress" as ToolId, label: "Compression" },
      { id: "img-watermark" as ToolId, label: "Watermark" },
      { id: "img-passport" as ToolId, label: "Passport Photo" },
      { id: "img-dpi" as ToolId, label: "DPI Change" },
    ],
  },
  {
    id: "pdf",
    label: "PDF Tools",
    icon: FileText,
    tools: [
      { id: "pdf-view" as ToolId, label: "View PDF" },
      { id: "pdf-img2pdf" as ToolId, label: "Image to PDF" },
      { id: "pdf-merge" as ToolId, label: "Merge PDF" },
      { id: "pdf-split" as ToolId, label: "Split PDF" },
      { id: "pdf-compress" as ToolId, label: "Compress PDF" },
      { id: "pdf-toimg" as ToolId, label: "PDF to Images" },
      { id: "pdf-rotate" as ToolId, label: "Rotate Pages" },
      { id: "pdf-delete" as ToolId, label: "Delete Pages" },
    ],
  },
  {
    id: "file",
    label: "File Utilities",
    icon: FolderOpen,
    tools: [
      { id: "file-rename" as ToolId, label: "File Rename" },
      { id: "file-batch" as ToolId, label: "Batch Resize" },
      { id: "file-info" as ToolId, label: "File Info" },
    ],
  },
];

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((res) => {
    const i = new window.Image();
    i.onload = () => res(i);
    i.src = URL.createObjectURL(file);
  });
}

export default function App() {
  const [activeTool, setActiveTool] = useState<ToolId>("img-bgremove");
  const [openGroups, setOpenGroups] = useState<Set<string>>(
    new Set(["image", "pdf", "file"]),
  );
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadedImage, setUploadedImage] = useState<HTMLImageElement | null>(
    null,
  );
  const [imgPreviewUrl, setImgPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileLoad = useCallback(async (file: File) => {
    setUploadedFile(file);
    if (file.type.startsWith("image/")) {
      const img = await loadImageFromFile(file);
      setUploadedImage(img);
      setImgPreviewUrl(img.src);
    } else {
      setUploadedImage(null);
      setImgPreviewUrl(null);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFileLoad(file);
    },
    [handleFileLoad],
  );

  const toggleGroup = (id: string) => {
    setOpenGroups((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const renderTool = () => {
    if (activeTool.startsWith("img-"))
      return (
        <ImageTools
          tool={activeTool}
          img={uploadedImage ?? undefined}
          file={uploadedFile ?? undefined}
        />
      );
    if (activeTool.startsWith("pdf-"))
      return <PdfTools tool={activeTool} file={uploadedFile ?? undefined} />;
    return <FileUtils tool={activeTool} file={uploadedFile ?? undefined} />;
  };

  const activeLabel =
    sidebarGroups.flatMap((g) => g.tools).find((t) => t.id === activeTool)
      ?.label ?? "";

  const isImageFile = uploadedFile?.type.startsWith("image/");
  const isPdfFile = uploadedFile?.type === "application/pdf";

  return (
    <div
      className="flex h-screen bg-gray-950 text-gray-100 overflow-hidden"
      data-ocid="app.page"
    >
      {/* Sidebar */}
      <aside className="w-56 bg-gray-900 border-r border-gray-800 flex flex-col overflow-hidden flex-shrink-0">
        <div className="px-4 py-4 border-b border-gray-800 flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <Star className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="font-bold text-white text-sm">BBD Solution</div>
            <div className="text-xs text-gray-400">Cyber Cafe Tools</div>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto py-2">
          {sidebarGroups.map((group) => {
            const Icon = group.icon;
            const isOpen = openGroups.has(group.id);
            return (
              <div key={group.id}>
                <button
                  type="button"
                  onClick={() => toggleGroup(group.id)}
                  className="w-full flex items-center gap-2 px-4 py-2 text-gray-400 hover:text-white text-xs font-semibold uppercase tracking-wider"
                  data-ocid={`nav.${group.id}.toggle`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span className="flex-1 text-left">{group.label}</span>
                  {isOpen ? (
                    <ChevronDown className="w-3 h-3" />
                  ) : (
                    <ChevronRight className="w-3 h-3" />
                  )}
                </button>
                {isOpen &&
                  group.tools.map((tool) => (
                    <button
                      type="button"
                      key={tool.id}
                      onClick={() => setActiveTool(tool.id)}
                      data-ocid={`nav.${tool.id}.link`}
                      className={`w-full text-left px-6 py-1.5 text-sm transition-colors ${activeTool === tool.id ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white hover:bg-gray-800"}`}
                    >
                      {tool.label}
                    </button>
                  ))}
              </div>
            );
          })}
        </nav>
        <div className="px-4 py-3 border-t border-gray-800 text-xs text-gray-500">
          v1.0 &bull; All local
        </div>
      </aside>

      {/* Main area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-gray-900 border-b border-gray-800 px-6 py-3 flex items-center gap-2 flex-shrink-0">
          <span className="text-gray-400 text-sm">BBD Solution</span>
          <span className="text-gray-600">/</span>
          <span className="text-white text-sm font-medium">{activeLabel}</span>
          {uploadedFile && (
            <>
              <span className="text-gray-600">/</span>
              <span className="text-blue-400 text-sm truncate max-w-xs">
                {uploadedFile.name}
              </span>
            </>
          )}
        </header>

        {/* Content: left panel + right panel */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Panel - File Upload & Preview */}
          <div className="w-96 bg-gray-900 border-r border-gray-800 flex flex-col overflow-hidden flex-shrink-0">
            <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
              <span className="text-sm font-medium text-gray-300">File</span>
              {uploadedFile && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-xs text-gray-400 hover:text-white h-7 gap-1"
                  onClick={() => fileInputRef.current?.click()}
                  data-ocid="file.change_button"
                >
                  <RefreshCw className="w-3 h-3" />
                  Change File
                </Button>
              )}
            </div>

            <div className="flex-1 flex flex-col overflow-hidden p-3">
              {!uploadedFile ? (
                /* Upload drop zone */
                <label
                  className={`flex-1 flex flex-col items-center justify-center border-2 border-dashed rounded-xl cursor-pointer transition-all ${
                    isDragging
                      ? "border-blue-400 bg-blue-950/30"
                      : "border-gray-700 hover:border-blue-500 bg-gray-800/40"
                  }`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  data-ocid="file.dropzone"
                >
                  <Upload className="w-10 h-10 text-gray-500 mb-3" />
                  <span className="text-gray-300 font-medium text-sm">
                    Drop file here
                  </span>
                  <span className="text-gray-500 text-xs mt-1">
                    or click to browse
                  </span>
                  <span className="text-gray-600 text-xs mt-3">
                    Images, PDFs & more
                  </span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,.pdf,*"
                    className="hidden"
                    onChange={(e) =>
                      e.target.files?.[0] && handleFileLoad(e.target.files[0])
                    }
                  />
                </label>
              ) : (
                /* File preview */
                <div className="flex-1 flex flex-col gap-3 overflow-hidden">
                  {/* Image preview */}
                  {isImageFile && imgPreviewUrl && (
                    <div
                      className="flex-1 rounded-lg overflow-hidden border border-gray-700 flex items-center justify-center min-h-0"
                      style={{
                        background:
                          "repeating-conic-gradient(#2a2a2a 0% 25%, #1e1e1e 0% 50%) 0 0/16px 16px",
                      }}
                    >
                      <img
                        src={imgPreviewUrl}
                        alt="Preview"
                        className="max-w-full max-h-full object-contain"
                        style={{ imageRendering: "pixelated" }}
                      />
                    </div>
                  )}

                  {/* PDF preview */}
                  {isPdfFile && (
                    <div className="flex-1 flex flex-col items-center justify-center rounded-lg border border-gray-700 bg-gray-800/50">
                      <FileText className="w-16 h-16 text-red-400 mb-3" />
                      <span className="text-gray-300 text-sm font-medium">
                        PDF Document
                      </span>
                    </div>
                  )}

                  {/* Other file */}
                  {!isImageFile && !isPdfFile && (
                    <div className="flex-1 flex flex-col items-center justify-center rounded-lg border border-gray-700 bg-gray-800/50">
                      <FolderOpen className="w-16 h-16 text-yellow-400 mb-3" />
                      <span className="text-gray-300 text-sm font-medium">
                        File loaded
                      </span>
                    </div>
                  )}

                  {/* File metadata */}
                  <div className="bg-gray-800 rounded-lg px-3 py-2 space-y-1 flex-shrink-0">
                    <div className="flex items-start gap-2">
                      <span className="text-gray-500 text-xs w-16 flex-shrink-0">
                        Name
                      </span>
                      <span className="text-gray-200 text-xs truncate">
                        {uploadedFile.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500 text-xs w-16">Size</span>
                      <span className="text-gray-200 text-xs">
                        {uploadedFile.size > 1024 * 1024
                          ? `${(uploadedFile.size / 1024 / 1024).toFixed(2)} MB`
                          : `${(uploadedFile.size / 1024).toFixed(1)} KB`}
                      </span>
                    </div>
                    {isImageFile && uploadedImage && (
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500 text-xs w-16">Dims</span>
                        <span className="text-gray-200 text-xs">
                          {uploadedImage.width} × {uploadedImage.height} px
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500 text-xs w-16">Type</span>
                      <span className="text-gray-200 text-xs">
                        {uploadedFile.type || "unknown"}
                      </span>
                    </div>
                  </div>

                  {/* Hidden file input for change */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,.pdf,*"
                    className="hidden"
                    onChange={(e) =>
                      e.target.files?.[0] && handleFileLoad(e.target.files[0])
                    }
                  />
                </div>
              )}
            </div>
          </div>

          {/* Right Panel - Tool controls */}
          <div className="flex-1 overflow-y-auto p-5" data-ocid="tool.panel">
            {renderTool()}
          </div>
        </div>
      </main>
    </div>
  );
}
