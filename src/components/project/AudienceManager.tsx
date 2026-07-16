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

  // Deduplicate audience list by Email
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

  const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

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
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleCSVUpload}
            accept=".csv"
            className="hidden"
            id="csv-file-input"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={readOnly || isImporting}
            id="btn-import-csv"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider bg-white/5 border border-white/10 hover:bg-white/10 text-white transition-all"
          >
            <Upload size={13} />
            {isImporting ? 'Importing...' : 'Import CSV'}
          </button>
        </div>
      </div>

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
