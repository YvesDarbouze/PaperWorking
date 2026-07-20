import React, { useState, useRef } from 'react';
import { 
  Sparkles, DollarSign, Calendar, Check, AlertTriangle, 
  FileText, Lock, Plus, Trash2, ArrowUpRight, UploadCloud, Loader2
} from 'lucide-react';
import { Project, ProjectFinancials, Contingency, RoleLinkedDocument } from '@/types/schema';
import { useProjectStore } from '@/store/projectStore';
import { projectsService } from '@/lib/firebase/deals';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage, auth as firebaseAuth } from '@/lib/firebase/config';
import { useAuth } from '@/context/AuthContext';
import { IS_DEMO_MODE } from '@/lib/config/demo';
import toast from 'react-hot-toast';

interface SaleOperationsCardProps {
  project: Project;
  refresh: () => void;
  isLocked?: boolean;
}

export default function SaleOperationsCard({ project, refresh, isLocked = false }: SaleOperationsCardProps) {
  const { user } = useAuth();
  const financials = project.financials || {};
  const updateProjectFinancials = useProjectStore(state => state.updateProjectFinancials);

  // Component UI state
  const [isMarkingUnderContract, setIsMarkingUnderContract] = useState(false);
  const [contractPrice, setContractPrice] = useState('');
  const [targetClosingDate, setTargetClosingDate] = useState('');

  // Closing execution form states
  const [isClosingSale, setIsClosingSale] = useState(false);
  const [finalSalePrice, setFinalSalePrice] = useState(
    financials.sale_price ? financials.sale_price.toString() : ''
  );
  const [finalSellingCosts, setFinalSellingCosts] = useState(
    financials.selling_costs ? financials.selling_costs.toString() : ''
  );
  const [finalClosingDate, setFinalClosingDate] = useState(
    financials.sale_closed_date || ''
  );

  // Loading/Uploading states
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingDocType, setUploadingDocType] = useState<string | null>(null);

  // Custom Contingency inputs
  const [showAddContingency, setShowAddContingency] = useState(false);
  const [customType, setCustomType] = useState('Inspection');
  const [customDays, setCustomDays] = useState('10');
  const [customParty, setCustomParty] = useState<'Buyer' | 'Seller'>('Buyer');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeUploadCategory, setActiveUploadCategory] = useState<string | null>(null);

  const saleUnderContract = financials.sale_under_contract || false;
  const saleClosed = !!(financials.sale_price && financials.sale_closed_date);

  // ── Transition to Under Contract ─────────────────────────────────────────
  const handleMarkUnderContract = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contractPrice) {
      toast.error('Please enter a contract price');
      return;
    }

    setIsSaving(true);
    try {
      const priceNum = parseFloat(contractPrice.replace(/[^0-9.]/g, ''));
      if (isNaN(priceNum)) throw new Error('Invalid contract price');

      // Initialize default contingencies
      const today = new Date();
      const createContingency = (type: string, daysOut: number): Contingency => {
        const d = new Date(today);
        d.setDate(d.getDate() + daysOut);
        return {
          id: crypto.randomUUID(),
          type,
          deadlineDate: d,
          isSatisfied: false,
          isWaived: false,
          party: 'Buyer',
          reminderSettings: ['T-7', 'T-3', 'T-1'],
        };
      };

      const defaultContingencies = [
        createContingency('Inspection', 10),
        createContingency('Appraisal', 14),
        createContingency('Financing', 21),
      ];

      await updateProjectFinancials(project.id, {
        sale_under_contract: true,
        sale_contract_price: priceNum,
        sale_buyer_contingencies: defaultContingencies,
      });

      toast.success('Property is now under contract');
      setIsMarkingUnderContract(false);
      refresh();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update contract status');
    } finally {
      setIsSaving(false);
    }
  };

  // ── Contingency helpers ───────────────────────────────────────────────────
  const handleUpdateContingency = async (id: string, updates: Partial<Contingency>) => {
    const list = financials.sale_buyer_contingencies || [];
    const updated = list.map(c => c.id === id ? { ...c, ...updates } : c);
    
    try {
      await updateProjectFinancials(project.id, {
        sale_buyer_contingencies: updated
      });
      toast.success('Contingency status updated');
      refresh();
    } catch (err: any) {
      toast.error('Failed to update contingency');
    }
  };

  const handleAddCustomContingency = async (e: React.FormEvent) => {
    e.preventDefault();
    const daysNum = parseInt(customDays);
    if (isNaN(daysNum)) return;

    const today = new Date();
    today.setDate(today.getDate() + daysNum);

    const newContingency: Contingency = {
      id: crypto.randomUUID(),
      type: customType,
      deadlineDate: today,
      isSatisfied: false,
      isWaived: false,
      party: customParty,
      reminderSettings: ['T-3', 'T-1'],
    };

    const updated = [...(financials.sale_buyer_contingencies || []), newContingency];

    try {
      await updateProjectFinancials(project.id, {
        sale_buyer_contingencies: updated
      });
      toast.success('Custom contingency added');
      setShowAddContingency(false);
      refresh();
    } catch (err: any) {
      toast.error('Failed to add contingency');
    }
  };

  const handleDeleteContingency = async (id: string) => {
    const updated = (financials.sale_buyer_contingencies || []).filter(c => c.id !== id);
    try {
      await updateProjectFinancials(project.id, {
        sale_buyer_contingencies: updated
      });
      toast.success('Contingency removed');
      refresh();
    } catch (err: any) {
      toast.error('Failed to remove contingency');
    }
  };

  const formatDeadlineDate = (deadlineDate: any) => {
    if (!deadlineDate) return '';
    const date = deadlineDate instanceof Date 
      ? deadlineDate 
      : deadlineDate.toDate 
        ? deadlineDate.toDate() 
        : new Date(deadlineDate);
    return isNaN(date.getTime()) ? '' : date.toLocaleDateString();
  };

  const calculateDaysRemaining = (deadlineDate: any) => {
    if (!deadlineDate) return 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const deadline = deadlineDate instanceof Date
      ? deadlineDate
      : deadlineDate.toDate
        ? deadlineDate.toDate()
        : new Date(deadlineDate);

    if (isNaN(deadline.getTime())) return 0;
    deadline.setHours(0, 0, 0, 0);

    const diffTime = deadline.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  // ── Document management ───────────────────────────────────────────────────
  const getDocumentByCategory = (category: string) => {
    return (project.roleLinkedDocuments || []).find(d => d.category === category);
  };

  const triggerFileUpload = (category: string) => {
    setActiveUploadCategory(category);
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeUploadCategory) return;

    setUploadingDocType(activeUploadCategory);
    const toastId = toast.loading(`Uploading ${file.name}...`);

    try {
      let downloadURL = '';

      if (IS_DEMO_MODE) {
        downloadURL = `/mock/documents/${file.name}`;
      } else {
        const uploadId = crypto.randomUUID();
        const fileRef = ref(storage, `projects/${project.id}/sale/${uploadId}_${file.name}`);
        const uploadTask = uploadBytesResumable(fileRef, file);

        downloadURL = await new Promise((resolve, reject) => {
          uploadTask.on(
            'state_changed',
            null,
            (error) => reject(error),
            async () => {
              const url = await getDownloadURL(uploadTask.snapshot.ref);
              resolve(url);
            }
          );
        });
      }

      const updatedDocs = [...(project.roleLinkedDocuments || [])];
      const matchIndex = updatedDocs.findIndex(d => d.category === activeUploadCategory);

      const newDoc: RoleLinkedDocument = {
        id: matchIndex >= 0 ? updatedDocs[matchIndex].id : crypto.randomUUID(),
        category: activeUploadCategory as any,
        fileName: file.name,
        fileUrl: downloadURL,
        linkedRole: 'Closing Agent',
        uploadedByUid: user?.uid || 'user_123',
        uploadedByName: user?.displayName || user?.email || 'Lead Investor',
        uploadedAt: new Date(),
        verified: true,
        notes: `Uploaded for sale close-out`,
      };

      if (matchIndex >= 0) {
        updatedDocs[matchIndex] = newDoc;
      } else {
        updatedDocs.push(newDoc);
      }

      await projectsService.updateProject(project.id, {
        roleLinkedDocuments: updatedDocs
      });

      toast.success(`${activeUploadCategory} uploaded successfully`, { id: toastId });
      refresh();
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to upload document', { id: toastId });
    } finally {
      setUploadingDocType(null);
      setActiveUploadCategory(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // ── Finalize Close of Sale ────────────────────────────────────────────────
  const handleFinalizeClose = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!finalSalePrice || !finalClosingDate) {
      toast.error('Please fill in closing price and date');
      return;
    }

    // Verify documents are uploaded
    const hasContract = !!getDocumentByCategory('Buyer Agreements');
    const hasSettlement = !!getDocumentByCategory('Final Settlement Statement');
    const hasDeed = !!getDocumentByCategory('Deed');

    if (!hasContract || !hasSettlement || !hasDeed) {
      toast.error('Please upload all required closing documents: Sale Contract, Settlement Statement, and Deed Out');
      return;
    }

    setIsSaving(true);
    try {
      const priceNum = parseFloat(finalSalePrice.replace(/[^0-9.]/g, ''));
      const costsNum = parseFloat(finalSellingCosts.replace(/[^0-9.]/g, '')) || 0;

      if (isNaN(priceNum)) throw new Error('Invalid sale price');

      // Update financials and mark project as realized/sold
      await updateProjectFinancials(project.id, {
        sale_price: priceNum,
        selling_costs: costsNum,
        sale_closed_date: finalClosingDate,
        actualSalePrice: priceNum, // Sync actualSalePrice for ccim engine
        sellingCosts: costsNum,
        soldDate: finalClosingDate as any,
      });

      // Update main project status to "exit"
      await projectsService.updateProject(project.id, {
        status: 'exit',
        phaseStatus: 'Phase 4: Exit',
      });

      toast.success('🎉 Transaction Closed! Property is officially Realized.');
      setIsClosingSale(false);
      refresh();
    } catch (err: any) {
      toast.error(err.message || 'Failed to finalize transaction');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div 
      className="grid grid-cols-1 lg:grid-cols-12 gap-6"
      style={{ color: 'var(--text-primary)' }}
    >
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        className="hidden" 
        accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
      />

      {/* Left Column: Transaction Details */}
      <div 
        className="lg:col-span-5 rounded-[8px] border overflow-hidden"
        style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-ui)' }}
      >
        <div 
          className="px-6 py-4 border-b flex justify-between items-center"
          style={{ borderColor: 'var(--border-ui)' }}
        >
          <div>
            <h3 className="text-sm font-bold tracking-tight text-[var(--text-primary)] flex items-center gap-2">
              <FileText className="w-4 h-4 text-amber-500" />
              E1.S Sale Operations
            </h3>
            <p className="text-[10px] uppercase tracking-[0.15em] mt-0.5 text-[var(--text-tertiary)]">
              Handle property contract status and transaction closeout
            </p>
          </div>
          <div>
            {saleClosed ? (
              <span className="px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Closed
              </span>
            ) : saleUnderContract ? (
              <span className="px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse">
                Under Contract
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider bg-white/5 text-[var(--text-secondary)] border border-white/10">
                Listed
              </span>
            )}
          </div>
        </div>

        {/* ─── STAGE 1: LISTED ─── */}
        {!saleUnderContract && !saleClosed && (
          <div className="p-6 space-y-6">
            {!isMarkingUnderContract ? (
              <div className="space-y-4">
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  The property is currently marketed for sale. Once an offer is accepted and a formal contract is executed, transition this project to the Under Contract state to track due diligence timelines.
                </p>
                {!isLocked && (
                  <button
                    onClick={() => setIsMarkingUnderContract(true)}
                    className="w-full py-2.5 rounded text-[10px] font-bold uppercase tracking-widest bg-[var(--text-primary)] text-[var(--bg-surface)] hover:opacity-90 transition-all flex items-center justify-center gap-1.5"
                  >
                    <ArrowUpRight className="w-3.5 h-3.5" />
                    Mark Under Contract
                  </button>
                )}
              </div>
            ) : (
              <form onSubmit={handleMarkUnderContract} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-secondary)]">Contract Price ($)</label>
                  <input
                    type="number"
                    value={contractPrice}
                    onChange={e => setContractPrice(e.target.value)}
                    placeholder="e.g. 450000"
                    className="glass-input w-full text-xs py-2.5 px-3 focus:outline-none"
                    required
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsMarkingUnderContract(false)}
                    className="w-1/2 py-2 rounded text-[10px] font-bold uppercase tracking-widest text-[var(--text-secondary)] hover:bg-white/5 border border-white/10"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="w-1/2 py-2 rounded text-[10px] font-bold uppercase tracking-widest bg-amber-500 text-black hover:bg-amber-600 transition-all"
                  >
                    Confirm Contract
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* ─── STAGE 2: UNDER CONTRACT ─── */}
        {saleUnderContract && !saleClosed && (
          <div className="p-6 space-y-6">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-tertiary)]">Escrow Contract Price</span>
              <p className="text-2xl font-bold tracking-tight text-[var(--text-primary)] mt-1">
                ${financials.sale_contract_price?.toLocaleString() || '0'}
              </p>
            </div>

            {!isClosingSale ? (
              <div className="space-y-4">
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  Due diligence checks are ongoing. Once all contingencies have been completed/satisfied and escrow closing statements are ready, initiate the transaction close.
                </p>
                {!isLocked && (
                  <button
                    onClick={() => setIsClosingSale(true)}
                    className="w-full py-2.5 rounded text-[10px] font-bold uppercase tracking-widest bg-emerald-500 text-white hover:bg-emerald-600 transition-all flex items-center justify-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Close Sale
                  </button>
                )}
              </div>
            ) : (
              <form onSubmit={handleFinalizeClose} className="space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">Log Transaction Closing Terms</h4>
                
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-secondary)]">Final Sale Price ($)</label>
                  <input
                    type="number"
                    value={finalSalePrice}
                    onChange={e => setFinalSalePrice(e.target.value)}
                    placeholder="e.g. 450000"
                    className="glass-input w-full text-xs py-2.5 px-3 focus:outline-none"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-secondary)]">Selling Costs / Fee ($)</label>
                    <input
                      type="number"
                      value={finalSellingCosts}
                      onChange={e => setFinalSellingCosts(e.target.value)}
                      placeholder="e.g. 24000"
                      className="glass-input w-full text-xs py-2.5 px-3 focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-secondary)]">Closing Date</label>
                    <input
                      type="date"
                      value={finalClosingDate}
                      onChange={e => setFinalClosingDate(e.target.value)}
                      className="glass-input w-full text-xs py-2.5 px-3 focus:outline-none"
                      required
                    />
                  </div>
                </div>

                {/* Upload documentation reminder inside Close Sale Form */}
                <div className="p-3 rounded bg-[rgba(255,255,255,0.02)] border border-white/5 space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-secondary)] block">Required Documents before Close:</span>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-[var(--text-tertiary)]">Sale Contract</span>
                      {getDocumentByCategory('Buyer Agreements') ? (
                        <span className="text-emerald-400 text-[10px] font-bold flex items-center gap-1">
                          <Check className="w-3 h-3" /> Uploaded
                        </span>
                      ) : (
                        <span className="text-rose-400 text-[10px] font-bold">Missing</span>
                      )}
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[var(--text-tertiary)]">Settlement Statement</span>
                      {getDocumentByCategory('Final Settlement Statement') ? (
                        <span className="text-emerald-400 text-[10px] font-bold flex items-center gap-1">
                          <Check className="w-3 h-3" /> Uploaded
                        </span>
                      ) : (
                        <span className="text-rose-400 text-[10px] font-bold">Missing</span>
                      )}
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[var(--text-tertiary)]">Deed Out</span>
                      {getDocumentByCategory('Deed') ? (
                        <span className="text-emerald-400 text-[10px] font-bold flex items-center gap-1">
                          <Check className="w-3 h-3" /> Uploaded
                        </span>
                      ) : (
                        <span className="text-rose-400 text-[10px] font-bold">Missing</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsClosingSale(false)}
                    className="w-1/2 py-2 rounded text-[10px] font-bold uppercase tracking-widest text-[var(--text-secondary)] hover:bg-white/5 border border-white/10"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    className="w-1/2 py-2 rounded text-[10px] font-bold uppercase tracking-widest bg-emerald-500 text-white hover:bg-emerald-600 transition-all"
                  >
                    Confirm Close
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* ─── STAGE 3: CLOSED STATE ─── */}
        {saleClosed && (
          <div className="p-6 space-y-6">
            <div className="p-4 rounded-lg bg-[rgba(16,185,129,0.03)] border border-emerald-500/20 space-y-4">
              <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5" />
                Transaction Finalized
              </span>
              
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-[var(--text-tertiary)] block">Sale Price</span>
                  <span className="font-bold text-[var(--text-primary)] text-sm">${financials.sale_price?.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-[var(--text-tertiary)] block">Selling Costs</span>
                  <span className="font-bold text-[var(--text-primary)] text-sm">${financials.selling_costs?.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-[var(--text-tertiary)] block">Closing Date</span>
                  <span className="font-bold text-[var(--text-primary)] text-sm">{financials.sale_closed_date}</span>
                </div>
                <div>
                  <span className="text-[var(--text-tertiary)] block">Realized Net Profit</span>
                  <span className="font-bold text-emerald-400 text-sm">
                    ${(project as any).realizedNetProceeds?.toLocaleString() || financials.realizedNetProceeds?.toLocaleString() || '0'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Right Column: Contingency Tracker & Document Vault uploads */}
      <div 
        className="lg:col-span-7 rounded-[8px] border overflow-hidden flex flex-col"
        style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-ui)' }}
      >
        <div 
          className="px-6 py-4 border-b flex justify-between items-center"
          style={{ borderColor: 'var(--border-ui)' }}
        >
          <div>
            <h3 className="text-sm font-bold tracking-tight text-[var(--text-primary)] flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-500" />
              Contingencies &amp; Closing Docs
            </h3>
            <p className="text-[10px] uppercase tracking-[0.15em] mt-0.5 text-[var(--text-tertiary)]">
              Validate contract checks and upload finalized escrow documents
            </p>
          </div>
        </div>

        <div className="p-6 space-y-6 flex-1 flex flex-col justify-between">
          {/* Buyer Contingency Checklist */}
          {saleUnderContract && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-secondary)]">Buyer Contingency Deadlines</span>
                {!isLocked && !saleClosed && (
                  <button
                    onClick={() => setShowAddContingency(!showAddContingency)}
                    className="flex items-center gap-1 px-2 py-1 rounded bg-white/5 border border-white/10 text-[9px] font-bold uppercase tracking-wider text-[var(--text-primary)]"
                  >
                    <Plus className="w-3 h-3" /> Add Custom
                  </button>
                )}
              </div>

              {showAddContingency && (
                <form onSubmit={handleAddCustomContingency} className="p-3.5 rounded bg-[rgba(255,255,255,0.02)] border border-white/5 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold uppercase tracking-widest text-[var(--text-tertiary)]">Contingency Type</label>
                      <select
                        value={customType}
                        onChange={e => setCustomType(e.target.value)}
                        className="glass-input w-full text-xs py-1.5 px-2 bg-[var(--bg-surface)] text-[var(--text-primary)]"
                      >
                        <option value="Inspection">Inspection</option>
                        <option value="Appraisal">Appraisal</option>
                        <option value="Financing">Financing</option>
                        <option value="Survey">Survey</option>
                        <option value="Custom">Custom</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold uppercase tracking-widest text-[var(--text-tertiary)]">Days Until Deadline</label>
                      <input
                        type="number"
                        value={customDays}
                        onChange={e => setCustomDays(e.target.value)}
                        className="glass-input w-full text-xs py-1.5 px-2"
                        required
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowAddContingency(false)}
                      className="px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-[var(--text-secondary)]"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider bg-[var(--text-primary)] text-[var(--bg-surface)] rounded"
                    >
                      Add
                    </button>
                  </div>
                </form>
              )}

              <div className="space-y-2">
                {(financials.sale_buyer_contingencies || []).map((c) => {
                  const days = calculateDaysRemaining(c.deadlineDate);
                  const isDone = c.isSatisfied || c.isWaived;
                  return (
                    <div 
                      key={c.id}
                      className="p-3 rounded bg-[var(--bg-canvas)] border border-[var(--border-ui)] flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={c.isSatisfied || false}
                          disabled={isLocked || saleClosed}
                          onChange={(e) => handleUpdateContingency(c.id, { isSatisfied: e.target.checked })}
                          className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500 focus:ring-offset-0 bg-transparent border-[var(--border-ui)]"
                        />
                        <div>
                          <p className={`text-xs font-bold ${isDone ? 'line-through text-[var(--text-tertiary)]' : 'text-[var(--text-primary)]'}`}>
                            {c.type} Contingency
                          </p>
                          <p className="text-[10px] text-[var(--text-tertiary)] mt-0.5">
                            Deadline: {formatDeadlineDate(c.deadlineDate)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {!isDone && (
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                            days <= 3 ? 'bg-rose-500/10 text-rose-400' : 'bg-amber-500/10 text-amber-400'
                          }`}>
                            {days <= 0 ? 'Overdue' : `${days}d left`}
                          </span>
                        )}
                        {isDone && (
                          <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400">
                            Completed
                          </span>
                        )}
                        {!isLocked && !saleClosed && (
                          <button
                            onClick={() => handleDeleteContingency(c.id)}
                            className="p-1 rounded text-[var(--text-tertiary)] hover:text-rose-400"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {!saleUnderContract && !saleClosed && (
            <div className="flex-1 flex items-center justify-center py-10 border border-dashed border-white/5 rounded-lg">
              <span className="text-[10px] uppercase tracking-wider text-[var(--text-tertiary)]">Contingency Tracker is Active when property is under contract</span>
            </div>
          )}

          {/* Document Vault Uploads Checklist */}
          <div className="space-y-4 pt-4 border-t border-white/5 flex-1 justify-end flex flex-col">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-secondary)]">Required Exit Documents</span>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {[
                { category: 'Buyer Agreements', label: 'Sale Contract' },
                { category: 'Final Settlement Statement', label: 'Settlement Statement' },
                { category: 'Deed', label: 'Deed Out' }
              ].map((docItem) => {
                const docFile = getDocumentByCategory(docItem.category);
                const isUploading = uploadingDocType === docItem.category;

                return (
                  <div 
                    key={docItem.category}
                    className="p-3 rounded bg-[var(--bg-canvas)] border border-[var(--border-ui)] flex flex-col justify-between h-28"
                  >
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-primary)] block">
                        {docItem.label}
                      </span>
                      {docFile ? (
                        <span className="text-[9px] text-[var(--text-tertiary)] truncate block mt-1 max-w-full">
                          {docFile.fileName}
                        </span>
                      ) : (
                        <span className="text-[9px] text-rose-400 block mt-1">
                          Missing file
                        </span>
                      )}
                    </div>

                    {!isLocked && !saleClosed ? (
                      <button
                        onClick={() => triggerFileUpload(docItem.category)}
                        disabled={isUploading}
                        className="w-full py-1.5 rounded bg-white/5 border border-white/10 text-[9px] font-bold uppercase tracking-widest text-[var(--text-secondary)] hover:bg-white/10 transition-all flex items-center justify-center gap-1"
                      >
                        {isUploading ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <UploadCloud className="w-3 h-3" />
                        )}
                        {docFile ? 'Replace' : 'Upload'}
                      </button>
                    ) : docFile ? (
                      <a
                        href={docFile.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="w-full py-1.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-[9px] font-bold uppercase tracking-widest text-emerald-400 text-center block"
                      >
                        Download
                      </a>
                    ) : (
                      <span className="text-[9px] text-[var(--text-tertiary)] text-center py-1 block">
                        No doc
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
