"use client";

import * as React from "react";
import { Github, Heart, Zap, ExternalLink, Coffee } from "lucide-react";

const footerLinks = {
  product: [
    { label: "Packages", href: "/packages" },
    { label: "Applications", href: "/applications" },
    { label: "Add Your Package", href: "/how-to-add" },
  ],
  resources: [
    { label: "Zig Language", href: "https://ziglang.org", external: true },
    { label: "Zig Learn", href: "https://ziglearn.org", external: true },
    { label: "Zig Forum", href: "https://ziggit.dev", external: true },
  ],
  community: [
    { label: "GitHub", href: "https://github.com/Zig-Index/website", external: true },
  ],
};

export function Footer() {
  return (
    <footer className="border-t bg-muted/30">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="sm:col-span-2 lg:col-span-1">
            <a href="/" className="flex items-center gap-2 mb-4" title="Zig Index Home">
              <div className="flex items-center justify-center w-8 h-8 bg-primary rounded-lg hover:scale-105 transition-transform">
                <Zap className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="font-bold text-xl">Zig Index</span>
            </a>
            <p className="text-sm text-muted-foreground mb-4">
              Discover and explore the best Zig packages and applications. 
              Client-side, offline-first, and open source.
            </p>
            <div className="flex items-center gap-3">
              <a
                href="https://github.com/Zig-Index/website"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
                title="View on GitHub"
                aria-label="View Zig Index on GitHub"
              >
                <Github className="w-5 h-5" />
              </a>
              <a
                href="https://pay.muhammadfiaz.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
                title="Support the developer"
                aria-label="Donate to support the developer"
              >
                <Coffee className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Product Links */}
          <div>
            <h3 className="font-semibold mb-4">Product</h3>
            <ul className="space-y-2">
              {footerLinks.product.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    title={link.label}
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources Links */}
          <div>
            <h3 className="font-semibold mb-4">Resources</h3>
            <ul className="space-y-2">
              {footerLinks.resources.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    target={link.external ? "_blank" : undefined}
                    rel={link.external ? "noopener noreferrer" : undefined}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1"
                    title={link.label}
                  >
                    {link.label}
                    {link.external && <ExternalLink className="w-3 h-3" />}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="font-semibold mb-4">Support</h3>
            <ul className="space-y-2">
              <li>
                <a
                  href="https://github.com/Zig-Index/website"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  title="View on GitHub"
                >
                  GitHub
                </a>
              </li>
              <li>
                <a
                  href="https://pay.muhammadfiaz.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  title="Donate to support the developer"
                >
                  Donate
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Zig Index. Open source under MIT License.
          </p>
          <p className="text-sm text-muted-foreground flex items-center gap-1 flex-wrap justify-center">
            Made with <Heart className="w-4 h-4 text-red-500 fill-red-500" /> by{" "}
            <a 
              href="https://github.com/muhammad-fiaz" 
              target="_blank" 
              rel="noopener noreferrer"
              className="font-medium hover:text-foreground transition-colors underline-offset-4 hover:underline"
              title="View Muhammad Fiaz's GitHub profile"
            >
              Muhammad Fiaz
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
