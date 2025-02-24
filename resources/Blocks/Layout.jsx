import { ContentLayout } from "@/components/admin-panel/content-layout";

export default function Layout({ children, title }) {
    return (
        <ContentLayout title={title}>
            {children}
        </ContentLayout>
    );
}
