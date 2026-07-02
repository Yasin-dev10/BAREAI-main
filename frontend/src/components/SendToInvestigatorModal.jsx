import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Send, ShieldAlert, ShieldCheck, X } from 'lucide-react';

/**
 * SendToInvestigatorModal
 *
 * Props:
 *  - item        : The prediction/history record object
 *  - onClose     : () => void  — called when modal is dismissed
 *  - onConfirm   : ({ predictionId, finalDecision, note }) => Promise<void>
 */
const SendToInvestigatorModal = ({ item, onClose, onConfirm }) => {
  const [finalDecision, setFinalDecision] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!item) return null;

  const inputText =
    item.inputText ||
    item.content ||
    item.extractedText ||
    item.url ||
    item.input?.text ||
    item.input?.url ||
    item.input?.filename ||
    (item.input?.batch_count ? `${item.input.batch_count} items` : 'No content');

  const handleSubmit = async () => {
    setError('');
    setSubmitting(true);
    try {
      await onConfirm({
        predictionId: item._id || item.id,
        finalDecision: finalDecision || undefined,
        note: note.trim() || undefined,
      });
      onClose();
    } catch (err) {
      setError(err.response?.data?.details || err.response?.data?.error || err.response?.data?.message || 'Failed to send record to investigator.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          transition={{ duration: 0.18 }}
          className="relative w-full max-w-lg rounded-2xl border border-white/10 bg-surface shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-4 border-b border-white/10 p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/30">
                <Send className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h2 className="font-semibold text-white">Send to Investigator</h2>
                <p className="text-xs text-textMuted">Choose a classification and send to Case Management</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg border border-white/10 p-2 text-textMuted hover:bg-white/5 hover:text-white transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Body */}
          <div className="p-5 space-y-5">
            {/* Preview of record */}
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-textMuted mb-2">Record Content</p>
              <p className="text-sm text-white/80 line-clamp-3">{inputText}</p>
            </div>

            {/* Crime / Not-Crime selection */}
            <div>
              <p className="mb-2 text-sm font-semibold text-white">
                Classification <span className="text-textMuted font-normal">(optional — can be set later)</span>
              </p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setFinalDecision(finalDecision === 'crime' ? '' : 'crime')}
                  className={`flex items-center gap-2.5 rounded-xl border px-4 py-3 text-sm font-semibold transition-all ${
                    finalDecision === 'crime'
                      ? 'border-red-500/50 bg-red-500/15 text-red-300'
                      : 'border-white/10 bg-white/5 text-textMuted hover:border-red-500/30 hover:bg-red-500/5 hover:text-red-300'
                  }`}
                >
                  <ShieldAlert className="h-4 w-4 shrink-0" />
                  Crime
                </button>
                <button
                  type="button"
                  onClick={() => setFinalDecision(finalDecision === 'not_crime' ? '' : 'not_crime')}
                  className={`flex items-center gap-2.5 rounded-xl border px-4 py-3 text-sm font-semibold transition-all ${
                    finalDecision === 'not_crime'
                      ? 'border-green-500/50 bg-green-500/15 text-green-300'
                      : 'border-white/10 bg-white/5 text-textMuted hover:border-green-500/30 hover:bg-green-500/5 hover:text-green-300'
                  }`}
                >
                  <ShieldCheck className="h-4 w-4 shrink-0" />
                  Not Crime
                </button>
              </div>
            </div>

            {/* Optional note */}
            <div>
              <p className="mb-2 text-sm font-semibold text-white">
                Note <span className="text-textMuted font-normal">(optional)</span>
              </p>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="glass-input w-full min-h-20 text-sm resize-none"
                placeholder="Add a note or reason for sending to investigator..."
              />
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                {error}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 border-t border-white/10 p-5">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="btn-outline px-4 py-2 text-sm"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="btn-primary px-4 py-2 text-sm"
            >
              <Send className="h-4 w-4" />
              {submitting ? 'Sending...' : 'Send to Investigator'}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default SendToInvestigatorModal;
