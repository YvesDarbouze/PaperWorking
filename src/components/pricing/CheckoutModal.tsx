import React, { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { X, Lock, ShieldCheck, CheckCircle2, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';

// Dummy Stripe test key for rendering the Element UI locally
const stripePromise = loadStripe('pk_test_TYooMQauvdEDq54NiTphI7jx');

interface CheckoutModalProps {
  planIdentifier: string;
  onClose: () => void;
}

function CheckoutForm({ planIdentifier, onClose }: CheckoutModalProps) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setLoading(true);

    // Mock validation and processing delay
    setTimeout(() => {
       setLoading(false);
       setSuccess(true);
       
       // Redirect to dashboard after a brief success flash
       setTimeout(() => {
          router.push('/dashboard');
       }, 2000);
    }, 2000);
  };

  if (success) {
     return (
        <div className="flex flex-col items-center justify-center p-12 text-center h-full">
           <CheckCircle2 className="w-16 h-16 text-phase-4 mb-6 animate-in zoom-in duration-500" />
           <h2 className="text-2xl font-medium text-phase-4 tracking-tight">Payment Verified</h2>
           <p className="text-phase-3 mt-2">Provisioning your organizational ledger...</p>
        </div>
     );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-full">
       <div className="flex justify-between items-center px-6 py-5 border-b border-dashboard">
         <div>
            <h2 className="text-xl font-semibold text-phase-4 tracking-tight flex items-center">Secure Checkout <Lock className="w-4 h-4 ml-2 text-phase-2"/></h2>
            <p className="text-xs font-medium text-phase-3 tracking-widest uppercase mt-1">Plan: {planIdentifier}</p>
         </div>
         <button type="button" onClick={onClose} className="p-2 text-phase-2 hover:text-phase-4 hover:bg-dashboard transition-colors">
            <X className="w-5 h-5" />
         </button>
       </div>

       <div className="p-6 space-y-6 flex-1 overflow-y-auto">
          
          <div className="space-y-4">
             <h3 className="text-sm font-bold uppercase tracking-widest text-phase-2">Account Credentials</h3>
             
             <div className="grid grid-cols-2 gap-4">
               <div>
                  <label className="block text-xs font-semibold text-phase-3 mb-1">Full Name</label>
                  <input required placeholder="Jane Doe" className="w-full text-sm bg-dashboard border border-phase-1 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-black/5" />
               </div>
               <div>
                  <label className="block text-xs font-semibold text-phase-3 mb-1">Email Address</label>
                  <input required type="email" placeholder="jane@realty.com" className="w-full text-sm bg-dashboard border border-phase-1 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-black/5" />
               </div>
             </div>

             <div>
                <label className="block text-xs font-semibold text-phase-3 mb-1">Secure Password</label>
                <input required type="password" placeholder="••••••••" className="w-full text-sm bg-dashboard border border-phase-1 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-black/5" />
             </div>
          </div>

          <hr className="border-dashboard" />

          <div className="space-y-4">
             <h3 className="text-sm font-bold uppercase tracking-widest text-phase-2">Payment Details</h3>
             
             <div className="bg-white border border-phase-1 p-4 shadow-sm">
                 <CardElement options={{
                   style: {
                     base: {
                       fontSize: '15px',
                       color: '#595959',
                       fontFamily: 'Inter, sans-serif',
                       '::placeholder': { color: '#a5a5a5' }
                     }
                   }
                 }} />
             </div>

             <div className="flex items-center space-x-4 text-xs font-medium text-phase-3 mt-2">
                <span className="flex items-center"><ShieldCheck className="w-4 h-4 text-phase-4 mr-1"/> 256-bit SSL Secure</span>
                <span className="flex items-center"><CheckCircle2 className="w-4 h-4 text-phase-2 mr-1"/> Cancel Anytime</span>
             </div>
          </div>

       </div>

       <div className="p-6 border-t border-dashboard bg-dashboard">
          <button 
             type="submit"
             disabled={!stripe || loading}
             className="w-full flex items-center justify-center bg-black text-white font-medium py-3.5 hover:bg-phase-4 transition active:scale-95 disabled:opacity-50"
          >
             {loading ? 'Authorizing...' : `Subscribe to ${planIdentifier}`}
             {!loading && <ArrowRight className="w-4 h-4 ml-2" />}
          </button>
          <p className="text-xs text-center text-phase-2 mt-4 leading-relaxed max-w-xs mx-auto">
             By subscribing, you agree to our Terms of Service and Privacy Policy. Your card will be stored securely via Stripe.
          </p>
       </div>
    </form>
  )
}

export default function CheckoutModal({ planIdentifier, onClose }: CheckoutModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
       <div className="bg-white w-full max-w-md shadow-2xl overflow-hidden animate-in slide-in-from-bottom-8 duration-300 h-fit max-h-screen border border-phase-1">
          <Elements stripe={stripePromise}>
             <CheckoutForm planIdentifier={planIdentifier} onClose={onClose} />
          </Elements>
       </div>
    </div>
  );
}
