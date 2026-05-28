import React, { useState } from 'react';
import { PIBDocument, DeliveryInfo } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, UploadCloud, CheckSquare, Square, 
  Settings, AlertCircle, Edit2, Check, X, Calendar 
} from 'lucide-react';

interface PreviewTabProps {
  documents: PIBDocument[];
  onUpdateDocument: (docId: string, updates: Partial<PIBDocument>) => Promise<void>;
  uploadedRowKeys: string[];
  onUploadRows: (keys: string[]) => void;
}

export default function PreviewTab({ 
  documents, 
  onUpdateDocument,
  uploadedRowKeys,
  onUploadRows 
}: PreviewTabProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  
  // Cell editing states for Tanggal Billing & Tanggal SPPB
  const [editingCell, setEditingCell] = useState<{ docId: string; field: 'billingDate' | 'sppbDate' } | null>(null);
  const [editValue, setEditValue] = useState('');

  // Helper to format container display
  const getContainerDisplay = (cont: string) => {
    if (!cont) return '-';
    const cleaned = cont.trim();
    return cleaned;
  };

  // Compile all rows (one row per container)
  const allRows = [];
  documents.forEach((doc) => {
    doc.containers.forEach((cont) => {
      const info = doc.containers.length > 1 
        ? doc.deliveryInfoMap?.[cont] 
        : doc.deliveryInfo;

      const rowKey = `${doc.id}_${cont}`;
      
      // Map properties
      const tglPengiriman = info?.tglPengiriman || (info ? info.scheduledDate : '-');
      const tempatPenimbunan = info?.tempatPenimbunan || info?.vendorDepo || 'TPS Lini 1 Tanjung Priok';
      const lokasiBongkar = info?.lokasiBongkar || info?.warehouseTarget || 'Belum Ditentukan';
      const vendorArmada = info?.vendorArmada || '-';
      const namaSupirArmada = info?.driverName || '-';
      const statusPengirimanContainer = info?.pengiriman || (info ? (info.status === 'Selesai' ? 'Selesai Bongkar' : info.status) : 'Belum Dijadwalkan');
      const suratJalan = info?.suratJalan || (info?.status === 'Selesai' || info?.suratJalanDiterima ? 'Sudah Diterima' : 'Belum Diterima');
      const detailBarang = doc.uraianBarang && doc.uraianBarang.length > 0 ? doc.uraianBarang.join(', ') : '-';
      const remark = info?.remark || '-';

      allRows.push({
        key: rowKey,
        docId: doc.id,
        nomorPengajuan: doc.noPengajuan || '-',
        namaImportir: doc.importer || '-',
        nomorContainer: getContainerDisplay(cont),
        tanggalBilling: doc.billingDate || '-',
        tanggalSppb: doc.sppbDate || '-',
        tanggalPengiriman: tglPengiriman,
        tempatPenimbunan,
        lokasiBongkar,
        vendorArmada,
        namaSupirArmada,
        statusPengirimanContainer,
        suratJalan,
        detailBarang,
        remark,
        originalDoc: doc,
        originalContainer: cont
      });
    });
  });

  // Filter rows based on search
  const filteredRows = allRows.filter((row) => {
    const q = searchTerm.toLowerCase();
    return (
      row.nomorPengajuan.toLowerCase().includes(q) ||
      row.namaImportir.toLowerCase().includes(q) ||
      row.nomorContainer.toLowerCase().includes(q) ||
      row.lokasiBongkar.toLowerCase().includes(q) ||
      row.namaSupirArmada.toLowerCase().includes(q) ||
      row.statusPengirimanContainer.toLowerCase().includes(q) ||
      row.vendorArmada.toLowerCase().includes(q)
    );
  });

  // Selection handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const keys = filteredRows.map(r => r.key);
      setSelectedRowKeys(keys);
    } else {
      setSelectedRowKeys([]);
    }
  };

  const handleToggleRow = (key: string, checked: boolean) => {
    if (checked) {
      setSelectedRowKeys(prev => [...prev, key]);
    } else {
      setSelectedRowKeys(prev => prev.filter(k => k !== key));
    }
  };

  // Upload handler (converts selected rows to generate spreadsheet availability)
  const handleUploadData = () => {
    if (selectedRowKeys.length === 0) return;
    setIsUploading(true);
    setUploadSuccess(false);

    setTimeout(() => {
      onUploadRows(selectedRowKeys);
      setIsUploading(false);
      setUploadSuccess(true);
      // Automatically dismiss success message after 4s
      setTimeout(() => setUploadSuccess(false), 4000);
    }, 900);
  };

  // Cell edit handlers
  const startEditing = (docId: string, field: 'billingDate' | 'sppbDate', currentVal: string) => {
    setEditingCell({ docId, field });
    setEditValue(currentVal === '-' ? '' : currentVal);
  };

  const saveEditing = async () => {
    if (!editingCell) return;
    const { docId, field } = editingCell;
    
    // Save to server
    await onUpdateDocument(docId, { [field]: editValue });
    setEditingCell(null);
  };

  const cancelEditing = () => {
    setEditingCell(null);
  };

  return (
    <div className="space-y-6">
      {/* Tab Description Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5">
          <UploadCloud className="w-48 h-48 text-indigo-500" />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-white tracking-tight">Preview & Validasi Seluruh Data Portal</h2>
            <p className="text-slate-400 text-xs max-w-2xl leading-relaxed">
              Tampilan komprehensif seluruh kontainer impor dan rencana pengiriman. Anda dapat melakukan checklist pada baris data terpilih untuk di-upload dan dipindahkan eksklusif ke tab <strong>Generate Spreadsheet</strong>.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleUploadData}
              disabled={selectedRowKeys.length === 0 || isUploading}
              className={`flex items-center gap-2 px-5 py-3 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all cursor-pointer ${
                selectedRowKeys.length > 0
                  ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20 active:scale-98'
                  : 'bg-slate-900 text-slate-500 border border-slate-800 cursor-not-allowed'
              }`}
            >
              {isUploading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Mengunggah...
                </>
              ) : (
                <>
                  <UploadCloud className="w-4 h-4" />
                  Upload ({selectedRowKeys.length}) Data
                </>
              )}
            </button>
          </div>
        </div>

        {/* Success Alert */}
        <AnimatePresence>
          {uploadSuccess && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mt-6 flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 text-emerald-400 text-xs font-medium"
            >
              <Check className="w-5 h-5 flex-shrink-0 text-emerald-500" />
              <div>
                <p className="font-bold">Berhasil Mengunggah Data!</p>
                <p className="text-emerald-400/80 mt-0.5">
                  Sebanyak {selectedRowKeys.length} baris data pilihan Anda telah berhasil disiapkan dan dipindahkan ke tab <strong>Generate Spreadsheet</strong> untuk diekspor ke Google Sheets.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Control Panel: Search & Select All Stats */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Cari No Pengajuan, Importir, Container, Lokasi..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 duration-200"
          />
        </div>

        {/* Stats Summary */}
        <div className="flex items-center gap-4 text-xs font-mono text-slate-400">
          <span>Terpajang: <strong>{filteredRows.length}</strong></span>
          <span>•</span>
          <span>Di-Checklist: <strong className="text-indigo-400">{selectedRowKeys.length}</strong></span>
          <span>•</span>
          <span>Sudah Di-upload: <strong className="text-emerald-400">{uploadedRowKeys.length}</strong></span>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs text-left">
            <thead>
              <tr className="bg-slate-950 text-slate-300 divide-x divide-slate-800 uppercase tracking-wider text-[10px]">
                <th className="px-3 py-3.5 text-center w-12 select-none font-bold">
                  <input
                    type="checkbox"
                    checked={filteredRows.length > 0 && filteredRows.every(r => selectedRowKeys.includes(r.key))}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="accent-indigo-500 cursor-pointer w-4 h-4 rounded border-slate-800"
                  />
                </th>
                <th className="px-3 py-3.5 text-center font-bold w-12 text-slate-200">No</th>
                <th className="px-4 py-3.5 text-center font-bold text-slate-200">NO AJU</th>
                <th className="px-4 py-3.5 text-center font-bold text-slate-200">Nama Importir</th>
                <th className="px-4 py-3.5 text-center font-bold text-slate-200">Nomor Container</th>
                <th className="px-4 py-3.5 text-center font-bold text-slate-200">Tanggal Billing</th>
                <th className="px-4 py-3.5 text-center font-bold text-slate-200">Tanggal SPPB</th>
                <th className="px-4 py-3.5 text-center font-bold text-slate-200">Tanggal Pengiriman</th>
                <th className="px-4 py-3.5 text-center font-bold text-slate-200">Tempat Penimbunan</th>
                <th className="px-4 py-3.5 text-center font-bold text-slate-200">Lokasi Bongkar</th>
                <th className="px-4 py-3.5 text-center font-bold text-slate-200">Nama Vendor Armada</th>
                <th className="px-4 py-3.5 text-center font-bold text-slate-200">Nama Supir Armada</th>
                <th className="px-4 py-3.5 text-center font-bold text-slate-200">Status Pengiriman Container</th>
                <th className="px-4 py-3.5 text-center font-bold text-slate-200">Surat Jalan</th>
                <th className="px-4 py-3.5 text-center font-bold text-slate-200">DETAIL BARANG</th>
                <th className="px-4 py-3.5 text-center font-bold text-slate-200">REMARK</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 bg-slate-900/40">
              {filteredRows.length > 0 ? (
                filteredRows.map((row, index) => {
                  const isChecked = selectedRowKeys.includes(row.key);
                  const isUploaded = uploadedRowKeys.includes(row.key);
                  const showEditingBilling = editingCell?.docId === row.docId && editingCell?.field === 'billingDate';
                  const showEditingSppb = editingCell?.docId === row.docId && editingCell?.field === 'sppbDate';

                  return (
                    <tr 
                      key={row.key} 
                      className={`hover:bg-slate-800/30 transition-colors duration-150 divide-x divide-slate-800/60 ${
                        isChecked ? 'bg-indigo-500/5' : ''
                      } ${isUploaded ? 'border-l-2 border-l-emerald-500' : ''}`}
                    >
                      {/* Checklist Box */}
                      <td className="px-3 py-3 text-center align-middle">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => handleToggleRow(row.key, e.target.checked)}
                          className="accent-indigo-500 cursor-pointer w-4 h-4 rounded"
                        />
                      </td>

                      {/* No */}
                      <td className="px-3 py-3 text-center text-slate-400 font-mono">
                        {index + 1}
                      </td>

                      {/* Nomor Pengajuan / NO AJU (last 5 digits) */}
                      <td className="px-4 py-3 font-mono text-slate-300 font-bold text-center" title={`No Aju Lengkap: ${row.nomorPengajuan}`}>
                        {row.nomorPengajuan && row.nomorPengajuan !== '-' 
                          ? (row.nomorPengajuan.length > 5 ? row.nomorPengajuan.slice(-5) : row.nomorPengajuan) 
                          : '-'
                        }
                      </td>

                      {/* Nama Importir */}
                      <td className="px-4 py-3 text-slate-300 font-medium">
                        {row.namaImportir}
                      </td>

                      {/* Nomor Container */}
                      <td className="px-4 py-3 text-slate-200 font-bold font-mono">
                        {row.nomorContainer}
                      </td>

                      {/* Tanggal Billing */}
                      <td className="px-4 py-3 text-center cursor-pointer hover:bg-slate-800/50 group duration-150 transition-colors">
                        {showEditingBilling ? (
                          <div className="flex items-center gap-1.5 justify-center">
                            <input
                              type="date"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              className="bg-slate-950 text-white rounded px-2 py-1 text-xs border border-indigo-500 focus:outline-none"
                            />
                            <button 
                              onClick={saveEditing} 
                              className="p-1 bg-emerald-500 text-slate-950 rounded hover:bg-emerald-400"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button 
                              onClick={cancelEditing} 
                              className="p-1 bg-rose-500 text-white rounded hover:bg-rose-450"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div 
                            onClick={() => startEditing(row.docId, 'billingDate', row.tanggalBilling)}
                            className="flex items-center justify-between gap-2"
                          >
                            <span className="text-slate-300 font-mono mx-auto">{row.tanggalBilling}</span>
                            <Edit2 className="w-3 h-3 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        )}
                      </td>

                      {/* Tanggal SPPB */}
                      <td className="px-4 py-3 text-center cursor-pointer hover:bg-slate-800/50 group duration-150 transition-colors">
                        {showEditingSppb ? (
                          <div className="flex items-center gap-1.5 justify-center">
                            <input
                              type="date"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              className="bg-slate-950 text-white rounded px-2 py-1 text-xs border border-indigo-500 focus:outline-none"
                            />
                            <button 
                              onClick={saveEditing} 
                              className="p-1 bg-emerald-500 text-slate-950 rounded hover:bg-emerald-400"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button 
                              onClick={cancelEditing} 
                              className="p-1 bg-rose-500 text-white rounded hover:bg-rose-450"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div 
                            onClick={() => startEditing(row.docId, 'sppbDate', row.tanggalSppb)}
                            className="flex items-center justify-between gap-2"
                          >
                            <span className="text-slate-300 font-mono mx-auto">{row.tanggalSppb}</span>
                            <Edit2 className="w-3 h-3 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        )}
                      </td>

                      {/* Tanggal Pengiriman */}
                      <td className="px-4 py-3 text-slate-300 font-mono text-center">
                        {row.tanggalPengiriman}
                      </td>

                      {/* Tempat Penimbunan */}
                      <td className="px-4 py-3 text-slate-300">
                        {row.tempatPenimbunan}
                      </td>

                      {/* Lokasi Bongkar */}
                      <td className="px-4 py-3 text-slate-300 font-medium">
                        {row.lokasiBongkar}
                      </td>

                      {/* Nama Vendor Armada */}
                      <td className="px-4 py-3 text-slate-300">
                        {row.vendorArmada}
                      </td>

                      {/* Nama Supir Armada */}
                      <td className="px-4 py-3 text-slate-300">
                        {row.namaSupirArmada}
                      </td>

                      {/* Status Pengiriman Container */}
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${
                          row.statusPengirimanContainer === 'Selesai Bongkar' || row.statusPengirimanContainer === 'Selesai'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : row.statusPengirimanContainer === 'Delivery'
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              : 'bg-slate-800 text-slate-450 border border-slate-700/60'
                        }`}>
                          {row.statusPengirimanContainer}
                        </span>
                      </td>

                      {/* Surat Jalan */}
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-[9px] font-extrabold uppercase ${
                          row.suratJalan === 'Sudah Diterima'
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                            : 'bg-rose-500/15 text-rose-450 text-rose-400 border border-rose-500/30'
                        }`}>
                          {row.suratJalan}
                        </span>
                      </td>

                      {/* DETAIL BARANG */}
                      <td className="px-4 py-3 text-slate-300 font-sans truncate max-w-[180px]" title={row.detailBarang}>
                        {row.detailBarang}
                      </td>

                      {/* REMARK */}
                      <td className="px-4 py-3 text-slate-400 font-sans italic truncate max-w-[150px]" title={row.remark}>
                        {row.remark}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={16} className="px-6 py-16 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <AlertCircle className="w-10 h-10 text-slate-600" />
                      <p className="font-bold text-slate-400 text-sm">Tidak ada baris data dalam portal.</p>
                      <p className="text-slate-500 text-xs">Unggah dokumen PIB terlebih dahulu atau sesuaikan pencarian Anda.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
