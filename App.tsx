import React, { useState, useEffect, useMemo } from 'react';
import { AnalysisStatus, FullAnalysisResult, HistoryItem, User } from './types';
import { analyzeDocument } from './services/geminiService';
import { getHistory, saveHistoryItem, deleteHistoryItem, clearHistory } from './services/historyService';
import { authService } from './services/authService';
import FileUpload from './components/FileUpload';
import AnalysisResult from './components/AnalysisResult';
import AuthModal from './components/AuthModal';
import { 
  Scale, 
  Loader2, 
  FileText, 
  Shield, 
  MessageSquareText, 
  Clock, 
  Trash2, 
  ChevronRight, 
  Home, 
  Briefcase, 
  CreditCard,
  Building,
  AlertTriangle,
  FolderOpen,
  Search,
  User as UserIcon,
  LogOut,
  Lock
} from 'lucide-react';

// Helper function to refine categories based on content keywords
const getRefinedCategory = (item: HistoryItem): string => {
  const aiCategory = item.category;
  
  // Combine relevant text for keyword searching
  const summaryText = item.data?.legalSummary?.summary?.join(' ') || item.summary_snippet || '';
  const parties = item.data?.legalSummary?.key_entities?.parties?.join(' ') || '';
  const searchText = `${item.fileName} ${summaryText} ${parties}`.toLowerCase();

  // 1. High Priority: Fraud/Scam
  if (item.fraud_score >= 75 || searchText.includes('scam') || searchText.includes('fraud') || searchText.includes('phishing')) {
    return "High Risk / Scams";
  }

  // 2. Keyword-based Categorization
  if (/\b(lease|tenant|landlord|rent|property|apartment|housing|eviction|premises|sublease)\b/.test(searchText)) {
    return "Real Estate";
  }
  
  if (/\b(invoice|bill|receipt|payment|owing|balance|tax|bank|financial|salary|payroll|loan|debt)\b/.test(searchText)) {
    return "Finance & Invoices";
  }

  if (/\b(employment|job offer|termination|resignation|contractor|employee|employer|hiring|work agreement)\b/.test(searchText)) {
    return "Employment & HR";
  }

  if (/\b(nda|confidentiality|non-disclosure|agreement|settlement|terms of service|memorandum|contract|service agreement)\b/.test(searchText)) {
    return "Legal Contracts";
  }

  // 3. Fallback to AI Category if it's specific enough
  if (aiCategory && !['Other', 'General', 'Personal'].includes(aiCategory)) {
    return aiCategory;
  }

  return "General Documents";
};

const App: React.FC = () => {
  const [status, setStatus] = useState<AnalysisStatus>('idle');
  const [result, setResult] = useState<FullAnalysisResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [fileData, setFileData] = useState<{ base64: string; mimeType: string } | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Auth State
  const [user, setUser] = useState<User | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');

  useEffect(() => {
    // Check for logged in user
    const currentUser = authService.getCurrentUser();
    setUser(currentUser);
    
    // Load history for current user (or guest)
    setHistory(getHistory(currentUser?.id));
  }, []);

  // Reload history when user changes
  useEffect(() => {
    setHistory(getHistory(user?.id));
  }, [user]);

  const handleLogin = (newUser: User) => {
    setUser(newUser);
  };

  const handleLogout = () => {
    authService.logout();
    setUser(null);
    setResult(null);
    setStatus('idle');
    setFileData(null);
  };

  const openAuthModal = (mode: 'login' | 'signup') => {
    setAuthMode(mode);
    setIsAuthModalOpen(true);
  };

  const handleFileSelect = async (file: File) => {
    setStatus('analyzing');
    setErrorMsg(null);
    setFileData(null);

    try {
      // Convert file to Base64
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        // Remove data URL prefix
        const base64Content = base64String.split(',')[1];
        const mimeType = file.type;
        
        // Store for chat context
        setFileData({ base64: base64Content, mimeType });
        
        try {
          const analysis = await analyzeDocument(base64Content, mimeType);
          setResult(analysis);
          
          // Save to history only if logged in, or save to guest history
          // We always save, but history access might be gated
          const updatedHistory = saveHistoryItem(file.name, analysis, user?.id);
          setHistory(updatedHistory);
          
          setStatus('complete');
        } catch (err: any) {
          console.error(err);
          setErrorMsg(err.message || "Failed to analyze document. Please try again.");
          setStatus('error');
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setErrorMsg("Error reading file.");
      setStatus('error');
    }
  };

  const handleReset = () => {
    setStatus('idle');
    setResult(null);
    setErrorMsg(null);
    setFileData(null);
  };

  const loadHistoryItem = (item: HistoryItem) => {
    setResult(item.data);
    setFileData(null); // File data is not stored in history
    setStatus('complete');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteHistory = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const updated = deleteHistoryItem(id, user?.id);
    setHistory(updated);
  };

  const handleClearHistory = () => {
    if (confirm("Are you sure you want to clear all history?")) {
      const updated = clearHistory(user?.id);
      setHistory(updated);
    }
  };

  // Filter history based on search query
  const filteredHistory = useMemo(() => {
    if (!searchQuery.trim()) return history;
    const lowerQuery = searchQuery.toLowerCase();
    
    return history.filter(item => {
      const cat = getRefinedCategory(item).toLowerCase();
      const name = item.fileName.toLowerCase();
      const snippet = (item.summary_snippet || '').toLowerCase();
      const parties = (item.data?.legalSummary?.key_entities?.parties || []).join(' ').toLowerCase();
      
      return name.includes(lowerQuery) || 
             snippet.includes(lowerQuery) || 
             cat.includes(lowerQuery) ||
             parties.includes(lowerQuery);
    });
  }, [history, searchQuery]);

  // Group filtered history by refined category
  const groupedHistory = useMemo(() => {
    const groups: Record<string, HistoryItem[]> = {};
    filteredHistory.forEach(item => {
      const cat = getRefinedCategory(item);
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(item);
    });
    return groups;
  }, [filteredHistory]);

  // Get categories sorted by most recent item within the filtered set
  const sortedCategories = useMemo(() => {
    return Object.keys(groupedHistory).sort((a, b) => {
      const latestA = Math.max(...groupedHistory[a].map(i => i.timestamp));
      const latestB = Math.max(...groupedHistory[b].map(i => i.timestamp));
      return latestB - latestA;
    });
  }, [groupedHistory]);

  const getCategoryIcon = (category: string) => {
    const cat = category.toLowerCase();
    if (cat.includes('real estate') || cat.includes('property')) return <Home className="w-4 h-4" />;
    if (cat.includes('finance') || cat.includes('invoice') || cat.includes('money')) return <CreditCard className="w-4 h-4" />;
    if (cat.includes('employment') || cat.includes('job') || cat.includes('hr')) return <Briefcase className="w-4 h-4" />;
    if (cat.includes('scam') || cat.includes('risk') || cat.includes('fraud')) return <AlertTriangle className="w-4 h-4" />;
    if (cat.includes('contract') || cat.includes('legal') || cat.includes('agreement')) return <FileText className="w-4 h-4" />;
    if (cat.includes('company') || cat.includes('business')) return <Building className="w-4 h-4" />;
    return <FolderOpen className="w-4 h-4" />;
  };

  return (
    <div className="min-h-screen flex flex-col font-sans bg-slate-50 text-slate-900 print:bg-white print:h-auto print:min-h-0 print:block print:overflow-visible">
      
      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={() => setIsAuthModalOpen(false)} 
        onLoginSuccess={handleLogin}
        initialMode={authMode}
      />

      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 print:hidden">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={handleReset}>
            <div className="p-2 bg-navy-900 rounded-lg">
              <Scale className="w-6 h-6 text-gold-500" />
            </div>
            <div>
              <h1 className="text-xl font-serif font-bold text-navy-900 tracking-tight">LegalSense</h1>
              <p className="text-xs text-slate-500 hidden sm:block">Clarity & Fraud Detection</p>
            </div>
          </div>
          <nav className="flex items-center gap-4">
             {user ? (
               <div className="flex items-center gap-4">
                 <div className="flex items-center gap-2 text-sm font-medium text-navy-900">
                   <div className="w-8 h-8 rounded-full bg-navy-50 flex items-center justify-center text-navy-800 border border-slate-200">
                     <UserIcon className="w-4 h-4" />
                   </div>
                   <span className="hidden sm:inline">{user.name}</span>
                 </div>
                 <button 
                   onClick={handleLogout}
                   className="text-slate-500 hover:text-red-600 transition-colors p-2"
                   title="Log Out"
                 >
                   <LogOut className="w-5 h-5" />
                 </button>
               </div>
             ) : (
               <div className="flex items-center gap-3">
                 <button 
                   onClick={() => openAuthModal('login')}
                   className="text-sm font-medium text-slate-600 hover:text-navy-900 px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors"
                 >
                   Log In
                 </button>
                 <button 
                   onClick={() => openAuthModal('signup')}
                   className="text-sm font-medium bg-navy-900 text-white px-4 py-2 rounded-lg hover:bg-navy-800 transition-colors shadow-sm"
                 >
                   Sign Up
                 </button>
               </div>
             )}
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow flex flex-col items-center justify-start pt-12 px-4 sm:px-6 print:pt-0 print:px-0 print:block print:w-full print:overflow-visible">
        
        {status === 'idle' && (
          <div className="w-full max-w-4xl space-y-12 animate-fade-in-up pb-12">
            
            {/* Hero Section */}
            <div className="text-center space-y-4">
              <div className="inline-block px-3 py-1 bg-gold-50 text-gold-600 rounded-full text-xs font-semibold uppercase tracking-wider mb-2">
                New: Screenshot Analysis for Scams
              </div>
              <h2 className="text-4xl md:text-5xl font-serif font-bold text-navy-900 leading-tight">
                Understand Contracts.<br />
                <span className="text-gold-600">Detect Fraud.</span>
              </h2>
              <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                Upload any contract, invoice, or screenshot. LegalSense uses advanced AI to summarize terms, uncover risks, and calculate a fraud probability score instantly.
              </p>
            </div>

            {/* Feature Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto">
              <div className="p-6 bg-white rounded-xl shadow-sm border border-slate-100 flex flex-col items-center text-center hover:shadow-md transition-shadow">
                <FileText className="w-8 h-8 text-blue-500 mb-3" />
                <h3 className="font-bold text-slate-800">Plain English</h3>
                <p className="text-sm text-slate-500">Complex jargon translated into simple summaries.</p>
              </div>
              <div className="p-6 bg-white rounded-xl shadow-sm border border-slate-100 flex flex-col items-center text-center hover:shadow-md transition-shadow">
                <Shield className="w-8 h-8 text-gold-500 mb-3" />
                <h3 className="font-bold text-slate-800">Fraud Scoring</h3>
                <p className="text-sm text-slate-500">Instant risk assessment (0-100) for your safety.</p>
              </div>
              <div className="p-6 bg-white rounded-xl shadow-sm border border-slate-100 flex flex-col items-center text-center hover:shadow-md transition-shadow">
                <MessageSquareText className="w-8 h-8 text-green-500 mb-3" />
                <h3 className="font-bold text-slate-800">Legal Chat</h3>
                <p className="text-sm text-slate-500">Ask specific follow-up questions about the document.</p>
              </div>
            </div>

            <FileUpload onFileSelect={handleFileSelect} disabled={false} />
            
            <p className="text-xs text-center text-slate-400">
              Supported: PDF, PNG, JPG. Your documents are processed securely and never saved.
            </p>

            {/* History Section - Gated or Shown */}
            <div className="max-w-3xl mx-auto pt-8 border-t border-slate-200 w-full">
               
               <div className="flex justify-between items-center mb-6">
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-navy-900" />
                    <h3 className="text-lg font-bold text-navy-900">Your Documents</h3>
                  </div>
                  {user && (
                    <button 
                      onClick={handleClearHistory}
                      className="text-xs text-slate-400 hover:text-red-500 transition-colors"
                    >
                      Clear History
                    </button>
                  )}
                </div>

                {!user && history.length === 0 && (
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 text-center space-y-4">
                    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto shadow-sm">
                      <Lock className="w-5 h-5 text-gold-500" />
                    </div>
                    <div>
                      <h4 className="font-bold text-navy-900">Log in to view history</h4>
                      <p className="text-sm text-slate-500 mt-1">Save your analyses and access them anytime.</p>
                    </div>
                    <button 
                      onClick={() => openAuthModal('login')}
                      className="text-sm font-medium text-navy-900 hover:text-navy-700 underline"
                    >
                      Sign In / Create Account
                    </button>
                  </div>
                )}

                {/* Search Bar (Only if history exists) */}
                {history.length > 0 && (
                  <div className="relative mb-6">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <input
                      type="text"
                      placeholder="Search by name, category, or keyword..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-500/20 focus:border-gold-500 transition-all text-sm shadow-sm"
                    />
                  </div>
                )}
                
                {history.length > 0 && filteredHistory.length === 0 && searchQuery && (
                   <div className="text-center py-8 text-slate-500">
                     <p>No documents found matching "{searchQuery}"</p>
                   </div>
                )}

                {history.length > 0 && (
                  <div className="space-y-8">
                    {sortedCategories.map(category => (
                      <div key={category} className="animate-fade-in">
                        <div className="flex items-center gap-2 mb-3 text-slate-500">
                          {getCategoryIcon(category)}
                          <h4 className="text-sm font-bold uppercase tracking-wider">{category}</h4>
                          <span className="text-xs bg-slate-100 px-2 py-0.5 rounded-full text-slate-400">
                            {groupedHistory[category].length}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-1 gap-3">
                          {groupedHistory[category].map((item) => (
                            <div 
                                key={item.id} 
                                onClick={() => loadHistoryItem(item)}
                                className="group bg-white p-4 rounded-xl border border-slate-200 hover:border-gold-500 hover:shadow-md transition-all cursor-pointer flex items-center justify-between"
                              >
                                <div className="flex-1 min-w-0 pr-4">
                                  <div className="flex items-center gap-3 mb-1">
                                    <h4 className="font-semibold text-slate-800 truncate">{item.fileName}</h4>
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${
                                      item.fraud_score > 70 ? 'bg-red-100 text-red-700' :
                                      item.fraud_score > 40 ? 'bg-yellow-100 text-yellow-700' :
                                      'bg-green-100 text-green-700'
                                    }`}>
                                      Risk: {item.fraud_score}
                                    </span>
                                  </div>
                                  <p className="text-sm text-slate-500 truncate">{item.summary_snippet}</p>
                                  <p className="text-xs text-slate-400 mt-1 flex gap-2">
                                    <span>{new Date(item.timestamp).toLocaleDateString()}</span>
                                    <span>•</span>
                                    <span>{new Date(item.timestamp).toLocaleTimeString()}</span>
                                  </p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <button 
                                    onClick={(e) => handleDeleteHistory(e, item.id)}
                                    className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors opacity-0 group-hover:opacity-100"
                                    title="Delete from history"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                  <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-gold-500 transition-colors" />
                                </div>
                              </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
            </div>
          </div>
        )}

        {status === 'analyzing' && (
          <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-6">
            <div className="relative">
              <div className="absolute inset-0 bg-gold-500 blur-xl opacity-20 rounded-full animate-pulse"></div>
              <Loader2 className="w-16 h-16 text-navy-900 animate-spin relative z-10" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-xl font-bold text-navy-900">Analyzing Document</h3>
              <p className="text-slate-500">Classifying document, checking patterns, and calculating risk score...</p>
            </div>
          </div>
        )}

        {status === 'complete' && result && (
          <AnalysisResult data={result} onReset={handleReset} fileData={fileData} />
        )}

        {status === 'error' && (
          <div className="text-center space-y-4 bg-white p-8 rounded-2xl shadow-lg border border-red-100">
             <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto">
               <Shield className="w-8 h-8 text-red-500" />
             </div>
             <h3 className="text-xl font-bold text-slate-900">Analysis Failed</h3>
             <p className="text-red-500 max-w-md mx-auto">{errorMsg}</p>
             <button 
               onClick={handleReset}
               className="px-6 py-2 bg-navy-900 text-white rounded-lg hover:bg-navy-800 transition-colors"
             >
               Try Again
             </button>
          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="bg-navy-900 py-8 mt-auto print:hidden">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <p className="text-slate-400 text-sm">
            © {new Date().getFullYear()} LegalSense AI. <br className="md:hidden"/>
            <span className="opacity-50">Not legal advice. Consult an attorney for professional counsel.</span>
          </p>
        </div>
      </footer>
    </div>
  );
};

export default App;