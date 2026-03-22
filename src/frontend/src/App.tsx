import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import {
  ChevronDown,
  ChevronRight,
  FileText,
  FolderOpen,
  Image,
  RefreshCw,
  Upload,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import FileUtils from "./components/tools/FileUtils";
import ImageTools from "./components/tools/ImageTools";
import PdfTools from "./components/tools/PdfTools";

type ToolCategory = "image" | "pdf" | "file";

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
  | "pdf-batch-toimg"
  | "pdf-single-jpg"
  | "pdf-merge"
  | "pdf-split"
  | "pdf-compress"
  | "pdf-toimg"
  | "pdf-rotate"
  | "pdf-delete"
  | "file-rename"
  | "file-batch"
  | "file-info";

const sidebarGroups: {
  id: ToolCategory;
  label: string;
  icon: React.ElementType;
  tools: { id: ToolId; label: string }[];
}[] = [
  {
    id: "image",
    label: "Image Tools",
    icon: Image,
    tools: [
      { id: "img-bgremove", label: "Remove Background" },
      { id: "img-perspective", label: "Perspective Crop" },
      { id: "img-crop", label: "Crop" },
      { id: "img-resize", label: "Resize" },
      { id: "img-rotate", label: "Rotate & Flip" },
      { id: "img-adjust", label: "Brightness / Contrast" },
      { id: "img-filter", label: "Sharpen / Blur" },
      { id: "img-convert", label: "Format Convert" },
      { id: "img-compress", label: "Compression" },
      { id: "img-watermark", label: "Watermark" },
      { id: "img-passport", label: "Passport Photo" },
      { id: "img-dpi", label: "DPI Change" },
    ],
  },
  {
    id: "pdf",
    label: "PDF Tools",
    icon: FileText,
    tools: [
      { id: "pdf-view", label: "View PDF" },
      { id: "pdf-batch-toimg", label: "Batch PDF → JPG" },
      { id: "pdf-img2pdf", label: "JPG / PNG → PDF" },
      { id: "pdf-single-jpg", label: "Download as JPG" },
      { id: "pdf-merge", label: "Merge PDF" },
      { id: "pdf-split", label: "Split PDF" },
      { id: "pdf-compress", label: "Compress PDF" },
      { id: "pdf-toimg", label: "PDF to Images" },
      { id: "pdf-rotate", label: "Rotate Pages" },
      { id: "pdf-delete", label: "Delete Pages" },
    ],
  },
  {
    id: "file",
    label: "File Utilities",
    icon: FolderOpen,
    tools: [
      { id: "file-rename", label: "File Rename" },
      { id: "file-batch", label: "Batch Resize" },
      { id: "file-info", label: "File Info" },
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

function formatFileSize(bytes: number): string {
  if (bytes > 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

export default function App() {
  const [activeTool, setActiveTool] = useState<ToolId>("img-bgremove");
  const [activeCategory, setActiveCategory] = useState<ToolCategory>("image");
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
  const changeFileInputRef = useRef<HTMLInputElement>(null);

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

  const imageHistoryRef = useRef<{ img: HTMLImageElement; dataUrl: string }[]>(
    [],
  );
  const histIdxRef = useRef(-1);

  const handleSave = useCallback(
    async (newImg: HTMLImageElement, dataUrl: string) => {
      setUploadedImage(newImg);
      setImgPreviewUrl(dataUrl);
      imageHistoryRef.current = imageHistoryRef.current.slice(
        0,
        histIdxRef.current + 1,
      );
      imageHistoryRef.current.push({ img: newImg, dataUrl });
      if (imageHistoryRef.current.length > 20) imageHistoryRef.current.shift();
      histIdxRef.current = imageHistoryRef.current.length - 1;
      try {
        const res = await fetch(dataUrl);
        const blob = await res.blob();
        const newFile = new File([blob], uploadedFile?.name ?? "edited.png", {
          type: blob.type || "image/png",
        });
        setUploadedFile(newFile);
      } catch {
        // ignore
      }
    },
    [uploadedFile],
  );

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        const idx = histIdxRef.current;
        if (idx > 0) {
          histIdxRef.current = idx - 1;
          const prev = imageHistoryRef.current[idx - 1];
          setUploadedImage(prev.img);
          setImgPreviewUrl(prev.dataUrl);
          toast.success("Undo — workspace restored");
        }
      } else if (
        (e.ctrlKey || e.metaKey) &&
        (e.key === "y" || (e.shiftKey && e.key === "z"))
      ) {
        e.preventDefault();
        const idx = histIdxRef.current;
        if (idx < imageHistoryRef.current.length - 1) {
          histIdxRef.current = idx + 1;
          const next = imageHistoryRef.current[idx + 1];
          setUploadedImage(next.img);
          setImgPreviewUrl(next.dataUrl);
          toast.success("Redo — workspace restored");
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        toast.success("✓ Workspace saved");
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
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

  const handleCategoryClick = (cat: ToolCategory) => {
    setActiveCategory(cat);
    const group = sidebarGroups.find((g) => g.id === cat);
    if (group?.tools[0]) setActiveTool(group.tools[0].id);
    setOpenGroups((prev) => new Set([...prev, cat]));
  };

  const filteredGroups = sidebarGroups.filter((g) => g.id === activeCategory);

  const renderTool = () => {
    if (activeTool.startsWith("img-"))
      return (
        <ImageTools
          tool={activeTool}
          img={uploadedImage ?? undefined}
          file={uploadedFile ?? undefined}
          onSave={handleSave}
        />
      );
    if (activeTool.startsWith("pdf-"))
      return <PdfTools tool={activeTool} file={uploadedFile ?? undefined} />;
    return <FileUtils tool={activeTool} file={uploadedFile ?? undefined} />;
  };

  const activeToolLabel =
    sidebarGroups.flatMap((g) => g.tools).find((t) => t.id === activeTool)
      ?.label ?? "";

  const isImageFile = uploadedFile?.type.startsWith("image/");
  const isPdfFile = uploadedFile?.type === "application/pdf";

  // Dark theme tokens
  const D = {
    bg: "#1a1a1a",
    bg2: "#222222",
    bg3: "#2a2a2a",
    bg4: "#333333",
    border: "#3a3a3a",
    text: "#e0e0e0",
    textMuted: "#888888",
    textDim: "#555555",
    accent: "#0078d4",
    accentHover: "#1a4a7a",
  };

  // For pdf-batch tools, allow using the tool even without a pre-loaded file
  const batchTools: ToolId[] = [
    "pdf-batch-toimg",
    "pdf-img2pdf",
    "pdf-merge",
    "pdf-single-jpg",
  ];
  const toolNeedsFile = !batchTools.includes(activeTool);

  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{
        background: D.bg,
        fontFamily: "system-ui, sans-serif",
        color: D.text,
      }}
      data-ocid="app.page"
    >
      {/* Left Sidebar */}
      <aside
        className="flex flex-col overflow-hidden flex-shrink-0"
        style={{
          width: 190,
          background: D.bg2,
          borderRight: `1px solid ${D.border}`,
        }}
      >
        {/* Logo */}
        <div
          className="flex items-center gap-2 px-3 py-2 flex-shrink-0"
          style={{ borderBottom: `1px solid ${D.border}`, background: D.bg }}
        >
          <img
            src="/assets/uploads/Gemini_Generated_Image_p16r2mp16r2mp16r-1.png"
            alt="BBD Solution Logo"
            className="flex-shrink-0 object-contain"
            style={{ width: 36, height: 36 }}
          />
          <div>
            <div className="font-bold text-xs" style={{ color: "#5bb0f0" }}>
              BBD Solution
            </div>
            <div className="text-xs" style={{ color: D.textMuted }}>
              Cyber Cafe Tools
            </div>
          </div>
        </div>

        {/* Tool navigation */}
        <nav className="flex-1 overflow-y-auto py-1">
          {filteredGroups.map((group) => {
            const Icon = group.icon;
            const isOpen = openGroups.has(group.id);
            return (
              <div key={group.id}>
                <button
                  type="button"
                  onClick={() => toggleGroup(group.id)}
                  className="w-full flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide"
                  style={{ color: D.textMuted, background: "transparent" }}
                  data-ocid={`nav.${group.id}.toggle`}
                >
                  <Icon className="w-3 h-3 flex-shrink-0" />
                  <span className="flex-1 text-left">{group.label}</span>
                  {isOpen ? (
                    <ChevronDown className="w-3 h-3" />
                  ) : (
                    <ChevronRight className="w-3 h-3" />
                  )}
                </button>
                {isOpen &&
                  group.tools.map((tool) => {
                    const isActive = activeTool === tool.id;
                    return (
                      <button
                        type="button"
                        key={tool.id}
                        onClick={() => setActiveTool(tool.id)}
                        data-ocid={`nav.${tool.id}.link`}
                        className="w-full text-left text-xs transition-colors"
                        style={{
                          padding: "4px 10px 4px 22px",
                          background: isActive ? D.accent : "transparent",
                          color: isActive ? "#fff" : D.text,
                        }}
                        onMouseEnter={(e) => {
                          if (!isActive) {
                            (
                              e.currentTarget as HTMLButtonElement
                            ).style.background = D.accentHover;
                            (e.currentTarget as HTMLButtonElement).style.color =
                              "#90c8f0";
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isActive) {
                            (
                              e.currentTarget as HTMLButtonElement
                            ).style.background = "transparent";
                            (e.currentTarget as HTMLButtonElement).style.color =
                              D.text;
                          }
                        }}
                      >
                        {tool.label}
                      </button>
                    );
                  })}
              </div>
            );
          })}
        </nav>

        {/* File drop zone / thumbnail */}
        <div
          className="flex-shrink-0"
          style={{ borderTop: `1px solid ${D.border}`, padding: "8px" }}
        >
          {!uploadedFile ? (
            <label
              className="flex flex-col items-center justify-center cursor-pointer rounded text-center"
              style={{
                border: isDragging
                  ? `2px dashed ${D.accent}`
                  : `2px dashed ${D.border}`,
                background: isDragging ? D.accentHover : D.bg3,
                padding: "10px 8px",
                transition: "all 0.15s",
              }}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              data-ocid="file.dropzone"
            >
              <Upload className="w-5 h-5 mb-1" style={{ color: D.accent }} />
              <span className="text-xs font-medium" style={{ color: D.text }}>
                Drop file here
              </span>
              <span className="text-xs" style={{ color: D.textMuted }}>
                or click to browse
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
            <div>
              {isImageFile && imgPreviewUrl && (
                <div
                  className="rounded mb-1 overflow-hidden flex items-center justify-center"
                  style={{
                    height: 70,
                    background: D.bg,
                    border: `1px solid ${D.border}`,
                  }}
                >
                  <img
                    key={imgPreviewUrl}
                    src={imgPreviewUrl}
                    alt="Preview"
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
              )}
              {isPdfFile && (
                <div
                  className="rounded mb-1 flex items-center justify-center"
                  style={{
                    height: 70,
                    background: D.bg3,
                    border: `1px solid ${D.border}`,
                  }}
                >
                  <FileText className="w-8 h-8" style={{ color: "#e05050" }} />
                </div>
              )}
              {!isImageFile && !isPdfFile && (
                <div
                  className="rounded mb-1 flex items-center justify-center"
                  style={{
                    height: 70,
                    background: D.bg3,
                    border: `1px solid ${D.border}`,
                  }}
                >
                  <FolderOpen
                    className="w-8 h-8"
                    style={{ color: "#d4a017" }}
                  />
                </div>
              )}
              <div className="flex items-center gap-1">
                <span
                  className="text-xs flex-1 truncate"
                  style={{ color: D.text }}
                >
                  {uploadedFile.name}
                </span>
                <button
                  type="button"
                  onClick={() => changeFileInputRef.current?.click()}
                  className="flex-shrink-0 rounded px-1 py-0.5 text-xs"
                  style={{
                    background: D.bg4,
                    color: D.text,
                    border: `1px solid ${D.border}`,
                  }}
                  data-ocid="file.change_button"
                  title="Change file"
                >
                  <RefreshCw className="w-3 h-3" />
                </button>
                <input
                  ref={changeFileInputRef}
                  type="file"
                  accept="image/*,.pdf,*"
                  className="hidden"
                  onChange={(e) =>
                    e.target.files?.[0] && handleFileLoad(e.target.files[0])
                  }
                />
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Main area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top menu bar */}
        <header
          className="flex items-center gap-0 flex-shrink-0"
          style={{
            background: D.bg,
            borderBottom: `1px solid ${D.border}`,
            padding: "0",
            height: 34,
          }}
        >
          {(
            [
              {
                id: "image" as ToolCategory,
                label: "Image Tools",
                icon: Image,
              },
              { id: "pdf" as ToolCategory, label: "PDF Tools", icon: FileText },
              {
                id: "file" as ToolCategory,
                label: "File Utilities",
                icon: FolderOpen,
              },
            ] as { id: ToolCategory; label: string; icon: React.ElementType }[]
          ).map((cat) => {
            const Icon = cat.icon;
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => handleCategoryClick(cat.id)}
                data-ocid={`nav.${cat.id}.tab`}
                className="flex items-center gap-1.5 h-full px-4 text-xs transition-colors"
                style={{
                  background: isActive ? D.bg2 : "transparent",
                  color: isActive ? "#5bb0f0" : D.textMuted,
                  borderRight: `1px solid ${D.border}`,
                  borderBottom: isActive
                    ? `2px solid ${D.accent}`
                    : "2px solid transparent",
                  fontWeight: isActive ? 600 : 400,
                }}
              >
                <Icon className="w-3.5 h-3.5" />
                {cat.label}
              </button>
            );
          })}
          {uploadedFile && (
            <span
              className="ml-auto px-4 text-xs truncate max-w-xs"
              style={{ color: D.textMuted }}
            >
              {uploadedFile.name}
            </span>
          )}
        </header>

        {/* Tool workspace */}
        <div
          className="flex-1 flex overflow-hidden"
          style={{ background: D.bg }}
          data-ocid="tool.panel"
        >
          {/* LEFT: tool controls */}
          <div
            className="flex-1 flex flex-col overflow-hidden"
            style={{ background: D.bg2 }}
          >
            {/* Tool header */}
            <div
              className="flex items-center px-3 py-1.5 flex-shrink-0 sticky top-0"
              style={{
                background: D.bg,
                borderBottom: `1px solid ${D.border}`,
                zIndex: 1,
              }}
            >
              <span className="text-sm font-semibold" style={{ color: D.text }}>
                {activeToolLabel}
              </span>
              {uploadedFile && isImageFile && uploadedImage && (
                <span className="ml-3 text-xs" style={{ color: D.textMuted }}>
                  {uploadedImage.naturalWidth}&times;
                  {uploadedImage.naturalHeight}
                </span>
              )}
            </div>
            {/* Tool controls */}
            <div className="flex-1 flex flex-col overflow-hidden">
              {uploadedFile || !toolNeedsFile ? (
                renderTool()
              ) : (
                <div
                  className="p-4 text-center text-sm"
                  style={{ color: D.textDim }}
                >
                  Upload a file to use tools
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: preview panel */}
          <div
            className="w-56 flex-shrink-0 overflow-auto flex flex-col p-2"
            style={{ borderLeft: `1px solid ${D.border}`, background: D.bg }}
          >
            <div
              className="text-xs font-semibold text-center mb-2"
              style={{ color: D.textDim, letterSpacing: "0.05em" }}
            >
              PREVIEW
            </div>
            <div className="flex-1 flex items-center justify-center">
              {!uploadedFile && (
                <div
                  className="flex flex-col items-center justify-center rounded-lg p-3 text-center"
                  style={{
                    border: `2px dashed ${D.border}`,
                    background: D.bg2,
                  }}
                >
                  <Upload
                    className="w-8 h-8 mb-2"
                    style={{ color: D.textDim }}
                  />
                  <p className="text-xs" style={{ color: D.textMuted }}>
                    Upload a file to preview
                  </p>
                </div>
              )}
              {uploadedFile && isImageFile && imgPreviewUrl && (
                <img
                  key={imgPreviewUrl}
                  src={imgPreviewUrl}
                  alt="Preview"
                  className="max-w-full max-h-full object-contain rounded"
                  style={{ maxHeight: "calc(100vh - 100px)" }}
                />
              )}
              {uploadedFile && isPdfFile && (
                <div
                  className="flex flex-col items-center justify-center rounded-lg p-4"
                  style={{ background: D.bg3, border: `1px solid ${D.border}` }}
                >
                  <FileText
                    className="w-12 h-12 mb-2"
                    style={{ color: "#e05050" }}
                  />
                  <span
                    className="text-sm font-medium"
                    style={{ color: "#e05050" }}
                  >
                    PDF Loaded
                  </span>
                  <span className="text-xs mt-1" style={{ color: D.textMuted }}>
                    ← Use tools
                  </span>
                </div>
              )}
              {uploadedFile && !isImageFile && !isPdfFile && (
                <div
                  className="flex flex-col items-center justify-center rounded-lg p-4"
                  style={{ background: D.bg3, border: `1px solid ${D.border}` }}
                >
                  <FolderOpen
                    className="w-12 h-12 mb-2"
                    style={{ color: "#d4a017" }}
                  />
                  <span
                    className="text-xs font-medium truncate max-w-full"
                    style={{ color: D.text }}
                  >
                    {uploadedFile.name}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Status bar */}
        <div
          className="flex items-center gap-4 px-3 flex-shrink-0"
          style={{
            height: 22,
            background: D.bg,
            borderTop: `1px solid ${D.border}`,
          }}
        >
          <span className="text-xs" style={{ color: D.textMuted }}>
            {uploadedFile ? uploadedFile.name : "No file loaded"}
          </span>
          {uploadedFile && isImageFile && uploadedImage && (
            <span className="text-xs" style={{ color: D.textDim }}>
              {uploadedImage.naturalWidth} &times; {uploadedImage.naturalHeight}{" "}
              px
            </span>
          )}
          {uploadedFile && (
            <span className="text-xs" style={{ color: D.textDim }}>
              {formatFileSize(uploadedFile.size)}
            </span>
          )}
          <span className="text-xs ml-auto" style={{ color: D.textDim }}>
            {activeToolLabel}
          </span>
        </div>
      </main>
      <Toaster position="bottom-right" />
    </div>
  );
}
