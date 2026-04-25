import React, { useState } from 'react';
import { useProjectStore } from '@/store/projectStore';
import { Upload, DollarSign, List, Camera } from 'lucide-react';
import toast from 'react-hot-toast';
import { PendingReceipt } from '@/types/schema';

// Mock generic file upload simulation
const mockFileUpload = () => {
    return `https://mockstorage.com/receipt_${Math.random().toString(36).substring(7)}.jpg`;
};

const CATEGORIES = [
    'Demolition',
    'Structural Framing',
    'Plumbing',
    'Electrical',
    'HVAC',
    'Roofing',
    'Flooring',
    'Cabinets & Counters',
    'Paint & Finish',
    'Permit Fees',
    'Misc Hardware'
];

interface ContractorUploadZoneProps {
    projectId: string;
}

export default function ContractorUploadZone({ projectId }: ContractorUploadZoneProps) {
    const updateRehabModule = useProjectStore(state => state.updateRehabModule);
    const projects = useProjectStore(state => state.projects);
    const deal = projects.find(d => d.id === projectId);

    const [amount, setAmount] = useState<string>('');
    const [lineItem, setLineItem] = useState<string>('');
    const [isUploading, setIsUploading] = useState(false);

    if (!deal) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!amount || !lineItem) {
            toast.error('Please enter amount and choose a category.');
            return;
        }

        setIsUploading(true);
        const receiptUrl = mockFileUpload();
        
        await new Promise(r => setTimeout(r, 1200)); // Simulate mock upload

        const newReceipt: PendingReceipt = {
            id: `receipt_${Date.now()}`,
            amount: parseFloat(amount),
            budgetLineItem: lineItem,
            imageUrl: receiptUrl,
            status: 'pending',
            submittedByUid: 'GC_MOCK_USER_ID',
            submittedAt: new Date()
        };

        const existingReceipts = deal.rehab?.pendingReceipts || [];
        updateRehabModule(deal.id, { pendingReceipts: [...existingReceipts, newReceipt] });

        toast.success(`Receipt for $${amount} injected to Engine Room Triage queue!`);
        setIsUploading(false);
        setAmount('');
        setLineItem('');
    };

    return (
        <div className="bg-bg-surface rounded-xl shadow-lg border border-border-accent overflow-hidden max-w-sm w-full mx-auto sm:max-w-md">
            <div className="bg-slate-900 p-6 text-white text-center">
                <div className="mx-auto w-12 h-12 bg-bg-surface/10 rounded-full flex items-center justify-center mb-3">
                    <Camera className="w-6 h-6 text-blue-400" />
                </div>
                <h3 className="text-xl font-bold">Upload Expense</h3>
                <p className="text-text-secondary text-sm mt-1">{deal.propertyName}</p>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
                <div>
                    <label className="block text-sm font-medium text-text-primary mb-1 flex items-center"><DollarSign className="w-4 h-4 mr-1 text-green-600"/> Total Amount</label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <span className="text-text-secondary sm:text-sm">$</span>
                        </div>
                        <input
                            type="number"
                            step="0.01"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className="block w-full pl-7 pr-12 sm:text-sm border-border-accent rounded-md border py-3 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="0.00"
                            required
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-text-primary mb-1 flex items-center"><List className="w-4 h-4 mr-1 text-purple-600"/> Budget Line Item</label>
                    <select
                        value={lineItem}
                        onChange={(e) => setLineItem(e.target.value)}
                        className="block w-full border border-border-accent rounded-md py-3 px-3 sm:text-sm focus:ring-blue-500 focus:border-blue-500 text-text-primary bg-bg-surface"
                        required
                    >
                        <option value="" disabled>Select a category...</option>
                        {CATEGORIES.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                        ))}
                    </select>
                </div>

                <div className="pt-2">
                    <label className="block text-sm font-medium text-text-primary mb-1 flex items-center"><Upload className="w-4 h-4 mr-1 text-text-secondary"/> Photo Receipt</label>
                    <label className="flex justify-center w-full h-32 px-4 transition bg-bg-surface border-2 border-border-accent border-dashed rounded-md appearance-none cursor-pointer hover:border-gray-400 focus:outline-none">
                        <span className="flex items-center space-x-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                            </svg>
                            <span className="font-medium text-text-secondary">
                                {isUploading ? 'Uploading...' : 'Tap to scan/browse'}
                            </span>
                        </span>
                        <input type="file" name="file_upload" className="hidden" accept="image/*" disabled={isUploading}/>
                    </label>
                </div>

                <button
                    type="submit"
                    disabled={isUploading || !amount || !lineItem}
                    className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition"
                >
                    {isUploading ? 'Encrypting & Routing...' : 'Submit to Engine Room'}
                </button>
            </form>
        </div>
    );
}
