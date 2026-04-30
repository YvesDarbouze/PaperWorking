'use client';

import React, { useState, useEffect } from 'react';
import {
  Users, Plus, X, Search, Phone, Mail, Building2,
  Briefcase, Scale, Home, Landmark, Shield, ChevronDown,
  Check, UserCircle, MoreHorizontal, Pencil, Trash2,
} from 'lucide-react';
import {
  collection, query, where, onSnapshot, addDoc, updateDoc,
  doc, deleteDoc, serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useAuth } from '@/context/AuthContext';
import { useProjectStore } from '@/store/projectStore';
import toast from 'react-hot-toast';
import type { CRMContact, ContactRole } from '@/types/schema';

const ROLE_CONFIG: Record<ContactRole, { label: string; icon: React.ReactNode; color: string }> = {
  'Lawyer':             { label: 'Lawyer',           icon: <Scale className="w-4 h-4" />,    color: 'bg-purple-50 text-purple-700 border-purple-200' },
  'Real Estate Agent':  { label: 'Real Estate Agent', icon: <Home className="w-4 h-4" />,     color: 'bg-blue-50 text-blue-700 border-blue-200' },
  'Lender / Bank':      { label: 'Lender / Bank',     icon: <Landmark className="w-4 h-4" />, color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  'Appraiser':          { label: 'Appraiser',         icon: <Briefcase className="w-4 h-4" />, color: 'bg-amber-50 text-amber-700 border-amber-200' },
  'Title Company':      { label: 'Title Company',     icon: <Building2 className="w-4 h-4" />, color: 'bg-orange-50 text-orange-700 border-orange-200' },
  'Insurance Agent':    { label: 'Insurance Agent',   icon: <Shield className="w-4 h-4" />,   color: 'bg-red-50 text-red-700 border-red-200' },
  'Other':              { label: 'Other',             icon: <UserCircle className="w-4 h-4" />, color: 'bg-bg-primary text-text-primary border-border-accent' },
};

const ROLE_OPTIONS: ContactRole[] = [
  'Lawyer', 'Real Estate Agent', 'Lender / Bank', 'Appraiser',
  'Title Company', 'Insurance Agent', 'Other',
];

const BLANK_FORM = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  companyName: '',
  licenseNumber: '',
  role: 'Real Estate Agent' as ContactRole,
  notes: '',
  assignedProjectIds: [] as string[],
};

export default function ContactManager() {
  const { user, profile } = useAuth();
  const projects = useProjectStore(s => s.projects);

  const [contacts, setContacts] = useState<CRMContact[]>([]);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState<ContactRole | 'All'>('All');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(BLANK_FORM);
  const [saving, setSaving] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const orgId: string = profile?.organizationId || `org_${user?.uid?.slice(0, 8)}` || '';

  // Real-time Firestore subscription
  useEffect(() => {
    if (!orgId) return;
    const q = query(
      collection(db, 'organizations', orgId, 'contacts'),
    );
    return onSnapshot(q, snap => {
      setContacts(snap.docs.map(d => ({ id: d.id, ...d.data() })) as CRMContact[]);
    });
  }, [orgId]);

  const handleSave = async () => {
    if (!form.firstName.trim() || !form.email.trim()) {
      toast.error('First name and email are required');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        organizationId: orgId,
        updatedAt: serverTimestamp(),
      };
      if (editingId) {
        await updateDoc(doc(db, 'organizations', orgId, 'contacts', editingId), payload);
        toast.success('Contact updated');
      } else {
        await addDoc(collection(db, 'organizations', orgId, 'contacts'), {
          ...payload,
          createdAt: serverTimestamp(),
        });
        toast.success('Contact added');
      }
      setShowForm(false);
      setEditingId(null);
      setForm(BLANK_FORM);
    } catch {
      toast.error('Failed to save contact');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (c: CRMContact) => {
    setForm({
      firstName: c.firstName,
      lastName: c.lastName,
      email: c.email,
      phone: c.phone || '',
      companyName: c.companyName || '',
      licenseNumber: c.licenseNumber || '',
      role: c.role,
      notes: c.notes || '',
      assignedProjectIds: c.assignedProjectIds || [],
    });
    setEditingId(c.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'organizations', orgId, 'contacts', id));
      toast.success('Contact removed');
    } catch {
      toast.error('Failed to remove contact');
    }
  };

  const toggleProject = (projectId: string) => {
    setForm(f => ({
      ...f,
      assignedProjectIds: f.assignedProjectIds.includes(projectId)
        ? f.assignedProjectIds.filter(id => id !== projectId)
        : [...f.assignedProjectIds, projectId],
    }));
  };

  const filtered = contacts.filter(c => {
    const matchSearch = !search || [c.firstName, c.lastName, c.email, c.companyName].join(' ').toLowerCase().includes(search.toLowerCase());
    const matchRole = filterRole === 'All' || c.role === filterRole;
    return matchSearch && matchRole;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-medium text-text-primary">Contact Manager</h3>
          <p className="text-sm text-text-secondary">Assign lawyers, agents, and lenders to your properties.</p>
        </div>
        <button
          onClick={() => { setForm(BLANK_FORM); setEditingId(null); setShowForm(true); }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition"
        >
          <Plus className="w-4 h-4" />
          Add Contact
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
          <input
            type="text"
            placeholder="Search contacts…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-border-accent rounded-lg focus:ring-1 focus:ring-gray-400 focus:border-gray-400 outline-none"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {(['All', ...ROLE_OPTIONS] as const).map(r => (
            <button
              key={r}
              onClick={() => setFilterRole(r as ContactRole | 'All')}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${
                filterRole === r
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'bg-bg-surface text-text-secondary border-border-accent hover:border-gray-400'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Contact Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-bg-surface rounded-xl shadow-2xl border border-border-accent w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-border-accent">
              <h4 className="text-base font-semibold text-text-primary">
                {editingId ? 'Edit Contact' : 'New Contact'}
              </h4>
              <button onClick={() => { setShowForm(false); setEditingId(null); }} className="text-text-secondary hover:text-text-secondary">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {/* Role */}
              <div>
                <label className="block text-xs font-medium text-text-primary mb-1">Role *</label>
                <select
                  className="w-full border border-border-accent rounded-md text-sm py-2 px-3 focus:ring-indigo-500 focus:border-indigo-500"
                  value={form.role}
                  onChange={e => setForm(f => ({ ...f, role: e.target.value as ContactRole }))}
                >
                  {ROLE_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>

              {/* Name Row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-text-primary mb-1">First Name *</label>
                  <input
                    type="text"
                    className="w-full border border-border-accent rounded-md text-sm py-2 px-3 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Jane"
                    value={form.firstName}
                    onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-primary mb-1">Last Name</label>
                  <input
                    type="text"
                    className="w-full border border-border-accent rounded-md text-sm py-2 px-3 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Smith"
                    value={form.lastName}
                    onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))}
                  />
                </div>
              </div>

              {/* Email + Phone */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-text-primary mb-1">Email *</label>
                  <input
                    type="email"
                    className="w-full border border-border-accent rounded-md text-sm py-2 px-3 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="jane@firm.com"
                    value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-primary mb-1">Phone</label>
                  <input
                    type="tel"
                    className="w-full border border-border-accent rounded-md text-sm py-2 px-3 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="+1 (555) 000-0000"
                    value={form.phone}
                    onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  />
                </div>
              </div>

              {/* Company + License */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-text-primary mb-1">Company / Firm</label>
                  <input
                    type="text"
                    className="w-full border border-border-accent rounded-md text-sm py-2 px-3 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Smith & Associates"
                    value={form.companyName}
                    onChange={e => setForm(f => ({ ...f, companyName: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-primary mb-1">License #</label>
                  <input
                    type="text"
                    className="w-full border border-border-accent rounded-md text-sm py-2 px-3 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="RE-1234567"
                    value={form.licenseNumber}
                    onChange={e => setForm(f => ({ ...f, licenseNumber: e.target.value }))}
                  />
                </div>
              </div>

              {/* Assign to Properties */}
              {projects.length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-text-primary mb-2">Assign to Properties</label>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto border border-border-accent rounded-lg p-2">
                    {projects.map(p => (
                      <label key={p.id} className="flex items-center gap-2 px-2 py-1.5 hover:bg-bg-primary rounded cursor-pointer">
                        <div
                          onClick={() => toggleProject(p.id)}
                          className={`w-4 h-4 rounded border flex items-center justify-center transition flex-shrink-0 cursor-pointer ${
                            form.assignedProjectIds.includes(p.id)
                              ? 'bg-gray-900 border-gray-900'
                              : 'border-border-accent'
                          }`}
                        >
                          {form.assignedProjectIds.includes(p.id) && <Check className="w-2.5 h-2.5 text-white" />}
                        </div>
                        <span className="text-sm text-text-primary truncate">{p.propertyName}</span>
                        <span className="ml-auto text-xs text-text-secondary flex-shrink-0">{p.status}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="block text-xs font-medium text-text-primary mb-1">Notes</label>
                <textarea
                  rows={2}
                  className="w-full border border-border-accent rounded-md text-sm py-2 px-3 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
                  placeholder="Specializes in distressed properties…"
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 pb-6">
              <button
                onClick={() => { setShowForm(false); setEditingId(null); }}
                className="px-4 py-2 text-sm text-text-primary border border-border-accent rounded-lg hover:bg-bg-primary transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-700 transition disabled:opacity-50"
              >
                {saving ? 'Saving…' : editingId ? 'Save Changes' : 'Add Contact'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Contact Grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-border-accent rounded-xl">
          <Users className="w-12 h-12 text-gray-300 mb-3" />
          <p className="text-sm font-medium text-text-secondary">
            {contacts.length === 0 ? 'No contacts added yet' : 'No contacts match your filter'}
          </p>
          {contacts.length === 0 && (
            <p className="text-xs text-text-secondary mt-1">Add your lawyer, agent, and lender to get started</p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(contact => {
            const cfg = ROLE_CONFIG[contact.role];
            const assignedNames = contact.assignedProjectIds
              .map(id => projects.find(p => p.id === id)?.propertyName)
              .filter(Boolean);
            return (
              <div key={contact.id} className="bg-bg-surface border border-border-accent rounded-xl p-4 hover:shadow-sm transition group">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full border flex items-center justify-center flex-shrink-0 ${cfg.color}`}>
                      {cfg.icon}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-text-primary">
                        {contact.firstName} {contact.lastName}
                      </p>
                      {contact.companyName && (
                        <p className="text-xs text-text-secondary truncate max-w-[140px]">{contact.companyName}</p>
                      )}
                    </div>
                  </div>

                  {/* ── Triple-dot action menu ── */}
                  <div className="relative">
                    <button
                      onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === contact.id ? null : contact.id); }}
                      className="p-1.5 rounded-lg text-text-secondary opacity-0 group-hover:opacity-100 hover:bg-bg-primary hover:text-text-primary transition-all"
                      aria-label="Contact actions"
                    >
                      <MoreHorizontal className="w-4 h-4" strokeWidth={2} />
                    </button>

                    {openMenuId === contact.id && (
                      <>
                        {/* Backdrop to close */}
                        <div
                          className="fixed inset-0 z-10"
                          onClick={() => setOpenMenuId(null)}
                        />
                        <div
                          className="absolute right-0 top-full mt-1 w-40 z-20 rounded-lg py-1 shadow-lg"
                          style={{
                            background: 'var(--bg-surface)',
                            border: '1px solid var(--border-ui)',
                          }}
                        >
                          <button
                            onClick={() => { handleEdit(contact); setOpenMenuId(null); }}
                            className="flex items-center gap-2.5 w-full px-3 py-2 text-xs text-text-primary hover:bg-bg-primary transition-colors"
                          >
                            <Pencil className="w-3.5 h-3.5 text-text-secondary" strokeWidth={2} />
                            Edit Contact
                          </button>
                          <div className="my-1" style={{ borderTop: '1px solid var(--border-ui)' }} />
                          <button
                            onClick={() => { handleDelete(contact.id); setOpenMenuId(null); }}
                            className="flex items-center gap-2.5 w-full px-3 py-2 text-xs text-red-600 hover:bg-red-50 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" strokeWidth={2} />
                            Remove
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Role Badge */}
                <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-xs font-medium mb-3 ${cfg.color}`}>
                  {cfg.icon}
                  {contact.role}
                </div>

                {/* Contact Info */}
                <div className="space-y-1.5">
                  <a href={`mailto:${contact.email}`} className="flex items-center gap-2 text-xs text-text-secondary hover:text-blue-600 transition">
                    <Mail className="w-3.5 h-3.5 text-text-secondary" />
                    <span className="truncate">{contact.email}</span>
                  </a>
                  {contact.phone && (
                    <a href={`tel:${contact.phone}`} className="flex items-center gap-2 text-xs text-text-secondary hover:text-blue-600 transition">
                      <Phone className="w-3.5 h-3.5 text-text-secondary" />
                      <span>{contact.phone}</span>
                    </a>
                  )}
                  {contact.licenseNumber && (
                    <p className="text-xs text-text-secondary">License: {contact.licenseNumber}</p>
                  )}
                </div>

                {/* Assigned Properties */}
                {assignedNames.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-border-accent">
                    <p className="text-xs font-medium text-text-secondary mb-1.5">Assigned to:</p>
                    <div className="flex flex-wrap gap-1">
                      {assignedNames.slice(0, 3).map((name, i) => (
                        <span key={i} className="px-2 py-0.5 bg-bg-primary text-text-secondary text-xs rounded-full truncate max-w-[120px]">
                          {name}
                        </span>
                      ))}
                      {assignedNames.length > 3 && (
                        <span className="px-2 py-0.5 bg-bg-primary text-text-secondary text-xs rounded-full">
                          +{assignedNames.length - 3}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {contact.notes && (
                  <p className="mt-2 text-xs text-text-secondary italic line-clamp-2">{contact.notes}</p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Footer Stats */}
      {contacts.length > 0 && (
        <div className="flex flex-wrap gap-4 pt-3 border-t border-border-accent text-xs text-text-secondary">
          <span className="font-medium text-text-primary">{contacts.length} contacts total</span>
          {ROLE_OPTIONS.map(r => {
            const count = contacts.filter(c => c.role === r).length;
            if (!count) return null;
            return <span key={r}>{count} {r}</span>;
          })}
        </div>
      )}
    </div>
  );
}
