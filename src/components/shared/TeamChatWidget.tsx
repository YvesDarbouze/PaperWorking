import React, { useState } from 'react';
import { MessageSquare, Send, AtSign } from 'lucide-react';

interface TeamChatWidgetProps {
  projectId: string;
}

export default function TeamChatWidget({ projectId }: TeamChatWidgetProps) {
  const [messages, setMessages] = useState([
     { id: 1, author: 'Lead Investor', role: 'admin', text: 'Checked the structural reports. We are holding tight until framing passes.', time: '10:00 AM' },
     { id: 2, author: 'General Contractor', role: 'contractor', text: '@LeadInvestor I uploaded the lien waivers to the Triage Queue for the foundation pour.', time: '11:15 AM' }
  ]);
  const [input, setInput] = useState('');

  const sendMsg = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    setMessages([...messages, { id: Date.now(), author: 'You', role: 'admin', text: input, time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}]);
    setInput('');
  };

  return (
    <div className="bg-bg-surface border border-border-accent rounded-xl shadow-sm overflow-hidden flex flex-col h-[400px]">
       <div className="bg-indigo-600 text-white p-3 flex justify-between items-center">
          <div className="flex items-center gap-2 font-semibold text-sm tracking-wide">
             <MessageSquare className="w-4 h-4"/> Property Communications
          </div>
       </div>
       
       <div className="flex-1 p-3 overflow-y-auto space-y-3 bg-bg-primary">
          {messages.map(m => (
             <div key={m.id} className={`flex flex-col ${m.author === 'You' ? 'items-end' : 'items-start'}`}>
                <span className="text-xs text-text-secondary font-bold mb-0.5">{m.author}</span>
                <div className={`px-3 py-2 rounded-xl text-sm max-w-[85%] ${m.author === 'You' ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-bg-surface border border-border-accent text-text-primary rounded-bl-none shadow-sm'}`}>
                   {m.text}
                </div>
                <span className="text-xs text-text-secondary mt-0.5">{m.time}</span>
             </div>
          ))}
       </div>

       <form onSubmit={sendMsg} className="p-2 bg-bg-surface border-t border-border-accent flex items-center gap-2">
          <button type="button" className="p-2 text-text-secondary hover:text-indigo-600 transition"><AtSign className="w-4 h-4" /></button>
          <input 
             value={input}
             onChange={e => setInput(e.target.value)}
             placeholder="Type a message or @mention..."
             className="flex-1 bg-bg-primary border-transparent focus:bg-bg-surface focus:border-indigo-400 focus:ring-0 rounded-lg text-sm px-3 py-2 outline-none transition"
          />
          <button type="submit" className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition">
             <Send className="w-4 h-4" />
          </button>
       </form>
    </div>
  );
}
