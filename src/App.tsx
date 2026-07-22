import React, { useState, useEffect } from 'react';
import { PIBDocument, UserRole, UserSession, DeliveryInfo } from './types';
import LoginScreen from './components/LoginScreen';
import Dashboard from './components/Dashboard';
import UploadTab from './components/UploadTab';
import MonitoringTab from './components/MonitoringTab';
import GenerateTab from './components/GenerateTab';
import PreviewTab from './components/PreviewTab';
import amlLogo from './assets/images/aml_logo_solid_white_1784613581619.jpg';
import { 
  ClipboardCheck, LogOut, Shield, 
  Truck, LayoutDashboard, FileText, Settings, Database, Server, RefreshCw, FileSpreadsheet
} from 'lucide-react';

export default function App() {
  const [session, setSession] = useState<UserSession | null>(null);
  const [activeTab, setActiveTab] = useState<number>(0); // 0: Dashboard, 1: Upload PIB, 2: Monitoring & Status
  const [documents, setDocuments] = useState<PIBDocument[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [reloadTrigger, setReloadTrigger] = useState<number>(0);
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [deliveryFilter, setDeliveryFilter] = useState<string>('All');
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);

  // State for container keys uploaded from Preview Data tab to Generate Spreadsheet tab
  const [uploadedRowKeys, setUploadedRowKeys] = useState<string[]>(() => {
    const saved = localStorage.getItem('aml_uploaded_row_keys');
    return saved ? JSON.parse(saved) : [];
  });

  const handleUploadRows = (keys: string[]) => {
    setUploadedRowKeys(keys);
    localStorage.setItem('aml_uploaded_row_keys', JSON.stringify(keys));
  };

  // Initialize role and check if session exists in memory
  useEffect(() => {
    // Fetch initial documents listing from API
    const fetchDocuments = async () => {
      setIsLoading(true);
      try {
        const response = await fetch('/api/documents');
        if (response.ok) {
          const data = await response.json();
          setDocuments(data);
        } else {
          console.error('Server returned error status on loading documents');
        }
      } catch (err) {
        console.error('Failed to load documents from API:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchDocuments();
  }, [reloadTrigger]);

  const handleLogin = (role: UserRole, username: string, fullName: string) => {
    setSession({
      role,
      username,
      fullName,
      isSuperUser: username.toLowerCase() === 'dhimasaml'
    });
    // Set landing tab: Both roles look at Dashboard upon entering
    setActiveTab(0);
  };

  const handleLogout = () => {
    setSession(null);
  };

  const handleDocumentAdded = (newDoc: PIBDocument) => {
    setDocuments(prev => [newDoc, ...prev]);
  };

  const handleUpdateDocument = async (docId: string, updates: Partial<PIBDocument>) => {
    try {
      const response = await fetch(`/api/documents/${docId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      if (response.ok) {
        const data = await response.json();
        // Update local state
        setDocuments(prev => prev.map(doc => doc.id === docId ? { ...doc, ...data.document } : doc));
      } else {
        console.error('Server failed to update PIB Document');
      }
    } catch (err) {
      console.error('Failed API update call:', err);
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    try {
      const response = await fetch(`/api/documents/${docId}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        setDocuments(prev => prev.filter(doc => doc.id !== docId));
      } else {
        console.error('Server failed to remove document');
      }
    } catch (err) {
      console.error('API deletion call error:', err);
    }
  };

  if (!session) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans selection:bg-teal-500 selection:text-white">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <img 
            src={amlLogo} 
            alt="PT Agung Makmur Logistik Logo" 
            className="h-11 sm:h-14 w-auto object-contain mix-blend-multiply transition-all hover:brightness-110 duration-200"
            referrerPolicy="no-referrer"
          />
          <div className="hidden xs:block h-6 w-[1px] bg-slate-200"></div>
          <div>
            <h1 className="text-md sm:text-lg font-bold text-slate-900 tracking-tight">PT Agung Makmur Logistik</h1>
            <p className="text-[10px] sm:text-xs text-slate-500 font-mono uppercase">Portal for PIB and PEB Document Records and Delivery Plans</p>
          </div>
        </div>

        {/* User context information */}
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex flex-col text-right">
            <p className="text-xs font-semibold text-white">{session.fullName}</p>
            <p className="text-[10px] text-teal-400 font-bold uppercase tracking-wider flex items-center gap-1 justify-end">
              {session.isSuperUser ? (
                <>
                  <span className="text-[9px] bg-amber-500/10 text-amber-400 px-1.5 py-0.5 rounded border border-amber-500/20 mr-1 animate-pulse">👑 SUPER POWER</span>
                  {session.role === 'STAFF_AML' ? 'Staff Document' : 'Staff Delivery'}
                </>
              ) : session.role === 'STAFF_AML' ? (
                <>
                  <Shield className="w-3 h-3" />
                  Staff Document
                </>
              ) : (
                <>
                  <Truck className="w-3 h-3" />
                  Delivery AML
                </>
              )}
            </p>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3.5 py-2 hover:bg-slate-800 text-slate-300 hover:text-rose-400 border border-slate-855 border-slate-800 hover:border-rose-500/10 rounded-xl text-xs font-semibold transition-all cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            Logout
          </button>
        </div>
      </header>

      {/* Main Layout Area */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col gap-6">
        {/* Navigation Tabs (Modern capsule style matching the background) */}
        <div className="bg-white p-1.5 rounded-2xl border border-slate-200 flex items-center gap-2 overflow-x-auto shadow-sm">
          <button
            onClick={() => setActiveTab(0)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold tracking-wide transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 0
                ? 'bg-teal-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            DASHBOARD MONITORING
          </button>

          {(session.role === 'STAFF_AML' || session.isSuperUser) && (
            <button
              onClick={() => setActiveTab(1)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold tracking-wide transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 1
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <FileText className="w-4 h-4" />
              SUMMARY PIB/PEB
            </button>
          )}

          <button
            onClick={() => setActiveTab(2)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold tracking-wide transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 2
                ? 'bg-teal-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Truck className="w-4 h-4" />
            MONITORING & DELIVERY PLAN
          </button>

          <button
            onClick={() => setActiveTab(3)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold tracking-wide transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 3
                ? 'bg-teal-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Database className="w-4 h-4" />
            PREVIEW DATA
          </button>

          <button
            onClick={() => setActiveTab(4)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold tracking-wide transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 4
                ? 'bg-teal-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            GENERATE SPREADSHEET
          </button>
          
          <button
            onClick={() => setReloadTrigger(prev => prev + 1)}
            disabled={isLoading}
            className="ml-auto flex items-center gap-1.5 px-4 py-2 text-xs text-slate-600 hover:text-teal-600 hover:bg-slate-100 font-bold tracking-wide transition-all cursor-pointer bg-white rounded-xl border border-slate-200"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            REFRESH DATA
          </button>
        </div>

        {/* Tab Contents */}
        {isLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 min-h-[300px] space-y-4">
            <div className="w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-slate-400 text-xs font-mono">Sinkronisasi status dengan database PT AML...</p>
          </div>
        ) : (
          <div className="flex-1">
            {activeTab === 0 && (
              <Dashboard 
                documents={documents} 
                onNavigateToTab={(t) => setActiveTab(t)}
                userFullName={session.fullName}
                userRole={session.role}
                isSuperUser={session.isSuperUser}
                onSelectStatusFilter={(status) => {
                  setStatusFilter(status);
                  setDeliveryFilter('All');
                  const matchingDoc = documents.find(d => d.status === status);
                  if (matchingDoc) {
                    setSelectedDocId(matchingDoc.id);
                  } else {
                    setSelectedDocId(null);
                  }
                  setActiveTab(2);
                }}
                onSelectDeliveryFilter={(delFilter) => {
                  setStatusFilter('SPPB');
                  setDeliveryFilter(delFilter);
                  let matchingDoc: PIBDocument | undefined;
                  if (delFilter === 'Belum Dijadwalkan') {
                    matchingDoc = documents.find(d => d.status === 'SPPB' && (!d.deliveryPlanned || d.containers.some(c => !d.deliveryInfoMap?.[c])));
                  } else if (delFilter === 'Delivery') {
                    matchingDoc = documents.find(d => d.status === 'SPPB' && (d.containers.length > 1 ? (Object.values(d.deliveryInfoMap || {}) as (DeliveryInfo | undefined)[]).some(x => x?.status === 'Delivery') : d.deliveryInfo?.status === 'Delivery'));
                  } else if (delFilter === 'Selesai') {
                    matchingDoc = documents.find(d => d.status === 'SPPB' && (d.containers.length > 1 ? (Object.values(d.deliveryInfoMap || {}) as (DeliveryInfo | undefined)[]).some(x => x?.status === 'Selesai') : d.deliveryInfo?.status === 'Selesai'));
                  } else {
                    matchingDoc = documents.find(d => d.status === 'SPPB');
                  }
                  if (matchingDoc) {
                    setSelectedDocId(matchingDoc.id);
                  } else {
                    setSelectedDocId(null);
                  }
                  setActiveTab(2);
                }}
              />
            )}
            
            {activeTab === 1 && (session.role === 'STAFF_AML' || session.isSuperUser) && (
              <UploadTab 
                onDocumentAdded={handleDocumentAdded}
                onNavigateToTab={(t) => setActiveTab(t)}
              />
            )}

            {activeTab === 2 && (
              <MonitoringTab 
                documents={documents}
                onUpdateDocument={handleUpdateDocument}
                onDeleteDocument={handleDeleteDocument}
                userRole={session.role}
                isSuperUser={session.isSuperUser}
                statusFilter={statusFilter}
                setStatusFilter={setStatusFilter}
                deliveryFilter={deliveryFilter}
                setDeliveryFilter={setDeliveryFilter}
                selectedDocId={selectedDocId}
                setSelectedDocId={setSelectedDocId}
              />
            )}

            {activeTab === 3 && (
              <PreviewTab 
                documents={documents}
                onUpdateDocument={handleUpdateDocument}
                uploadedRowKeys={uploadedRowKeys}
                onUploadRows={handleUploadRows}
              />
            )}

            {activeTab === 4 && (
              <GenerateTab 
                documents={documents}
                userRole={session.role}
                isSuperUser={session.isSuperUser}
                onUpdateDocument={handleUpdateDocument}
                uploadedRowKeys={uploadedRowKeys}
                onUploadRows={handleUploadRows}
              />
            )}
          </div>
        )}
      </div>

      {/* Footer bar */}
      <footer className="bg-slate-900 border-t border-slate-800 py-6 px-6 text-center text-xs text-slate-500 space-y-2 mt-auto">
        <div className="flex flex-wrap items-center justify-center gap-4 text-[10px] uppercase font-mono tracking-widest text-slate-500">
          <span className="flex items-center gap-1">
            <Server className="w-3.5 h-3.5 text-teal-500/70" />
            Local Database Connected
          </span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <Database className="w-3.5 h-3.5 text-teal-500/70" />
            Gemini 3.5 Flash Model Configured
          </span>
        </div>
        <p>© 2026 PT Agung Makmur Logistik. All rights reserved. Solusi Manajemen Cargo Laut, Pelabuhan & Hub Logistik Terpadu.</p>
      </footer>
    </div>
  );
}
