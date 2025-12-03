"use client";

import * as React from "react";
import { RepoDetailPage as RepoDetailContent } from "./RepoDetailPage";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";
import { EmptyState } from "./SyncStatus";
import { FileText } from "lucide-react";

// Client-side component that extracts owner/name from URL hash
export function RepoPageClient() {
  const [owner, setOwner] = React.useState<string | null>(null);
  const [name, setName] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    // Get the path from either query params or hash
    const params = new URLSearchParams(window.location.search);
    const ownerParam = params.get("owner");
    const nameParam = params.get("name");

    if (ownerParam && nameParam) {
      setOwner(ownerParam);
      setName(nameParam);
    } else {
      // Try to parse from hash: #owner/name
      const hash = window.location.hash.slice(1); // Remove #
      if (hash) {
        const parts = hash.split("/");
        if (parts.length >= 2) {
          setOwner(parts[0]);
          setName(parts.slice(1).join("/")); // Handle names with slashes
        } else {
          setError("Invalid URL format. Expected: /repo?owner=xxx&name=yyy or /repo#owner/name");
        }
      } else {
        setError("No repository specified. Use /repo?owner=xxx&name=yyy or /repo#owner/name");
      }
    }
  }, []);

  if (error) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 container mx-auto px-4 py-8">
          <EmptyState
            icon={<FileText className="w-12 h-12" />}
            title="Invalid URL"
            description={error}
            action={{
              label: "Go to Registry",
              onClick: () => window.location.href = "/registry",
            }}
          />
        </main>
        <Footer />
      </div>
    );
  }

  if (!owner || !name) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 container mx-auto px-4 py-8 flex items-center justify-center">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </main>
        <Footer />
      </div>
    );
  }

  return <RepoDetailContent owner={owner} name={name} />;
}

export default RepoPageClient;
