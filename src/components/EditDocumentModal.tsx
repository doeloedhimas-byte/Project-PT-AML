import React, { useState, useEffect } from 'react';
import { PIBDocument, DocumentStatus } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Save, Edit3, FileText, Building2, 
  Container, Package, Calendar, Tag, ShieldCheck, Check
} from 'lucide-react';

interface EditDocumentModalProps {
  doc: PIBDocument | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (docId: string, updates: Partial<PIBDocument>) => Promise<void> | void;
}

export default function EditDocumentModal({
  doc,
  isOpen,
  onClose,
  onSave
}: EditDocumentModalProps) {
  const [noPengajuan, setNoPengajuan] = useState('');
  const [importer, setImporter] = useState('');
  const [blNumber, setBlNumber] = useState('');
  const [blDate, setBlDate] = useState('');
  const [containersStr, setContainersStr] = useState('');
  const [uraianStr, setUraianStr] = useState('');
  const [status, setStatus] = useState<DocumentStatus>('Draft PIB');
  const [billingDate, setBillingDate] = useState('');
  const [sppbDate, setSppbDate] = useState('');
  const [invPlNo, setInvPlNo] = useState('');
  const [poNo, setPoNo] = useState('');
  const [vesselName, setVesselName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState(false);

  useEffect(() => {
    if (doc) {
      setNoPengajuan(doc.noPengajuan || '');
      setImporter(doc.importer || '');
      setBlNumber(doc.blNumber || '');
      setBlDate(doc.blDate || '');
      setContainersStr(doc.containers ? doc.containers.join(', ') : '');
      setUraianStr(doc.uraianBarang ? doc.uraianBarang.join('\n') : '');
      setStatus(doc.status || 'Draft PIB');
      setBillingDate(doc.billingDate || '');
      setSppbDate(doc.sppbDate || '');
      setInvPlNo(doc.invPlNo || '');
      setPoNo(doc.poNo || '');
      setVesselName(doc.vesselName || '');
      setSuccessMsg(false);
    }
  }, [doc, isOpen]);

  if (!isOpen || !doc) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      // Parse container list
      const parsedContainers = containersStr
        .split(/[,;\n]+/)
        .map(c => c.trim())
        .filter(c => c.length > 0);

      // Parse item descriptions
      const parsedUraian = uraianStr
        .split('\n')
        .map(u => u.trim())
        .filter(u => u.length > 0);

      const updates: Partial<PIBDocument> = {
        noPengajuan: noPengajuan.trim() || doc.noPengajuan,
        importer: importer.trim() || doc.importer,
        blNumber: blNumber.trim() || doc.blNumber,
        blDate: blDate.trim() || doc.blDate,
        containers: parsedContainers.length > 0 ? parsedContainers : doc.containers,
        uraianBarang: parsedUraian.length > 0 ? parsedUraian : doc.uraianBarang,
        status: status,
        billingDate: billingDate.trim() || undefined,
        sppbDate: sppbDate.trim() || undefined,
        invPlNo: invPlNo.trim() || undefined,
        poNo: poNo.trim() || undefined,
        vesselName: vesselName.trim() || undefined,
      };

      await onSave(doc.id, updates);
      setSuccessMsg(true);
      setTimeout(() => {
        setSuccessMsg(false);
        onClose();
      }, 600);
    } catch (err) {
      console.error('Failed to save revised document:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const documentStatuses: DocumentStatus[] = [
    'Draft PIB',
    'Billing DJBC',
    'SPPB',
    'SPJM',
    'NHI',
    'SPTNP',
    'SPBL'
  ];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden my-8"
        >
          {/* Modal Header */}
          <div className="px-6 py-4 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-teal-500/20 text-teal-400 rounded-xl border border-teal-500/30">
                <Edit3 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold tracking-tight">Revisi & Edit Dokumen PIB / PEB</h3>
                <p className="text-xs text-slate-400 font-mono">ID: {doc.id}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form Content */}
          <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
            {/* Status Selector */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
                <ShieldCheck className="w-4 h-4 text-teal-600" />
                Status Dokumen
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                {documentStatuses.map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setStatus(st)}
                    className={`px-3 py-2 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                      status === st
                        ? 'bg-teal-600 text-white border-teal-600 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    {st === 'Draft PIB' ? 'Draft PIB & PEB' : st}
                  </button>
                ))}
              </div>
            </div>

            {/* Main Primary Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                  <FileText className="w-3.5 h-3.5 text-slate-500" />
                  Nomor Pengajuan PIB
                </label>
                <input
                  type="text"
                  value={noPengajuan}
                  onChange={(e) => setNoPengajuan(e.target.value)}
                  placeholder="Contoh: 050100-002154-20260520..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 focus:outline-none focus:border-teal-500 focus:bg-white transition-all"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                  <Building2 className="w-3.5 h-3.5 text-slate-500" />
                  Perusahaan Importir
                </label>
                <input
                  type="text"
                  value={importer}
                  onChange={(e) => setImporter(e.target.value)}
                  placeholder="Contoh: PT INDO GLOBAL DISTRIBUSI"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-teal-500 focus:bg-white transition-all"
                  required
                />
              </div>
            </div>

            {/* B/L Number & Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                  <Tag className="w-3.5 h-3.5 text-slate-500" />
                  Nomor Bill of Lading (B/L)
                </label>
                <input
                  type="text"
                  value={blNumber}
                  onChange={(e) => setBlNumber(e.target.value)}
                  placeholder="Contoh: BL/MAERSK/81923012"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-semibold text-slate-800 focus:outline-none focus:border-teal-500 focus:bg-white transition-all"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  Tanggal Bill of Lading (B/L)
                </label>
                <input
                  type="date"
                  value={blDate}
                  onChange={(e) => setBlDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-semibold text-slate-800 focus:outline-none focus:border-teal-500 focus:bg-white transition-all"
                />
              </div>
            </div>

            {/* Containers List */}
            <div className="space-y-1.5">
              <label className="flex items-center justify-between text-xs font-bold text-slate-700">
                <span className="flex items-center gap-1.5">
                  <Container className="w-3.5 h-3.5 text-slate-500" />
                  Daftar Nomor Container & Ukuran
                </span>
                <span className="text-[10px] text-slate-400 font-normal">Pisahkan dengan koma</span>
              </label>
              <input
                type="text"
                value={containersStr}
                onChange={(e) => setContainersStr(e.target.value)}
                placeholder="Contoh: MSKU1849204 (40ft), OOLU1234567 (20ft)"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:outline-none focus:border-teal-500 focus:bg-white transition-all"
              />
            </div>

            {/* Item Descriptions */}
            <div className="space-y-1.5">
              <label className="flex items-center justify-between text-xs font-bold text-slate-700">
                <span className="flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5 text-slate-500" />
                  Uraian & Jenis Barang
                </span>
                <span className="text-[10px] text-slate-400 font-normal">1 barang per baris</span>
              </label>
              <textarea
                rows={3}
                value={uraianStr}
                onChange={(e) => setUraianStr(e.target.value)}
                placeholder="Contoh:\nPOLYCARBONATE RESIN PELLETS GRADE B\nPLASTIC RAW MATERIAL GRANULES"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-teal-500 focus:bg-white transition-all resize-none"
              />
            </div>

            {/* Optional dates & references */}
            <div className="border-t border-slate-100 pt-4">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3">Informasi Tambahan (Opsional)</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-slate-600">Tanggal Billing DJBC</label>
                  <input
                    type="date"
                    value={billingDate}
                    onChange={(e) => setBillingDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-800 focus:outline-none focus:border-teal-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-slate-600">Tanggal SPPB</label>
                  <input
                    type="date"
                    value={sppbDate}
                    onChange={(e) => setSppbDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-800 focus:outline-none focus:border-teal-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-slate-600">Inv / PL No.</label>
                  <input
                    type="text"
                    value={invPlNo}
                    onChange={(e) => setInvPlNo(e.target.value)}
                    placeholder="Inv / PL #"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-800 focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="flex items-center gap-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer disabled:opacity-50"
              >
                {successMsg ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-200" />
                    Tersimpan!
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    {isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
