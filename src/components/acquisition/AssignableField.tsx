"use client";

import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { useAcquisitionWizard } from "@/store/acquisitionWizardStore";
import toast from "react-hot-toast";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Collaborator {
  userId: string;
  role:   string;
  user:   { id: string; email: string; name: string | null };
}

interface Assignment {
  id:        string;
  fieldKey:  string;
  status:    "OPEN" | "FILLED";
  assignedTo:{ id: string; email: string; name: string | null };
}

// ─── API ──────────────────────────────────────────────────────────────────────

async function fetchProjectCollaborators(projectId: string, token: string): Promise<Collaborator[]> {
  const res = await fetch(`/api/reil/projects/${projectId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data.collaborators ?? [];
}

async function createAssignment(
  projectId: string,
  fieldKey:  string,
  assignedToId: string,
  token: string,
): Promise<Assignment> {
  const res = await fetch(`/api/reil/projects/${projectId}/assignments`, {
    method:  "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body:    JSON.stringify({ fieldKey, assignedToId }),
  });
  if (!res.ok) throw new Error("Failed to create assignment.");
  return res.json();
}

async function resolveAssignment(
  projectId:    string,
  assignmentId: string,
  token: string,
) {
  const res = await fetch(`/api/reil/projects/${projectId}/assignments/${assignmentId}`, {
    method:  "PATCH",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body:    JSON.stringify({ status: "FILLED" }),
  });
  if (!res.ok) throw new Error("Failed to resolve assignment.");
  return res.json();
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function displayName(u: { email: string; name: string | null }): string {
  return u.name ?? u.email.split("@")[0];
}

// ─── Component ────────────────────────────────────────────────────────────────

interface AssignableFieldProps {
  /** Dot-separated field key, e.g. "terms.offerMadeCents" */
  fieldKey:    string;
  label:       string;
  /** Whether the field currently has a value (truthy = filled) */
  hasValue:    boolean;
  children:    React.ReactNode;
}

export function AssignableField({ fieldKey, label, hasValue, children }: AssignableFieldProps) {
  const { projectId } = useAcquisitionWizard();
  const { user } = useAuth();
  const qc = useQueryClient();

  const [showPicker, setShowPicker] = useState(false);

  // Current assignment for this field
  const { data: assignments = [] } = useQuery({
    queryKey: ["assignments", projectId],
    queryFn:  async () => {
      const token = await user?.getIdToken();
      if (!token || !projectId) return [];
      const res = await fetch(`/api/reil/projects/${projectId}/assignments`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return [];
      return res.json() as Promise<Assignment[]>;
    },
    enabled:   !!projectId && !!user,
    staleTime: 15_000,
  });

  const openAssignment = assignments.find(
    a => a.fieldKey === fieldKey && a.status === "OPEN",
  ) ?? null;

  // Fetch collaborators for the assignee picker
  const { data: collaborators = [] } = useQuery({
    queryKey: ["collaborators", projectId],
    queryFn:  async () => {
      const token = await user?.getIdToken();
      if (!token || !projectId) return [];
      return fetchProjectCollaborators(projectId, token);
    },
    enabled:   !!projectId && !!user && showPicker,
    staleTime: 30_000,
  });

  // Auto-resolve when the field gets a value
  useEffect(() => {
    if (!hasValue || !openAssignment || !projectId || !user) return;
    let cancelled = false;
    user.getIdToken().then((token: string) => {
      if (cancelled) return;
      resolveAssignment(projectId, openAssignment.id, token)
        .then(() => qc.invalidateQueries({ queryKey: ["assignments", projectId] }))
        .catch(() => {}); // silent — best effort
    });
    return () => { cancelled = true; };
  }, [hasValue, openAssignment, projectId, user, qc]);

  // Assign mutation
  const assignMutation = useMutation({
    mutationFn: async (assignedToId: string) => {
      const token = await user?.getIdToken();
      if (!token || !projectId) throw new Error("Not ready.");
      return createAssignment(projectId, fieldKey, assignedToId, token);
    },
    onSuccess: (_, assignedToId) => {
      const c = collaborators.find(c => c.userId === assignedToId);
      const name = c ? displayName(c.user) : "teammate";
      toast.success(`"${label}" assigned to ${name}`);
      qc.invalidateQueries({ queryKey: ["assignments", projectId] });
      setShowPicker(false);
    },
    onError: () => toast.error("Failed to assign field."),
  });

  const isAssigned = !!openAssignment;
  const assigneeName = openAssignment ? displayName(openAssignment.assignedTo) : null;
  const canAssign = !!projectId;

  return (
    <div className="relative group">
      {/* ── Waiting state overlay ── */}
      {isAssigned && !hasValue && (
        <div
          className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-xl"
          style={{
            background: "rgba(14,22,28,0.85)",
            border:     "1px solid rgba(255,209,170,0.2)",
            backdropFilter: "blur(4px)",
          }}
        >
          <span className="material-symbols-outlined text-[22px] mb-1" style={{ color: "#ffd1aa" }}>
            pending
          </span>
          <p className="text-[12px] font-semibold" style={{ color: "rgba(218,228,236,0.7)" }}>
            Waiting on {assigneeName}
          </p>
          <p className="text-[10px]" style={{ color: "rgba(218,228,236,0.3)" }}>
            {label}
          </p>
        </div>
      )}

      {/* The actual field */}
      <div className={isAssigned && !hasValue ? "pointer-events-none opacity-30" : ""}>
        {children}
      </div>

      {/* ── Assign affordance ── */}
      {!isAssigned && canAssign && (
        <div className="absolute -top-1 -right-1 z-20">
          <button
            onClick={() => setShowPicker(v => !v)}
            className="w-5 h-5 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-150"
            style={{
              background: "rgba(87,241,219,0.12)",
              border:     "1px solid rgba(87,241,219,0.25)",
            }}
            title={`Ask a teammate to fill in "${label}"`}
          >
            <span className="material-symbols-outlined text-[11px]" style={{ color: "#57f1db" }}>
              person_add
            </span>
          </button>
        </div>
      )}

      {/* ── Assignee picker dropdown ── */}
      {showPicker && (
        <div
          className="absolute right-0 top-full mt-1 z-30 min-w-[200px] rounded-xl overflow-hidden"
          style={{
            background:    "rgba(18,27,34,0.98)",
            border:        "1px solid rgba(255,255,255,0.1)",
            backdropFilter: "blur(24px)",
            boxShadow:     "0 16px 40px rgba(0,0,0,0.5)",
          }}
        >
          <div className="px-3 py-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "rgba(218,228,236,0.3)" }}>
              Assign "{label}"
            </p>
          </div>

          {collaborators.length === 0 ? (
            <div className="px-3 py-3 text-center">
              <p className="text-[11px]" style={{ color: "rgba(218,228,236,0.3)" }}>
                No teammates yet. Invite from the Team panel.
              </p>
            </div>
          ) : (
            collaborators.map(c => (
              <button
                key={c.userId}
                onClick={() => assignMutation.mutate(c.userId)}
                disabled={assignMutation.isPending}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors"
                onMouseEnter={e => (e.currentTarget.style.background = "rgba(87,241,219,0.06)")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
              >
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-[9px] font-bold"
                  style={{ background: "rgba(87,241,219,0.12)", color: "#57f1db" }}
                >
                  {displayName(c.user).slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-[12px] font-medium truncate" style={{ color: "rgba(218,228,236,0.85)" }}>
                    {displayName(c.user)}
                  </p>
                  <p className="text-[10px] truncate" style={{ color: "rgba(218,228,236,0.3)" }}>
                    {c.role.charAt(0) + c.role.slice(1).toLowerCase()}
                  </p>
                </div>
              </button>
            ))
          )}

          <button
            onClick={() => setShowPicker(false)}
            className="w-full py-2 text-[11px]"
            style={{ borderTop: "1px solid rgba(255,255,255,0.05)", color: "rgba(218,228,236,0.25)" }}
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
