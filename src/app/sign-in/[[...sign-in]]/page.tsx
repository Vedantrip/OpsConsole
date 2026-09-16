import { SignIn } from "@clerk/nextjs";

const clerkAppearance = {
  variables: {
    colorPrimary: "#CC9A3D",
    colorText: "#1A1815",
    colorBackground: "#FFFFFF",
    colorInputBackground: "#FAF8F4",
    colorInputText: "#1A1815",
    colorTextSecondary: "#7A7266",
    borderRadius: "0.5rem",
    fontFamily: "var(--font-sans), system-ui, sans-serif",
  },
  elements: {
    card: "border border-[#E7E1D4] shadow-sm rounded-xl bg-white",
    headerTitle: "font-display font-semibold text-[#1A1815] text-lg",
    headerSubtitle: "text-xs text-[#7A7266]",
    formButtonPrimary: "bg-[#1A1815] hover:bg-[#211E1A] text-white font-medium text-xs rounded-md shadow-none transition-colors",
    formFieldInput: "border-[#E7E1D4] rounded-md focus:border-[#CC9A3D] text-xs",
    footerActionLink: "text-[#CC9A3D] hover:underline font-medium",
  },
};

export default function Page() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#FAF8F4] px-4 py-12 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(#E7E1D4_1px,transparent_1px)] [background-size:16px_16px] opacity-40 pointer-events-none" />
      <div className="relative z-10 w-full max-w-md flex flex-col items-center">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-10 h-10 rounded-lg bg-[#211E1A] text-[#CC9A3D] flex items-center justify-center font-bold text-sm font-mono shadow-sm mb-3">
            ML
          </div>
          <h1 className="text-xl font-display font-bold text-[#1A1815] tracking-tight">MountLift OpsConsole</h1>
          <p className="text-xs text-[#7A7266] mt-1">Creator partnerships & campaign execution</p>
        </div>
        <SignIn appearance={clerkAppearance} />
      </div>
    </div>
  );
}