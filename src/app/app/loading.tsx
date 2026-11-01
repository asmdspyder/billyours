import { Loader2 } from "lucide-react";

export default function AppLoading() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 min-h-[60vh] animate-in fade-in duration-200">
      <div className="bg-white/90 backdrop-blur-md p-6 rounded-2xl border border-slate-200/80 shadow-lg flex flex-col items-center gap-3">
        <div className="relative flex items-center justify-center">
          <div className="w-10 h-10 rounded-full border-3 border-blue-100 border-t-blue-600 animate-spin" />
          <Loader2 className="w-5 h-5 text-blue-600 absolute animate-pulse" />
        </div>
        <div className="text-center">
          <p className="text-xs font-bold text-slate-800 tracking-wide">Loading page...</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Please wait a moment</p>
        </div>
      </div>
    </div>
  );
}
