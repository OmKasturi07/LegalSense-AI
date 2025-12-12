import React, { useMemo, useState } from 'react';
import { FullAnalysisResult } from '../types';
import FraudGauge from './FraudGauge';
import DocumentChat from './DocumentChat';
import { createChatSession } from '../services/geminiService';
import { 
  ShieldCheck, 
  AlertTriangle, 
  FileText, 
  Search, 
  CheckCircle,
  AlertOctagon,
  Printer,
  MessageSquare,
  Calendar,
  DollarSign,
  Users,
  MapPin,
  Bookmark,
  ChevronRight,
  ArrowRight,
  LayoutDashboard,
  ListChecks,
  Info
} from 'lucide-react';

interface AnalysisResultProps {
  data: FullAnalysisResult;
  onReset: () => void;
  fileData: { base64: string; mimeType: string } | null;
}

const AnalysisResult: React.FC<AnalysisResultProps> = ({ data, onReset, fileData }) => {
  const { legalSummary, fraudAnalysis } = data;
  const [activeTab, setActiveTab] = useState<'report' | 'chat'>('report');

  // Initialize chat session once when component mounts
  const chatSession = useMemo(() => {
    if (fileData) {
      return createChatSession(fileData.base64, fileData.mimeType);
    }
    return null;
  }, [fileData]);

  // Generate suggested questions based on clauses
  const suggestedQuestions = useMemo(() => {
    const questions = [
      "Is this standard for this type of document?",
      "What are the biggest risks here?",
      "Can I terminate this agreement early?"
    ];
    if (legalSummary.clauses.length > 0) {
      questions.unshift(`Explain the "${legalSummary.clauses[0].title}" clause in detail`);
    }
    return questions;
  }, [legalSummary]);

  const handlePrint = () => {
    setTimeout(() => {
      window.print();
    }, 100);
  };

  const getRiskVisuals = (score: number) => {
    if (score >= 75) return { 
      label: 'Critical Risk', 
      color: 'text-red-700', 
      bg: 'bg-red-50', 
      border: 'border-red-200',
      fill: '#ef4444',
      dotBg: 'bg-red-700',
      icon: AlertOctagon 
    };
    if (score >= 40) return { 
      label: 'Caution Advised', 
      color: 'text-amber-700', 
      bg: 'bg-amber-50', 
      border: 'border-amber-200', 
      fill: '#f59e0b',
      dotBg: 'bg-amber-700',
      icon: AlertTriangle 
    };
    return { 
      label: 'Likely Safe', 
      color: 'text-emerald-700', 
      bg: 'bg-emerald-50', 
      border: 'border-emerald-200', 
      fill: '#10b981',
      dotBg: 'bg-emerald-700',
      icon: ShieldCheck 
    };
  };

  const risk = getRiskVisuals(fraudAnalysis.fraud_score);
  const RiskIcon = risk.icon;

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 animate-fade-in pb-12 print:p-0 print:max-w-none">
      
      {/* Top Navigation & Controls */}
      <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4 border-b border-slate-200 pb-2 print:hidden">
        
        {/* Tabs */}
        <div className="flex bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('report')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'report' 
                ? 'bg-white text-navy-900 shadow-sm' 
                : 'text-slate-500 hover:text-navy-900'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            Analysis Report
          </button>
          <button
            onClick={() => setActiveTab('chat')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'chat' 
                ? 'bg-white text-navy-900 shadow-sm' 
                : 'text-slate-500 hover:text-navy-900'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            AI Assistant
          </button>
        </div>

        <div className="flex gap-3">
          <button 
            type="button"
            onClick={handlePrint}
            className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 shadow-sm"
          >
            <Printer className="w-4 h-4" />
            Print to PDF
          </button>
          <button 
            type="button"
            onClick={onReset}
            className="px-6 py-2 bg-navy-900 hover:bg-navy-800 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
          >
            New Analysis
          </button>
        </div>
      </div>

      {/* Print Header */}
      <div className="hidden print:block border-b border-slate-300 pb-4 mb-6">
        <div className="flex justify-between items-center">
           <div>
             <h1 className="text-2xl font-serif font-bold text-navy-900">LegalSense Report</h1>
             <p className="text-sm text-slate-500">Analysis for {fileData ? "uploaded document" : "document"}</p>
           </div>
           <div className="text-right">
             <p className="text-xs text-slate-400">{new Date().toLocaleDateString()}</p>
           </div>
        </div>
      </div>

      {/* REPORT CONTENT */}
      <div className={`${activeTab === 'report' ? 'block' : 'hidden'} print:block space-y-6`}>
        
        {/* 1. VERDICT BANNER */}
        <div className={`rounded-2xl border ${risk.border} ${risk.bg} overflow-hidden break-inside-avoid shadow-sm`}>
          <div className="flex flex-col md:flex-row">
            {/* Left: Gauge */}
            <div className="p-6 md:w-1/4 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-slate-200/50">
               <div className="h-40 w-full relative">
                 <FraudGauge score={fraudAnalysis.fraud_score} />
               </div>
            </div>
            
            {/* Right: Info */}
            <div className="p-6 md:w-3/4 flex flex-col justify-center">
              <div className="flex items-center gap-3 mb-2">
                 <RiskIcon className={`w-6 h-6 ${risk.color}`} />
                 <h2 className={`text-2xl font-bold ${risk.color}`}>{risk.label}</h2>
              </div>
              <p className="text-lg font-medium text-navy-900 mb-4">
                Recommended Action: <span className="font-bold">{fraudAnalysis.action}</span>
              </p>
              
              <div className="bg-white/60 rounded-xl p-4 border border-white/50">
                 <p className="text-sm font-semibold text-navy-900 mb-2 uppercase tracking-wide opacity-70">Analysis Logic</p>
                 <ul className="space-y-1">
                   {fraudAnalysis.why.map((point, i) => (
                     <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                       <span className={`mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${risk.dotBg}`}></span>
                       {point}
                     </li>
                   ))}
                 </ul>
              </div>
            </div>
          </div>
        </div>

        {/* 2. KEY HIGHLIGHTS (Horizontal Strip) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 break-inside-avoid">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
             <div className="flex items-center gap-2 text-slate-400 mb-1 text-xs font-bold uppercase">
               <FileText className="w-3 h-3" /> Document Type
             </div>
             <p className="font-semibold text-navy-900 truncate" title={legalSummary.category}>
               {legalSummary.category}
             </p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
             <div className="flex items-center gap-2 text-slate-400 mb-1 text-xs font-bold uppercase">
               <DollarSign className="w-3 h-3" /> Financials
             </div>
             <p className="font-semibold text-navy-900 truncate">
               {legalSummary.key_entities.amounts.length > 0 ? legalSummary.key_entities.amounts[0] : "None detected"}
               {legalSummary.key_entities.amounts.length > 1 && ` +${legalSummary.key_entities.amounts.length - 1} more`}
             </p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
             <div className="flex items-center gap-2 text-slate-400 mb-1 text-xs font-bold uppercase">
               <Calendar className="w-3 h-3" /> Dates
             </div>
             <p className="font-semibold text-navy-900 truncate">
               {legalSummary.key_entities.dates.length > 0 ? legalSummary.key_entities.dates[0] : "None detected"}
             </p>
          </div>
           <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
             <div className="flex items-center gap-2 text-slate-400 mb-1 text-xs font-bold uppercase">
               <ShieldCheck className="w-3 h-3" /> Confidence
             </div>
             <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-navy-900" style={{ width: `${legalSummary.confidence}%` }}></div>
                </div>
                <span className="text-sm font-semibold">{legalSummary.confidence}%</span>
             </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LEFT COL (Main Info) */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Executive Summary */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm break-inside-avoid">
              <div className="flex items-center gap-2 mb-4">
                <ListChecks className="w-5 h-5 text-navy-900" />
                <h3 className="text-lg font-bold text-navy-900">Executive Summary</h3>
              </div>
              <div className="space-y-3">
                {legalSummary.summary.map((item, i) => (
                  <div key={i} className="flex gap-3 text-slate-700">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <p className="leading-relaxed">{item}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Clauses */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm break-inside-avoid">
              <div className="flex items-center gap-2 mb-4">
                <Search className="w-5 h-5 text-navy-900" />
                <h3 className="text-lg font-bold text-navy-900">Clause Breakdown</h3>
              </div>
              <div className="grid gap-3">
                {legalSummary.clauses.map((clause, i) => (
                  <div key={i} className="p-4 bg-slate-50 rounded-xl border border-slate-100 hover:border-slate-300 transition-colors">
                     <h4 className="font-bold text-navy-900 text-sm mb-1">{clause.title}</h4>
                     <p className="text-sm text-slate-600 leading-relaxed">{clause.meaning}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Print Only Disclaimer */}
            <div className="hidden print:block pt-8 text-center text-xs text-slate-400">
              <p>LegalSense AI Analysis • Generated {new Date().toLocaleDateString()}</p>
              <p>This report is for informational purposes only and does not constitute legal advice.</p>
            </div>

          </div>

          {/* RIGHT COL (Sidebar) */}
          <div className="space-y-6">
            
            {/* Recommendations */}
            <div className="bg-navy-900 text-white p-6 rounded-2xl shadow-md break-inside-avoid print:bg-white print:text-black print:border print:border-slate-300">
               <div className="flex items-center gap-2 mb-4">
                 <ArrowRight className="w-5 h-5 text-gold-500 print:text-black" />
                 <h3 className="font-bold text-lg">Next Steps</h3>
               </div>
               <div className="space-y-4">
                 {legalSummary.recommendations.map((rec, i) => (
                   <div key={i} className="flex gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold text-gold-400 border border-white/10 print:bg-slate-100 print:text-black print:border-slate-200">
                        {i + 1}
                      </span>
                      <p className="text-sm text-slate-200 pt-0.5 leading-snug print:text-black">{rec}</p>
                   </div>
                 ))}
               </div>
            </div>

            {/* Red Flags (Conditional) */}
            {fraudAnalysis.suspicious_elements.length > 0 && (
              <div className="bg-white p-6 rounded-2xl border border-red-100 shadow-sm break-inside-avoid">
                 <div className="flex items-center gap-2 mb-4 text-red-700">
                   <AlertOctagon className="w-5 h-5" />
                   <h3 className="font-bold">Red Flags Detected</h3>
                 </div>
                 <div className="space-y-3">
                   {fraudAnalysis.suspicious_elements.map((el, i) => (
                     <div key={i} className="bg-red-50 p-3 rounded-lg border border-red-100 text-sm">
                        <p className="font-semibold text-red-900 mb-1">"{el.text}"</p>
                        <p className="text-red-700 opacity-90">{el.reason}</p>
                     </div>
                   ))}
                 </div>
              </div>
            )}

            {/* Entities List */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm break-inside-avoid">
               <div className="flex items-center gap-2 mb-4">
                 <Users className="w-5 h-5 text-navy-900" />
                 <h3 className="font-bold text-navy-900">Key Entities</h3>
               </div>
               
               <div className="space-y-4">
                 {legalSummary.key_entities.parties.length > 0 && (
                   <div>
                     <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Parties</p>
                     <div className="flex flex-wrap gap-2">
                       {legalSummary.key_entities.parties.map((p, i) => (
                         <span key={i} className="px-2 py-1 bg-slate-100 text-slate-700 text-xs rounded-md border border-slate-200">{p}</span>
                       ))}
                     </div>
                   </div>
                 )}
                 {legalSummary.key_entities.addresses.length > 0 && (
                   <div>
                     <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Locations</p>
                     <ul className="space-y-1">
                       {legalSummary.key_entities.addresses.map((a, i) => (
                         <li key={i} className="text-xs text-slate-600 flex gap-2">
                           <MapPin className="w-3 h-3 flex-shrink-0 mt-0.5" />
                           <span className="truncate">{a}</span>
                         </li>
                       ))}
                     </ul>
                   </div>
                 )}
               </div>
            </div>

            {/* Info Card */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 break-inside-avoid">
               <div className="flex gap-3">
                 <Info className="w-5 h-5 text-slate-400 flex-shrink-0" />
                 <p className="text-xs text-slate-500 leading-relaxed">
                   Analysis based on OCR text extraction. Always verify numbers and dates against the original document.
                 </p>
               </div>
            </div>

          </div>
        </div>
      </div>

      {/* CHAT CONTENT */}
      {activeTab === 'chat' && (
        <div className="print:hidden">
          {chatSession ? (
             <DocumentChat chatSession={chatSession} suggestedQuestions={suggestedQuestions} />
          ) : (
             <div className="text-center p-12 bg-white rounded-2xl border border-slate-200">
                <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-navy-900">Chat Unavailable</h3>
                <p className="text-slate-500">Please re-analyze the document to enable chat.</p>
             </div>
          )}
        </div>
      )}

    </div>
  );
};

export default AnalysisResult;