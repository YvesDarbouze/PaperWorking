"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { InviteModal } from "./InviteModal";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Collaborator {
  id:         string;
  userId:     string;
  role:       string;
  invitedAt:  string;
  acceptedAt: string | null;
  user: {
    id:    string;
    email: string;
    name:  string | null;
  };
}

interface Assignment {
  id:           string;
  fieldKey:     string;
  status:       "OPEN" | "FILLED";
  createdAt:    string;
  assignedTo: { id: string; email: string; name: string | null };
}

// ─── API ──────────────────────────────────────────────────────────────────────

async function fetchCollaborators(projectId: string, token: string): Promise<Collaborator[]> {
  const res = await fetch(`/api/reil/projects/${projectId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data.collaborators ?? [];
}

async function fetchAssignments(projectId: string, token: string): Promise<Assignment[]> {
  const res = await fetch(`/api/reil/projects/${projectId}/assignments`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return [];
  return res.json();
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function initials(email: string, name?: string | null): string {
  if (name) return name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  return email.slice(0, 2).toUpperCase();
}

function displayName(u: { email: string; name: string | null }): string {
  return u.name ?? u.email.split("@")[0];
}

function fieldLabel(fieldKey: string): string {
  return fieldKey.split(".").pop()?.replace(/([A-Z])/g, " $1").replace(/Cents$/, "").trim() ?? fieldKey;
}

// ─── Component ────────────────────────────────────────────────────────────────

interface MembersPanelProps {
  projectId:   string;
  projectName?: string;
}

export function MembersPanel({ projectId, projectName }: MembersPanelProps) {
  const { user } = useAuth();
  const [inviteOpen,  setInviteOpen]  = useState(false);
  const [expanded,    setExpanded]    = useState(false);

  const { data: collaborators = [] } = useQuery({
    queryKey: ["collaborators", projectId],
    queryFn:  async () => {
      const token = await user?.getIdToken();
      if (!token || !projectId) return [];
      return fetchCollaborators(projectId, token);
    },
    enabled:   !!projectId && !!user,
    staleTime: 30_000,
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ["assignments", projectId],
    queryFn:  async () => {
      const token = await user?.getIdToken();
      if (!token || !projectId) return [];
      return fetchAssignments(projectId, token);
    },
    enabled:   !!projectId && !!user,
    staleTime: 15_000,
  });

  const openAssignments = assignments.filter(a => a.status === "OPEN");

  return (
    <>
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }} className="pt-4">

        {/* Header row */}
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => setExpanded(v => !v)}
            className="flex items-center gap-2 text-left"
          >
            <span className="material-symbols-outlined text-[14px]" style={{ color: "rgba(218,228,236,0.3)", fontVariationSettings: "'FILL' 0" }}>
              group
            </span>
            <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: "rgba(218,228,236,0.3)", letterSpacing: "0.07em" }}>
              Team
            </span>
            {collaborators.length > 0 && (
              <span
                className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                style={{ background: "rgba(87,241,219,0.1)", color: "#57f1db" }}
              >
                {collaborators.length}
              </span>
            )}
            {openAssignments.length > 0 && (
              <span
                className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                style={{ background: "rgba(255,209,170,0.12)", color: "#ffd1aa" }}
              >
                {openAssignments.length} open
              </span>
            )}
          </button>

          <button
            onClick={() => setInviteOpen(true)}
            className="w-6 h-6 rounded-lg flex items-center justify-center transition-opacity hover:opacity-70"
            style={{ background: "rgba(87,241,219,0.1)", border: "1px solid rgba(87,241,219,0.2)" }}
            title="Invite teammate"
          >
            <span className="material-symbols-outlined text-[13px]" style={{ color: "#57f1db" }}>add</span>
          </button>
        </div>

        {/* Expanded member list */}
        {expanded && (
          <div className="space-y-2">
            {collaborators.length === 0 && (
              <p className="text-[11px] text-center py-2" style={{ color: "rgba(218,228,236,0.2)" }}>
                No teammates yet.
              </p>
            )}
            {collaborators.map(c => {
              const memberAssignments = openAssignments.filter(a => a.assignedTo.id === c.userId);
              return (
                <div key={c.id} className="space-y-1">
                  {/* Member row */}
                  <div className="flex items-center gap-2">
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-[9px] font-bold"
                      style={{ background: "rgba(87,241,219,0.12)", color: "#57f1db" }}
                    >
                      {initials(c.user.email, c.user.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] truncate font-medium" style={{ color: "rgba(218,228,236,0.75)" }}>
                        {displayName(c.user)}
                      </p>
                      <p className="text-[10px]" style={{ color: "rgba(218,228,236,0.25)" }}>
                        {c.role.charAt(0) + c.role.slice(1).toLowerCase()} · {c.acceptedAt ? "Active" : "Invited"}
                      </p>
                    </div>
                  </div>

                  {/* Open assignments for this member */}
                  {memberAssignments.map(a => (
                    <div
                      key={a.id}
                      className="ml-8 flex items-center gap-1.5 text-[10px] px-2 py-1 rounded-lg"
                      style={{ background: "rgba(255,209,170,0.07)", border: "1px solid rgba(255,209,170,0.12)" }}
                    >
                      <span className="material-symbols-outlined text-[11px]" style={{ color: "#ffd1aa" }}>pending</span>
                      <span style={{ color: "rgba(218,228,236,0.45)" }}>{fieldLabel(a.fieldKey)}</span>
                    </div>
                  ))}
                </div>
              );
            })}

            {/* Invite CTA if no members */}
            {collaborators.length === 0 && (
              <button
                onClick={() => setInviteOpen(true)}
                className="w-full py-2 rounded-xl text-[11px] font-semibold flex items-center justify-center gap-1.5"
                style={{ background: "rgba(87,241,219,0.06)", border: "1px dashed rgba(87,241,219,0.15)", color: "#57f1db" }}
              >
                <span className="material-symbols-outlined text-[14px]">person_add</span>
                Invite a teammate
              </button>
            )}
          </div>
        )}
      </div>

      <InviteModal
        projectId={projectId}
        projectName={projectName}
        isOpen={inviteOpen}
        onClose={() => setInviteOpen(false)}
      />
    </>
  );
}
