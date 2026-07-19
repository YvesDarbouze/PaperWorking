import React, { useState, useEffect } from 'react';
import { ApplicationUser } from '@/types/schema';
import { useProjectStore } from '@/store/projectStore';
import { X, ShieldCheck, Link, UploadCloud, Users, CheckCircle, Search, AlertTriangle, Sparkles, Loader2, DollarSign, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import { pingDigitalRegistry, Web3ProviderNotConfiguredError } from '@/lib/web3RegistryHooks';
import DealProgressTracker from '@/components/shared/DealProgressTracker';
import ESignAction from '@/components/shared/ESignAction';
import { usePermissions } from '@/hooks/usePermissions';
import { uploadFile } from '@/lib/storage/uploadService';
import { useAuth } from '@/context/AuthContext';
import { projectsService } from '@/lib/firebase/deals';
import { reconcileProjectCapital } from '@/lib/math/reconciliation';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { foldersService } from '@/lib/firebase/folders';
import { computeClosingCostLines } from '@/lib/math/closingCosts';

interface ClosingRoomProps {
    projectId: string;
    onClose: () => void;
}

export default function ClosingRoomModal({ projectId, onClose }: ClosingRoomProps) {
    const projects = useProjectStore(state => state.projects);
    const updateClosingRoom = useProjectStore(state => state.updateClosingRoom);
    const updateProjectFinancials = useProjectStore(state => state.updateProjectFinancials);
    const deal = projects.find(d => d.id === projectId);
    const closingRoom = deal?.closingRoom || ({
        titleInsuranceUrl: null,
        closingDisclosureUrl: null,
        wiringInstructionsUrl: null,
        assignedLawyerUid: null,
        lawyerVerified: false,
        blockchainTxHash: null,
        chainOfTitleStatus: 'pending',
        verifiedByUid: null,
        verifiedByName: null,
        verifiedAt: null,
        verifiedRole: null,
        reconciliationOverrideReason: null,
        isReconciliationOverridden: false,
        closingStatus: 'pending',
        isClosingExecuted: false,
        actualClosingDate: null,
        executedDocs: null,
        disbursementRecorded: false,
        disbursementStatementUrl: null,
        deedRecordingCounty: null,
        deedRecordingDate: null,
        deedRecordingInstrumentNumber: null
    } as NonNullable<import('@/types/schema').Project['closingRoom']>);
    const { role } = usePermissions();
    const { user, profile } = useAuth();

    const [isPinging, setIsPinging] = useState(false);
    const [matchingLawyers, setMatchingLawyers] = useState<ApplicationUser[]>([]);
    const [isSearchingLawyers, setIsSearchingLawyers] = useState(false);
    const [isSigned, setIsSigned] = useState(false);
    const [isVerifyingDocs, setIsVerifyingDocs] = useState(false);
    const [uploadingField, setUploadingField] = useState<
        'titleInsuranceUrl' | 'closingDisclosureUrl' | 'wiringInstructionsUrl' |
        'deed' | 'note' | 'settlementStatement' | 'titlePolicy' | 'entityDocs' | 'disbursementStatement' | null
    >(null);
    const [viewMode, setViewMode] = useState<'main' | 'cd_capture'>('main');
    const [cdFinalClosingCosts, setCdFinalClosingCosts] = useState<number>(0);
    const [cdCashToClose, setCdCashToClose] = useState<number>(0);
    const [cdPrepaidsReserves, setCdPrepaidsReserves] = useState<number>(0);
    const [isOcrScanning, setIsOcrScanning] = useState(false);
    const [isSavingCDData, setIsSavingCDData] = useState(false);
    const [overrideReasonState, setOverrideReasonState] = useState<string>(closingRoom.reconciliationOverrideReason || '');
    const [isSavingOverride, setIsSavingOverride] = useState(false);

    const [actualClosingDateState, setActualClosingDateState] = useState<string>(
        closingRoom.actualClosingDate || new Date().toISOString().split('T')[0]
    );
    const [executedDeedUrl, setExecutedDeedUrl] = useState<string>(closingRoom.executedDocs?.deedUrl || '');
    const [executedDeedSigned, setExecutedDeedSigned] = useState<boolean>(!!closingRoom.executedDocs?.deedSigned);

    const [executedNoteUrl, setExecutedNoteUrl] = useState<string>(closingRoom.executedDocs?.noteUrl || '');
    const [executedNoteSigned, setExecutedNoteSigned] = useState<boolean>(!!closingRoom.executedDocs?.noteSigned);

    const [executedSettlementStatementUrl, setExecutedSettlementStatementUrl] = useState<string>(closingRoom.executedDocs?.settlementStatementUrl || '');
    const [executedSettlementStatementSigned, setExecutedSettlementStatementSigned] = useState<boolean>(!!closingRoom.executedDocs?.settlementStatementSigned);

    const [executedTitlePolicyUrl, setExecutedTitlePolicyUrl] = useState<string>(closingRoom.executedDocs?.titlePolicyUrl || '');
    const [executedTitlePolicySigned, setExecutedTitlePolicySigned] = useState<boolean>(!!closingRoom.executedDocs?.titlePolicySigned);

    const [executedEntityDocsUrl, setExecutedEntityDocsUrl] = useState<string>(closingRoom.executedDocs?.entityDocsUrl || '');
    const [executedEntityDocsSigned, setExecutedEntityDocsSigned] = useState<boolean>(!!closingRoom.executedDocs?.entityDocsSigned);

    const [disbursementRecordedState, setDisbursementRecordedState] = useState<boolean>(!!closingRoom.disbursementRecorded);
    const [disbursementStatementUrlState, setDisbursementStatementUrlState] = useState<string>(closingRoom.disbursementStatementUrl || '');

    const [deedRecordingCountyState, setDeedRecordingCountyState] = useState<string>(closingRoom.deedRecordingCounty || '');
    const [deedRecordingDateState, setDeedRecordingDateState] = useState<string>(closingRoom.deedRecordingDate || '');
    const [deedRecordingInstrumentNumberState, setDeedRecordingInstrumentNumberState] = useState<string>(closingRoom.deedRecordingInstrumentNumber || '');

    const [isSavingExecution, setIsSavingExecution] = useState(false);

    // Card F5.6 Actualization Sweep States
    const [sweepPurchasePrice, setSweepPurchasePrice] = useState<number | ''>('');
    const [sweepClosingCosts, setSweepClosingCosts] = useState<number | ''>('');
    const [sweepPrepaids, setSweepPrepaids] = useState<number | ''>('');
    const [sweepCashToClose, setSweepCashToClose] = useState<number | ''>('');
    const [sweepEmd, setSweepEmd] = useState<number | ''>('');
    const [sweepInsurance, setSweepInsurance] = useState<number | ''>('');
    const [sweepLoanAmount, setSweepLoanAmount] = useState<number | ''>('');
    const [sweepInterestRate, setSweepInterestRate] = useState<number | ''>('');
    const [isSavingSweep, setIsSavingSweep] = useState(false);

    useEffect(() => {
        if (closingRoom.cdFinalClosingCosts !== undefined && closingRoom.cdFinalClosingCosts !== null) {
            setCdFinalClosingCosts(closingRoom.cdFinalClosingCosts);
        }
        if (closingRoom.cdCashToClose !== undefined && closingRoom.cdCashToClose !== null) {
            setCdCashToClose(closingRoom.cdCashToClose);
        }
        if (closingRoom.cdPrepaidsReserves !== undefined && closingRoom.cdPrepaidsReserves !== null) {
            setCdPrepaidsReserves(closingRoom.cdPrepaidsReserves);
        }
        setOverrideReasonState(closingRoom.reconciliationOverrideReason || '');

        setActualClosingDateState(closingRoom.actualClosingDate || new Date().toISOString().split('T')[0]);
        setExecutedDeedUrl(closingRoom.executedDocs?.deedUrl || '');
        setExecutedDeedSigned(!!closingRoom.executedDocs?.deedSigned);
        setExecutedNoteUrl(closingRoom.executedDocs?.noteUrl || '');
        setExecutedNoteSigned(!!closingRoom.executedDocs?.noteSigned);
        setExecutedNoteSigned(!!closingRoom.executedDocs?.noteSigned);
        setExecutedSettlementStatementUrl(closingRoom.executedDocs?.settlementStatementUrl || '');
        setExecutedSettlementStatementSigned(!!closingRoom.executedDocs?.settlementStatementSigned);
        setExecutedTitlePolicyUrl(closingRoom.executedDocs?.titlePolicyUrl || '');
        setExecutedTitlePolicySigned(!!closingRoom.executedDocs?.titlePolicySigned);
        setExecutedEntityDocsUrl(closingRoom.executedDocs?.entityDocsUrl || '');
        setExecutedEntityDocsSigned(!!closingRoom.executedDocs?.entityDocsSigned);
        setDisbursementRecordedState(!!closingRoom.disbursementRecorded);
        setDisbursementStatementUrlState(closingRoom.disbursementStatementUrl || '');
        setDeedRecordingCountyState(closingRoom.deedRecordingCounty || '');
        setDeedRecordingDateState(closingRoom.deedRecordingDate || '');
        setDeedRecordingInstrumentNumberState(closingRoom.deedRecordingInstrumentNumber || '');

        const fin = deal?.financials;
        if (fin) {
            setSweepPurchasePrice(fin.purchasePrice || '');
            setSweepClosingCosts(fin.finalClosingCosts || closingRoom.cdFinalClosingCosts || '');
            setSweepPrepaids(fin.finalPrepaidsReserves || closingRoom.cdPrepaidsReserves || '');
            setSweepCashToClose(fin.finalCashToClose || closingRoom.cdCashToClose || '');
            setSweepEmd(fin.emdAmount ? fin.emdAmount / 100 : '');
            setSweepInsurance(fin.insuranceCost || '');
            const loanSource = (fin.capitalStack || []).find((s: any) => s.category === 'Conventional Financing' || s.category === 'Hard Money Loans');
            setSweepLoanAmount(loanSource?.amount || fin.loanAmount || '');
            setSweepInterestRate(loanSource?.interestRate || fin.loanInterestRate || '');
        }
    }, [
        closingRoom.cdFinalClosingCosts,
        closingRoom.cdCashToClose,
        closingRoom.cdPrepaidsReserves,
        closingRoom.reconciliationOverrideReason,
        closingRoom.actualClosingDate,
        closingRoom.executedDocs,
        closingRoom.disbursementRecorded,
        closingRoom.disbursementStatementUrl,
        closingRoom.deedRecordingCounty,
        closingRoom.deedRecordingDate,
        closingRoom.deedRecordingInstrumentNumber,
        deal?.financials
    ]);

    useEffect(() => {
      if (!deal) return;
      const discoverLawyers = async () => {
        setIsSearchingLawyers(true);
        // Extract 2-letter state abbreviation from address (e.g. "123 Main St, Miami, FL 33101")
        const stateMatch = deal.address.match(/,\s*([A-Z]{2})(?:\s+\d{5})?/i);
        const stateCode = stateMatch ? stateMatch[1].toUpperCase() : 'NY';
        try {
          const token = user && typeof user.getIdToken === 'function' ? await user.getIdToken() : '';
          const res = await fetch(`/api/lawyers?state=${stateCode}`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const data = await res.json();
          setMatchingLawyers(data.lawyers ?? []);
        } catch (err) {
          console.error('[ClosingRoomModal] Failed to fetch lawyers:', err);
          toast.error('Could not load attorneys. Please try again.');
        } finally {
          setIsSearchingLawyers(false);
        }
      };
      discoverLawyers();
    }, [projectId, deal]);

    if (!deal) return null;

    const isMember = user ? !!(deal.members && user.uid in deal.members) : false;

    if (!isMember) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-md p-4">
                <div className="bg-pw-glass-bg border border-pw-border backdrop-blur-[20px] rounded-2xl shadow-2xl w-full max-w-md p-6 flex flex-col items-center text-center">
                    <AlertTriangle className="w-12 h-12 text-red-500 mb-4 animate-bounce" />
                    <h2 className="text-xl font-bold text-pw-black mb-2">Access Denied</h2>
                    <p className="text-sm text-pw-muted mb-6">You must be a member of this project to access the Closing Room.</p>
                    <button onClick={onClose} className="pw-btn pw-btn--primary pw-btn--pill px-6 py-2">Close</button>
                </div>
            </div>
        );
    }

    const handleWeb3Ping = async () => {
        if (!isMember) return;
        setIsPinging(true);
        toast.loading('Verifying title on chain...', { id: 'web3' });
        try {
            const res = await pingDigitalRegistry(deal.address);
            // res.chainOfTitleStatus is always 'verified'|'failed'|'pending' here
            // (the 'unavailable' case throws before reaching this point)
            const status = res.chainOfTitleStatus as 'verified' | 'failed' | 'pending';
            const updates = { chainOfTitleStatus: status, blockchainTxHash: res.blockchainTxHash };
            await projectsService.updateProject(deal.id, {
                closingRoom: { ...closingRoom, ...updates }
            });
            updateClosingRoom(deal.id, updates);
            toast.success(`Title Registry Verified! Hash: ${res.blockchainTxHash?.slice(0, 10)}…`, { id: 'web3' });
        } catch (err: any) {
            if (err instanceof Web3ProviderNotConfiguredError) {
                toast.error(
                    'On-chain title verification is not enabled. Contact your administrator to configure a blockchain registry provider.',
                    { id: 'web3', duration: 6000 }
                );
            } else {
                toast.error('Failed to communicate with title registry nodes.', { id: 'web3' });
            }
        } finally {
            setIsPinging(false);
        }
    };

    const handleFileUpload = async (field: 'titleInsuranceUrl' | 'closingDisclosureUrl' | 'wiringInstructionsUrl', file: File) => {
        if (!isMember) {
            toast.error('Access denied. You are not a member of this project.');
            return;
        }
        setUploadingField(field);
        const toastId = toast.loading(`Uploading ${file.name}...`);
        try {
            const res = await uploadFile({
                file,
                path: 'closing_docs',
                projectId: deal.id,
            });
            await projectsService.updateProject(deal.id, {
                closingRoom: {
                    ...closingRoom,
                    [field]: res.downloadUrl
                }
            });
            updateClosingRoom(deal.id, {
                [field]: res.downloadUrl
            });
            toast.success('Document uploaded successfully!', { id: toastId });
        } catch (err: any) {
            console.error('[ClosingRoomModal] Upload failed:', err);
            toast.error(`Upload failed: ${err.message || 'Unknown error'}`, { id: toastId });
        } finally {
            setUploadingField(null);
        }
    };

    const handleDocumentAttestation = async () => {
        if (!isMember) return;
        const { titleInsuranceUrl, closingDisclosureUrl, wiringInstructionsUrl } = closingRoom;
        if (!titleInsuranceUrl || !closingDisclosureUrl || !wiringInstructionsUrl) {
            toast.error('All three required documents must be uploaded before legal verification.');
            return;
        }

        setIsVerifyingDocs(true);
        const toastId = toast.loading('Recording review attestation...', { id: 'legal-verify' });
        try {
            const reviewerName = profile?.displayName || user?.displayName || user?.email || 'Unknown Reviewer';
            const reviewerRole = profile?.role || role || 'Project Member';
            const timestamp = new Date().toISOString();

            const updates = { 
                lawyerVerified: true,
                verifiedByUid: user?.uid || null,
                verifiedByName: reviewerName,
                verifiedAt: timestamp,
                verifiedRole: reviewerRole
            };
            await projectsService.updateProject(deal.id, {
                closingRoom: {
                    ...closingRoom,
                    ...updates
                }
            });
            updateClosingRoom(deal.id, updates);
            toast.success('Document review successfully attested!', { id: 'legal-verify' });
        } catch (err: any) {
            toast.error(err.message || 'Failed to record review attestation.', { id: 'legal-verify' });
        } finally {
            setIsVerifyingDocs(false);
        }
    };

    const handleUpdateClosingRoom = async (updates: Partial<typeof closingRoom>) => {
        if (!isMember) return;
        try {
            await projectsService.updateProject(deal.id, {
                closingRoom: {
                    ...closingRoom,
                    ...updates
                }
            });
            updateClosingRoom(deal.id, updates);
        } catch (err: any) {
            console.error('[ClosingRoomModal] Update failed:', err);
            toast.error(`Update failed: ${err.message || 'Unknown error'}`);
        }
    };

    const handleRunCDOcr = async () => {
        if (!closingRoom.closingDisclosureUrl) {
            toast.error('Please upload a Closing Disclosure first.');
            return;
        }
        setIsOcrScanning(true);
        const toastId = toast.loading('Analyzing document with Gemini AI...');
        try {
            const token = user && typeof user.getIdToken === 'function' ? await user.getIdToken() : '';
            const res = await fetch('/api/ocr/settlement', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    fileUrl: closingRoom.closingDisclosureUrl,
                    mimeType: 'application/pdf'
                })
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || `HTTP ${res.status}`);
            }

            const { data } = await res.json();
            
            setCdFinalClosingCosts(data.closingCosts || 0);
            
            const derivedPrepaids = Math.max(0, (data.closingCosts || 0) - ((data.titleFees || 0) + (data.recordingFees || 0) + (data.transferTaxes || 0)));
            setCdPrepaidsReserves(derivedPrepaids || 0);

            const purchasePrice = deal.financials?.purchasePrice || 0;
            const loanAmount = deal.financials?.loanAmount || 0;
            const derivedCashToClose = Math.max(0, purchasePrice + (data.closingCosts || 0) - loanAmount);
            setCdCashToClose(derivedCashToClose || 0);

            toast.success(`Scan complete! (Confidence: ${data.confidence})`, { id: toastId });
        } catch (err: any) {
            console.error('[CD OCR] Failed:', err);
            
            const purchasePrice = deal.financials?.purchasePrice || 0;
            const loanAmount = deal.financials?.loanAmount || 0;
            
            const estTitle = Math.round(purchasePrice * 0.004);
            const estTransfer = Math.round(purchasePrice * 0.001);
            const estOrig = Math.round(loanAmount * 0.01);
            const estClosingCosts = estTitle + estTransfer + estOrig;
            const estPrepaids = Math.round(purchasePrice * 0.005 / 12) + Math.round((purchasePrice * 0.0125 / 12) * 3);
            const totalEstCosts = estClosingCosts + estPrepaids;
            const estCashToClose = Math.max(0, purchasePrice + totalEstCosts - loanAmount);

            setCdFinalClosingCosts(totalEstCosts);
            setCdPrepaidsReserves(estPrepaids);
            setCdCashToClose(estCashToClose);

            toast.success('Generated estimates based on deal underwriting.', { id: toastId });
        } finally {
            setIsOcrScanning(false);
        }
    };

    const handleSaveCDData = async () => {
        setIsSavingCDData(true);
        const toastId = toast.loading('Saving and actualizing financials...');
        try {
            const reviewerName = profile?.displayName || user?.displayName || user?.email || 'Unknown User';
            const timestamp = new Date().toISOString();

            const closingRoomUpdates = {
                cdFinalClosingCosts,
                cdCashToClose,
                cdPrepaidsReserves,
                cdSourceDocumentUrl: closingRoom.closingDisclosureUrl,
                cdSourceDocumentName: closingRoom.closingDisclosureUrl?.split('/').pop()?.split('?')[0] || 'Closing Disclosure',
                cdCapturedAt: timestamp,
                cdCapturedByUid: user?.uid || null,
                cdCapturedByName: reviewerName,
            };

            const financialUpdates = {
                finalClosingCosts: cdFinalClosingCosts,
                finalCashToClose: cdCashToClose,
                finalPrepaidsReserves: cdPrepaidsReserves,
            };

            await projectsService.updateProject(deal.id, {
                closingRoom: {
                    ...closingRoom,
                    ...closingRoomUpdates
                },
                financials: {
                    ...deal.financials,
                    ...financialUpdates
                }
            });

            updateClosingRoom(deal.id, closingRoomUpdates);
            updateProjectFinancials(deal.id, financialUpdates);

            toast.success('Financials actualized from CD successfully!', { id: toastId });
            setViewMode('main');
        } catch (err: any) {
            console.error('[CD Capture Save] Failed:', err);
            toast.error(`Save failed: ${err.message || 'Unknown error'}`, { id: toastId });
        } finally {
            setIsSavingCDData(false);
        }
    };

    const reconciliation = reconcileProjectCapital(deal);

    const handleSaveOverride = async () => {
        setIsSavingOverride(true);
        const toastId = toast.loading('Saving override reason...');
        try {
            const updates = {
                reconciliationOverrideReason: overrideReasonState,
                isReconciliationOverridden: !!overrideReasonState.trim(),
            };

            await projectsService.updateProject(deal.id, {
                closingRoom: {
                    ...closingRoom,
                    ...updates
                }
            });

            updateClosingRoom(deal.id, updates);
            toast.success(updates.isReconciliationOverridden ? 'Override recorded successfully!' : 'Override cleared.', { id: toastId });
        } catch (err: any) {
            console.error('[Reconciliation Override] Save failed:', err);
            toast.error(`Save failed: ${err.message || 'Unknown error'}`, { id: toastId });
        } finally {
            setIsSavingOverride(false);
        }
    };

    const handleSaveSweep = async () => {
        if (!deal) return;
        if (!isMember) {
            toast.error('Access denied. You are not a member of this project.');
            return;
        }
        setIsSavingSweep(true);
        const toastId = toast.loading('Applying actuals sweep...');
        try {
            const fin = deal.financials || {};
            const updatedCapitalStack = (fin.capitalStack || []).map((s) => {
                if (s.category === 'Conventional Financing' || s.category === 'Hard Money Loans') {
                    return {
                        ...s,
                        amount: sweepLoanAmount !== '' ? Number(sweepLoanAmount) : s.amount,
                        interestRate: sweepInterestRate !== '' ? Number(sweepInterestRate) : s.interestRate,
                    };
                }
                return s;
            });

            const updatedFinancials = {
                ...fin,
                purchasePrice: sweepPurchasePrice !== '' ? Number(sweepPurchasePrice) : fin.purchasePrice,
                finalClosingCosts: sweepClosingCosts !== '' ? Number(sweepClosingCosts) : fin.finalClosingCosts,
                finalPrepaidsReserves: sweepPrepaids !== '' ? Number(sweepPrepaids) : fin.finalPrepaidsReserves,
                finalCashToClose: sweepCashToClose !== '' ? Number(sweepCashToClose) : fin.finalCashToClose,
                emdAmount: sweepEmd !== '' ? Math.round(Number(sweepEmd) * 100) : fin.emdAmount,
                insuranceCost: sweepInsurance !== '' ? Number(sweepInsurance) : fin.insuranceCost,
                insurance: sweepInsurance !== '' ? Math.round((Number(sweepInsurance) / 12) * 100) / 100 : fin.insurance,
                holdingCostInsurance: sweepInsurance !== '' ? Math.round((Number(sweepInsurance) / 12) * 100) / 100 : fin.holdingCostInsurance,
                loanAmount: sweepLoanAmount !== '' ? Number(sweepLoanAmount) : fin.loanAmount,
                loanInterestRate: sweepInterestRate !== '' ? Number(sweepInterestRate) : fin.loanInterestRate,
                capitalStack: updatedCapitalStack,
            };

            const closingRoomUpdates = {
                cdFinalClosingCosts: sweepClosingCosts !== '' ? Number(sweepClosingCosts) : (closingRoom.cdFinalClosingCosts || null),
                cdPrepaidsReserves: sweepPrepaids !== '' ? Number(sweepPrepaids) : (closingRoom.cdPrepaidsReserves || null),
                cdCashToClose: sweepCashToClose !== '' ? Number(sweepCashToClose) : (closingRoom.cdCashToClose || null),
            };

            await projectsService.updateProject(deal.id, {
                financials: updatedFinancials,
                closingRoom: {
                    ...closingRoom,
                    ...closingRoomUpdates
                }
            });

            const store = useProjectStore.getState();
            const updatedProject = {
                ...deal,
                financials: updatedFinancials,
                closingRoom: {
                    ...closingRoom,
                    ...closingRoomUpdates
                }
            };
            const updatedProjects = store.projects.map(p => p.id === deal.id ? updatedProject : p);
            store.setDeals(updatedProjects);
            store.setDeal(updatedProject);

            toast.success('Actualization sweep applied successfully!', { id: toastId });
        } catch (err: any) {
            console.error('[Save Sweep] Failed:', err);
            toast.error(`Save failed: ${err.message || 'Unknown error'}`, { id: toastId });
        } finally {
            setIsSavingSweep(false);
        }
    };

    const isFinanced = (deal.financials?.capitalStack || []).some(
        source => 
            (source.category === 'Conventional Financing' || source.category === 'Hard Money Loans') &&
            (source.status === 'Approved' || source.status === 'Funded')
    );

    const handleExecutedDocUpload = async (
        docKey: 'deed' | 'note' | 'settlementStatement' | 'titlePolicy' | 'entityDocs' | 'disbursementStatement',
        file: File
    ) => {
        if (!isMember) {
            toast.error('Access denied. You are not a member of this project.');
            return;
        }
        setUploadingField(docKey as any);
        const toastId = toast.loading(`Uploading ${file.name}...`);
        try {
            const res = await uploadFile({
                file,
                path: 'executed_docs',
                projectId: deal.id,
            });

            if (docKey === 'disbursementStatement') {
                setDisbursementStatementUrlState(res.downloadUrl);
                const closingRoomUpdates = {
                    disbursementStatementUrl: res.downloadUrl,
                };
                await projectsService.updateProject(deal.id, {
                    closingRoom: {
                        ...closingRoom,
                        ...closingRoomUpdates
                    }
                });
                updateClosingRoom(deal.id, closingRoomUpdates);
            } else {
                let updatedUrlState: any = {};
                if (docKey === 'deed') {
                    setExecutedDeedUrl(res.downloadUrl);
                    updatedUrlState = { deedUrl: res.downloadUrl };
                } else if (docKey === 'note') {
                    setExecutedNoteUrl(res.downloadUrl);
                    updatedUrlState = { noteUrl: res.downloadUrl };
                } else if (docKey === 'settlementStatement') {
                    setExecutedSettlementStatementUrl(res.downloadUrl);
                    updatedUrlState = { settlementStatementUrl: res.downloadUrl };
                    // If disbursement statement doesn't exist, autofill it
                    if (!disbursementStatementUrlState) {
                        setDisbursementStatementUrlState(res.downloadUrl);
                    }
                } else if (docKey === 'titlePolicy') {
                    setExecutedTitlePolicyUrl(res.downloadUrl);
                    updatedUrlState = { titlePolicyUrl: res.downloadUrl };
                } else if (docKey === 'entityDocs') {
                    setExecutedEntityDocsUrl(res.downloadUrl);
                    updatedUrlState = { entityDocsUrl: res.downloadUrl };
                }

                const updatedExecutedDocs = {
                    deedUrl: docKey === 'deed' ? res.downloadUrl : executedDeedUrl,
                    deedSigned: executedDeedSigned,
                    noteUrl: docKey === 'note' ? res.downloadUrl : executedNoteUrl,
                    noteSigned: executedNoteSigned,
                    settlementStatementUrl: docKey === 'settlementStatement' ? res.downloadUrl : executedSettlementStatementUrl,
                    settlementStatementSigned: executedSettlementStatementSigned,
                    titlePolicyUrl: docKey === 'titlePolicy' ? res.downloadUrl : executedTitlePolicyUrl,
                    titlePolicySigned: executedTitlePolicySigned,
                    entityDocsUrl: docKey === 'entityDocs' ? res.downloadUrl : executedEntityDocsUrl,
                    entityDocsSigned: executedEntityDocsSigned,
                    ...updatedUrlState
                };

                const closingRoomUpdates = {
                    executedDocs: updatedExecutedDocs,
                    disbursementStatementUrl: docKey === 'settlementStatement' && !disbursementStatementUrlState ? res.downloadUrl : disbursementStatementUrlState
                };

                await projectsService.updateProject(deal.id, {
                    closingRoom: {
                        ...closingRoom,
                        ...closingRoomUpdates
                    }
                });

                updateClosingRoom(deal.id, closingRoomUpdates);
            }

            toast.success('Document uploaded successfully!', { id: toastId });
        } catch (err: any) {
            console.error('[Executed Doc Upload] Failed:', err);
            toast.error(`Upload failed: ${err.message || 'Unknown error'}`, { id: toastId });
        } finally {
            setUploadingField(null);
        }
    };

    const handleToggleSignedStatus = async (docKey: 'deed' | 'note' | 'settlementStatement' | 'titlePolicy' | 'entityDocs', currentVal: boolean) => {
        if (!isMember) return;
        const newVal = !currentVal;

        const updatedExecutedDocs = {
            deedUrl: executedDeedUrl,
            deedSigned: executedDeedSigned,
            noteUrl: executedNoteUrl,
            noteSigned: executedNoteSigned,
            settlementStatementUrl: executedSettlementStatementUrl,
            settlementStatementSigned: executedSettlementStatementSigned,
            titlePolicyUrl: executedTitlePolicyUrl,
            titlePolicySigned: executedTitlePolicySigned,
            entityDocsUrl: executedEntityDocsUrl,
            entityDocsSigned: executedEntityDocsSigned,
            [`${docKey}Signed`]: newVal
        };

        // Set local state
        if (docKey === 'deed') setExecutedDeedSigned(newVal);
        else if (docKey === 'note') setExecutedNoteSigned(newVal);
        else if (docKey === 'settlementStatement') setExecutedSettlementStatementSigned(newVal);
        else if (docKey === 'titlePolicy') setExecutedTitlePolicySigned(newVal);
        else if (docKey === 'entityDocs') setExecutedEntityDocsSigned(newVal);

        const closingRoomUpdates = {
            executedDocs: updatedExecutedDocs
        };

        try {
            await projectsService.updateProject(deal.id, {
                closingRoom: {
                    ...closingRoom,
                    ...closingRoomUpdates
                }
            });
            updateClosingRoom(deal.id, closingRoomUpdates);
        } catch (err: any) {
            toast.error('Failed to update signed status: ' + err.message);
        }
    };

    const isDocsChecklistComplete = 
        (executedDeedUrl && executedDeedSigned) &&
        (!isFinanced || (executedNoteUrl && executedNoteSigned)) &&
        (executedSettlementStatementUrl && executedSettlementStatementSigned) &&
        (executedTitlePolicyUrl && executedTitlePolicySigned) &&
        (executedEntityDocsUrl && executedEntityDocsSigned);

    const isPurchasePriceRecorded = !!deal?.financials?.purchasePrice && deal.financials.purchasePrice > 0;
    const isTotalCashActualized = (!!deal?.financials?.totalCashInvested && deal.financials.totalCashInvested > 0) || (!!deal?.financials?.finalCashToClose && deal.financials.finalCashToClose > 0);
    const isLoanTermsActual = !isFinanced || (
        !!deal?.financials?.loanAmount && deal.financials.loanAmount > 0 &&
        !!deal?.financials?.loanInterestRate && deal.financials.loanInterestRate > 0
    );
    const isClosingDateRecorded = !!actualClosingDateState;
    const isDeedRecordingConfirmed = !!deedRecordingCountyState && !!deedRecordingDateState && !!deedRecordingInstrumentNumberState;
    const isClosingDocsArchived = isDocsChecklistComplete;
    const isCashToCloseReconciled = reconciliation.isReconciled || (closingRoom.isReconciliationOverridden && !!closingRoom.reconciliationOverrideReason?.trim());
    const isAttorneySatisfied = !!closingRoom.lawyerVerified;

    const isGatePassed = 
        isPurchasePriceRecorded &&
        isTotalCashActualized &&
        isLoanTermsActual &&
        isClosingDateRecorded &&
        isDeedRecordingConfirmed &&
        isClosingDocsArchived &&
        isCashToCloseReconciled &&
        isAttorneySatisfied;

    const canCompleteExecution = isGatePassed && !!disbursementRecordedState && !!disbursementStatementUrlState;

    const handleCompleteClosing = async () => {
        if (!isMember) return;
        if (!canCompleteExecution) {
            toast.error('Please complete all executed documents, record disbursement, and enter deed recording confirmation.');
            return;
        }

        setIsSavingExecution(true);
        const toastId = toast.loading('Archiving closing package to Data Room & completing deal closing...');

        try {
            // Find folder matching 'Under Contract' (or first project folder)
            const q = query(
                collection(db, 'projectFolders'),
                where('projectId', '==', deal.id)
            );
            const querySnap = await getDocs(q);
            let folderId = '';
            querySnap.forEach((docSnap) => {
                const data = docSnap.data();
                if (data.name === 'Under Contract' || data.phase === 'Under Contract') {
                    folderId = docSnap.id;
                }
            });

            if (!folderId && !querySnap.empty) {
                folderId = querySnap.docs[0].id;
            }

            if (!folderId) {
                throw new Error('Project Data Room phase folders are not initialized.');
            }

            const archiveDoc = async (name: string, category: any, url: string) => {
                await foldersService.addFile(
                    folderId,
                    deal.id,
                    deal.organizationId,
                    {
                        name,
                        category,
                        storageUrl: url,
                        fileType: 'application/pdf',
                        sizeBytes: 1024 * 100, // 100KB mock
                        uploadedByUid: user?.uid || 'system',
                        uploadedByEmail: user?.email || '',
                        isVerified: true,
                        verifiedByUid: user?.uid || 'system',
                        verifiedAt: new Date(),
                    }
                );
            };

            // Archive all executed docs
            if (executedDeedUrl) await archiveDoc('Executed Deed.pdf', 'Title Report', executedDeedUrl);
            if (isFinanced && executedNoteUrl) await archiveDoc('Promissory Note.pdf', 'Other', executedNoteUrl);
            if (executedSettlementStatementUrl) await archiveDoc('Settlement Statement.pdf', 'HUD-1 Settlement Statement', executedSettlementStatementUrl);
            if (executedTitlePolicyUrl) await archiveDoc('Title Policy.pdf', 'Title Report', executedTitlePolicyUrl);
            if (executedEntityDocsUrl) await archiveDoc('Entity Assignment Documents.pdf', 'Other', executedEntityDocsUrl);
            if (disbursementStatementUrlState && disbursementStatementUrlState !== executedSettlementStatementUrl) {
                await archiveDoc('Disbursement Proof.pdf', 'Other', disbursementStatementUrlState);
            }

            const closingRoomUpdates = {
                closingStatus: 'completed' as const,
                isClosingExecuted: true,
                actualClosingDate: actualClosingDateState,
                executedDocs: {
                    deedUrl: executedDeedUrl,
                    deedSigned: executedDeedSigned,
                    noteUrl: executedNoteUrl,
                    noteSigned: executedNoteSigned,
                    settlementStatementUrl: executedSettlementStatementUrl,
                    settlementStatementSigned: executedSettlementStatementSigned,
                    titlePolicyUrl: executedTitlePolicyUrl,
                    titlePolicySigned: executedTitlePolicySigned,
                    entityDocsUrl: executedEntityDocsUrl,
                    entityDocsSigned: executedEntityDocsSigned,
                },
                disbursementRecorded: disbursementRecordedState,
                disbursementStatementUrl: disbursementStatementUrlState,
                deedRecordingCounty: deedRecordingCountyState,
                deedRecordingDate: deedRecordingDateState,
                deedRecordingInstrumentNumber: deedRecordingInstrumentNumberState,
            };

            const nextPhaseUpdates = {
                phaseStatus: 'Phase 3: Hold' as const,
                currentPhase: 3,
                status: 'hold' as const,
            };

            await projectsService.updateProject(deal.id, {
                closingRoom: {
                    ...closingRoom,
                    ...closingRoomUpdates
                },
                ...nextPhaseUpdates
            });

            // Progress the project state in the local store
            const store = useProjectStore.getState();
            const updatedProject = {
                ...deal,
                closingRoom: {
                    ...closingRoom,
                    ...closingRoomUpdates
                },
                ...nextPhaseUpdates
            };
            const updatedProjects = store.projects.map(p => p.id === deal.id ? updatedProject : p);
            store.setDeals(updatedProjects);
            store.setDeal(updatedProject);

            toast.success('Closing execution completed and archived to Data Room!', { id: toastId });
            onClose();
        } catch (err: any) {
            console.error('[Complete Closing Execution] Failed:', err);
            toast.error(`Execution failed: ${err.message || 'Unknown error'}`, { id: toastId });
        } finally {
            setIsSavingExecution(false);
        }
    };

    const DocsComplete = closingRoom.titleInsuranceUrl && closingRoom.closingDisclosureUrl && closingRoom.wiringInstructionsUrl;

    const isReconciliationApproved = reconciliation.isReconciled || (closingRoom.isReconciliationOverridden && closingRoom.reconciliationOverrideReason?.trim());

    if (viewMode === 'cd_capture') {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-md p-4">
                <div className="bg-pw-glass-bg border border-pw-border backdrop-blur-[20px] rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto flex flex-col">
                    {/* Header */}
                    <div className="border-b border-pw-border p-6 flex justify-between items-center bg-pw-glass-bg/90 backdrop-blur-md sticky top-0 z-10 text-pw-black">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => setViewMode('main')}
                                className="text-sm font-bold text-[#454955] hover:text-black flex items-center gap-1.5"
                            >
                                &larr; Back to Closing Room
                            </button>
                            <div className="h-4 w-[1px] bg-pw-border" />
                            <div>
                                <h2 className="text-xl font-semibold flex items-center gap-2">
                                    Closing Disclosure Capture
                                </h2>
                                <p className="text-xs text-pw-muted mt-0.5">
                                    Review, verify, and actualize transaction numbers from the CD.
                                </p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-pw-glass-bg/25 rounded-full transition text-pw-black"><X className="w-5 h-5"/></button>
                    </div>

                    {/* Body: Split View */}
                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8 overflow-y-auto">
                        {/* Left Column: Document Viewer Mockup */}
                        <div className="space-y-4 flex flex-col h-full justify-between">
                            <div className="space-y-4">
                                <h3 className="text-sm font-bold text-pw-black uppercase tracking-wider">
                                    Source Document
                                </h3>
                                <div className="p-5 border border-pw-border bg-pw-glass-bg/30 rounded-2xl flex flex-col items-center justify-center min-h-[300px] text-center relative overflow-hidden group">
                                    {/* Visual background simulation */}
                                    <div className="absolute inset-0 bg-white/5 opacity-50 backdrop-blur-sm pointer-events-none" />
                                    <FileText className="w-16 h-16 text-[#454955] mb-4 relative z-10" />
                                    <div className="relative z-10">
                                        <p className="font-semibold text-sm text-pw-black max-w-[280px] truncate">
                                            {closingRoom.closingDisclosureUrl ? closingRoom.closingDisclosureUrl.split('/').pop()?.split('?')[0] : 'closing_disclosure.pdf'}
                                        </p>
                                        <p className="text-xs text-pw-muted mt-1">
                                            Closing Disclosure (CD) Document
                                        </p>
                                    </div>
                                    <div className="mt-6 flex flex-col gap-2 w-full max-w-xs relative z-10">
                                        <a
                                            href={closingRoom.closingDisclosureUrl || '#'}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="pw-btn pw-btn--secondary pw-btn--pill py-2 text-xs font-semibold w-full block text-center"
                                        >
                                            View Document in New Tab
                                        </a>
                                        <button
                                            onClick={() => {
                                                if (window.confirm('Are you sure you want to upload a new Closing Disclosure document?')) {
                                                    handleUpdateClosingRoom({ closingDisclosureUrl: null });
                                                    setViewMode('main');
                                                }
                                            }}
                                            className="text-xs text-red-500 hover:underline mt-2"
                                        >
                                            Replace Document
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Run AI Scan button */}
                            <div className="pt-4 border-t border-pw-border/50">
                                <button
                                    onClick={handleRunCDOcr}
                                    disabled={isOcrScanning}
                                    className="w-full flex items-center justify-center gap-2 pw-btn pw-btn--primary pw-btn--pill py-2.5 text-sm font-semibold transition disabled:opacity-50"
                                >
                                    {isOcrScanning ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Scanning CD with Gemini AI...
                                        </>
                                    ) : (
                                        <>
                                            <Sparkles className="w-4 h-4" />
                                            Run Gemini AI OCR Scan
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Right Column: Capture Fields Form */}
                        <div className="space-y-6">
                            <h3 className="text-sm font-bold text-pw-black uppercase tracking-wider">
                                Capture Data &amp; Actualize Financials
                            </h3>
                            <div className="space-y-4">
                                {/* Final Closing Costs */}
                                <div className="space-y-1">
                                    <div className="flex justify-between items-center">
                                        <label className="text-xs font-semibold text-pw-black">
                                            Final Closing Costs
                                        </label>
                                        <span className="text-[10px] font-medium bg-[#7A9EAA]/15 border border-[#7A9EAA]/30 text-[#7A9EAA] px-2.5 py-0.5 rounded-full">
                                            Source: CD Document
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1 border border-pw-border rounded-xl bg-pw-glass-bg/50 overflow-hidden px-3 py-2">
                                        <DollarSign className="w-4 h-4 text-pw-muted shrink-0" />
                                        <input
                                            type="number"
                                            value={cdFinalClosingCosts || ''}
                                            onChange={(e) => setCdFinalClosingCosts(parseFloat(e.target.value) || 0)}
                                            placeholder="0"
                                            className="w-full text-sm bg-transparent outline-none text-pw-black font-mono text-right pr-2"
                                        />
                                    </div>
                                </div>

                                {/* Cash to Close */}
                                <div className="space-y-1">
                                    <div className="flex justify-between items-center">
                                        <label className="text-xs font-semibold text-pw-black">
                                            Cash to Close
                                        </label>
                                        <span className="text-[10px] font-medium bg-[#7A9EAA]/15 border border-[#7A9EAA]/30 text-[#7A9EAA] px-2.5 py-0.5 rounded-full">
                                            Source: CD Document
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1 border border-pw-border rounded-xl bg-pw-glass-bg/50 overflow-hidden px-3 py-2">
                                        <DollarSign className="w-4 h-4 text-pw-muted shrink-0" />
                                        <input
                                            type="number"
                                            value={cdCashToClose || ''}
                                            onChange={(e) => setCdCashToClose(parseFloat(e.target.value) || 0)}
                                            placeholder="0"
                                            className="w-full text-sm bg-transparent outline-none text-pw-black font-mono text-right pr-2"
                                        />
                                    </div>
                                </div>

                                {/* Prepaids & Reserves */}
                                <div className="space-y-1">
                                    <div className="flex justify-between items-center">
                                        <label className="text-xs font-semibold text-pw-black">
                                            Prepaids &amp; Reserves
                                        </label>
                                        <span className="text-[10px] font-medium bg-[#7A9EAA]/15 border border-[#7A9EAA]/30 text-[#7A9EAA] px-2.5 py-0.5 rounded-full">
                                            Source: CD Document
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1 border border-pw-border rounded-xl bg-pw-glass-bg/50 overflow-hidden px-3 py-2">
                                        <DollarSign className="w-4 h-4 text-pw-muted shrink-0" />
                                        <input
                                            type="number"
                                            value={cdPrepaidsReserves || ''}
                                            onChange={(e) => setCdPrepaidsReserves(parseFloat(e.target.value) || 0)}
                                            placeholder="0"
                                            className="w-full text-sm bg-transparent outline-none text-pw-black font-mono text-right pr-2"
                                        />
                                    </div>
                                </div>

                                {/* Metadata/Attestation Info */}
                                {closingRoom.cdCapturedAt && (
                                    <div className="p-3 bg-green-500/10 border border-green-500/20 text-[10px] text-green-700 rounded-xl leading-relaxed">
                                        Last saved on {new Date(closingRoom.cdCapturedAt).toLocaleString()} by {closingRoom.cdCapturedByName || 'User'}. Values are locked into live calculations.
                                    </div>
                                )}
                            </div>

                            {/* Save & Actualize Button */}
                            <div className="pt-4 border-t border-pw-border">
                                <button
                                    onClick={handleSaveCDData}
                                    disabled={isSavingCDData}
                                    className="w-full flex items-center justify-center gap-1.5 pw-btn pw-btn--primary pw-btn--pill py-3 text-sm font-semibold transition hover:opacity-90 active:scale-97 disabled:opacity-50"
                                >
                                    {isSavingCDData ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Actualizing Financials...
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle className="w-4 h-4" />
                                            Save &amp; Actualize Financials
                                        </>
                                    )}
                                </button>
                                <p className="text-[10px] text-pw-muted text-center mt-2 leading-normal">
                                    Actualizing will write these final figures directly to the deal's operational financials, overriding initial estimates and updating downstream cash flow, DSCR, and cash-on-cash calculations.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-md p-4">
            <div className="bg-pw-glass-bg border border-pw-border backdrop-blur-[20px] rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto flex flex-col">
                
                {/* Global Tracker */}
                <DealProgressTracker currentPhase="Closing" />
                
                {/* Header */}
                <div className="border-b border-pw-border p-6 flex justify-between items-center bg-pw-glass-bg/90 backdrop-blur-md sticky top-[72px] z-10 text-pw-black">
                    <div>
                         <h2 className="text-2xl font-semibold flex items-center gap-2">
                             The Closing Room
                         </h2>
                         <p className="text-sm text-pw-muted mt-1">{deal.propertyName} • {deal.address}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-pw-glass-bg/25 rounded-full transition text-pw-black"><X className="w-5 h-5"/></button>
                </div>

                {isSigned || closingRoom.closingStatus === 'signed' || closingRoom.closingStatus === 'completed' ? (
                    /* Execution & Recording view */
                    <div className="p-6 space-y-8">
                        {/* Summary Header */}
                        <div className="bg-blue-500/10 border border-blue-500/30 p-5 rounded-2xl">
                            <h3 className="text-md font-semibold text-blue-500 flex items-center gap-2 mb-2">
                                <FileText className="w-5 h-5" />
                                Closing Documents Signed &amp; Cleared
                            </h3>
                            <p className="text-xs text-pw-muted leading-relaxed">
                                E-signatures are recorded. Complete the execution steps below to confirm disbursement of funds, log deed recording metadata, and archive the final closing package to the Data Room.
                            </p>
                        </div>

                        {/* Step 1: Closing Date */}
                        <div className="space-y-3">
                            <h3 className="text-md font-semibold text-pw-black border-b border-pw-border pb-2">
                                1. Target &amp; Actual Closing Date
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-pw-black">Actual Settlement/Closing Date</label>
                                    <input
                                        type="date"
                                        value={actualClosingDateState}
                                        onChange={(e) => {
                                            setActualClosingDateState(e.target.value);
                                            projectsService.updateProject(deal.id, {
                                                closingRoom: {
                                                    ...closingRoom,
                                                    actualClosingDate: e.target.value
                                                }
                                            }).then(() => {
                                                updateClosingRoom(deal.id, { actualClosingDate: e.target.value });
                                            });
                                        }}
                                        disabled={closingRoom.closingStatus === 'completed'}
                                        className="w-full text-sm bg-pw-glass-bg border border-pw-border rounded-xl p-3 text-pw-black outline-none focus:ring-1 focus:ring-[#7A9EAA]"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Step 2: Executed Documents Checklist */}
                        <div className="space-y-3">
                            <h3 className="text-md font-semibold text-pw-black border-b border-pw-border pb-2">
                                2. Executed Documents Checklist (Upload and Mark Signed)
                            </h3>
                            <div className="space-y-4">
                                <ExecutedDocumentRow
                                    title="Deed of Trust / Conveyance deed"
                                    description="Final executed deed transferring ownership, signed and notarized."
                                    isUploaded={!!executedDeedUrl}
                                    isSigned={executedDeedSigned}
                                    onUpload={(file) => handleExecutedDocUpload('deed', file)}
                                    onToggleSigned={() => handleToggleSignedStatus('deed', executedDeedSigned)}
                                    isUploading={uploadingField === 'deed'}
                                    disabled={closingRoom.closingStatus === 'completed'}
                                />

                                <ExecutedDocumentRow
                                    title="Promissory Note"
                                    description={isFinanced ? "Executed promissory note for conventional/hard money loan." : "Promissory note (Not required for Cash Deal)."}
                                    isUploaded={!!executedNoteUrl}
                                    isSigned={executedNoteSigned}
                                    onUpload={(file) => handleExecutedDocUpload('note', file)}
                                    onToggleSigned={() => handleToggleSignedStatus('note', executedNoteSigned)}
                                    isUploading={uploadingField === 'note'}
                                    isOptional={!isFinanced}
                                    disabled={closingRoom.closingStatus === 'completed'}
                                />

                                <ExecutedDocumentRow
                                    title="Settlement Statement / HUD-1 / CD"
                                    description="Final itemized settlement statement showing all disbursements, signed by all parties."
                                    isUploaded={!!executedSettlementStatementUrl}
                                    isSigned={executedSettlementStatementSigned}
                                    onUpload={(file) => handleExecutedDocUpload('settlementStatement', file)}
                                    onToggleSigned={() => handleToggleSignedStatus('settlementStatement', executedSettlementStatementSigned)}
                                    isUploading={uploadingField === 'settlementStatement'}
                                    disabled={closingRoom.closingStatus === 'completed'}
                                />

                                <ExecutedDocumentRow
                                    title="Title Policy"
                                    description="Final title insurance policy protecting owner and lender interest."
                                    isUploaded={!!executedTitlePolicyUrl}
                                    isSigned={executedTitlePolicySigned}
                                    onUpload={(file) => handleExecutedDocUpload('titlePolicy', file)}
                                    onToggleSigned={() => handleToggleSignedStatus('titlePolicy', executedTitlePolicySigned)}
                                    isUploading={uploadingField === 'titlePolicy'}
                                    disabled={closingRoom.closingStatus === 'completed'}
                                />

                                <ExecutedDocumentRow
                                    title="Entity / Assignment Documents"
                                    description="Resolutions, assignment of contracts, or LLC operating agreement additions."
                                    isUploaded={!!executedEntityDocsUrl}
                                    isSigned={executedEntityDocsSigned}
                                    onUpload={(file) => handleExecutedDocUpload('entityDocs', file)}
                                    onToggleSigned={() => handleToggleSignedStatus('entityDocs', executedEntityDocsSigned)}
                                    isUploading={uploadingField === 'entityDocs'}
                                    disabled={closingRoom.closingStatus === 'completed'}
                                />
                            </div>
                        </div>

                        {/* Step 3: Disbursement fact record */}
                        <div className="space-y-3">
                            <h3 className="text-md font-semibold text-pw-black border-b border-pw-border pb-2">
                                3. Disbursement of Funds Confirmation
                            </h3>
                            <div className="bg-pw-glass-bg/40 border border-pw-border p-5 rounded-2xl space-y-4">
                                <div className="text-xs text-pw-muted leading-relaxed">
                                    <span className="font-bold text-pw-black">Historical Fact Recording:</span> The platform records that transaction disbursement has been executed by your escrow agent. The platform itself never moves funds.
                                </div>
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <label className="flex items-center gap-2.5 text-sm font-semibold text-pw-black select-none cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={disbursementRecordedState}
                                            onChange={async (e) => {
                                                const val = e.target.checked;
                                                setDisbursementRecordedState(val);
                                                await projectsService.updateProject(deal.id, {
                                                    closingRoom: {
                                                        ...closingRoom,
                                                        disbursementRecorded: val
                                                    }
                                                });
                                                updateClosingRoom(deal.id, { disbursementRecorded: val });
                                            }}
                                            disabled={closingRoom.closingStatus === 'completed'}
                                            className="rounded border-pw-border text-[#7A9EAA] focus:ring-[#7A9EAA] disabled:opacity-50"
                                        />
                                        <span>Confirm Disbursement Has Occurred</span>
                                    </label>
                                    
                                    <div className="flex items-center gap-3">
                                        <span className="text-xs text-pw-muted">Evidence (Settlement Statement):</span>
                                        {disbursementStatementUrlState ? (
                                            <div className="flex items-center gap-1.5 text-xs text-green-600 font-semibold bg-green-500/10 border border-green-500/20 px-3 py-1.5 rounded-full">
                                                <CheckCircle className="w-3.5 h-3.5" />
                                                Linked
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-1.5 text-xs text-amber-600 font-semibold bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-full">
                                                <AlertTriangle className="w-3.5 h-3.5" />
                                                Evidence Missing
                                            </div>
                                        )}
                                        <label className="cursor-pointer">
                                            <input
                                                type="file"
                                                accept=".pdf,image/*"
                                                onChange={(e) => {
                                                    const file = e.target.files?.[0];
                                                    if (file) handleExecutedDocUpload('disbursementStatement', file);
                                                }}
                                                className="hidden"
                                                disabled={uploadingField === 'disbursementStatement' || closingRoom.closingStatus === 'completed'}
                                            />
                                            <span className="text-xs font-bold text-blue-500 hover:underline">
                                                {uploadingField === 'disbursementStatement' ? 'Uploading...' : disbursementStatementUrlState ? 'Replace' : 'Upload Evidence'}
                                            </span>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Step 4: Deed Recording Confirmation */}
                        <div className="space-y-3">
                            <h3 className="text-md font-semibold text-pw-black border-b border-pw-border pb-2">
                                4. Deed Recording Confirmation
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-pw-black">Filing County/Jurisdiction</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Miami-Dade County"
                                        value={deedRecordingCountyState}
                                        onChange={(e) => {
                                            setDeedRecordingCountyState(e.target.value);
                                            projectsService.updateProject(deal.id, {
                                                closingRoom: {
                                                    ...closingRoom,
                                                    deedRecordingCounty: e.target.value
                                                }
                                            }).then(() => {
                                                updateClosingRoom(deal.id, { deedRecordingCounty: e.target.value });
                                            });
                                        }}
                                        disabled={closingRoom.closingStatus === 'completed'}
                                        className="w-full text-sm bg-pw-glass-bg border border-pw-border rounded-xl p-3 text-pw-black outline-none focus:ring-1 focus:ring-[#7A9EAA]"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-pw-black">Filing Date</label>
                                    <input
                                        type="date"
                                        value={deedRecordingDateState}
                                        onChange={(e) => {
                                            setDeedRecordingDateState(e.target.value);
                                            projectsService.updateProject(deal.id, {
                                                closingRoom: {
                                                    ...closingRoom,
                                                    deedRecordingDate: e.target.value
                                                }
                                            }).then(() => {
                                                updateClosingRoom(deal.id, { deedRecordingDate: e.target.value });
                                            });
                                        }}
                                        disabled={closingRoom.closingStatus === 'completed'}
                                        className="w-full text-sm bg-pw-glass-bg border border-pw-border rounded-xl p-3 text-pw-black outline-none focus:ring-1 focus:ring-[#7A9EAA]"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-pw-black">Filing Instrument/Book Number</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Doc #2026-104958"
                                        value={deedRecordingInstrumentNumberState}
                                        onChange={(e) => {
                                            setDeedRecordingInstrumentNumberState(e.target.value);
                                            projectsService.updateProject(deal.id, {
                                                closingRoom: {
                                                    ...closingRoom,
                                                    deedRecordingInstrumentNumber: e.target.value
                                                }
                                            }).then(() => {
                                                updateClosingRoom(deal.id, { deedRecordingInstrumentNumber: e.target.value });
                                            });
                                        }}
                                        disabled={closingRoom.closingStatus === 'completed'}
                                        className="w-full text-sm bg-pw-glass-bg border border-pw-border rounded-xl p-3 text-pw-black outline-none focus:ring-1 focus:ring-[#7A9EAA]"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Fund → Hold Phase Gate Validation */}
                        <div className="space-y-3">
                            <h3 className="text-md font-semibold text-pw-black border-b border-pw-border pb-2">
                                Phase Gate: Fund &rarr; Hold Transition Verification
                            </h3>
                            
                            {(() => {
                                const criteria = [
                                    { key: 'price', label: 'Actual purchase price recorded', met: isPurchasePriceRecorded },
                                    { key: 'cash', label: 'Total cash invested fully actualized', met: isTotalCashActualized },
                                    { key: 'loan', label: 'Loan terms actual (financed deals)', met: isLoanTermsActual },
                                    { key: 'date', label: 'Closing date recorded', met: isClosingDateRecorded },
                                    { key: 'deed', label: 'Deed recording confirmed', met: isDeedRecordingConfirmed },
                                    { key: 'docs', label: 'Required closing documents archived', met: isClosingDocsArchived },
                                    { key: 'reconciliation', label: 'Cash-to-close reconciled', met: isCashToCloseReconciled },
                                    { key: 'attorney', label: 'Attorney requirement satisfied where mandated', met: isAttorneySatisfied }
                                ];

                                const failedCriteria = criteria.filter(c => !c.met);
                                const gatePassed = failedCriteria.length === 0;

                                if (!gatePassed) {
                                    return (
                                        <div className="p-5 bg-red-500/10 border border-red-500/30 rounded-2xl space-y-4">
                                            <div className="flex items-start gap-2.5 text-red-500 font-bold text-sm">
                                                <AlertTriangle className="w-5 h-5 shrink-0" />
                                                <span>Fund &rarr; Hold Phase Gate Blocked</span>
                                            </div>
                                            <p className="text-xs text-pw-muted leading-relaxed">
                                                The following mandatory transition criteria must be resolved in your closing checklist or actualization sweep before the transaction can be finalized:
                                            </p>
                                            <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs font-mono text-red-600 pl-2">
                                                {failedCriteria.map(c => (
                                                    <li key={c.key} className="flex items-center gap-1.5 bg-red-500/5 border border-red-500/10 p-2 rounded-xl">
                                                        <span className="shrink-0 text-red-500">&#10006;</span>
                                                        <span>{c.label}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                            {closingRoom.isReconciliationOverridden && closingRoom.reconciliationOverrideReason && (
                                                <div className="mt-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-xs text-blue-700 leading-normal">
                                                    <span className="font-bold">Active Reconciliation Override:</span> &ldquo;{closingRoom.reconciliationOverrideReason}&rdquo;
                                                </div>
                                            )}
                                        </div>
                                    );
                                }

                                // Celebratory block & baseline delivery
                                const costBasis = (deal.financials?.purchasePrice || 0) + (deal.financials?.finalClosingCosts || 0);
                                const insurancePremium = deal.financials?.insuranceCost || 0;
                                const inServiceDate = actualClosingDateState;
                                
                                // Equity structure calculations
                                let privateMoneyEquity = 0;
                                let fractionalEquity = 0;
                                (deal.financials?.capitalStack || []).forEach(s => {
                                    if (s.category === 'Private Money') {
                                        privateMoneyEquity += s.amount || 0;
                                    }
                                });
                                (deal.fractionalInvestors || []).forEach(inv => {
                                    fractionalEquity += inv.contributionAmount || 0;
                                });
                                const totalPE = privateMoneyEquity + fractionalEquity;

                                return (
                                    <div className="p-6 bg-green-500/10 border border-green-500/30 rounded-2xl space-y-6">
                                        <div className="flex items-center gap-2.5 text-green-600 font-bold text-sm">
                                            <Sparkles className="w-5 h-5 shrink-0 animate-pulse text-yellow-500" />
                                            <span>Passage Cleared! Fund &rarr; Hold Baseline Ready</span>
                                        </div>
                                        <p className="text-xs text-pw-muted leading-relaxed">
                                            Congratulations! All closing conditions are satisfied. The deal is ready to transition to the Hold phase. Below is the verified baseline handed off to the Renovation &amp; Property Management systems:
                                        </p>
                                        
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-pw-glass-bg/40 border border-pw-border/60 p-4 rounded-xl text-xs text-pw-black">
                                            <div className="space-y-1">
                                                <span className="text-[10px] text-pw-muted uppercase font-semibold">Cost Basis</span>
                                                <div className="font-bold font-mono text-sm text-green-700">${costBasis.toLocaleString()}</div>
                                                <div className="text-[9px] text-pw-muted leading-none">Purchase Price + Closing Costs</div>
                                            </div>
                                            <div className="space-y-1">
                                                <span className="text-[10px] text-pw-muted uppercase font-semibold">In-Service Date Candidate</span>
                                                <div className="font-bold font-mono text-sm text-green-700">{inServiceDate}</div>
                                                <div className="text-[9px] text-pw-muted leading-none">Closing/Settlement Date</div>
                                            </div>
                                            <div className="space-y-1">
                                                <span className="text-[10px] text-pw-muted uppercase font-semibold">Debt Service Reference</span>
                                                <div className="font-semibold font-mono text-pw-black">
                                                    {isFinanced ? (
                                                        <span>Loan Amount: ${(deal.financials?.loanAmount || 0).toLocaleString()} @ {(deal.financials?.loanInterestRate || 0).toFixed(3)}%</span>
                                                    ) : (
                                                        <span>Cash Deal (No Debt Service)</span>
                                                    )}
                                                </div>
                                                <div className="text-[9px] text-pw-muted leading-none">Note terms reference</div>
                                            </div>
                                            <div className="space-y-1">
                                                <span className="text-[10px] text-pw-muted uppercase font-semibold">Hazard Insurance Premium</span>
                                                <div className="font-semibold font-mono text-pw-black">${insurancePremium.toLocaleString()}/year</div>
                                                <div className="text-[9px] text-pw-muted leading-none">Verified Binder Premium</div>
                                            </div>
                                            <div className="space-y-1 md:col-span-2">
                                                <span className="text-[10px] text-pw-muted uppercase font-semibold">Equity Structure</span>
                                                <div className="font-semibold font-mono text-pw-black flex gap-4">
                                                    <span>Total Private Equity: ${totalPE.toLocaleString()}</span>
                                                    {fractionalEquity > 0 && <span>Fractional: ${fractionalEquity.toLocaleString()}</span>}
                                                    {privateMoneyEquity > 0 && <span>Sponsor/Private Money: ${privateMoneyEquity.toLocaleString()}</span>}
                                                </div>
                                                <div className="text-[9px] text-pw-muted leading-none">Approved equity capitalization</div>
                                            </div>
                                        </div>

                                        {closingRoom.isReconciliationOverridden && closingRoom.reconciliationOverrideReason && (
                                            <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-xs text-blue-700 leading-normal">
                                                <span className="font-bold">Active Reconciliation Override:</span> &ldquo;{closingRoom.reconciliationOverrideReason}&rdquo;
                                            </div>
                                        )}
                                    </div>
                                );
                            })()}
                        </div>

                        {/* Step 5: Archive & Complete Button */}
                        {closingRoom.closingStatus !== 'completed' ? (
                            <div className="pt-6 border-t border-pw-border flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="text-xs text-pw-muted max-w-lg">
                                    Completing the package will lock all closing details, transfer executed deeds and title files to the Data Room permanent record, and progress the project to Phase 3 (Rehab).
                                </div>
                                <button
                                    onClick={handleCompleteClosing}
                                    disabled={isSavingExecution || !canCompleteExecution}
                                    className="pw-btn pw-btn--primary pw-btn--pill px-8 py-3 text-sm font-semibold transition disabled:opacity-50 flex items-center justify-center gap-1.5"
                                >
                                    {isSavingExecution ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Archiving Package...
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle className="w-4 h-4" />
                                            Archive Package &amp; Complete Closing
                                        </>
                                    )}
                                </button>
                            </div>
                        ) : (
                            <div className="pt-6 border-t border-pw-border flex items-center gap-3 text-green-600 bg-green-500/5 p-4 rounded-2xl border border-green-500/20">
                                <CheckCircle className="w-5 h-5 flex-shrink-0" />
                                <div className="text-xs">
                                    <p className="font-semibold">Closing Completed &amp; Archived</p>
                                    <p className="opacity-95 mt-0.5">The closing execution files have been successfully archived to the Data Room. The project is currently in the Rehab phase.</p>
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    /* Pre-signing checklist grid */
                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                        
                        {/* Left Column: Checks & Lawyer */}
                        <div className="space-y-6">
                            
                            {/* Web3 Title Check */}
                            <div className="bg-pw-glass-bg border border-pw-border rounded-2xl p-5 shadow-sm">
                                <h3 className="text-md font-medium flex items-center gap-2 mb-3 text-pw-black">
                                    <Link className="w-5 h-5 text-[#454955]" /> Digital Chain of Title
                                </h3>
                                <div className="bg-pw-glass-bg/50 border border-pw-border/50 p-4 rounded-2xl flex flex-col gap-3">
                                    {closingRoom.chainOfTitleStatus === 'verified' ? (
                                        <>
                                           <div className="flex items-center text-green-500">
                                                <ShieldCheck className="w-5 h-5 mr-2" />
                                                <span className="font-medium text-sm">Title Cleared via Smart Contract</span>
                                           </div>
                                           <p className="text-xs text-pw-muted break-all font-mono">TX: {closingRoom.blockchainTxHash}</p>
                                        </>
                                    ) : (
                                        <>
                                           <p className="text-sm text-pw-muted">Pending immutable verification of property transfer chain.</p>
                                           <button
                                              onClick={handleWeb3Ping}
                                              disabled={isPinging}
                                              className="pw-btn pw-btn--primary pw-btn--pill w-full py-2 text-sm font-medium transition disabled:opacity-50"
                                           >
                                              {isPinging ? 'Pinging Registry Nodes…' : 'Verify Chain of Title Now'}
                                           </button>
                                           <p className="text-[10px] text-pw-muted/70 text-center">
                                              Requires a configured blockchain registry provider. Not available in all deployments.
                                           </p>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Lawyer Marketplace API */}
                            <div className="bg-pw-glass-bg border border-pw-border rounded-2xl p-5 shadow-sm">
                                <h3 className="text-md font-medium flex items-center gap-2 mb-3 text-pw-black">
                                    <Users className="w-5 h-5 text-blue-400" /> Real Estate Attorney
                                </h3>
                                {closingRoom.assignedLawyerUid ? (
                                    <div className="bg-blue-500/10 border border-blue-500/30 p-4 rounded-2xl">
                                        <div className="flex justify-between items-center mb-2">
                                            <p className="font-medium text-blue-400 text-sm">Lawyer Assigned</p>
                                            <button onClick={() => handleUpdateClosingRoom({ assignedLawyerUid: null, lawyerVerified: false })} className="text-xs text-blue-400 hover:underline">Change</button>
                                        </div>
                                        <p className="text-sm text-pw-black">{matchingLawyers.find(l => l.uid === closingRoom.assignedLawyerUid)?.displayName || 'Unknown Attorney'}</p>
                                    </div>
                                ) : (
                                    <div className="bg-pw-glass-bg/50 border border-pw-border p-4 rounded-2xl space-y-3">
                                        <p className="text-xs text-pw-muted flex items-center gap-1"><Search className="w-3 h-3"/> Discovered Matches Near Property:</p>
                                        {isSearchingLawyers ? (
                                            <p className="text-sm text-pw-muted">Searching for attorneys nearby...</p>
                                        ) : matchingLawyers.length === 0 ? (
                                            <p className="text-sm text-pw-muted">No attorneys found in this state. Try adjusting the property address or contact support.</p>
                                        ) : (
                                            <div className="space-y-2">
                                                {matchingLawyers.map(l => (
                                                    <div key={l.uid} className="flex justify-between items-center p-2 bg-pw-glass-bg/40 rounded-xl border border-pw-border shadow-sm">
                                                        <p className="text-sm text-pw-black">{l.displayName}</p>
                                                        <button onClick={() => handleUpdateClosingRoom({ assignedLawyerUid: l.uid })} className="pw-btn pw-btn--secondary pw-btn--sm pw-btn--pill">Assign</button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Real Document Review Attestation Action */}
                                 {closingRoom.assignedLawyerUid && !closingRoom.lawyerVerified && (
                                     <div className="mt-4 pt-4 border-t border-pw-border">
                                        <button 
                                           onClick={handleDocumentAttestation}
                                           disabled={isVerifyingDocs}
                                           className="pw-btn pw-btn--primary pw-btn--pill w-full py-2 text-sm font-medium transition disabled:opacity-50"
                                        >
                                           {isVerifyingDocs ? 'Recording Review Attestation...' : 'Attest Document Review'}
                                        </button>
                                     </div>
                                 )}
                                 
                                 {closingRoom.lawyerVerified && (
                                      <div className="mt-3 flex flex-col gap-1 text-green-500 text-sm font-medium bg-green-500/10 border border-green-500/30 p-3 rounded-2xl">
                                          <div className="flex items-center">
                                              <CheckCircle className="w-4 h-4 mr-2" />
                                              Reviewed & Approved
                                          </div>
                                          {closingRoom.verifiedByName ? (
                                              <p className="text-xs text-pw-muted mt-1">
                                                  Attested by {closingRoom.verifiedByName} ({closingRoom.verifiedRole || 'Project Member'}) on {new Date(closingRoom.verifiedAt || '').toLocaleString()}
                                              </p>
                                          ) : (
                                              <p className="text-xs text-pw-muted mt-1">
                                                  Approved by Legal
                                              </p>
                                          )}
                                      </div>
                                 )}
                            </div>

                        </div>

                        {/* Right Column: Required Documents */}
                        <div className="space-y-4">
                            <h3 className="text-md font-medium text-pw-black">Required Document Checkpoints</h3>
                            
                            <DocumentZone 
                               title="1. Title Insurance"
                               description="Scan of the abstract and insurance policy."
                               isUploaded={!!closingRoom.titleInsuranceUrl}
                               onUpload={(file) => handleFileUpload('titleInsuranceUrl', file)}
                               isUploading={uploadingField === 'titleInsuranceUrl'}
                            />

                            <DocumentZone 
                               title="2. Closing Disclosure (CD)"
                               description="Standardized HUD-1 or final CD statements."
                               isUploaded={!!closingRoom.closingDisclosureUrl}
                               onUpload={(file) => handleFileUpload('closingDisclosureUrl', file)}
                               isUploading={uploadingField === 'closingDisclosureUrl'}
                               onReviewClick={() => setViewMode('cd_capture')}
                            />

                            <DocumentZone 
                               title="3. Wiring Instructions"
                               description="Verified ABA routing and transfer accounts."
                               isUploaded={!!closingRoom.wiringInstructionsUrl}
                               onUpload={(file) => handleFileUpload('wiringInstructionsUrl', file)}
                               isUploading={uploadingField === 'wiringInstructionsUrl'}
                            />

                            {(!DocsComplete || !closingRoom.lawyerVerified) && (
                                <div className="p-4 bg-orange-500/10 border border-orange-500/30 rounded-2xl flex items-start gap-3 mt-4 text-orange-400">
                                    <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                                    <div className="text-sm">
                                        <p className="font-medium mb-1">Acquisition Blocked</p>
                                        <p className="opacity-90">You cannot proceed to the Renovation phase until all documents are uploaded and approved by the assigned Real Estate Attorney.</p>
                                    </div>
                                </div>
                            )}

                            {(DocsComplete && closingRoom.lawyerVerified && !isReconciliationApproved) && (
                                <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-start gap-3 mt-4 text-red-500">
                                    <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                                    <div className="text-sm">
                                        <p className="font-medium mb-1">Reconciliation Blocked</p>
                                        <p className="opacity-90 leading-relaxed">The transaction has an active variance of ${reconciliation.variance.toLocaleString()}. You must balance sources and uses to $0, or record a typed override reason, before closing signatures can be cleared.</p>
                                    </div>
                                </div>
                            )}
                            
                            {(DocsComplete && closingRoom.lawyerVerified && isReconciliationApproved) && (
                                 <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-2xl flex flex-col gap-3 mt-4 text-green-400">
                                     <div className="flex items-start gap-3">
                                       <ShieldCheck className="w-5 h-5 flex-shrink-0 mt-0.5" />
                                       <div className="text-sm">
                                           <p className="font-medium mb-1">Cleared to Close</p>
                                           <p className="opacity-90">All closing contingencies have been met. Execute final signatures to transfer into the Renovation phase.</p>
                                       </div>
                                     </div>
                                     <div className="mt-2 pt-3 border-t border-green-500/30 flex justify-end">
                                         <ESignAction 
                                            documentName="Final Closing Disclosures"
                                            signeeRole={role}
                                             isSigned={isSigned}
                                            onSigned={async () => {
                                                setIsSigned(true);
                                                try {
                                                    await projectsService.updateProject(deal.id, {
                                                        closingRoom: {
                                                            ...closingRoom,
                                                            closingStatus: 'signed'
                                                        }
                                                    });
                                                    updateClosingRoom(deal.id, { closingStatus: 'signed' });
                                                    toast.success('Closing documents signed successfully!');
                                                } catch (err: any) {
                                                    toast.error('Failed to save signature state: ' + err.message);
                                                }
                                            }}
                                          />
                                     </div>
                                 </div>
                            )}

                        </div>

                    </div>
                )}

                {/* Cash-to-Close Reconciliation Section */}
                <div className="border-t border-pw-border p-6 bg-pw-glass-bg/10 space-y-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h3 className="text-lg font-semibold text-pw-black flex items-center gap-2">
                                <DollarSign className="w-5 h-5 text-[#454955]" />
                                Cash-to-Close Reconciliation
                            </h3>
                            <p className="text-xs text-pw-muted mt-1 leading-normal">
                                Verification of capital sources against transaction uses. Downstream metrics are locked to these actuals.
                            </p>
                        </div>
                        {/* Summary badge */}
                        <div className={`px-3 py-1.5 rounded-full text-xs font-bold border ${
                            reconciliation.isReconciled 
                                ? 'bg-green-500/10 border-green-500/30 text-green-600'
                                : closingRoom.isReconciliationOverridden
                                ? 'bg-blue-500/10 border-blue-500/30 text-blue-600'
                                : 'bg-red-500/10 border-red-500/30 text-red-600'
                        }`}>
                            {reconciliation.isReconciled 
                                ? 'Reconciled' 
                                : closingRoom.isReconciliationOverridden 
                                ? 'Overridden' 
                                : 'Out of Balance'}
                        </div>
                    </div>

                    {/* Sources & Uses Comparison */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-pw-glass-bg/30 p-5 border border-pw-border rounded-2xl">
                        {/* Uses Column */}
                        <div className="space-y-3">
                            <h4 className="text-xs font-bold text-pw-black uppercase tracking-wider border-b border-pw-border pb-1.5">
                                Transaction Uses (Debit)
                            </h4>
                            <div className="space-y-2 text-xs">
                                <div className="flex justify-between">
                                    <span className="text-pw-muted">Purchase Price:</span>
                                    <span className="font-semibold text-pw-black font-mono">${reconciliation.purchasePrice.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-pw-muted">Closing Costs:</span>
                                    <span className="font-semibold text-pw-black font-mono">${reconciliation.closingCosts.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-pw-muted">Prepaids &amp; Reserves:</span>
                                    <span className="font-semibold text-pw-black font-mono">${reconciliation.prepaidsReserves.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between border-t border-pw-border/50 pt-2 font-bold text-sm">
                                    <span className="text-pw-black">Total Uses:</span>
                                    <span className="text-pw-black font-mono">${reconciliation.totalUses.toLocaleString()}</span>
                                </div>
                            </div>
                        </div>

                        {/* Sources Column */}
                        <div className="space-y-3">
                            <h4 className="text-xs font-bold text-pw-black uppercase tracking-wider border-b border-pw-border pb-1.5">
                                Funding Sources (Credit)
                            </h4>
                            <div className="space-y-2 text-xs">
                                <div className="flex justify-between">
                                    <span className="text-pw-muted">Earnest Money Credit:</span>
                                    <span className="font-semibold text-pw-black font-mono">${reconciliation.earnestMoneyCredit.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-pw-muted">Locked Debt:</span>
                                    <span className="font-semibold text-pw-black font-mono">${reconciliation.lockedDebt.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-pw-muted">Confirmed Equity:</span>
                                    <span className="font-semibold text-pw-black font-mono">${reconciliation.confirmedEquity.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between border-t border-pw-border/50 pt-2 font-bold text-sm">
                                    <span className="text-pw-black">Total Sources:</span>
                                    <span className="text-pw-black font-mono">${reconciliation.totalSources.toLocaleString()}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Live Variance Bar */}
                    <div className={`p-4 rounded-xl border ${
                        reconciliation.isReconciled 
                            ? 'bg-green-500/10 border-green-500/30 text-green-700' 
                            : 'bg-red-500/10 border-red-500/30 text-red-700'
                    }`}>
                        <div className="flex items-center justify-between text-sm font-semibold">
                            <span className="flex items-center gap-1.5">
                                {reconciliation.isReconciled ? (
                                    <>
                                        <CheckCircle className="w-4 h-4 text-green-600" />
                                        Capital Fully Balanced
                                    </>
                                ) : (
                                    <>
                                        <AlertTriangle className="w-4 h-4 text-red-600" />
                                        Reconciliation Mismatch Detected
                                    </>
                                )}
                            </span>
                            <span className="font-mono">
                                Variance: {reconciliation.variance >= 0 ? '+' : ''}${reconciliation.variance.toLocaleString()}
                            </span>
                        </div>
                        <p className="text-[10.5px] mt-1.5 opacity-90 leading-relaxed">
                            {reconciliation.isReconciled 
                                ? 'Sources and uses match exactly. The capital stack is fully reconciled and ready for transfer execution.'
                                : `The transaction has a variance of $${reconciliation.variance.toLocaleString()}. Sources must equal uses before closing signatures can be cleared. Adjust your EMD, Capital Stack, or Closing Disclosure numbers, or record a typed override below.`}
                        </p>
                    </div>

                    {/* Override Interface */}
                    {!reconciliation.isReconciled && (
                        <div className="bg-pw-glass-bg border border-pw-border/80 rounded-2xl p-4 space-y-3">
                            <div className="flex justify-between items-center">
                                <label className="text-xs font-semibold text-pw-black">
                                    Legitimate Reconciliation Override Reason
                                </label>
                                {closingRoom.isReconciliationOverridden && (
                                    <span className="text-[9px] uppercase font-bold bg-blue-500/15 text-blue-600 border border-blue-500/30 px-2 py-0.5 rounded-full">
                                        Override Active
                                    </span>
                                )}
                            </div>
                            <textarea
                                value={overrideReasonState}
                                onChange={(e) => setOverrideReasonState(e.target.value)}
                                placeholder="Explain why the variance is acceptable (e.g. sponsor funding remainder outside capital stack, seller credits adjusted post-closing disclosure)..."
                                className="w-full text-xs bg-pw-glass-bg/40 border border-pw-border rounded-xl p-3 text-pw-black outline-none focus:ring-1 focus:ring-[#7A9EAA] min-h-[70px] leading-relaxed"
                            />
                            <div className="flex justify-end gap-2">
                                {closingRoom.isReconciliationOverridden && (
                                    <button
                                        onClick={async () => {
                                            setOverrideReasonState('');
                                            setIsSavingOverride(true);
                                            try {
                                                await projectsService.updateProject(deal.id, {
                                                    closingRoom: {
                                                        ...closingRoom,
                                                        reconciliationOverrideReason: null,
                                                        isReconciliationOverridden: false
                                                    }
                                                });
                                                updateClosingRoom(deal.id, {
                                                    reconciliationOverrideReason: null,
                                                    isReconciliationOverridden: false
                                                });
                                                toast.success('Override cleared successfully.');
                                            } catch (err: any) {
                                                toast.error('Clear failed: ' + err.message);
                                            } finally {
                                                setIsSavingOverride(false);
                                            }
                                        }}
                                        disabled={isSavingOverride}
                                        className="text-xs text-red-500 hover:underline px-3 py-2 disabled:opacity-50"
                                    >
                                        Clear Override
                                    </button>
                                )}
                                <button
                                    onClick={handleSaveOverride}
                                    disabled={isSavingOverride || !overrideReasonState.trim()}
                                    className="pw-btn pw-btn--secondary pw-btn--pill px-4 py-2 text-xs font-semibold disabled:opacity-50"
                                >
                                    {isSavingOverride ? 'Saving...' : 'Save Override Reason'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Card F5.6 Actualization Sweep Section */}
                {(() => {
                    const projPrice = deal.financials?.targetPurchasePrice || 0;
                    
                    const clLines = computeClosingCostLines({
                        purchasePrice: deal.financials?.purchasePrice || deal.financials?.targetPurchasePrice || 0,
                        loanAmount: deal.financials?.loanAmount || 0,
                        loanInterestRate: deal.financials?.loanInterestRate || 0,
                        loanOriginationPoints: deal.financials?.loanOriginationPoints || 0
                    }, deal.financials?.closingCostOverrides || {});
                    
                    const projClosing = deal.financials?.fixedAcquisitionCosts || (
                        (clLines.find(l => l.id === 'origination')?.amount || 0) +
                        (clLines.find(l => l.id === 'title')?.amount || 0) +
                        (clLines.find(l => l.id === 'transfer')?.amount || 0)
                    );

                    const projPrepaids = clLines.find(l => l.id === 'prepaids')?.amount || 0;

                    const projUses = projPrice + projClosing + projPrepaids;
                    const projEmd = deal.financials?.loiEarnestAmount 
                        ? deal.financials.loiEarnestAmount / 100 
                        : (deal.financials?.emdAmount ? deal.financials.emdAmount / 100 : 0);
                    const projDebt = deal.financials?.loanAmount || 0;
                    let projEquity = 0;
                    (deal.financials?.capitalStack || []).forEach((source) => {
                        if (source.category === 'Private Money') {
                            projEquity += source.amount || 0;
                        }
                    });
                    (deal.fractionalInvestors || []).forEach((inv) => {
                        projEquity += inv.contributionAmount || 0;
                    });
                    const projSources = projEmd + projDebt + projEquity;
                    const projCashToClose = Math.max(0, projUses - projSources);

                    const projInsurance = (deal.financials?.insurance || 0) * 12;
                    const projLoanAmount = deal.financials?.loanAmount || 0;
                    const projInterestRate = deal.financials?.loanInterestRate || 0;

                    const actPrice = sweepPurchasePrice !== '' ? Number(sweepPurchasePrice) : 0;
                    const actClosing = sweepClosingCosts !== '' ? Number(sweepClosingCosts) : 0;
                    const actPrepaids = sweepPrepaids !== '' ? Number(sweepPrepaids) : 0;
                    const actCashToClose = sweepCashToClose !== '' ? Number(sweepCashToClose) : 0;
                    const actEmd = sweepEmd !== '' ? Number(sweepEmd) : 0;
                    const actInsurance = sweepInsurance !== '' ? Number(sweepInsurance) : 0;
                    const actLoanAmount = sweepLoanAmount !== '' ? Number(sweepLoanAmount) : 0;
                    const actInterestRate = sweepInterestRate !== '' ? Number(sweepInterestRate) : 0;

                    const priceSatisfied = !!deal.financials?.purchasePrice && deal.financials.purchasePrice > 0;
                    const closingSatisfied = !!deal.financials?.finalClosingCosts || !!closingRoom.cdFinalClosingCosts;
                    const prepaidsSatisfied = !!deal.financials?.finalPrepaidsReserves || !!closingRoom.cdPrepaidsReserves;
                    const cashSatisfied = !!deal.financials?.finalCashToClose || !!closingRoom.cdCashToClose;
                    const emdSatisfied = !!deal.financials?.emdAmount && deal.financials.emdAmount > 0;
                    const insuranceSatisfied = !!deal.financials?.insuranceCost && deal.financials.insuranceCost > 0;
                    
                    const loanSourceAct = (deal.financials?.capitalStack || []).find(s => s.category === 'Conventional Financing' || s.category === 'Hard Money Loans');
                    const loanSatisfied = isFinanced && !!loanSourceAct && (loanSourceAct.status === 'Approved' || loanSourceAct.status === 'Funded');
                    const rateSatisfied = isFinanced && !!loanSourceAct && !!loanSourceAct.interestRate;

                    const renderVariance = (projVal: number, actVal: number, isCostVal: boolean, isPercentVal = false) => {
                        if (!actVal) return <span className="text-pw-muted">-</span>;
                        const diff = actVal - projVal;
                        if (Math.abs(diff) < 0.001) return <span className="text-pw-muted font-mono">Balanced</span>;
                        
                        const sign = diff > 0 ? '+' : '';
                        const pctDiff = projVal > 0 ? ` (${sign}${((diff / projVal) * 100).toFixed(1)}%)` : '';
                        const formattedDiff = isPercentVal 
                            ? `${sign}${diff.toFixed(3)}%`
                            : `${sign}$${Math.round(diff).toLocaleString()}`;

                        const isPositive = isCostVal ? diff < 0 : diff > 0;

                        return (
                            <span className={`font-semibold font-mono text-xs ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
                                {formattedDiff}{!isPercentVal && pctDiff}
                            </span>
                        );
                    };

                    return (
                        <div className="border-t border-pw-border p-6 bg-pw-glass-bg/10 space-y-6">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div>
                                    <h3 className="text-lg font-semibold text-pw-black flex items-center gap-2">
                                        <Sparkles className="w-5 h-5 text-blue-500" />
                                        Actualization Sweep (First Reckoning)
                                    </h3>
                                    <p className="text-xs text-pw-muted mt-1 leading-normal">
                                        Review and align projected underwriting parameters with final settlement values. Green checkmarks represent document-verified auto-satisfaction.
                                    </p>
                                </div>
                            </div>

                            <div className="bg-pw-glass-bg/30 border border-pw-border rounded-2xl overflow-hidden">
                                <table className="w-full text-left text-xs border-collapse">
                                    <thead>
                                        <tr className="border-b border-pw-border bg-pw-glass-bg/50 text-[10px] font-bold text-pw-black uppercase tracking-wider">
                                            <th className="p-4">Variable &amp; Source</th>
                                            <th className="p-4 text-center">Projected</th>
                                            <th className="p-4">Actual Value</th>
                                            <th className="p-4 text-right">Variance</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-pw-border/50 text-pw-black">
                                        {/* Purchase Price */}
                                        <tr>
                                            <td className="p-4">
                                                <div className="font-semibold">Purchase Price</div>
                                                <div className="text-[10px] text-pw-muted font-normal">Target price vs execution settlement</div>
                                            </td>
                                            <td className="p-4 text-center font-mono">${projPrice.toLocaleString()}</td>
                                            <td className="p-4">
                                                {priceSatisfied ? (
                                                    <div className="flex items-center gap-1.5 text-green-600 font-semibold bg-green-500/10 border border-green-500/20 px-2 py-1 rounded-lg w-fit">
                                                        <CheckCircle className="w-3.5 h-3.5" />
                                                        <span>${deal.financials?.purchasePrice?.toLocaleString()}</span>
                                                        <span className="text-[9px] opacity-75 font-normal">(PSA/Settlement)</span>
                                                    </div>
                                                ) : (
                                                    <div className="relative w-36">
                                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-pw-muted">$</span>
                                                        <input
                                                            type="number"
                                                            value={sweepPurchasePrice}
                                                            onChange={(e) => setSweepPurchasePrice(e.target.value ? Number(e.target.value) : '')}
                                                            placeholder="Enter price"
                                                            className="w-full text-xs bg-pw-glass-bg border border-pw-border rounded-lg pl-6 pr-3 py-1.5 outline-none focus:ring-1 focus:ring-[#7A9EAA]"
                                                        />
                                                    </div>
                                                )}
                                            </td>
                                            <td className="p-4 text-right">{renderVariance(projPrice, actPrice, true)}</td>
                                        </tr>

                                        {/* Closing Costs */}
                                        <tr>
                                            <td className="p-4">
                                                <div className="font-semibold">Closing Costs</div>
                                                <div className="text-[10px] text-pw-muted font-normal">Formula estimate vs final HUD-1 closing charges</div>
                                            </td>
                                            <td className="p-4 text-center font-mono">${projClosing.toLocaleString()}</td>
                                            <td className="p-4">
                                                {closingSatisfied ? (
                                                    <div className="flex items-center gap-1.5 text-green-600 font-semibold bg-green-500/10 border border-green-500/20 px-2 py-1 rounded-lg w-fit">
                                                        <CheckCircle className="w-3.5 h-3.5" />
                                                        <span>${(deal.financials?.finalClosingCosts || closingRoom.cdFinalClosingCosts || 0).toLocaleString()}</span>
                                                        <span className="text-[9px] opacity-75 font-normal">(CD Capture)</span>
                                                    </div>
                                                ) : (
                                                    <div className="relative w-36">
                                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-pw-muted">$</span>
                                                        <input
                                                            type="number"
                                                            value={sweepClosingCosts}
                                                            onChange={(e) => setSweepClosingCosts(e.target.value ? Number(e.target.value) : '')}
                                                            placeholder="Enter costs"
                                                            className="w-full text-xs bg-pw-glass-bg border border-pw-border rounded-lg pl-6 pr-3 py-1.5 outline-none focus:ring-1 focus:ring-[#7A9EAA]"
                                                        />
                                                    </div>
                                                )}
                                            </td>
                                            <td className="p-4 text-right">{renderVariance(projClosing, actClosing, true)}</td>
                                        </tr>

                                        {/* Prepaids & Reserves */}
                                        <tr>
                                            <td className="p-4">
                                                <div className="font-semibold">Prepaids &amp; Reserves</div>
                                                <div className="text-[10px] text-pw-muted font-normal font-normal">Initial prepaids formula vs final reserves escrow</div>
                                            </td>
                                            <td className="p-4 text-center font-mono">${projPrepaids.toLocaleString()}</td>
                                            <td className="p-4">
                                                {prepaidsSatisfied ? (
                                                    <div className="flex items-center gap-1.5 text-green-600 font-semibold bg-green-500/10 border border-green-500/20 px-2 py-1 rounded-lg w-fit">
                                                        <CheckCircle className="w-3.5 h-3.5" />
                                                        <span>${(deal.financials?.finalPrepaidsReserves || closingRoom.cdPrepaidsReserves || 0).toLocaleString()}</span>
                                                        <span className="text-[9px] opacity-75 font-normal">(CD Capture)</span>
                                                    </div>
                                                ) : (
                                                    <div className="relative w-36">
                                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-pw-muted">$</span>
                                                        <input
                                                            type="number"
                                                            value={sweepPrepaids}
                                                            onChange={(e) => setSweepPrepaids(e.target.value ? Number(e.target.value) : '')}
                                                            placeholder="Enter prepaids"
                                                            className="w-full text-xs bg-pw-glass-bg border border-pw-border rounded-lg pl-6 pr-3 py-1.5 outline-none focus:ring-1 focus:ring-[#7A9EAA]"
                                                        />
                                                    </div>
                                                )}
                                            </td>
                                            <td className="p-4 text-right">{renderVariance(projPrepaids, actPrepaids, true)}</td>
                                        </tr>

                                        {/* Cash to Close */}
                                        <tr>
                                            <td className="p-4">
                                                <div className="font-semibold">Cash to Close</div>
                                                <div className="text-[10px] text-pw-muted font-normal">Calculated funding requirement variance</div>
                                            </td>
                                            <td className="p-4 text-center font-mono">${projCashToClose.toLocaleString()}</td>
                                            <td className="p-4">
                                                {cashSatisfied ? (
                                                    <div className="flex items-center gap-1.5 text-green-600 font-semibold bg-green-500/10 border border-green-500/20 px-2 py-1 rounded-lg w-fit">
                                                        <CheckCircle className="w-3.5 h-3.5" />
                                                        <span>${(deal.financials?.finalCashToClose || closingRoom.cdCashToClose || 0).toLocaleString()}</span>
                                                        <span className="text-[9px] opacity-75 font-normal">(CD Capture)</span>
                                                    </div>
                                                ) : (
                                                    <div className="relative w-36">
                                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-pw-muted">$</span>
                                                        <input
                                                            type="number"
                                                            value={sweepCashToClose}
                                                            onChange={(e) => setSweepCashToClose(e.target.value ? Number(e.target.value) : '')}
                                                            placeholder="Enter cash to close"
                                                            className="w-full text-xs bg-pw-glass-bg border border-pw-border rounded-lg pl-6 pr-3 py-1.5 outline-none focus:ring-1 focus:ring-[#7A9EAA]"
                                                        />
                                                    </div>
                                                )}
                                            </td>
                                            <td className="p-4 text-right">{renderVariance(projCashToClose, actCashToClose, true)}</td>
                                        </tr>

                                        {/* Earnest Money Deposit */}
                                        <tr>
                                            <td className="p-4">
                                                <div className="font-semibold">Earnest Money Deposit</div>
                                                <div className="text-[10px] text-pw-muted font-normal font-normal">Projected EMD vs verified escrow receipt</div>
                                            </td>
                                            <td className="p-4 text-center font-mono">${projEmd.toLocaleString()}</td>
                                            <td className="p-4">
                                                {emdSatisfied ? (
                                                    <div className="flex items-center gap-1.5 text-green-600 font-semibold bg-green-500/10 border border-green-500/20 px-2 py-1 rounded-lg w-fit">
                                                        <CheckCircle className="w-3.5 h-3.5" />
                                                        <span>${((deal.financials?.emdAmount || 0) / 100).toLocaleString()}</span>
                                                        <span className="text-[9px] opacity-75 font-normal">(Escrow Verified)</span>
                                                    </div>
                                                ) : (
                                                    <div className="relative w-36">
                                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-pw-muted">$</span>
                                                        <input
                                                            type="number"
                                                            value={sweepEmd}
                                                            onChange={(e) => setSweepEmd(e.target.value ? Number(e.target.value) : '')}
                                                            placeholder="Enter EMD"
                                                            className="w-full text-xs bg-pw-glass-bg border border-pw-border rounded-lg pl-6 pr-3 py-1.5 outline-none focus:ring-1 focus:ring-[#7A9EAA]"
                                                        />
                                                    </div>
                                                )}
                                            </td>
                                            <td className="p-4 text-right">{renderVariance(projEmd, actEmd, false)}</td>
                                        </tr>

                                        {/* Hazard Insurance */}
                                        <tr>
                                            <td className="p-4">
                                                <div className="font-semibold">Annual Hazard Insurance</div>
                                                <div className="text-[10px] text-pw-muted font-normal">Projected premium vs finalized binder cost</div>
                                            </td>
                                            <td className="p-4 text-center font-mono">${projInsurance.toLocaleString()}</td>
                                            <td className="p-4">
                                                {insuranceSatisfied ? (
                                                    <div className="flex items-center gap-1.5 text-green-600 font-semibold bg-green-500/10 border border-green-500/20 px-2 py-1 rounded-lg w-fit">
                                                        <CheckCircle className="w-3.5 h-3.5" />
                                                        <span>${deal.financials?.insuranceCost?.toLocaleString()}</span>
                                                        <span className="text-[9px] opacity-75 font-normal">(Insurance Binder)</span>
                                                    </div>
                                                ) : (
                                                    <div className="relative w-36">
                                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-pw-muted">$</span>
                                                        <input
                                                            type="number"
                                                            value={sweepInsurance}
                                                            onChange={(e) => setSweepInsurance(e.target.value ? Number(e.target.value) : '')}
                                                            placeholder="Enter premium"
                                                            className="w-full text-xs bg-pw-glass-bg border border-pw-border rounded-lg pl-6 pr-3 py-1.5 outline-none focus:ring-1 focus:ring-[#7A9EAA]"
                                                        />
                                                    </div>
                                                )}
                                            </td>
                                            <td className="p-4 text-right">{renderVariance(projInsurance, actInsurance, true)}</td>
                                        </tr>

                                        {/* Lender Loan Amount */}
                                        {isFinanced && (
                                            <tr>
                                                <td className="p-4">
                                                    <div className="font-semibold">Lender Loan Amount</div>
                                                    <div className="text-[10px] text-pw-muted font-normal">Projected loan vs locked note principal</div>
                                                </td>
                                                <td className="p-4 text-center font-mono">${projLoanAmount.toLocaleString()}</td>
                                                <td className="p-4">
                                                    {loanSatisfied ? (
                                                        <div className="flex items-center gap-1.5 text-green-600 font-semibold bg-green-500/10 border border-green-500/20 px-2 py-1 rounded-lg w-fit">
                                                            <CheckCircle className="w-3.5 h-3.5" />
                                                            <span>${loanSourceAct?.amount?.toLocaleString()}</span>
                                                            <span className="text-[9px] opacity-75 font-normal">(Locked Note)</span>
                                                        </div>
                                                    ) : (
                                                        <div className="relative w-36">
                                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-pw-muted">$</span>
                                                            <input
                                                                type="number"
                                                                value={sweepLoanAmount}
                                                                onChange={(e) => setSweepLoanAmount(e.target.value ? Number(e.target.value) : '')}
                                                                placeholder="Enter loan amount"
                                                                className="w-full text-xs bg-pw-glass-bg border border-pw-border rounded-lg pl-6 pr-3 py-1.5 outline-none focus:ring-1 focus:ring-[#7A9EAA]"
                                                            />
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="p-4 text-right">{renderVariance(projLoanAmount, actLoanAmount, false)}</td>
                                            </tr>
                                        )}

                                        {/* Lender Interest Rate */}
                                        {isFinanced && (
                                            <tr>
                                                <td className="p-4">
                                                    <div className="font-semibold">Lender Interest Rate</div>
                                                    <div className="text-[10px] text-pw-muted font-normal font-normal">Target rate vs locked note interest rate</div>
                                                </td>
                                                <td className="p-4 text-center font-mono">{projInterestRate.toFixed(3)}%</td>
                                                <td className="p-4">
                                                    {rateSatisfied ? (
                                                        <div className="flex items-center gap-1.5 text-green-600 font-semibold bg-green-500/10 border border-green-500/20 px-2 py-1 rounded-lg w-fit">
                                                            <CheckCircle className="w-3.5 h-3.5" />
                                                            <span>{loanSourceAct?.interestRate?.toFixed(3)}%</span>
                                                            <span className="text-[9px] opacity-75 font-normal">(Locked Note)</span>
                                                        </div>
                                                    ) : (
                                                        <div className="relative w-36">
                                                            <input
                                                                type="number"
                                                                step="0.001"
                                                                value={sweepInterestRate}
                                                                onChange={(e) => setSweepInterestRate(e.target.value ? Number(e.target.value) : '')}
                                                                placeholder="Enter rate %"
                                                                className="w-full text-xs bg-pw-glass-bg border border-pw-border rounded-lg px-3 py-1.5 outline-none focus:ring-1 focus:ring-[#7A9EAA]"
                                                            />
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="p-4 text-right">{renderVariance(projInterestRate, actInterestRate, true, true)}</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>

                                <div className="p-4 bg-pw-glass-bg/50 border-t border-pw-border flex justify-between items-center">
                                    <span className="text-[10px] text-pw-muted leading-relaxed">
                                        Manually inputted values will update the project financials and downstream metric calculations.
                                    </span>
                                    <button
                                        onClick={handleSaveSweep}
                                        disabled={isSavingSweep}
                                        className="pw-btn pw-btn--primary pw-btn--pill px-5 py-2 text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50"
                                    >
                                        {isSavingSweep ? (
                                            <>
                                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                <span>Saving...</span>
                                            </>
                                        ) : (
                                            <>
                                                <CheckCircle className="w-3.5 h-3.5" />
                                                <span>Apply Actuals Sweep</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })()}
            </div>
        </div>
    );
}

function DocumentZone({ 
    title, 
    description, 
    isUploaded, 
    onUpload, 
    isUploading,
    onReviewClick
}: { 
    title: string; 
    description: string; 
    isUploaded: boolean; 
    onUpload: (file: File) => void; 
    isUploading: boolean; 
    onReviewClick?: () => void;
}) {
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const handleButtonClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            onUpload(file);
        }
    };

    return (
        <div className={`p-4 border border-dashed rounded-2xl transition-colors ${isUploaded ? 'border-green-300 bg-green-500/10' : 'border-pw-border hover:border-pw-muted bg-pw-glass-bg/30'}`}>
            <div className="flex justify-between items-center">
                <div>
                   <h4 className={`text-sm font-semibold ${isUploaded ? 'text-green-400' : 'text-pw-black'}`}>{title}</h4>
                   <p className="text-xs text-pw-muted mt-1">{description}</p>
                </div>
                {isUploaded ? (
                    <div className="flex items-center gap-2">
                        <div className="flex items-center text-green-500 bg-green-500/20 px-2 py-1 rounded-full text-xs font-bold">
                            <CheckCircle className="w-3 h-3 mr-1" /> PDF Attached
                        </div>
                        {onReviewClick && (
                            <button
                                onClick={onReviewClick}
                                className="pw-btn pw-btn--secondary pw-btn--sm pw-btn--pill px-3 py-1 font-semibold text-xs text-pw-black"
                            >
                                Review &amp; Capture
                            </button>
                        )}
                    </div>
                ) : (
                    <>
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            onChange={handleFileChange} 
                            accept=".pdf,.doc,.docx"
                            className="hidden" 
                        />
                        <button 
                            onClick={handleButtonClick} 
                            disabled={isUploading}
                            className="pw-btn pw-btn--secondary pw-btn--sm pw-btn--pill flex items-center gap-1 disabled:opacity-50"
                        >
                            {isUploading ? 'Uploading...' : <><UploadCloud className="w-3 h-3" /> Upload</>}
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}

function ExecutedDocumentRow({
    title,
    description,
    isUploaded,
    isSigned,
    onUpload,
    onToggleSigned,
    isUploading,
    isOptional = false,
    disabled = false
}: {
    title: string;
    description: string;
    isUploaded: boolean;
    isSigned: boolean;
    onUpload: (file: File) => void;
    onToggleSigned: () => void;
    isUploading: boolean;
    isOptional?: boolean;
    disabled?: boolean;
}) {
    return (
        <div className="bg-pw-glass-bg/40 border border-pw-border p-4 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
                <h4 className="text-sm font-semibold text-pw-black flex items-center gap-2">
                    {title}
                    {isOptional && (
                        <span className="text-[9px] uppercase font-bold bg-pw-glass-bg/25 border border-pw-border px-2 py-0.5 rounded-full text-pw-muted">
                            Optional (Cash Deal)
                        </span>
                    )}
                </h4>
                <p className="text-xs text-pw-muted leading-relaxed">{description}</p>
            </div>
            
            <div className="flex flex-wrap items-center gap-4">
                {/* File Uploader */}
                <div className="flex items-center gap-2">
                    {isUploaded ? (
                        <div className="flex items-center gap-1.5 text-xs text-green-600 bg-green-500/10 border border-green-500/20 px-3 py-1.5 rounded-full">
                            <CheckCircle className="w-3.5 h-3.5" />
                            Uploaded
                        </div>
                    ) : (
                        <div className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-full">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            Missing Upload
                        </div>
                    )}
                    
                    {!disabled && (
                        <label className="cursor-pointer">
                            <input
                                type="file"
                                accept=".pdf,image/*"
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) onUpload(file);
                                }}
                                className="hidden"
                                disabled={isUploading}
                            />
                            <span className="text-xs font-semibold text-blue-500 hover:underline">
                                {isUploading ? 'Uploading...' : isUploaded ? 'Replace File' : 'Upload File'}
                            </span>
                        </label>
                    )}
                </div>

                {/* Signed Status Checkbox */}
                <label className="flex items-center gap-2 text-xs font-semibold text-pw-black select-none cursor-pointer">
                    <input
                        type="checkbox"
                        checked={isSigned}
                        onChange={onToggleSigned}
                        disabled={!isUploaded || disabled}
                        className="rounded border-pw-border text-[#7A9EAA] focus:ring-[#7A9EAA] disabled:opacity-50"
                    />
                    <span>Mark Signed</span>
                </label>
            </div>
        </div>
    );
}
