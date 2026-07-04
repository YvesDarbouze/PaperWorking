"use client";

import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import toast from "react-hot-toast";

// ─── Types ────────────────────────────────────────────────────────────────────

type Role = "OWNER" | "PARTNER" | "ANALYST" | "VIEWER";

const ROLES: { value: Role; label: string; description: string }[] = [
  { value: "VIEWER",  label: "Viewer",  description: "Read-only access" },
  { value: "ANALYST", label: "Analyst", description: "Can fill in fields" },
  { value: "PARTNER", label: "Partner", description: "Can edit all data" },
  { value: "OWNER",   label: "Owner",   description: "Full access" },
];

// ─── API ──────────────────────────────────────────────────────────────────────

async function sendInvite(projectId: string, email: string, role: Role, token: string) {
  const res = await fetch(`/api/reil/projects/${projectId}/invite`, {
    method:  "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body:    JSON.stringify({ email, role }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.issues?.[0]?.message ?? err?.error ?? "Invite failed.");
  }
  return res.json();
}

// ─── Component ────────────────────────────────────────────────────────────────

interface InviteModalProps {
  projectId:  string;
  projectName?: string;
  isOpen:     boolean;
  onClose:    () => void;
}

export function InviteModal({ projectId, projectName, isOpen, onClose }: InviteModalProps) {
  const { user } = useAuth();
  const qc = useQueryClient();

  const [email, setEmail] = useState("");
  const [role,  setRole]  = useState<Role>("VIEWER");
  const [error, setError] = useState<string | null>(null);

  // Reset on open
  useEffect(() => {
    if (isOpen) { setEmail(""); setRole("VIEWER"); setError(null); }
  }, [isOpen]);

  const inviteMutation = useMutation({
    mutationFn: async () => {
      const token = await user?.getIdToken();
      if (!token) throw new Error("Not authenticated.");
      return sendInvite(projectId, email.trim(), role, token);
    },
    onSuccess: (data) => {
      toast.success(`Invite sent to ${data.invited}`);
      qc.invalidateQueries({ queryKey: ["collaborators", projectId] });
      onClose();
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) { setError("Email is required."); return; }
    setError(null);
    inviteMutation.mutate();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-[300]"
            style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            className="fixed z-[310] inset-0 flex items-center justify-center p-6 pointer-events-none"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.18, ease: [0.19, 1, 0.22, 1] }}
          >
            <div
              className="pointer-events-auto w-full max-w-md rounded-2xl overflow-hidden"
              style={{
                background:    "linear-gradient(135deg, rgba(22,19,24,0.98) 0%, rgba(11,18,24,0.99) 100%)",
                backdropFilter:"blur(32px)",
                border:        "1px solid rgba(255,255,255,0.1)",
                boxShadow:     "0 32px 80px rgba(0,0,0,0.6)",
              }}
            >
              {/* Header */}
              <div className="flex justify-between items-center px-6 py-5" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                <div>
                  <h3 className="text-[16px] font-bold" style={{ color: "rgba(253,255,252,0.95)" }}>
                    Invite a teammate
                  </h3>
                  {projectName && (
                    <p className="text-[12px] mt-0.5" style={{ color: "rgba(253,255,252,0.4)" }}>
                      to {projectName}
                    </p>
                  )}
                </div>
                <button onClick={onClose} className="hover:opacity-70 transition-opacity">
                  <span className="material-symbols-outlined text-[20px]" style={{ color: "rgba(253,255,252,0.4)" }}>close</span>
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="p-6 space-y-5">
                {/* Email */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-widest" style={{ color: "rgba(253,255,252,0.4)", letterSpacing: "0.07em" }}>
                    Email Address
                  </label>
                  <input
                    type="email"
                    autoFocus
                    placeholder="colleague@example.com"
                    value={email}
                    onChange={e => { setEmail(e.target.value); setError(null); }}
                    className="w-full rounded-xl px-4 py-3 text-sm bg-transparent outline-none"
                    style={{
                      background: "rgba(14,22,28,0.8)",
                      border:     `1px solid ${error ? "#F0654340" : "rgba(255,255,255,0.09)"}`,
                      color:      "rgba(253,255,252,0.9)",
                    }}
                  />
                </div>

                {/* Role */}
                <div className="space-y-2">
                  <label className="text-[11px] font-bold uppercase tracking-widest" style={{ color: "rgba(253,255,252,0.4)", letterSpacing: "0.07em" }}>
                    Role
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {ROLES.map(r => (
                      <button
                        key={r.value}
                        type="button"
                        onClick={() => setRole(r.value)}
                        className="flex flex-col px-3 py-2.5 rounded-xl text-left"
                        style={{
                          background: role === r.value ? "rgba(69,73,85,0.08)" : "rgba(255,255,255,0.04)",
                          border:     `1px solid ${role === r.value ? "rgba(69,73,85,0.25)" : "rgba(255,255,255,0.07)"}`,
                        }}
                      >
                        <span className="text-[12px] font-semibold" style={{ color: role === r.value ? "#454955" : "rgba(253,255,252,0.75)" }}>
                          {r.label}
                        </span>
                        <span className="text-[10px]" style={{ color: "rgba(253,255,252,0.3)" }}>
                          {r.description}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {error && (
                  <p className="text-[12px] flex items-center gap-1.5" style={{ color: "#F06543" }}>
                    <span className="material-symbols-outlined text-[14px]">error</span>
                    {error}
                  </p>
                )}

                {/* Note about mock email - hidden in production UI */}
                {process.env.NODE_ENV !== "production" && (
                  <p className="text-[11px]" style={{ color: "rgba(253,255,252,0.2)" }}>
                    📬 Email delivery is mocked — invite is logged to console. Wire a real provider to complete the flow.
                  </p>
                )}

                <button
                  type="submit"
                  disabled={inviteMutation.isPending}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold"
                  style={{
                    background: inviteMutation.isPending ? "rgba(69,73,85,0.1)" : "#454955",
                    color:      inviteMutation.isPending ? "#454955" : "#0d0a0b",
                  }}
                >
                  {inviteMutation.isPending ? "Sending invite…" : "Send Invite"}
                  <span className="material-symbols-outlined text-[18px]">send</span>
                </button>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
