import { Navbar } from "@/components/admin-panel/navbar";

export function ContentLayout({
  title,
  children
}) {
  return (
    (<div>
      <Navbar title={title} />
      <div className="container pt-8 pb-8 px-4 sm:px-8">{children}</div>
    </div>)
  );
}
