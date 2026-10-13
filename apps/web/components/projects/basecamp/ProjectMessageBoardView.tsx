'use client';

import { useState } from 'react';
import {
  ChatCenteredDots,
  Plus,
  PaperPlaneRight,
  Eye,
  EyeSlash,
} from '@phosphor-icons/react';
import type { ProjectMessageTopic } from '@/lib/projects/types';

export default function ProjectMessageBoardView({
  projectId,
  topics,
  onRefresh,
  vendorMode,
}: {
  projectId: string;
  topics: ProjectMessageTopic[];
  onRefresh: () => void;
  vendorMode: boolean;
}) {
  const [selectedTopic, setSelectedTopic] = useState<ProjectMessageTopic | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<'announcement' | 'decision' | 'contractor' | 'inspection' | 'general'>('general');
  const [newContent, setNewContent] = useState('');
  const [newVendorVisible, setNewVendorVisible] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Filter topics for vendor mode
  const visibleTopics = vendorMode ? topics.filter((t) => t.vendorVisible) : topics;

  async function handleCreateTopic(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle,
          category: newCategory,
          content: newContent,
          vendorVisible: newVendorVisible,
        }),
      });
      if (res.ok) {
        setNewTitle('');
        setNewContent('');
        setIsCreating(false);
        onRefresh();
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handlePostComment(topicId: string) {
    if (!commentText.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/messages/${topicId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: commentText }),
      });
      if (res.ok) {
        const data = await res.json();
        setCommentText('');
        if (data.topic) {
          setSelectedTopic(data.topic);
        }
        onRefresh();
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
        <div>
          <div className="flex items-center gap-2">
            <ChatCenteredDots size={20} className="text-foreground shrink-0" />
            <h3 className="text-base font-semibold text-foreground tracking-tight">Message Board</h3>
            <span className="text-xs font-mono rounded-none border border-border bg-muted/40 px-2 py-0.5 text-foreground">
              {visibleTopics.length} {visibleTopics.length === 1 ? 'Topic' : 'Topics'}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Structured discussion threads replacing long email chains.
          </p>
        </div>

        {!vendorMode && (
          <button
            type="button"
            onClick={() => setIsCreating(!isCreating)}
            className="inline-flex items-center gap-1.5 rounded-none border border-border bg-card px-3.5 py-2 text-xs font-medium text-foreground hover:bg-muted transition min-h-[44px]"
          >
            <Plus size={16} />
            <span>{isCreating ? 'Cancel' : 'New Message Topic'}</span>
          </button>
        )}
      </div>

      {/* New Topic Form */}
      {isCreating && !vendorMode && (
        <form onSubmit={handleCreateTopic} className="rounded-none border border-border bg-card p-4 space-y-3">
          <h4 className="text-sm font-semibold text-foreground">Start a Discussion Topic</h4>
          <div>
            <label className="block text-xs text-foreground font-medium mb-1">Topic Title</label>
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="e.g. Electrical permit approval timeline and contractor next steps"
              className="w-full rounded-none border border-input bg-background px-3 py-2 text-base sm:text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring min-h-[44px]"
              required
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-foreground font-medium mb-1">Category</label>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value as any)}
                className="w-full rounded-none border border-input bg-background px-3 py-2 text-base sm:text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring min-h-[44px]"
              >
                <option value="general">General Update</option>
                <option value="decision">Key Decision</option>
                <option value="inspection">Inspection Item</option>
                <option value="contractor">Contractor & Bid</option>
                <option value="announcement">Team Announcement</option>
              </select>
            </div>
            <div className="flex items-center gap-2 pt-2 sm:pt-6">
              <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer min-h-[44px]">
                <input
                  type="checkbox"
                  checked={newVendorVisible}
                  onChange={(e) => setNewVendorVisible(e.target.checked)}
                  className="rounded-none border-input text-primary focus:ring-ring"
                />
                <span>Visible to Vendors / Guests</span>
              </label>
            </div>
          </div>
          <div>
            <label className="block text-xs text-foreground font-medium mb-1">Message Content</label>
            <textarea
              rows={4}
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              placeholder="Provide background, findings, and actionable next steps..."
              className="w-full rounded-none border border-input bg-background px-3 py-2 text-base sm:text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring min-h-[44px]"
              required
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              className="px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition min-h-[44px]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-none bg-primary px-4 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition min-h-[44px]"
            >
              {submitting ? 'Posting...' : 'Post Message'}
            </button>
          </div>
        </form>
      )}

      {/* Selected Topic Thread View */}
      {selectedTopic ? (
        <div className="rounded-none border border-border bg-card p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <button
              type="button"
              onClick={() => setSelectedTopic(null)}
              className="text-xs font-medium text-muted-foreground hover:text-foreground transition flex items-center gap-1 min-h-[44px]"
            >
              ← Back to all topics
            </button>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase rounded-none border border-border px-2 py-0.5 bg-muted/40 text-foreground">
                {selectedTopic.category}
              </span>
              {selectedTopic.vendorVisible ? (
                <span className="text-[10px] font-mono flex items-center gap-1 text-foreground">
                  <Eye size={12} /> Vendor Visible
                </span>
              ) : (
                <span className="text-[10px] font-mono flex items-center gap-1 text-muted-foreground">
                  <EyeSlash size={12} /> Team Private
                </span>
              )}
            </div>
          </div>

          <div>
            <h2 className="text-lg font-bold text-foreground tracking-tight">{selectedTopic.title}</h2>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
              <span className="font-medium text-foreground">{selectedTopic.author.name}</span>
              <span>•</span>
              <span>{selectedTopic.author.role}</span>
              <span>•</span>
              <span>{new Date(selectedTopic.createdAt).toLocaleDateString()}</span>
            </div>
            <p className="mt-3 text-sm text-foreground leading-relaxed whitespace-pre-line">
              {selectedTopic.content}
            </p>
          </div>

          {/* Comments Section */}
          <div className="pt-4 border-t border-border space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Discussion ({selectedTopic.comments?.length || 0})
            </h4>

            <div className="space-y-2">
              {selectedTopic.comments && selectedTopic.comments.length > 0 ? (
                selectedTopic.comments.map((comment) => (
                  <div key={comment.id} className="rounded-none border border-border/60 bg-muted/20 p-3 text-xs">
                    <div className="flex items-center justify-between text-muted-foreground mb-1">
                      <span className="font-medium text-foreground">{comment.authorName} ({comment.authorRole})</span>
                      <span className="font-mono text-[10px]">{new Date(comment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <p className="text-foreground leading-relaxed">{comment.content}</p>
                  </div>
                ))
              ) : (
                <p className="text-xs text-muted-foreground italic">No replies yet. Start the conversation below.</p>
              )}
            </div>

            {/* Comment Form */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-2">
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handlePostComment(selectedTopic.id)}
                placeholder="Write a response or decision..."
                className="flex-1 rounded-none border border-input bg-background px-3 py-2 text-base sm:text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring min-h-[44px]"
              />
              <button
                type="button"
                onClick={() => handlePostComment(selectedTopic.id)}
                disabled={submitting || !commentText.trim()}
                className="inline-flex items-center justify-center gap-1.5 rounded-none bg-primary px-4 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition min-h-[44px] disabled:opacity-50"
              >
                <PaperPlaneRight size={14} />
                <span>Reply</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Topic List */
        <div className="space-y-2">
          {visibleTopics.length === 0 ? (
            <div className="rounded-none border border-border bg-card p-8 text-center text-muted-foreground">
              <p className="text-sm">No topics posted yet.</p>
              <p className="text-xs mt-1 text-muted-foreground">Post announcements or decisions to coordinate the project team.</p>
            </div>
          ) : (
            visibleTopics.map((topic) => (
              <button
                key={topic.id}
                type="button"
                onClick={() => setSelectedTopic(topic)}
                className="w-full text-left rounded-none border border-border bg-card p-4 transition hover:bg-muted/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 focus:outline-none focus:ring-1 focus:ring-ring min-h-[44px]"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-mono uppercase rounded-none border border-border px-2 py-0.5 bg-muted/40 text-foreground">
                      {topic.category}
                    </span>
                    <h4 className="text-sm font-semibold text-foreground tracking-tight">{topic.title}</h4>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-1">{topic.content}</p>
                  <div className="text-[11px] text-muted-foreground flex items-center gap-2 pt-0.5">
                    <span>{topic.author.name}</span>
                    <span>•</span>
                    <span>{new Date(topic.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <ChatCenteredDots size={16} />
                    <span>{topic.comments?.length || 0}</span>
                  </div>
                  {topic.vendorVisible && (
                    <span className="text-[10px] font-mono text-foreground flex items-center gap-1">
                      <Eye size={12} /> Vendor
                    </span>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
