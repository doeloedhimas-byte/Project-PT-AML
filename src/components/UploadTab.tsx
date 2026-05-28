import React, { useState, useRef } from 'react';
import { PIBDocument, DocumentStatus } from '../types';
import { Upload, FileText, AlertTriangle, CheckCircle, Sliders, Play, Plus, Coins } from 'lucide-react';
import { motion } from 'motion/react';

interface UploadTabProps {
  onDocumentAdded: (newDoc: PIBDocument) => void;
  onNavigateToTab: (index: number) => void;
}

export default function UploadTab({ onDocumentAdded, onNavigateToTab }: UploadTabProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [parseLog, setParseLog] = useState<string[]>([]);
  const [parsedData, setParsedData] = useState<any | null>(null);
  const [parseError, setParseError] = useState<string>('');
  const [isSuccesful, setIsSuccessful] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form states for checking/modifying extracted data before saving
  const [noPengajuan, setNoPengajuan] = useState('');
  const [importer, setImporter] = useState('');
  const [blNumber, setBlNumber] = useState('');
  const [blDate, setBlDate] = useState('');
  const [containersStr, setContainersStr] = useState('');
  const [uraianStr, setUraianStr] = useState('');

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.type === 'application/pdf') {
        setFile(droppedFile);
        setParseError('');
        setParsedData(null);
      } else {
        setParseError('Tipe file wajib berupa PDF.');
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.type === 'application/pdf') {
        setFile(selectedFile);
        setParseError('');
        setParsedData(null);
      } else {
        setParseError('Tipe file wajib berupa PDF.');
      }
    }
  };

  const runParser = async (useDemoSimulation = false) => {
    setIsParsing(true);
    setParseError('');
    setParsedData(null);
    setParseLog([]);

    const log = (msg: string) => {
      setParseLog(prev => [...prev, `${new Date().toLocaleTimeString()} - ${msg}`]);
    };

    try {
      if (!useDemoSimulation && !file) {
        throw new Error('Pilih atau unggah file dokumen PDF terlebih dahulu.');
      }

      log('Menghubungi server PT AML...');
      await new Promise(r => setTimeout(r, 800));

      let bodyPayload: any = {};

      if (useDemoSimulation) {
        log('Memulai jalur simulasi kecerdasan buatan...');
        bodyPayload = { mockOption: true };
      } else {
        log(`Membaca file ${file?.name} ke format biner...`);
        const base64Data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = (e) => reject(e);
          reader.readAsDataURL(file!);
        });

        log('Mengirim biner PDF ke server untuk diproses Gemini AI...');
        bodyPayload = {
          fileBytesBase64: base64Data,
          filename: file?.name
        };
      }

      await new Promise(r => setTimeout(r, 600));
      log('Gemini model "gemini-3.5-flash" sedang mengekstrak struktur formal PIB...');
      
      const response = await fetch('/api/parse-pib', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload)
      });

      if (!response.ok) {
        const errorJson = await response.json().catch(() => ({}));
        throw new Error(errorJson.error || 'Server gagal memproses PDF. Silakan gunakan opsi simulasi.');
      }

      const resData = await response.json();
      log('Menganalisis Nomor Pengajuan, Importir, BL & Container...');
      await new Promise(r => setTimeout(r, 800));
      log('Menyaring uraian barang (maksimal 5 item teratas)...');
      await new Promise(r => setTimeout(r, 500));

      if (resData.success && resData.parsedData) {
        const data = resData.parsedData;
        setParsedData(data);
        
        // Initialize editing inputs
        setNoPengajuan(data.noPengajuan || '');
        setImporter(data.importer || '');
        setBlNumber(data.blNumber || '');
        setBlDate(data.blDate || '');
        setContainersStr(data.containers ? data.containers.join(', ') : '');
        setUraianStr(data.uraianBarang ? data.uraianBarang.join('\n') : '');

        log('Ekstraksi Sukses! Silakan verifikasi hasil di formulir.');
      } else {
        throw new Error('Hasil ekstraksi kosong atau format tidak sesuai.');
      }
    } catch (err: any) {
      console.error(err);
      setParseError(err.message || 'Error tidak terduga saat mempresentasikan file.');
      log(`Gagal: ${err.message}`);
    } finally {
      setIsParsing(false);
    }
  };

  const handleSaveDocument = async () => {
    if (!noPengajuan || !importer || !blNumber) {
      setParseError('Nomor pengajuan, perusahaan importir, dan nomor BL wajib diisi.');
      return;
    }

    try {
      // Split containers
      const containers = containersStr
        .split(',')
        .map(c => c.trim())
        .filter(c => c.length > 0);

      // Split items
      const uraianBarang = uraianStr
        .split('\n')
        .map(u => u.trim())
        .filter(u => u.length > 0)
        .slice(0, 5); // Enforce max 5 items in final save

      const newDoc = {
        noPengajuan,
        importer,
        blNumber,
        blDate,
        containers,
        uraianBarang,
        status: 'Draft PIB' as DocumentStatus,
        billingPaid: false,
        deliveryPlanned: false
      };

      const res = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newDoc)
      });

      if (!res.ok) {
        throw new Error('Gagal mengamankan rekap dokumen di server database.');
      }

      const resData = await res.json();
      onDocumentAdded(resData.document);
      setIsSuccessful(true);
      
      // Flash reset states
      setFile(null);
      setParsedData(null);
    } catch (err: any) {
      setParseError(err.message || 'Gagal menyimpan dokumen.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 mb-2">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            Unggah & Ringkasan Dokumen PIB & PEB
          </h2>
          <p className="text-slate-400 text-sm">
            Gunakan motor AI Gemini untuk mengenali dan menulis ulang (rekap) seluruh detail manifes kontainer.
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-amber-400 bg-amber-400/10 px-3 py-1.5 rounded-lg border border-amber-500/10">
          <Coins className="w-3.5 h-3.5" />
          Powered by Gemini 3.5-Flash
        </div>
      </div>

      {isSuccesful ? (
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-slate-800/85 border border-teal-500/20 rounded-2xl p-8 max-w-2xl mx-auto text-center space-y-6"
        >
          <div className="inline-flex items-center justify-center p-3 rounded-full bg-teal-500/10 text-teal-400 mb-2">
            <CheckCircle className="w-10 h-10" />
          </div>
          <h3 className="text-xl font-bold text-white">Dokumen Berhasil Direkap ke Portal!</h3>
          <p className="text-slate-350 text-sm max-w-md mx-auto leading-relaxed">
            PIB PT Agung Makmur Logistik telah didaftarkan dalam status <span className="text-indigo-400 font-bold">Draft PIB</span>. Sekarang Anda bisa memperbarui pembayaran billing DJBC, memproses koordinasi Bea Cukai, atau menyusun Surat Jalan.
          </p>
          <div className="pt-4 flex justify-center gap-4">
            <button
              onClick={() => {
                setIsSuccessful(false);
                setFile(null);
                setParsedData(null);
              }}
              className="bg-slate-900 hover:bg-slate-950 border border-slate-700 hover:border-slate-650 text-slate-200 text-xs font-semibold py-2.5 px-5 rounded-xl cursor-pointer transition-colors"
            >
              Proses Dokumen Lain
            </button>
            <button
              onClick={() => {
                onNavigateToTab(2); // Redirect to monitoring list
                setIsSuccessful(false);
              }}
              className="bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-semibold py-2.5 px-5 rounded-xl cursor-pointer shadow-lg shadow-teal-500/15 transition-all animate-pulse"
            >
              Lihat Daftar & Atur Status
            </button>
          </div>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left panel: Upload actions */}
          <div className="lg:col-span-5 space-y-4">
            <div 
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                file 
                ? 'border-teal-500/50 bg-teal-500/5' 
                : 'border-slate-700 bg-slate-800/20 hover:bg-slate-800/40 hover:border-slate-600'
              }`}
            >
              <input 
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept="application/pdf"
                className="hidden"
              />
              <div className="flex flex-col items-center justify-center space-y-3">
                <div className={`p-3 rounded-xl ${file ? 'bg-teal-500/10 text-teal-400' : 'bg-slate-800 text-slate-400'}`}>
                  <Upload className="w-6 h-6" />
                </div>
                {file ? (
                  <div>
                    <p className="text-sm font-semibold text-white truncate max-w-[250px] mx-auto">
                      {file.name}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {(file.size / (1024 * 1024)).toFixed(2)} MB - Siap Proses
                    </p>
                  </div>
                ) : (
                  <div>
                    <h4 className="text-sm font-semibold text-slate-200">
                      Tarik & Lepaskan File PIB PDF
                    </h4>
                    <p className="text-xs text-slate-400 mt-1">
                      Mendukung file PDF standar ekspor impor DJBC
                    </p>
                  </div>
                )}
                <button
                  type="button"
                  className="mt-3 bg-slate-800 border border-slate-700 hover:bg-slate-755 text-xs text-slate-300 font-semibold px-4 py-2 rounded-xl"
                >
                  {file ? 'Ubah File' : 'Cari Dokumen PDF'}
                </button>
              </div>
            </div>

            {/* Quick Demo Simulator trigger */}
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/80 p-5 rounded-2xl space-y-3 shadow-lg">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-amber-400" />
                <h4 className="text-xs font-bold text-slate-200 uppercase tracking-widest">
                  Pengujian Instan Tanpa File PDF (Rekomendasi)
                </h4>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Tidak memiliki file PIB asli di komputer Anda? Jalankan algoritma simulasi generator PIB untuk mereplikasi proses AI.
              </p>
              <button
                type="button"
                onClick={() => runParser(true)}
                disabled={isParsing}
                className="w-full inline-flex items-center justify-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold py-2.5 px-4 rounded-xl cursor-pointer shadow-md shadow-amber-500/10 transition-all disabled:opacity-50"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                Simulasikan Unggah & Parsing PIB AML
              </button>
            </div>

            {/* Main triggers for real PDF file upload */}
            {file && (
              <button
                type="button"
                onClick={() => runParser(false)}
                disabled={isParsing}
                className="w-full flex items-center justify-center gap-2 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold py-3 px-4 rounded-xl shadow-lg transition-all disabled:opacity-50"
              >
                Start Gemini AI Extraction
              </button>
            )}

            {/* Console logs */}
            {(isParsing || parseLog.length > 0) && (
              <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 font-mono text-[10px] text-slate-350 space-y-1.5 max-h-[170px] overflow-y-auto">
                <p className="text-[11px] font-bold text-teal-400 border-b border-slate-800 pb-1 flex justify-between">
                  <span>SYSTEM_PIB_LOGGER:</span>
                  <span className="animate-pulse">{isParsing ? 'Mengekstrak...' : 'Siap'}</span>
                </p>
                {parseLog.map((logStr, i) => (
                  <p key={i} className="leading-relaxed">{logStr}</p>
                ))}
              </div>
            )}

            {parseError && (
              <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-4 text-xs text-rose-400 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <p>{parseError}</p>
              </div>
            )}
          </div>

          {/* Right panel: Inspection & check editor before submission */}
          <div className="lg:col-span-7">
            {parsedData ? (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-slate-800/40 border border-slate-700/60 rounded-2xl p-6 space-y-4"
              >
                <div className="flex items-center gap-2 border-b border-slate-700/60 pb-3 mb-2">
                  <FileText className="w-5 h-5 text-teal-400" />
                  <div>
                    <h3 className="text-sm font-semibold text-white">Inspeksi & Simpan Hasil Rekap</h3>
                    <p className="text-slate-400 text-[11px]">Silakan edit data jika ada rincian yang kurang presisi dari pembacaan AI.</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1.5">Nomor Pengajuan PIB</label>
                      <input 
                        type="text" 
                        value={noPengajuan}
                        onChange={(e) => setNoPengajuan(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-705 border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-teal-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1.5">Nama Perusahaan Importir (Penerima)</label>
                      <input 
                        type="text" 
                        value={importer}
                        onChange={(e) => setImporter(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-teal-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1.5">Nomor Bill of Lading (B/L)</label>
                      <input 
                        type="text" 
                        value={blNumber}
                        onChange={(e) => setBlNumber(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-teal-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1.5">Tanggal Bill of Lading</label>
                      <input 
                        type="date" 
                        value={blDate}
                        onChange={(e) => setBlDate(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 border-slate-700/80 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-teal-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">
                      Nomor Container (Gunakan koma sebagai pemisah jika lebih dari 1)
                    </label>
                    <input 
                      type="text" 
                      value={containersStr}
                      onChange={(e) => setContainersStr(e.target.value)}
                      placeholder="MSKU3001844, OOLU2228392"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-teal-500"
                    />
                    <p className="text-[10px] text-slate-500 mt-1">
                      * Seluruh kontainer yang dideteksi dibaca oleh Gemini dan dimasukkan sebagai list rilis terpisah.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">
                      Detail Uraian Barang (Dipisahkan baris baru, maks 5 jenis barang)
                    </label>
                    <textarea 
                      rows={5}
                      value={uraianStr}
                      onChange={(e) => setUraianStr(e.target.value)}
                      placeholder="1. POLYURETHANE RAW PELLETS&#10;2. CHEMICAL CATALYST AGENTS"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-teal-500 font-mono"
                    />
                    <p className="text-[10px] text-slate-500">
                      * Sesuai ketentuan, detail uraian barang dibatasi maksimal 5 jenis barang terpenting agar rekap ringkas.
                    </p>
                  </div>

                  <div className="pt-4 border-t border-slate-700 flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setParsedData(null)}
                      className="bg-slate-900 border border-slate-700 hover:bg-slate-950 text-xs font-semibold text-slate-300 py-2 px-4 rounded-xl"
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveDocument}
                      className="bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold py-2 px-5 rounded-xl shadow-md cursor-pointer flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5 text-slate-950" />
                      Simpan Dokumen ke Portal
                    </button>
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className="bg-slate-800/10 border border-slate-800/80 rounded-2xl p-12 text-center text-slate-500 min-h-[350px] flex flex-col items-center justify-center space-y-4">
                <FileText className="w-12 h-12 text-slate-700" />
                <div>
                  <h4 className="text-slate-400 font-semibold text-sm">Menunggu Unggahan Dokumen</h4>
                  <p className="text-xs text-slate-500 max-w-sm mt-1 mx-auto leading-relaxed">
                    Data rekap akan langsung ditampilkan di panel kanan ini setelah dokumen diunggah dan dianalisis oleh Gemini AI model.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
