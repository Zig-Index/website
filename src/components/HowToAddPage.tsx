"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { 
  Tag, 
  CheckCircle, 
  Copy, 
  ExternalLink,
  BookOpen,
  Github,
  ArrowRight
} from "lucide-react";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

function CodeBlock({ code, language = "text" }: { code: string; language?: string }) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group">
      <pre className="bg-muted/50 border rounded-lg p-4 overflow-x-auto text-sm">
        <code>{code}</code>
      </pre>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={handleCopy}
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
        title={copied ? "Copied!" : "Copy code"}
        aria-label={copied ? "Copied to clipboard" : "Copy code to clipboard"}
      >
        {copied ? (
          <CheckCircle className="w-4 h-4 text-green-500" />
        ) : (
          <Copy className="w-4 h-4" />
        )}
      </Button>
    </div>
  );
}

export function HowToAddPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden mesh-gradient hero-gradient py-20">
          {/* Animated background */}
          <div className="absolute inset-0 -z-10 overflow-hidden">
            <div className="absolute top-10 left-[10%] w-72 h-72 bg-linear-to-r from-primary/15 to-purple-500/15 rounded-full blur-3xl blob morph" />
            <div className="absolute bottom-10 right-[10%] w-80 h-80 bg-linear-to-r from-blue-500/10 to-primary/10 rounded-full blur-3xl blob blob-delay-1" />
            {/* Grid pattern */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.02)_1px,transparent_1px)] dark:bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-size-[60px_60px]" />
          </div>
          
          <div className="container mx-auto px-4 relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-3xl mx-auto text-center"
            >
              <Badge variant="outline" className="mb-4 glass">
                <BookOpen className="w-3 h-3 mr-1.5" />
                Developer Guide
              </Badge>
              <h1 className="text-4xl sm:text-5xl font-bold mb-4">
                Add Your <span className="gradient-text">Zig Project</span>
              </h1>
              <p className="text-xl text-muted-foreground">
                Get your Zig library or application listed on Zig Index by submitting a Pull Request.
                It's simple, curated, and gives you full control.
              </p>
            </motion.div>
          </div>
        </section>

        {/* Steps Section */}
        <section className="py-16 gradient-bg relative overflow-hidden">
          {/* Background decoration */}
          <div className="absolute inset-0 -z-10 overflow-hidden">
            <div className="absolute top-0 right-0 w-96 h-96 bg-linear-to-br from-primary/5 to-purple-500/5 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-linear-to-br from-blue-500/5 to-primary/5 rounded-full blur-3xl" />
          </div>
          
          <div className="container mx-auto px-4 max-w-4xl relative z-10">
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="space-y-8"
            >
              {/* Step 1: Fork the Repo */}
              <motion.div variants={itemVariants}>
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                        1
                      </div>
                      <div>
                        <CardTitle>Fork the Registry Repository</CardTitle>
                        <CardDescription>Start by forking the registry repo</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-muted-foreground">
                      Zig Index uses a curated registry of JSON files. To add your project, you'll need to submit a Pull Request.
                    </p>

                    <div className="flex flex-wrap gap-4">
                      <Button asChild title="Fork Zig Index registry on GitHub">
                        <a href="https://github.com/Zig-Index/registry/fork" target="_blank" rel="noopener noreferrer">
                          <Github className="w-4 h-4 mr-2" />
                          Fork Registry
                          <ExternalLink className="w-3 h-3 ml-2" />
                        </a>
                      </Button>
                      <Button variant="outline" asChild title="View Zig Index registry on GitHub">
                        <a href="https://github.com/Zig-Index/registry" target="_blank" rel="noopener noreferrer">
                          View Registry
                          <ExternalLink className="w-3 h-3 ml-2" />
                        </a>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Step 2: Create JSON File */}
              <motion.div variants={itemVariants}>
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                        2
                      </div>
                      <div>
                        <CardTitle>Create a JSON Entry</CardTitle>
                        <CardDescription>Add your project information</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-muted-foreground">
                      Create a new JSON file in the appropriate folder based on your project type:
                    </p>

                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="p-4 border rounded-lg bg-card hover:shadow-md transition-shadow">
                        <h4 className="font-semibold mb-2 flex items-center gap-2">
                          <Tag className="w-4 h-4 text-blue-500" />
                          For Libraries/Packages
                        </h4>
                        <code className="text-sm bg-muted px-2 py-1 rounded block break-all">
                          repositories/packages/your-package.json
                        </code>
                      </div>

                      <div className="p-4 border rounded-lg bg-card hover:shadow-md transition-shadow">
                        <h4 className="font-semibold mb-2 flex items-center gap-2">
                          <Tag className="w-4 h-4 text-green-500" />
                          For Applications/Tools
                        </h4>
                        <code className="text-sm bg-muted px-2 py-1 rounded block break-all">
                          repositories/applications/your-app.json
                        </code>
                      </div>
                    </div>

                    <Tabs defaultValue="package" className="w-full">
                      <TabsList>
                        <TabsTrigger value="package">Package Example</TabsTrigger>
                        <TabsTrigger value="application">Application Example</TabsTrigger>
                      </TabsList>
                      <TabsContent value="package" className="mt-4">
                        <CodeBlock
                          language="json"
                          code={`{
  "name": "Your Package Name",
  "owner": "your-github-username",
  "repo": "your-repo-name",
  "description": "A brief description of what your package does",
  "homepage": "https://your-docs-site.com",
  "license": "MIT",
  "category": "networking"
}`}
                        />
                      </TabsContent>
                      <TabsContent value="application" className="mt-4">
                        <CodeBlock
                          language="json"
                          code={`{
  "name": "Your Application Name",
  "owner": "your-github-username",
  "repo": "your-repo-name",
  "description": "A brief description of what your application does",
  "homepage": "https://your-app-website.com",
  "license": "GPL-3.0",
  "category": "development-tools"
}`}
                        />
                      </TabsContent>
                    </Tabs>

                    <div className="bg-muted/50 p-4 rounded-lg">
                      <h4 className="font-semibold mb-2">JSON Schema Fields:</h4>
                      <ul className="space-y-1 text-sm text-muted-foreground">
                        <li><strong>name</strong> (required): Display name for your project</li>
                        <li><strong>owner</strong> (required): GitHub username or organization</li>
                        <li><strong>repo</strong> (required): Repository name (without owner)</li>
                        <li><strong>description</strong> (required): Short description (max 200 chars recommended)</li>
                        <li><strong>homepage</strong> (optional): Documentation or website URL</li>
                        <li><strong>license</strong> (optional): License identifier (MIT, GPL-3.0, etc.)</li>
                        <li><strong>category</strong> (optional): Category for filtering (e.g., gui, networking, game-engine, database, etc.)</li>
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Step 3: Submit PR */}
              <motion.div variants={itemVariants}>
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                        3
                      </div>
                      <div>
                        <CardTitle>Submit a Pull Request</CardTitle>
                        <CardDescription>Get your project reviewed and merged</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-muted-foreground">
                      Create a Pull Request with your new JSON file. A maintainer will review it 
                      to ensure your project meets the quality guidelines.
                    </p>

                    <div className="bg-muted/50 p-4 rounded-lg">
                      <h4 className="font-semibold mb-2">PR Checklist:</h4>
                      <ul className="space-y-2 text-sm text-muted-foreground">
                        <li className="flex items-start gap-2">
                          <CheckCircle className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                          <span>JSON file is valid and follows the schema</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                          <span>Repository exists and is publicly accessible</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                          <span>Project is related to Zig programming language</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                          <span>Has a README with description and usage</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                          <span>Has a license file</span>
                        </li>
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Step 4: Write a Good README */}
              <motion.div variants={itemVariants}>
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                        4
                      </div>
                      <div>
                        <CardTitle>Write a Good README</CardTitle>
                        <CardDescription>Help users understand your project</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-muted-foreground">
                      A well-written README helps users understand what your package does 
                      and how to use it. Include these sections:
                    </p>

                    <Tabs defaultValue="template" className="w-full">
                      <TabsList>
                        <TabsTrigger value="template">Template</TabsTrigger>
                        <TabsTrigger value="tips">Tips</TabsTrigger>
                      </TabsList>
                      <TabsContent value="template" className="mt-4">
                        <CodeBlock
                          language="markdown"
                          code={`# Your Package Name

Short description of what your package does.

## Features

- Feature 1
- Feature 2
- Feature 3

## Installation

Add this to your \`build.zig.zon\`:

\`\`\`zig
.dependencies = .{
    .your_package = .{
        .url = "https://github.com/you/your-package/archive/refs/tags/v1.0.0.tar.gz",
        .hash = "...",
    },
},
\`\`\`

## Usage

\`\`\`zig
const lib = @import("your_package");

pub fn main() !void {
    // Example usage
}
\`\`\`

## API Reference

Document your public API here.

## License

MIT License - see LICENSE file for details.`}
                        />
                      </TabsContent>
                      <TabsContent value="tips" className="mt-4">
                        <ul className="space-y-3">
                          <li className="flex items-start gap-2">
                            <CheckCircle className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                            <span>Start with a clear, one-line description</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <CheckCircle className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                            <span>Include installation instructions for Zig's package manager</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <CheckCircle className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                            <span>Provide usage examples with actual code</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <CheckCircle className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                            <span>Document minimum Zig version requirements</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <CheckCircle className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                            <span>Add badges for build status, version, etc.</span>
                          </li>
                        </ul>
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>
              </motion.div>

              {/* What happens next */}
              <motion.div variants={itemVariants}>
                <Card className="bg-primary text-primary-foreground">
                  <CardHeader>
                    <CardTitle>What Happens Next?</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-primary-foreground/90">
                      Once your PR is merged, your project will appear on Zig Index immediately!
                      The site is rebuilt automatically when changes are merged.
                      Live stats (stars, forks, watchers) are fetched on-demand from GitHub.
                    </p>

                    <div className="flex flex-wrap gap-4">
                      <Button variant="secondary" asChild>
                        <a href="/packages">
                          Browse Packages
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </a>
                      </Button>
                      <Button variant="secondary" asChild>
                        <a href="/applications">
                          Browse Applications
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </a>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4 max-w-4xl">
            <h2 className="text-2xl font-bold mb-8 text-center">Frequently Asked Questions</h2>
            
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">How long until my project appears?</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Once your PR is reviewed and merged, your project will appear immediately after 
                    the site is rebuilt. This usually takes just a few minutes.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Can I update my project information?</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Yes! Simply submit another PR to update your JSON file. You can change the description,
                    topics, homepage, or any other field.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Can I remove my project from Zig Index?</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Yes! Submit a PR to delete your JSON file from the registry. 
                    The change will take effect after the PR is merged.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Why do I need to submit a PR?</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    The PR-based system ensures quality control and prevents spam. It also gives you 
                    full control over how your project is described and categorized. The curated approach 
                    keeps the registry focused on high-quality Zig projects.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Where does the star/fork data come from?</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Live stats are fetched from GitHub's API when users view the registry. 
                    This data is cached locally for performance. Your project's basic info (name, description) 
                    comes from the registry JSON file you submitted.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

export default HowToAddPage;
