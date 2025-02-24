import { Link } from "@inertiajs/react";

export function Footer() {
  return (
    <div className="z-20 w-full bg-zinc-900/50 border-t border-white/10 backdrop-blur">
      <div className="mx-4 md:mx-8 flex h-14 items-center">
        <p className="text-xs md:text-sm leading-loose text-zinc-400">
          Built with{" "}
          <a
            href="https://ui.shadcn.com"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium underline underline-offset-4 text-white hover:text-white/80"
          >
            shadcn/ui
          </a>
          . View source on{" "}
          <a
            href="https://github.com/russdefi"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium underline underline-offset-4 text-white hover:text-white/80"
          >
            GitHub
          </a>
        </p>
      </div>
    </div>
  );
}
