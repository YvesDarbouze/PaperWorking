'use client';

import React, { useState, useEffect, useRef } from 'react';
import { InvestorContact, ProjectFollower } from '@/types/schema';
import { Users, Mail, Phone, Upload, Trash2, ShieldAlert, CheckCircle, ToggleLeft, ToggleRight, XCircle } from 'lucide-react';
import { collection, onSnapshot, doc, writeBatch, deleteDoc, updateDoc, setDoc, query, orderBy, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import toast from 'react-hot-toast';

interface AudienceManagerProps {
  projectId: string;
  readOnly?: boolean;
}

export function AudienceManager({ projectId, readOnly = false }: AudienceManagerProps) {
  const [contacts, setContacts] = useState<InvestorContact[]>([]);
  const [followers, setFollowers] = useState<ProjectFollower[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // DM-37 States
  const [importSource, setImportSource] = useState<string>('');
  const [globalUnsubs, setGlobalUnsubs] = useState<string[]>([]);
  const [isAddFormOpen, setIsAddFormOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newContactType, setNewContactType] = useState('Individual');
  const [newRelationship, setNewRelationship] = useState('Warm');
  const [newTicket, setNewTicket] = useState('');
  const [newSource, setNewSource] = useState('manual');

  const isE2E = typeof window !== 'undefined' && document.cookie.includes('__e2e_test');
  const contactsKey = `pw_e2e_contacts_${projectId}`;
  const followersKey = `pw_e2e_followers_${projectId}`;

  // Helper to trigger same-page reloads in E2E mode
  const triggerE2ERefresh = () => {
    window.dispatchEvent(new Event(`update_${contactsKey}`));
    window.dispatchEvent(new Event(`update_${followersKey}`));
  };

  // 1. Listen to manual contacts subcollection
  useEffect(() => {
    if (!projectId) return;

    if (isE2E) {
      const load = () => {
        try {
          const val = localStorage.getItem(contactsKey);
          setContacts(val ? JSON.parse(val) : []);
        } catch (e) {
          console.error(e);
        }
      };
      load();

      const handleStorage = (e: StorageEvent) => {
        if (e.key === contactsKey) load();
      };
      window.addEventListener('storage', handleStorage);
      const handleCustom = () => load();
      window.addEventListener(`update_${contactsKey}`, handleCustom);

      return () => {
        window.removeEventListener('storage', handleStorage);
        window.removeEventListener(`update_${contactsKey}`, handleCustom);
      };
    }

    const q = query(collection(db, 'projects', projectId, 'investor_contacts'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const docs = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as InvestorContact[];
      setContacts(docs);
    });
    return unsub;
  }, [projectId, isE2E]);

  // 2. Listen to followers subcollection
  useEffect(() => {
    if (!projectId) return;

    if (isE2E) {
      const load = () => {
        try {
          const val = localStorage.getItem(followersKey);
          setFollowers(val ? JSON.parse(val) : []);
        } catch (e) {
          console.error(e);
        }
      };
      load();

      const handleStorage = (e: StorageEvent) => {
        if (e.key === followersKey) load();
      };
      window.addEventListener('storage', handleStorage);
      const handleCustom = () => load();
      window.addEventListener(`update_${followersKey}`, handleCustom);

      return () => {
        window.removeEventListener('storage', handleStorage);
        window.removeEventListener(`update_${followersKey}`, handleCustom);
      };
    }

    const q = query(collection(db, 'projects', projectId, 'followers'));
    const unsub = onSnapshot(q, (snap) => {
      const docs = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as ProjectFollower[];
      setFollowers(docs);
    });
    return unsub;
  }, [projectId, isE2E]);

  // Listen to global unsubscribes (DM-37)
  useEffect(() => {
    if (isE2E) {
      const load = () => {
        try {
          const val = localStorage.getItem('pw_e2e_global_unsubscribes');
          setGlobalUnsubs(val ? JSON.parse(val) : []);
        } catch (e) {
          console.error(e);
        }
      };
      load();
      window.addEventListener('storage', load);
      const handleCustom = () => load();
      window.addEventListener('update_pw_e2e_global_unsubscribes', handleCustom);
      return () => {
        window.removeEventListener('storage', load);
        window.removeEventListener('update_pw_e2e_global_unsubscribes', handleCustom);
      };
    }

    const unsub = onSnapshot(collection(db, 'unsubscribedEmails'), (snap) => {
      setGlobalUnsubs(snap.docs.map(d => d.id.toLowerCase()));
    });
    return unsub;
  }, [isE2E]);

  // Seed default mock followers if none exist, so counts match expectation
  useEffect(() => {
    const seedMockFollowers = async () => {
      if (!projectId) return;

      const mockFollowers: ProjectFollower[] = [
        {
          id: 'fol_1',
          name: 'Sarah Connor',
          email: 'sarah@resistance.io',
          phone: '555-0199',
          emailConsent: true,
          inAppConsent: true,
          followedAt: new Date().toISOString(),
        },
        {
          id: 'fol_2',
          name: 'John Connor',
          email: 'john@resistance.io',
          phone: '555-0100',
          emailConsent: true,
          inAppConsent: false,
          followedAt: new Date().toISOString(),
        },
        {
          id: 'fol_3',
          name: 'Investor Bob',
          email: 'bob@investor.com',
          phone: '555-0122',
          emailConsent: true,
          inAppConsent: true,
          followedAt: new Date().toISOString(),
        }
      ];

      if (isE2E) {
        try {
          const val = localStorage.getItem(followersKey);
          if (!val) {
            localStorage.setItem(followersKey, JSON.stringify(mockFollowers));
            triggerE2ERefresh();
          }
        } catch (e) {
          console.error(e);
        }
        return;
      }

      // Real Firebase seeding if none exist
      try {
        const snap = await getDocs(collection(db, 'projects', projectId, 'followers'));
        if (snap.empty) {
          for (const f of mockFollowers) {
            await setDoc(doc(db, 'projects', projectId, 'followers', f.id), f);
          }
        }
      } catch (err) {
        console.error('Failed to seed followers:', err);
      }
    };
    seedMockFollowers();
  }, [projectId, isE2E]);

  const getDeduplicatedAudience = () => {
    const map = new Map<string, {
      email: string;
      name: string;
      phone: string;
      sources: ('Contact' | 'Follower')[];
      emailConsent: boolean;
      inAppConsent: boolean;
      potentialTicket: number;
      type: string;
      relationship: string;
      contactId?: string;
      followerId?: string;
      source?: string;
      isPurchased?: boolean;
    }>();

    contacts.forEach((c) => {
      map.set(c.email.toLowerCase(), {
        email: c.email,
        name: c.name,
        phone: c.phone || '',
        sources: ['Contact'],
        emailConsent: c.emailConsent,
        inAppConsent: c.inAppConsent,
        potentialTicket: c.potentialTicket || 0,
        type: c.type || 'Individual',
        relationship: c.relationship || 'Warm',
        contactId: c.id,
        source: c.source || 'manual',
        isPurchased: c.isPurchased || false,
      });
    });

    followers.forEach((f) => {
      const emailLower = f.email.toLowerCase();
      const existing = map.get(emailLower);
      if (existing) {
        if (!existing.sources.includes('Follower')) {
          existing.sources.push('Follower');
        }
        existing.followerId = f.id;
        existing.emailConsent = existing.emailConsent && f.emailConsent;
        existing.inAppConsent = existing.inAppConsent || f.inAppConsent;
      } else {
        map.set(emailLower, {
          email: f.email,
          name: f.name,
          phone: f.phone || '',
          sources: ['Follower'],
          emailConsent: f.emailConsent,
          inAppConsent: f.inAppConsent,
          potentialTicket: 0,
          type: 'Individual',
          relationship: 'Follower Edge',
          followerId: f.id,
        });
      }
    });

    return Array.from(map.values());
  };

  const deduplicatedAudience = getDeduplicatedAudience();

  const totalAudience = deduplicatedAudience.length;
  const emailConsentedCount = deduplicatedAudience.filter((a) => a.emailConsent).length;
  const inAppConsentedCount = deduplicatedAudience.filter((a) => a.inAppConsent).length;

  const handleImportClick = () => {
    if (!importSource) {
      toast.error('Please specify the Import Source of the list before uploading.');
      return;
    }
    fileInputRef.current?.click();
  };

  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailLower = newEmail.trim().toLowerCase();
    if (!newName.trim() || !emailLower) {
      toast.error('Name and Email are required.');
      return;
    }
    if (!emailLower.includes('@')) {
      toast.error('Invalid email address.');
      return;
    }
    if (!newSource) {
      toast.error('Please specify the source of the contact.');
      return;
    }
    if (globalUnsubs.includes(emailLower)) {
      toast.error('This email address has opted out of platform communications.');
      return;
    }

    const potentialTicket = newTicket ? Math.round(parseFloat(newTicket) * 100) : 0;
    const contactId = `contact_${Date.now()}`;
    const newContact: InvestorContact = {
      id: contactId,
      name: newName,
      email: emailLower,
      phone: newPhone,
      type: newContactType,
      relationship: newRelationship,
      potentialTicket: isNaN(potentialTicket) ? 0 : potentialTicket,
      emailConsent: true,
      inAppConsent: true,
      source: newSource,
      isPurchased: newSource === 'import_purchased',
      createdAt: new Date().toISOString(),
    };

    try {
      if (isE2E) {
        const existing = JSON.parse(localStorage.getItem(contactsKey) || '[]');
        localStorage.setItem(contactsKey, JSON.stringify([newContact, ...existing]));
        triggerE2ERefresh();
      } else {
        await setDoc(doc(db, 'projects', projectId, 'investor_contacts', contactId), newContact);
      }
      toast.success('Successfully added contact!');
      setNewName('');
      setNewEmail('');
      setNewPhone('');
      setNewTicket('');
      setNewContactType('Individual');
      setNewRelationship('Warm');
      setNewSource('manual');
      setIsAddFormOpen(false);
    } catch (err) {
      console.error(err);
      toast.error('Failed to add contact.');
    }
  };

  const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!importSource) {
      toast.error('Please specify the Import Source of the list.');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const text = evt.target?.result as string;
      if (!text) return;

      setIsImporting(true);
      try {
        const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
        if (lines.length < 2) {
          toast.error('CSV file has no data rows');
          return;
        }

        const newContactsList: InvestorContact[] = [];
        let importCount = 0;
        const isPurchasedList = importSource === 'import_purchased';

        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(',').map((c) => c.replace(/(^["']|["']$)/g, '').trim());
          if (cols.length < 2) continue;

          const [name, email, phone, type, relationship, ticketStr, consentStr] = cols;
          if (!email || !email.includes('@')) continue;

          const potentialTicket = ticketStr ? Math.round(parseFloat(ticketStr) * 100) : 0;
          const emailConsent = consentStr ? consentStr.toLowerCase() === 'true' || consentStr === '1' : true;

          const contactId = `contact_${Date.now()}_${i}`;
          const newContact: InvestorContact = {
            id: contactId,
            name: name || 'Unnamed Investor',
            email: email.toLowerCase(),
            phone: phone || '',
            type: type || 'Individual',
            relationship: relationship || 'Warm',
            potentialTicket: isNaN(potentialTicket) ? 0 : potentialTicket,
            emailConsent,
            inAppConsent: true,
            source: importSource,
            isPurchased: isPurchasedList,
            createdAt: new Date().toISOString(),
          };

          newContactsList.push(newContact);
          importCount++;
        }

        if (isE2E) {
          const existing = JSON.parse(localStorage.getItem(contactsKey) || '[]');
          localStorage.setItem(contactsKey, JSON.stringify([...newContactsList, ...existing]));
          triggerE2ERefresh();
        } else {
          const batch = writeBatch(db);
          for (const c of newContactsList) {
            const ref = doc(db, 'projects', projectId, 'investor_contacts', c.id);
            batch.set(ref, c);
          }
          await batch.commit();
        }

        toast.success(`Successfully imported ${importCount} contacts!`);
      } catch (err) {
        console.error(err);
        toast.error('Failed to parse CSV file');
      } finally {
        setIsImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };

    reader.readAsText(file);
  };

  const handleToggleConsent = async (
    email: string,
    channel: 'email' | 'inApp',
    currentVal: boolean,
    contactId?: string,
    followerId?: string
  ) => {
    if (readOnly) return;
    try {
      const newVal = !currentVal;
      const targetEmail = email.toLowerCase();

      if (isE2E) {
        const updatedContacts = contacts.map(c => 
          c.email.toLowerCase() === targetEmail 
            ? { ...c, [channel === 'email' ? 'emailConsent' : 'inAppConsent']: newVal } 
            : c
        );
        const updatedFollowers = followers.map(f => 
          f.email.toLowerCase() === targetEmail 
            ? { ...f, [channel === 'email' ? 'emailConsent' : 'inAppConsent']: newVal } 
            : f
        );
        localStorage.setItem(contactsKey, JSON.stringify(updatedContacts));
        localStorage.setItem(followersKey, JSON.stringify(updatedFollowers));
        triggerE2ERefresh();
      } else {
        const matchingContacts = contacts.filter((c) => c.email.toLowerCase() === targetEmail);
        const matchingFollowers = followers.filter((f) => f.email.toLowerCase() === targetEmail);

        for (const c of matchingContacts) {
          const ref = doc(db, 'projects', projectId, 'investor_contacts', c.id);
          await updateDoc(ref, {
            [channel === 'email' ? 'emailConsent' : 'inAppConsent']: newVal,
          });
        }

        for (const f of matchingFollowers) {
          const ref = doc(db, 'projects', projectId, 'followers', f.id);
          await updateDoc(ref, {
            [channel === 'email' ? 'emailConsent' : 'inAppConsent']: newVal,
          });
        }
      }

      toast.success(`Updated ${channel} consent for ${email}`);
    } catch (err) {
      console.error(err);
      toast.error('Failed to update consent');
    }
  };

  const handleUnsubscribeEverywhere = async (email: string) => {
    if (readOnly) return;
    try {
      const targetEmail = email.toLowerCase();

      if (isE2E) {
        const updatedContacts = contacts.map(c => 
          c.email.toLowerCase() === targetEmail ? { ...c, emailConsent: false } : c
        );
        const updatedFollowers = followers.map(f => 
          f.email.toLowerCase() === targetEmail ? { ...f, emailConsent: false } : f
        );
        localStorage.setItem(contactsKey, JSON.stringify(updatedContacts));
        localStorage.setItem(followersKey, JSON.stringify(updatedFollowers));
        triggerE2ERefresh();
      } else {
        const matchingContacts = contacts.filter((c) => c.email.toLowerCase() === targetEmail);
        const matchingFollowers = followers.filter((f) => f.email.toLowerCase() === targetEmail);

        for (const c of matchingContacts) {
          const ref = doc(db, 'projects', projectId, 'investor_contacts', c.id);
          await updateDoc(ref, { emailConsent: false });
        }

        for (const f of matchingFollowers) {
          const ref = doc(db, 'projects', projectId, 'followers', f.id);
          await updateDoc(ref, { emailConsent: false });
        }
      }

      toast.success(`Revoked email consent everywhere for: ${email}`);
    } catch (err) {
      console.error(err);
      toast.error('Failed to unsubscribe contact');
    }
  };

  const handleDeleteContact = async (id: string) => {
    if (readOnly) return;
    try {
      if (isE2E) {
        const updated = contacts.filter(c => c.id !== id);
        localStorage.setItem(contactsKey, JSON.stringify(updated));
        triggerE2ERefresh();
      } else {
        await deleteDoc(doc(db, 'projects', projectId, 'investor_contacts', id));
      }
      toast.success('Deleted contact from audience list');
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete contact');
    }
  };

  return (
    <div className="glass-card rounded-2xl p-6 border border-white/5 space-y-6">
      {/* Header and Import button */}
      <div className="flex justify-between items-center border-b border-white/5 pb-4">
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-[#9E9DA0]">Audience & Consent Manager</h4>
          <p className="text-[10px] text-[#9E9DA0]/60 mt-1">Deduplicated email contacts & deal followers.</p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={importSource}
            onChange={(e) => setImportSource(e.target.value)}
            disabled={readOnly || isImporting}
            id="select-import-source"
            className="bg-zinc-900 border border-white/10 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-emerald-500"
          >
            <option value="">Select list source...</option>
            <option value="import_relational">Relational Network</option>
            <option value="import_purchased">Purchased List</option>
          </select>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleCSVUpload}
            accept=".csv"
            className="hidden"
            id="csv-file-input"
          />
          <button
            onClick={handleImportClick}
            disabled={readOnly || isImporting}
            id="btn-import-csv"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider bg-white/5 border border-white/10 hover:bg-white/10 text-white transition-all"
          >
            <Upload size={13} />
            {isImporting ? 'Importing...' : 'Import CSV'}
          </button>
          <button
            onClick={() => setIsAddFormOpen(!isAddFormOpen)}
            disabled={readOnly}
            id="btn-toggle-add-form"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider bg-zinc-900 border border-white/10 hover:bg-white/5 text-white transition-all"
          >
            {isAddFormOpen ? 'Cancel' : 'Add Contact'}
          </button>
        </div>
      </div>

      {isAddFormOpen && (
        <form onSubmit={handleAddContact} className="p-4 bg-zinc-900/60 rounded-xl border border-white/5 space-y-4" id="add-contact-form">
          <h5 className="text-xs font-bold text-white uppercase tracking-wider">Add Single Contact</h5>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">Name</label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. John Doe"
                className="w-full bg-black/40 border border-white/15 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                required
                id="input-contact-name"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">Email</label>
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="e.g. john@doe.com"
                className="w-full bg-black/40 border border-white/15 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                required
                id="input-contact-email"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">Phone</label>
              <input
                type="text"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                placeholder="e.g. 555-0100"
                className="w-full bg-black/40 border border-white/15 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                id="input-contact-phone"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">Type</label>
              <select
                value={newContactType}
                onChange={(e) => setNewContactType(e.target.value)}
                className="w-full bg-black/40 border border-white/15 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                id="select-contact-type"
              >
                <option value="Individual">Individual</option>
                <option value="Institutional">Institutional</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">Relationship</label>
              <select
                value={newRelationship}
                onChange={(e) => setNewRelationship(e.target.value)}
                className="w-full bg-black/40 border border-white/15 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                id="select-contact-relationship"
              >
                <option value="Warm">Warm</option>
                <option value="Cold">Cold</option>
                <option value="Existing">Existing</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">Potential Ticket (USD)</label>
              <input
                type="number"
                value={newTicket}
                onChange={(e) => setNewTicket(e.target.value)}
                placeholder="e.g. 25000"
                className="w-full bg-black/40 border border-white/15 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                id="input-contact-ticket"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">Recorded Source</label>
              <select
                value={newSource}
                onChange={(e) => setNewSource(e.target.value)}
                className="w-full bg-black/40 border border-white/15 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                required
                id="select-contact-source"
              >
                <option value="manual">Manual Entry</option>
                <option value="referral">Referral</option>
                <option value="organic_sign_up">Organic Sign-up</option>
              </select>
            </div>
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold uppercase tracking-wider transition-all font-mono"
            id="btn-submit-contact"
          >
            Save Contact
          </button>
        </form>
      )}

      {/* Counts Card */}
      <div className="grid grid-cols-3 gap-4" id="audience-preview-counts">
        <div className="p-4 bg-white/5 rounded-xl border border-white/5 text-center">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#9E9DA0] block">Deduplicated Audience</span>
          <span className="text-xl font-extrabold text-white block mt-1" id="count-total">{totalAudience}</span>
        </div>
        <div className="p-4 bg-white/5 rounded-xl border border-white/5 text-center">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#9E9DA0] block">Email Consent</span>
          <span className="text-xl font-extrabold text-pw-success block mt-1" id="count-email">{emailConsentedCount}</span>
        </div>
        <div className="p-4 bg-white/5 rounded-xl border border-white/5 text-center">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#9E9DA0] block">In-App Consent</span>
          <span className="text-xl font-extrabold text-sky-400 block mt-1" id="count-in-app">{inAppConsentedCount}</span>
        </div>
      </div>

      {/* Audience List Table */}
      <div className="overflow-x-auto rounded-xl border border-white/5 bg-pw-night-bg/40">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-white/5 bg-white/5 text-[#9E9DA0] uppercase tracking-wider text-[9px] font-bold">
              <th className="p-3">Name / Contact</th>
              <th className="p-3">Sources</th>
              <th className="p-3">Ticket / Type</th>
              <th className="p-3 text-center">Consent</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {deduplicatedAudience.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-[#9E9DA0]/60">
                  No audience members found. Import contacts or seed followers to begin.
                </td>
              </tr>
            ) : (
              deduplicatedAudience.map((member) => (
                <tr key={member.email} className="hover:bg-white/5 transition-all" id={`row-audience-${member.email.replace(/[@.]/g, '-')}`}>
                  <td className="p-3 space-y-1">
                    <div className="font-semibold text-white">{member.name}</div>
                    <div className="flex flex-col gap-0.5 text-[10px] text-[#9E9DA0]/80">
                      <span className="flex items-center gap-1"><Mail size={10} /> {member.email}</span>
                      {member.phone && <span className="flex items-center gap-1"><Phone size={10} /> {member.phone}</span>}
                    </div>
                  </td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-1">
                      {member.sources.map((src) => (
                        <span
                          key={src}
                          className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${
                            src === 'Contact'
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              : 'bg-pw-success-container text-pw-success border border-pw-success-border'
                          }`}
                        >
                          {src}
                        </span>
                      ))}
                    </div>
                    {member.source && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        <span className="px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider bg-zinc-800 text-zinc-300 border border-zinc-700">
                          Source: {member.source}
                        </span>
                        {member.isPurchased && (
                          <span
                            className="px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider bg-red-950 text-red-400 border border-red-900/60"
                            data-testid="purchased-flag"
                          >
                            Purchased
                          </span>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="p-3 space-y-1">
                    <div className="font-mono text-white">
                      {member.potentialTicket > 0 ? (member.potentialTicket / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }) : '—'}
                    </div>
                    <div className="text-[10px] text-[#9E9DA0]/70 uppercase tracking-wider font-bold">
                      {member.relationship} / {member.type}
                    </div>
                  </td>
                  <td className="p-3">
                    {globalUnsubs.includes(member.email.toLowerCase()) ? (
                      <div className="flex flex-col gap-1 items-center">
                        <span
                          className="px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider bg-red-900/20 text-red-400 border border-red-500/20"
                          data-testid="global-unsubscribed-badge"
                        >
                          Global Opt-Out
                        </span>
                        <span className="text-[10px] text-red-500 font-bold">Blocked</span>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-1.5 items-center">
                        <button
                          onClick={() => handleToggleConsent(member.email, 'email', member.emailConsent, member.contactId, member.followerId)}
                          disabled={readOnly}
                          className="flex items-center gap-1 text-[10px] hover:text-white transition-all font-semibold"
                          id={`btn-toggle-email-${member.email.replace(/[@.]/g, '-')}`}
                        >
                          {member.emailConsent ? (
                            <ToggleRight size={18} className="text-pw-success" />
                          ) : (
                            <ToggleLeft size={18} className="text-[#9E9DA0]" />
                          )}
                          <span className={member.emailConsent ? 'text-pw-success' : 'text-[#9E9DA0]'}>Email</span>
                        </button>

                        <button
                          onClick={() => handleToggleConsent(member.email, 'inApp', member.inAppConsent, member.contactId, member.followerId)}
                          disabled={readOnly}
                          className="flex items-center gap-1 text-[10px] hover:text-white transition-all font-semibold"
                          id={`btn-toggle-inapp-${member.email.replace(/[@.]/g, '-')}`}
                        >
                          {member.inAppConsent ? (
                            <ToggleRight size={18} className="text-sky-400" />
                          ) : (
                            <ToggleLeft size={18} className="text-[#9E9DA0]" />
                          )}
                          <span className={member.inAppConsent ? 'text-sky-400' : 'text-[#9E9DA0]'}>In-App</span>
                        </button>
                      </div>
                    )}
                  </td>
                  <td className="p-3 text-right space-y-1">
                    <div className="flex items-center justify-end gap-2">
                      {member.emailConsent && (
                        <button
                          onClick={() => handleUnsubscribeEverywhere(member.email)}
                          disabled={readOnly}
                          id={`btn-unsub-${member.email.replace(/[@.]/g, '-')}`}
                          className="p-1.5 hover:bg-red-500/10 rounded text-[#9E9DA0] hover:text-red-400 transition-all"
                          title="Revoke email consent everywhere"
                        >
                          <XCircle size={14} />
                        </button>
                      )}
                      {member.contactId && (
                        <button
                          onClick={() => handleDeleteContact(member.contactId!)}
                          disabled={readOnly}
                          id={`btn-delete-${member.email.replace(/[@.]/g, '-')}`}
                          className="p-1.5 hover:bg-white/10 rounded text-[#9E9DA0] hover:text-white transition-all"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
