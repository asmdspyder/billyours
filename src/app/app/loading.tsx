import { AppLoader } from "@/components/ui/app-loader";

export default function AppLoading() {
  return (
    <div className="flex min-h-[60vh] flex-1 animate-in items-center justify-center p-[2rem] fade-in duration-300">
      <div className="flex flex-col items-center">
        <AppLoader size="lg" />
        <div className="mt-[0.875rem] text-center">
          <p className="text-[0.8125rem] font-black text-slate-900">Loading your workspace</p>
          <p className="mt-[0.25rem] text-[0.6875rem] font-semibold text-slate-400">Just a moment</p>
        </div>
      </div>
    </div>
  );
}
