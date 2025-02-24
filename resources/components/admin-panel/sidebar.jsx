import { Link, usePage } from "@inertiajs/react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { menuList } from "@/lib/menu-list";

export function AdminSidebar() {
  const { url } = usePage();

  return (
    <aside className="fixed bottom-0 left-0 top-0 z-30 hidden w-72 border-r border-white/10 bg-zinc-900 lg:block">
      <ScrollArea className="h-full py-6">
        <nav className="space-y-6 px-4">
          {menuList.map((group, idx) => (
            <div key={idx} className="flex flex-col space-y-2">
              <h4 className="text-xs font-semibold uppercase text-zinc-400">
                {group.title}
              </h4>
              {group.list.map((item, itemIdx) => (
                <Link
                  key={itemIdx}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                    url === item.href
                      ? "bg-zinc-800 text-zinc-50"
                      : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-50"
                  }`}
                >
                  <item.icon className="h-4 w-4" />
                  {item.title}
                </Link>
              ))}
            </div>
          ))}
        </nav>
      </ScrollArea>
    </aside>
  );
}
