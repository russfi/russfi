import { Link } from "@inertiajs/react";
import { MobileSidebar } from "./mobile-sidebar";
import { UserNav } from "./user-nav";

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-zinc-900/50 backdrop-blur">
      <div className="container flex h-16 items-center px-4">
        <div className="flex items-center space-x-4">
          <MobileSidebar />
          <Link href="/" className="flex items-center space-x-2">
            <div className="h-8 w-8 rounded-lg bg-white flex items-center justify-center">
              <span className="text-black font-bold text-xl">R</span>
            </div>
            <span className="text-xl font-bold text-white">RussFi</span>
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-end space-x-4">
          <div className="flex items-center">
            <UserNav />
          </div>
        </div>
      </div>
    </header>
  );
}

// Export as both names for compatibility
export const AdminNavbar = Navbar;
