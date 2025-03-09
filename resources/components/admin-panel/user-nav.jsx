"use client";

import { Link, usePage, router } from "@inertiajs/react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { LayoutGrid, User, LogOut, Wallet, EqualIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePrivy } from '@privy-io/react-auth';
import WithdrawDialog from '@/Components/WithdrawFunds';

export function UserNav() {
  const { auth } = usePage().props;
  const { logout: privyLogout } = usePrivy();
  
  // Get first two letters of the name
  const initials = auth.user.name
    .split(' ')
    .map(part => part.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const handleLogout = async () => {
    // First logout from Privy
    await privyLogout();
    // Then logout from Laravel
    router.post(route('privy.logout'));
  };

  const openAddFundsDialog = () => {
    window.dispatchEvent(new CustomEvent('openAddFundsDialog'));
  };

  return (
    <div className="flex items-center gap-4">
      {/* Add Funds Button - Now visible on mobile */}
      <Button
        onClick={openAddFundsDialog}
        size="sm"
        className="flex items-center gap-2 bg-zinc-800/80 hover:bg-zinc-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 backdrop-blur-sm"
      >
        <Wallet className="h-4 w-4" />
        <span className="hidden sm:inline">Add Funds</span>
      </Button>

      {/* Withdraw Button */}
      <WithdrawDialog />

      {/* Balance Display - Hidden on mobile */}
      <div className="hidden sm:flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg bg-zinc-800/50 border border-white/10 backdrop-blur-sm">
        <span className="text-xs sm:text-sm text-zinc-400">Balance:</span>
        <span className="text-xs sm:text-sm font-semibold text-white">
          {Number(auth.user.funds).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      </div>

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full ring-1 ring-white/10 p-[20px]" style={{ background: "linear-gradient(132deg, #3170ee, #6a00f4, #ff4500)" }}>
                    <span className="text-md font-extrabold text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]">
                      {initials}
                    </span>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-black border border-white/10">
                {/* User info section */}
                <div className="border-b border-white/10 px-2 py-2.5">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-white">{auth.user.name}</span>
                    <span className="text-xs text-zinc-500">{auth.user.email}</span>
                  </div>
                </div>
                
                {/* Navigation items */}
                <DropdownMenuItem asChild className="text-white">
                  <Link 
                    href="/dashboard" 
                    className="flex items-center gap-3 px-2 py-2.5 text-sm font-medium text-white hover:bg-zinc-900 hover:text-white"
                  >
                    <LayoutGrid className="h-4 w-4" />
                    Dashboard
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="text-white">
                  <Link 
                    href="/profile" 
                    className="flex items-center gap-3 px-2 py-2.5 text-sm font-medium text-white hover:bg-zinc-900 hover:text-white"
                  >
                    <User className="h-4 w-4" />
                    My Profile
                  </Link>
                </DropdownMenuItem>
                
                <DropdownMenuSeparator className="bg-white/10" />
                
                {/* Sign out button */}
                <DropdownMenuItem asChild className="text-white">
                  <button 
                    onClick={handleLogout}
                    className="flex w-full items-center gap-3 px-2 py-2.5 text-sm font-medium text-white hover:bg-zinc-900 hover:text-white"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </button>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </TooltipTrigger>
          <TooltipContent>
            <p>Profile</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}
