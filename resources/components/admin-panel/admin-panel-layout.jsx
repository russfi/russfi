import { useState, useEffect } from "react";
import { Link, usePage, router } from "@inertiajs/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { menuList } from "@/lib/menu-list";
import { UserNav } from "./user-nav";
import { ChevronLeft, LogOut, Copy, Check, Wallet } from "lucide-react";
import { usePrivy } from '@privy-io/react-auth';

export function AdminPanelLayout({ children, title }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const { auth, url } = usePage().props;
  const { logout: privyLogout } = usePrivy();
  const [isMounted, setIsMounted] = useState(false);

  const funds = Number(auth?.user?.funds ?? 0);
  const walletAddress = auth?.user?.wallet_address;

  useEffect(() => {
    setIsMounted(true);
    const handleOpenDialog = () => setIsOpen(true);
    window.addEventListener('openAddFundsDialog', handleOpenDialog);
    return () => window.removeEventListener('openAddFundsDialog', handleOpenDialog);
  }, []);

  const copyToClipboard = async () => {
    if (!walletAddress) return;
    try {
      await navigator.clipboard.writeText(walletAddress);
      setCopied(true);
      toast({
        title: "Address copied",
        description: "Wallet address has been copied to clipboard",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast({
        title: "Failed to copy",
        description: "Please try copying manually",
        variant: "destructive",
      });
    }
  };

  const handleLogout = async () => {
    await privyLogout();
    router.post(route('privy.logout'));
  };

  return (
    <div className="relative flex min-h-screen">
      {/* Sidebar */}
      <aside
        className={cn(
          "group/sidebar relative z-30 flex h-screen w-72 flex-col border-r border-white/10 bg-zinc-900 duration-300 !h-auto",
          isCollapsed && "w-20"
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center border-b border-white/10 px-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white">
              <span className="text-xl font-bold text-black">R</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={cn(
                "text-xl font-bold text-white duration-300",
                isCollapsed && "opacity-0"
              )}>RussFi</span>
              <span className={cn(
                "px-2 py-0.5 text-[10px] font-bold uppercase rounded-full text-white shadow-lg",
                isCollapsed && "opacity-0"
              )} style={{ background: 'linear-gradient(132deg, rgb(49, 112, 238), rgb(106, 0, 244), rgb(255, 69, 0))' }}>Beta</span>
            </div>
          </Link>
        </div>

        {/* Sidebar content */}
        <ScrollArea className="flex flex-1 flex-col py-6">
          <nav className="space-y-6 px-4">
            {menuList.map((group, idx) => (
              <div key={idx} className="flex flex-col space-y-2">
                <h4 className={cn(
                  "text-xs font-semibold uppercase text-zinc-400",
                  isCollapsed && "opacity-0"
                )}>
                  {group.title}
                </h4>
                {group.list.map((item, itemIdx) => {
                  const isActive = isMounted && (
                    window.location.pathname === item.href ||
                    (item.href !== '/' && window.location.pathname.startsWith(item.href))
                  );
                  
                  return (
                    <Link
                      key={itemIdx}
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 rounded-lg p-4 text-md font-medium transition-colors",
                        isActive
                          ? "bg-zinc-800 text-white border-l-2 border-white shadow-[inset_0_0_10px_rgba(255,255,255,0.1)]"
                          : "text-zinc-400 hover:bg-zinc-800/50 hover:text-white"
                      )}
                    >
                      <item.icon className={cn(
                        "h-5 w-5",
                        isActive ? "text-white" : "text-zinc-400"
                      )} />
                      <span className={cn(
                        "duration-300",
                        isCollapsed && "opacity-0",
                        isActive && "font-semibold"
                      )}>
                        {item.title}
                      </span>
                    </Link>
                  );
                })}
              </div>
            ))}
          </nav>
        </ScrollArea>

        {/* Sign out button at bottom */}
        <div className="border-t border-white/10 p-4">
          <button
            onClick={handleLogout}
            className={cn(
              "inline-flex h-10 w-full items-center justify-center whitespace-nowrap rounded-md text-sm font-medium text-zinc-400 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-white/10 bg-zinc-900 shadow-sm hover:bg-zinc-800/90 hover:text-white",
              isCollapsed && "justify-center"
            )}
          >
            <LogOut className={cn("h-4 w-4", !isCollapsed && "mr-3")} />
            <span className={cn(
              "duration-300",
              isCollapsed && "hidden"
            )}>Sign out</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 bg-zinc-950">
        {/* Header */}
        <header className="sticky top-0 z-40 border-b border-white/10 bg-black">
          <div className="flex h-16 items-center px-4">
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="relative right-[30px] inline-flex items-center justify-center whitespace-nowrap text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-white/10 bg-black shadow-sm hover:bg-zinc-900 hover:text-white rounded-md w-8 h-8 mr-4"
            >
              <ChevronLeft className={cn(
                "h-4 w-4 text-white transition-transform",
                isCollapsed && "rotate-180"
              )} />
            </button>
            {/* Hide title on mobile */}
            <h1 className="hidden md:block text-xl font-semibold text-white">{title}</h1>
            
            {/* Right section with user nav */}
            <div className="relative max-sm:left-[-25px] ml-auto">
              <UserNav />
            </div>
          </div>
        </header>

        {/* Page content */}
        <div className="mx-auto">
          {children}
        </div>
      </main>

      {/* Add Funds Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="w-[95vw] sm:max-w-md bg-zinc-900/95 border-white/10 rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-white">Add Funds to Your Account</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Send funds to the following wallet address. Only send "SONIC" to this address.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col space-y-4">
            {walletAddress ? (
              <>
                <div className="flex items-center space-x-2">
                  <div className="grid flex-1 gap-2">
                    <div className="font-mono bg-zinc-800/80 p-3 rounded-lg break-all text-xs sm:text-sm text-white backdrop-blur-sm">
                      {walletAddress}
                    </div>
                  </div>
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    onClick={copyToClipboard}
                    className="transition-all duration-300 border-white/10 hover:bg-zinc-800/80 backdrop-blur-sm rounded-lg"
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4 text-black" />
                    )}
                  </Button>
                </div>
                <div className="flex flex-col items-center p-4 bg-zinc-800/80 rounded-lg backdrop-blur-sm">
                  <img
                    src="https://sonicscan.org/assets/sonic/images/svg/logos/logo-dark.svg"
                    alt="Sonic Logo"
                    className="w-16 sm:w-20 h-16 sm:h-20 mb-4"
                  />
                  <p className="text-sm font-medium text-white">
                    Current Balance: <span className="font-bold">${funds.toFixed(2)}</span>
                  </p>
                </div>
                <p className="text-xs text-zinc-400 text-center">
                  Funds Will Be Added Within 2 Minute, After You Send Funds.
                </p>
                <div class="ModalFooter-sc-c97bf02f-1 iEKsca flex justify-center items-center"><a href="https://www.privy.io/" target="_blank"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 460 40" height="13" width="150"><g fill="var(--privy-color-foreground)"><path d="M0 15.4v15.38h4.64V19.96h3.58c2.47 0 3.63-.01 3.77-.02 1-.08 1.49-.15 2.18-.3a9.45 9.45 0 0 0 4.6-2.37c1.66-1.57 2.64-3.87 2.81-6.56.02-.3.02-1.19 0-1.49-.1-1.77-.56-3.35-1.36-4.72A8.84 8.84 0 0 0 15.14.57c-.93-.3-1.75-.43-3.09-.54C11.9.02 10.2 0 5.93 0H0ZM10.85 4c1.85.05 3.1.45 4.16 1.3.22.17.54.49.69.68a5.97 5.97 0 0 1 1.19 3.13c.04.35.04 1.36 0 1.71-.08.68-.23 1.3-.44 1.85a4.8 4.8 0 0 1-1.09 1.68A5.63 5.63 0 0 1 12 15.92c-.6.08-.4.08-4.01.09H4.64V3.98h2.9c1.6 0 3.08 0 3.31.02ZM187.65 5.71v5.72h-.27l-.09-.14a15.9 15.9 0 0 0-1.21-1.73c-.43-.5-1-.95-1.7-1.36-.54-.3-1.05-.5-1.73-.63a8.98 8.98 0 0 0-1.7-.17 8.84 8.84 0 0 0-7.8 4.03 12.95 12.95 0 0 0-2.03 6.39c-.07.98-.06 2.15.02 3.13.2 2.47.87 4.53 2.02 6.25a8.98 8.98 0 0 0 10.22 3.65 6.5 6.5 0 0 0 2.8-1.93c.41-.51.84-1.1 1.1-1.55l.1-.17h.37v3.58h4.38V0h-4.48Zm-5.24 5.54c1.3.14 2.3.6 3.17 1.48.9.9 1.5 2.09 1.85 3.64.36 1.6.39 3.72.06 5.43a8.13 8.13 0 0 1-1.54 3.62 5.1 5.1 0 0 1-3.93 1.96 6.13 6.13 0 0 1-2.32-.31 5.87 5.87 0 0 1-3.33-3.5c-.39-1-.62-2.05-.72-3.32-.03-.32-.04-1.35-.02-1.73.08-1.56.4-2.91.96-4.05a6.2 6.2 0 0 1 1.06-1.58 5.08 5.08 0 0 1 3.6-1.66c.25-.02.9 0 1.16.02ZM210.07 15.39l.01 15.38h4.38l.01-3.57h.37l.09.15c.24.44.84 1.26 1.21 1.7a6.79 6.79 0 0 0 2.57 1.75 9.3 9.3 0 0 0 6.86-.49 9.28 9.28 0 0 0 4.05-4.07A13.05 13.05 0 0 0 231 21.6c.21-1.73.18-3.7-.09-5.32a13.03 13.03 0 0 0-1.5-4.3 9.1 9.1 0 0 0-3.75-3.63 9.15 9.15 0 0 0-4.43-.96 7.46 7.46 0 0 0-2.8.5A7.07 7.07 0 0 0 216 9.7c-.4.52-.82 1.12-1.1 1.59l-.07.14h-.27V0h-4.5Zm11.13-4.14c1.07.1 1.94.44 2.7 1.04a6.1 6.1 0 0 1 1.64 1.98c.43.84.78 2 .94 3.11.15 1.16.16 2.4.02 3.54a9.34 9.34 0 0 1-1.39 4.03 5.33 5.33 0 0 1-2.69 2.15c-.9.3-2.04.38-3.06.2a5.14 5.14 0 0 1-3.45-2.37 6.03 6.03 0 0 1-.45-.8c-.5-1.03-.8-2.2-.92-3.58-.04-.49-.06-.89-.05-1.53.01-.76.05-1.23.13-1.85.38-2.53 1.47-4.38 3.15-5.31a5.46 5.46 0 0 1 2.3-.63 10 10 0 0 1 1.13.02ZM69.05 2.17l-.01 2.77V7.7h-3.36v3.6h3.36v6.8l.01 7.15c.06 1.4.4 2.44 1.1 3.37a5.8 5.8 0 0 0 2.97 2.07c.91.3 1.83.42 2.9.38a8.71 8.71 0 0 0 2.66-.48l-.8-3.7-.38.06a4.96 4.96 0 0 1-2.43-.06c-.33-.1-.56-.25-.8-.49-.4-.41-.6-.88-.7-1.67-.02-.2-.02-.62-.03-6.82v-6.6h4.73V7.7h-4.73V2.16h-4.49ZM133.34 2.17V7.7h-3.39v3.6h3.38v6.9l.01 7.17a5.66 5.66 0 0 0 2.36 4.49c.85.6 2.03 1.03 3.26 1.17.85.1 2.03.05 2.81-.1.3-.06.75-.18 1-.26l.2-.06v-.05l-.81-3.67-.37.06a4.99 4.99 0 0 1-1.8.09c-.85-.13-1.32-.4-1.7-.97a2.63 2.63 0 0 1-.39-1.04c-.06-.4-.06 0-.06-7.1V11.3h4.7V7.7h-4.7l-.01-2.77V2.16h-4.49ZM293.41 2.36a14.56 14.56 0 0 0-13.7 16.07 14.59 14.59 0 0 0 21.86 11.08 14.5 14.5 0 0 0 7.11-14.07 14.61 14.61 0 0 0-6.53-10.73 14.49 14.49 0 0 0-8.74-2.35ZM350.8 2.36a10.17 10.17 0 0 0-7.56 4.2c-.16.2-.45.63-.58.83l-.05.1h-.47l-.01-4.36h-7.36v36.4h7.82V27.27h.49l.05.07a11.3 11.3 0 0 0 7.49 4.15 10.52 10.52 0 0 0 9.38-4.1c1.66-2.1 2.73-4.9 3.07-8.06.1-.87.13-1.4.13-2.37 0-.8 0-1.1-.07-1.76a15.95 15.95 0 0 0-3.23-8.72 12.8 12.8 0 0 0-1.85-1.84 10.49 10.49 0 0 0-7.26-2.28Zm-.94 6.05c1.27.15 2.33.65 3.2 1.5.98.96 1.67 2.31 2.03 4 .34 1.57.38 3.68.12 5.39a9.78 9.78 0 0 1-1.04 3.25c-.14.25-.44.69-.6.89a5.35 5.35 0 0 1-4.31 2.07 5.25 5.25 0 0 1-4.41-1.9 7.35 7.35 0 0 1-1.26-2.32 14.09 14.09 0 0 1-.62-4.83c.05-1.98.38-3.53 1.02-4.85a5.63 5.63 0 0 1 2.5-2.65c.66-.34 1.3-.5 2.14-.58.18-.02 1.04 0 1.23.03ZM363.63 3.1l-.01 3.2v3.16h1.43c1.26.01 1.44.02 1.54.04.42.09.66.28.79.62.08.23.08.08.08 2.96a911.57 911.57 0 0 1 .03 10.18v7.54h7.82v-7.4l.01-7.83c.03-.94.11-1.63.27-2.28.46-1.9 1.54-2.93 3.35-3.23.52-.08.2-.08 5-.08h4.4V3.08h-3.1c-3.48 0-3.91.01-4.67.1-1.83.2-3.04.79-3.96 1.88-.5.6-.9 1.32-1.26 2.26l-.06.17h-.46V3.09h-5.6c-4.46 0-5.6 0-5.6.02ZM390.8 16.95V30.8h3.87l3.86-.01V3.09h-7.73ZM400.6 3.1l-.01.4v.38l4.66 13.4 4.69 13.47.02.05h10.3l.03-.05 4.67-13.45 4.67-13.4V3.1h-7.43l-6.7 19.26h-.5l-3.28-9.5-3.31-9.64-.05-.12h-3.88l-3.88.01ZM430.98 3.1c-.01 0-.02.19-.02.4v.39l5.08 14.59c2.8 8.02 5.08 14.6 5.08 14.61.01.02-.22.02-4.8.02h-4.82v6.42h4.95c5.09 0 5.23 0 5.87-.06 3.15-.28 5.29-1.63 6.63-4.15.28-.55.44-.95.87-2.16L459 6.78l1-2.89v-.8h-7.43l-6.69 19.26h-.5l-3.27-9.46-3.31-9.64-.06-.16h-3.88l-3.88.01ZM36.57 7.36c-1.36.1-2.6.6-3.62 1.45a5.65 5.65 0 0 0-1.67 2.42l-.05.13H31V7.7h-4.35v23.08h4.5v-7.3c0-8 0-7.34.08-7.82a4.89 4.89 0 0 1 2.06-3.18c.83-.58 1.74-.89 2.87-.98a11.87 11.87 0 0 1 2.8.25H39v-4.3l-.21-.02c-.61-.07-1.74-.1-2.22-.07ZM51.08 7.41c-2.33.12-4.3.84-5.95 2.16a9.89 9.89 0 0 0-2.03 2.2 12.5 12.5 0 0 0-2 5.78 18.04 18.04 0 0 0 0 3.65 12.13 12.13 0 0 0 2.26 6.05 9.74 9.74 0 0 0 5 3.52c2.11.64 4.7.64 6.8 0a9.78 9.78 0 0 0 4.88-3.37c1.38-1.78 2.19-4 2.4-6.58.13-1.46.06-3.06-.18-4.42a11.24 11.24 0 0 0-3.58-6.6 10 10 0 0 0-5.75-2.35c-.56-.06-1.31-.07-1.85-.04Zm1.42 3.78c.88.1 1.62.34 2.28.75a6.13 6.13 0 0 1 1.99 2.15 10.31 10.31 0 0 1 1.2 5c.02 1.23-.12 2.44-.42 3.51a7.14 7.14 0 0 1-1.81 3.32c-.61.6-1.2.98-1.95 1.24a6 6 0 0 1-2 .3 5.7 5.7 0 0 1-2.72-.6 5 5 0 0 1-1.28-.94A7.1 7.1 0 0 1 46 22.73c-.57-1.99-.6-4.46-.08-6.5a7.24 7.24 0 0 1 2.03-3.67 5.13 5.13 0 0 1 3.35-1.4 11 11 0 0 1 1.2.03ZM92.05 7.4c-.96.06-1.56.15-2.3.33a9.62 9.62 0 0 0-6.09 4.66 13.5 13.5 0 0 0-1.71 7c0 .83 0 1.04.06 1.6.16 1.77.58 3.32 1.29 4.7A9.72 9.72 0 0 0 90.28 31c1.84.37 4.08.32 5.85-.13a9.07 9.07 0 0 0 5.02-3.1A7.64 7.64 0 0 0 102.5 25l-2.11-.39-2.11-.38-.08.13a4.72 4.72 0 0 1-2.35 2.55 6.3 6.3 0 0 1-2.23.58c-.29.03-1.13.03-1.44 0a6.35 6.35 0 0 1-3.02-1.04 5.93 5.93 0 0 1-2.02-2.43 8.44 8.44 0 0 1-.72-3.18v-.26h16.38v-.81c0-1.83-.06-2.76-.25-3.87-.2-1.22-.53-2.24-1.05-3.28a8.9 8.9 0 0 0-2.66-3.26 10.1 10.1 0 0 0-5.34-1.94 18.3 18.3 0 0 0-1.46-.03Zm1.3 3.75c1.2.13 2.19.55 3.05 1.3a5.8 5.8 0 0 1 1.78 2.96c.13.51.21 1.17.21 1.66v.15H86.43v-.12c.08-.97.3-1.78.72-2.61.5-1 1.2-1.8 2.14-2.42a5.32 5.32 0 0 1 2.9-.95c.2-.01.97 0 1.17.03ZM116.79 7.41c-2 .1-3.73.65-5.22 1.65a10.7 10.7 0 0 0-4.25 6.06 16.1 16.1 0 0 0-.5 5.8c.2 2.17.84 4.13 1.88 5.76.58.9 1.32 1.73 2.15 2.4a9.37 9.37 0 0 0 3.6 1.8 12.06 12.06 0 0 0 3.92.34 10.2 10.2 0 0 0 3.84-.95 8.31 8.31 0 0 0 4.76-6.75l.01-.04h-4.37l-.05.16a4.87 4.87 0 0 1-4.24 3.75c-.59.07-1.32.06-1.93-.05a5.47 5.47 0 0 1-3.5-2.27c-.56-.75-1-1.73-1.26-2.79a13.8 13.8 0 0 1-.16-5.24 7.77 7.77 0 0 1 2.1-4.3 5.48 5.48 0 0 1 2.15-1.3 6.4 6.4 0 0 1 3.89.1c.59.21 1.03.5 1.5.96a5.32 5.32 0 0 1 1.46 2.5l.04.15h4.37v-.06a8.22 8.22 0 0 0-5.31-6.94 10.98 10.98 0 0 0-4.88-.74ZM156.2 7.41a9.87 9.87 0 0 0-6 2.29 11.02 11.02 0 0 0-3.41 5.43c-.52 1.78-.68 3.9-.48 5.97.17 1.8.63 3.38 1.37 4.8a9.68 9.68 0 0 0 5.91 4.86c1.65.48 3.63.61 5.53.36 3.72-.49 6.55-2.62 7.56-5.69.12-.39.13-.42.1-.43-.02 0-4.13-.75-4.19-.75-.03 0-.04 0-.1.16-.18.42-.45.9-.72 1.22-.16.2-.49.53-.7.7-.67.54-1.5.9-2.43 1.08-.48.08-.83.11-1.41.11-.64 0-1.07-.04-1.6-.15a5.76 5.76 0 0 1-3.93-2.83 8 8 0 0 1-.99-3.79v-.16h16.38v-1.11l-.02-1.43c-.1-2.25-.53-4-1.35-5.59a9.24 9.24 0 0 0-6.18-4.75c-1.04-.26-2.2-.36-3.33-.3Zm1.45 3.74a5.35 5.35 0 0 1 3.66 1.94 6.1 6.1 0 0 1 1.38 4.01v.12h-11.97v-.06c0-.02 0-.14.02-.25a6.6 6.6 0 0 1 2.15-4.32 5.73 5.73 0 0 1 3.5-1.46c.25-.02 1 0 1.26.02ZM233.58 7.82l8.37 23.22a49.22 49.22 0 0 1-.67 1.9 5.36 5.36 0 0 1-1.14 1.8c-.41.4-.82.58-1.48.69-.27.04-1.03.03-1.35 0a8.05 8.05 0 0 1-1.1-.23l-1.08 3.67c0 .02.32.14.66.22.83.21 1.57.29 2.56.28.56-.01.8-.03 1.24-.1 2.71-.4 4.66-2.09 5.86-5.08l9.64-26.44c0-.02-4.82-.06-4.83-.05l-2.93 8.96-2.91 8.94h-.24l-.22-.65-2.91-8.95-2.7-8.3H233.53ZM293.05 35.8c-1.18.04-1.93.09-2.8.16-2.52.24-4.53.69-5.43 1.23-.7.41-.76.86-.2 1.28.88.66 3.29 1.19 6.36 1.4a48.55 48.55 0 0 0 5.75.05c3.47-.19 6.24-.78 7.11-1.5.22-.19.3-.34.3-.53 0-.1 0-.12-.04-.22-.35-.69-2.32-1.3-5.25-1.63a41.09 41.09 0 0 0-5.8-.24Zm0 0"></path></g></svg></a></div>
              </>
            ) : (
              <div className="text-center p-4">
                <p className="text-sm text-zinc-400">
                  No wallet address is set up for your account. Please contact support.
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
