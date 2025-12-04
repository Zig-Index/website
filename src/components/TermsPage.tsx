"use client";

import * as React from "react";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";

interface SearchItem {
  name: string;
  owner: string;
  repo: string;
  description: string;
  category?: string;
  type: "package" | "application";
  fullName: string;
}

interface TermsPageProps {
  searchItems?: SearchItem[];
}

export function TermsPage({ searchItems = [] }: TermsPageProps) {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar searchItems={searchItems} />

      <main className="flex-1 container mx-auto px-4 py-16">
        <div className="max-w-3xl mx-auto prose prose-neutral dark:prose-invert">
          <h1 className="text-3xl font-bold mb-8">Terms of Service</h1>

          <p className="text-muted-foreground mb-6">
            <strong>Last updated:</strong> {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Acceptance of Terms</h2>
            <p>
              By accessing and using Zig Index ("the Service"), you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Description of Service</h2>
            <p>
              Zig Index is a community-maintained index of Zig programming language packages and applications. The service provides:
            </p>
            <ul className="list-disc pl-6">
              <li>A searchable directory of Zig packages and applications</li>
              <li>Repository information and documentation links</li>
              <li>Community-contributed package registry data</li>
              <li>Search and filtering functionality</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">User Conduct</h2>
            <p>You agree to use the Service only for lawful purposes and in accordance with these Terms. You agree not to:</p>
            <ul className="list-disc pl-6">
              <li>Use the Service in any way that violates applicable laws or regulations</li>
              <li>Attempt to gain unauthorized access to any part of the Service</li>
              <li>Use the Service to transmit harmful, offensive, or inappropriate content</li>
              <li>Interfere with or disrupt the Service or servers</li>
              <li>Use automated tools to access the Service without permission</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Content and Intellectual Property</h2>

            <h3 className="text-xl font-medium mb-3">Third-Party Content</h3>
            <p>
              The Service displays information about packages and applications hosted on GitHub and other third-party platforms. We do not own or control this content. All rights belong to their respective owners.
            </p>

            <h3 className="text-xl font-medium mb-3 mt-4">Service Content</h3>
            <p>
              The Service itself is open-source software. The code, design, and functionality are licensed under the MIT License. You may use, modify, and distribute the Service code in accordance with that license.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Disclaimer of Warranties</h2>
            <p>
              The Service is provided "as is" without warranty of any kind, either express or implied, including but not limited to the implied warranties of merchantability, fitness for a particular purpose, and non-infringement. We do not guarantee the accuracy, completeness, or reliability of any content displayed.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Limitation of Liability</h2>
            <p>
              In no event shall Zig Index, its contributors, or maintainers be liable for any indirect, incidental, special, consequential, or punitive damages arising out of or related to your use of the Service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">External Links</h2>
            <p>
              The Service contains links to external websites and repositories. We are not responsible for the content, privacy policies, or practices of these external sites. Your interactions with third-party services are subject to their own terms and policies.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Data and Privacy</h2>
            <p>
              Your privacy is important to us. Please review our <a href="/privacy" className="text-primary hover:underline">Privacy Policy</a> for information about how we collect, use, and protect your data.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Service Availability</h2>
            <p>
              We strive to keep the Service available, but we do not guarantee uninterrupted access. The Service may be temporarily unavailable due to maintenance, technical issues, or other reasons beyond our control.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Changes to Terms</h2>
            <p>
              We reserve the right to modify these Terms at any time. Changes will be effective immediately upon posting on this page. Your continued use of the Service after changes constitutes acceptance of the new terms.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Governing Law</h2>
            <p>
              These Terms shall be governed by and construed in accordance with applicable laws. Any disputes arising from these Terms shall be resolved through appropriate legal channels.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Contact Information</h2>
            <p>
              If you have questions about these Terms, please open an issue on our <a href="https://github.com/Zig-Index/zig-index.github.io/issues" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">GitHub repository</a>.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Open Source</h2>
            <p>
              Zig Index is built by the community for the community. The source code is available on <a href="https://github.com/Zig-Index/zig-index.github.io" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">GitHub</a> under the MIT License.
            </p>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default TermsPage;