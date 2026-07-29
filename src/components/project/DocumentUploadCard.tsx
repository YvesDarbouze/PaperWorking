"use client";

import React, { useState, useRef } from "react";
import { UploadCloud, FileText, CheckCircle2, AlertCircle, Loader2, X } from "lucide-react";
import toast from "react-hot-toast";
import { useTheme } from "@/lib/utils/ThemeProvider";

export interface OptimisticFileItem {
  id: string;
  name: string;
  size: number;
  status: "uploading" | "completed" | "error";
  progress: number;
  error?: string;
}

interface DocumentUploadCardProps {
  projectId: string;
  category?: string;
  onUploadSuccess?: (doc: any) => void;
  uploadUrl?: string;
}

export function DocumentUploadCard({
  projectId,
  category = "General Disclosures",
  onUploadSuccess,
  uploadUrl,
}: DocumentUploadCardProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<OptimisticFileItem[]>([]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length === 0) return;

    for (const file of selectedFiles) {
      const tempId = `opt_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
      const newFileItem: OptimisticFileItem = {
        id: tempId,
        name: file.name,
        size: file.size,
        status: "uploading",
        progress: 10,
      };

      // 1. INSTANT OPTIMISTIC UI ADDITION
      setFiles((prev) => [newFileItem, ...prev]);

      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("category", category);
        formData.append("projectId", projectId);

        const targetUrl = uploadUrl || `/api/projects/${projectId}/documents`;
        const res = await fetch(targetUrl, {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          throw new Error(`Upload failed with status ${res.status}`);
        }

        const data = await res.json();

        // 2. RECONCILE ON SUCCESS
        setFiles((prev) =>
          prev.map((item) =>
            item.id === tempId ? { ...item, status: "completed", progress: 100 } : item
          )
        );
        toast.success(`Uploaded ${file.name} successfully`);
        if (onUploadSuccess) onUploadSuccess(data);
      } catch (err: any) {
        // 3. ROLLBACK ON FAILURE
        setFiles((prev) => prev.filter((item) => item.id !== tempId));
        toast.error(`Failed to upload ${file.name}: ${err.message || "Server error"}`);
      }
    }

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div
      data-testid="document-upload-card"
      className="w-full p-5 rounded-2xl border border-solid transition-all"
      style={{
        background: isDark ? "rgba(18,16,20,0.85)" : "#FFFFFF",
        borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(69,73,85,0.12)",
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3
            className="text-sm font-bold truncate"
            style={{ color: isDark ? "#FDFFFC" : "#121317" }}
          >
            Document Upload Vault
          </h3>
          <p
            className="text-xs opacity-60 mt-0.5"
            style={{ color: isDark ? "#FDFFFC" : "#454955" }}
          >
            Category: {category}
          </p>
        </div>

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all active:scale-95 cursor-pointer"
          style={{
            background: isDark ? "rgba(255,255,255,0.08)" : "rgba(69,73,85,0.08)",
            color: isDark ? "#FDFFFC" : "#121317",
            border: isDark ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(69,73,85,0.15)",
          }}
        >
          <UploadCloud className="w-4 h-4 text-emerald-500" />
          <span>Upload File</span>
        </button>

        <input
          ref={fileInputRef}
          type="file"
          data-testid="file-upload-input"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {/* Optimistic Files List */}
      {files.length > 0 && (
        <div className="space-y-2 mt-3">
          {files.map((file) => (
            <div
              key={file.id}
              data-testid="optimistic-file-row"
              className="p-3 rounded-xl border border-solid flex items-center justify-between gap-3 text-xs"
              style={{
                background: isDark ? "rgba(255,255,255,0.03)" : "rgba(69,73,85,0.02)",
                borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(69,73,85,0.08)",
              }}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <FileText className="w-4 h-4 text-emerald-500 shrink-0" />
                <span
                  className="font-semibold truncate"
                  style={{ color: isDark ? "#FDFFFC" : "#121317" }}
                >
                  {file.name}
                </span>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span
                  data-testid="upload-status"
                  className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                  style={{
                    background:
                      file.status === "uploading"
                        ? "rgba(245,158,11,0.12)"
                        : file.status === "completed"
                        ? "rgba(63,125,32,0.15)"
                        : "rgba(240,101,67,0.15)",
                    color:
                      file.status === "uploading"
                        ? "#F59E0B"
                        : file.status === "completed"
                        ? "#3f7d20"
                        : "#F06543",
                  }}
                >
                  {file.status === "uploading" ? (
                    <span className="flex items-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin" /> Uploading...
                    </span>
                  ) : file.status === "completed" ? (
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Complete
                    </span>
                  ) : (
                    <span className="flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> Error
                    </span>
                  )}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
