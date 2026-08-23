import React, { useState } from 'react';
import { X, Bot, KeyRound, Check } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface AISettingsModalProps {
  onClose: () => void;
}

export default function AISettingsModal({ onClose }: AISettingsModalProps) {
  const { aiApiKey, setAiApiKey } = useAuth();
  
  // Local state for the input before saving
  const [keyInput, setKeyInput] = useState(aiApiKey);
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = () => {
    setAiApiKey(keyInput.trim());
    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
      onClose();
    }, 1000);
  };

  const isCustom = aiApiKey.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-brand-surface border border-white/10 rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between bg-white/5">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Bot className="text-accent-teal" size={20} />
            AI Configuration
          </h2>
          <button 
            onClick={onClose}
            className="text-text-secondary hover:text-white p-1 rounded-md hover:bg-white/10 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          <p className="text-sm text-text-secondary">
            By default, TRACE uses the system-provided Google Gemini AI to run investigations and Ask TRACE. 
            You can override this by providing your own API key.
          </p>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-white flex items-center gap-2">
                <KeyRound size={16} className="text-accent-blue" />
                Custom Gemini API Key
              </label>
              <input
                type="password"
                placeholder="AIzaSy..."
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                autoComplete="new-password"
                className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-accent-teal placeholder-white/20 transition-colors"
              />
              <p className="text-xs text-text-secondary">
                {keyInput 
                  ? "Using Custom AI Key"
                  : "Using Default System AI"}
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/5 bg-black/20 flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="btn-secondary"
          >
            Cancel
          </button>
          <button 
            onClick={handleSave}
            className="btn-primary flex items-center gap-2 min-w-[100px] justify-center"
          >
            {isSaved ? (
              <>
                <Check size={16} /> Saved
              </>
            ) : (
              'Save Settings'
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
