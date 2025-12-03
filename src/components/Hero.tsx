"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { ArrowRight, Package, Cpu, Terminal, Star, GitFork, Zap, Database, Wifi, Search } from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { cn } from "@/lib/utils";

interface HeroProps {
  stats?: {
    totalRepos: number;
    totalPackages: number;
    totalApplications: number;
    lastUpdated: number;
  };
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const floatingVariants = {
  animate: {
    y: [0, -10, 0],
    transition: {
      duration: 3,
      repeat: Infinity,
      repeatType: "reverse" as const,
    },
  },
};

export function Hero({ stats }: HeroProps) {
  return (
    <section className="relative overflow-hidden mesh-gradient hero-gradient min-h-[calc(100vh-4rem)] flex items-center py-12 sm:py-16">
      {/* Animated blob background */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        {/* Morphing blobs */}
        <div className="absolute top-10 left-[5%] w-72 h-72 bg-linear-to-r from-primary/20 to-purple-500/20 rounded-full blur-3xl blob morph" />
        <div className="absolute bottom-10 right-[5%] w-96 h-96 bg-linear-to-r from-blue-500/15 to-primary/15 rounded-full blur-3xl blob blob-delay-1 morph" />
        <div className="absolute top-1/3 right-[20%] w-64 h-64 bg-linear-to-r from-green-500/10 to-emerald-500/10 rounded-full blur-3xl blob blob-delay-2" />
        <div className="absolute bottom-1/3 left-[15%] w-80 h-80 bg-linear-to-r from-amber-500/10 to-orange-500/10 rounded-full blur-3xl blob blob-delay-3 morph" />
        
        {/* Grid pattern overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.02)_1px,transparent_1px)] dark:bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-size-[60px_60px]" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="max-w-4xl mx-auto text-center"
        >
          {/* Badge */}
          <motion.div variants={itemVariants} className="mb-6">
            <Badge variant="outline" className="px-4 py-1.5 text-sm">
              <Zap className="w-3 h-3 mr-1.5" />
              Community-Driven • Curated • Open Source
            </Badge>
          </motion.div>

          {/* Title */}
          <motion.h1
            variants={itemVariants}
            className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-4 sm:mb-6 px-2"
          >
            Discover the Best{" "}
            <span className="relative inline-block">
              <span className="gradient-text">
                Zig Packages
              </span>
              <motion.span
                className="absolute -bottom-2 left-0 right-0 h-1 bg-linear-to-r from-primary via-purple-500 to-primary rounded-full"
                initial={{ scaleX: 0, opacity: 0 }}
                animate={{ scaleX: 1, opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.8, ease: "easeOut" }}
              />
            </span>
          </motion.h1>

          {/* Description */}
          <motion.p
            variants={itemVariants}
            className="text-lg sm:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto"
          >
            A curated registry for discovering quality Zig packages and applications. 
            Find libraries, tools, and software built by the Zig community.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            variants={itemVariants}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12"
          >
            <Button size="lg" asChild className="min-w-[180px]" title="Browse all Zig packages">
              <a href="/packages">
                <Search className="w-4 h-4 mr-2" />
                Browse Packages
              </a>
            </Button>
            <Button size="lg" variant="outline" asChild className="min-w-[180px]" title="Learn how to add your project">
              <a href="/how-to-add">
                Add Your Package
                <ArrowRight className="w-4 h-4 ml-2" />
              </a>
            </Button>
          </motion.div>

          {/* Stats */}
          {stats && (
            <motion.div
              variants={itemVariants}
              className="flex flex-wrap items-center justify-center gap-4 sm:gap-8"
            >
              <motion.div 
                className="flex items-center gap-3 px-6 py-3 rounded-lg bg-card/80 backdrop-blur-sm border glass hover-lift cursor-default"
                whileHover={{ scale: 1.05 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <Package className="w-6 h-6 text-blue-500" />
                <div className="text-left">
                  <span className="text-2xl font-bold block">{stats.totalPackages}</span>
                  <span className="text-xs text-muted-foreground">Packages</span>
                </div>
              </motion.div>
              <motion.div 
                className="flex items-center gap-3 px-6 py-3 rounded-lg bg-card/80 backdrop-blur-sm border glass hover-lift cursor-default"
                whileHover={{ scale: 1.05 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <Cpu className="w-6 h-6 text-green-500" />
                <div className="text-left">
                  <span className="text-2xl font-bold block">{stats.totalApplications}</span>
                  <span className="text-xs text-muted-foreground">Applications</span>
                </div>
              </motion.div>
            </motion.div>
          )}
        </motion.div>

        {/* Floating icons decoration - behind content */}
        <div className="hidden md:block pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <motion.div
            variants={floatingVariants}
            animate="animate"
            className="absolute top-32 left-[10%] opacity-60"
          >
            <div className="p-3 rounded-xl bg-card/80 backdrop-blur-sm border shadow-xl hover-lift glass">
              <Package className="w-6 h-6 text-primary" />
            </div>
          </motion.div>
          <motion.div
            variants={floatingVariants}
            animate="animate"
            style={{ animationDelay: "0.5s" }}
            className="absolute top-48 right-[15%] opacity-60"
          >
            <div className="p-3 rounded-xl bg-card/80 backdrop-blur-sm border shadow-xl glass">
              <Star className="w-6 h-6 text-amber-500" />
            </div>
          </motion.div>
          <motion.div
            variants={floatingVariants}
            animate="animate"
            style={{ animationDelay: "1s" }}
            className="absolute bottom-32 left-[20%] opacity-60"
          >
            <div className="p-3 rounded-xl bg-card/80 backdrop-blur-sm border shadow-xl glass">
              <GitFork className="w-6 h-6 text-green-500" />
            </div>
          </motion.div>
          <motion.div
            variants={floatingVariants}
            animate="animate"
            style={{ animationDelay: "1.5s" }}
            className="absolute bottom-48 right-[10%] opacity-60"
          >
            <div className="p-3 rounded-xl bg-card/80 backdrop-blur-sm border shadow-xl glass">
              <Terminal className="w-6 h-6 text-blue-500" />
            </div>
          </motion.div>
          {/* Additional floating elements */}
          <motion.div
            variants={floatingVariants}
            animate="animate"
            style={{ animationDelay: "2s" }}
            className="absolute top-60 left-[35%] opacity-40"
          >
            <div className="p-2 rounded-lg bg-primary/10 backdrop-blur-sm border border-primary/20 shadow-lg">
              <Zap className="w-5 h-5 text-primary" />
            </div>
          </motion.div>
          <motion.div
            variants={floatingVariants}
            animate="animate"
            style={{ animationDelay: "2.5s" }}
            className="absolute bottom-40 right-[30%] opacity-40"
          >
            <div className="p-2 rounded-lg bg-green-500/10 backdrop-blur-sm border border-green-500/20 shadow-lg">
              <Database className="w-5 h-5 text-green-500" />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

// Features section
const features = [
  {
    icon: Database,
    title: "Curated Registry",
    description: "Hand-picked packages and applications. Quality over quantity for the Zig ecosystem.",
  },
  {
    icon: Zap,
    title: "Fast & Cached",
    description: "Live GitHub stats with smart caching. Fresh data without unnecessary API calls.",
  },
  {
    icon: Search,
    title: "Powerful Search",
    description: "Full-text fuzzy search across names, descriptions, and categories. Find what you need fast.",
  },
  {
    icon: Wifi,
    title: "Community Driven",
    description: "Add your project via Pull Request. Open source and transparent contribution process.",
  },
];

export function Features() {
  return (
    <section className="py-20 gradient-bg relative overflow-hidden">
      {/* Animated background decoration */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-linear-to-br from-primary/10 to-purple-500/10 rounded-full blur-3xl blob" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-linear-to-tr from-blue-500/10 to-primary/10 rounded-full blur-3xl blob blob-delay-1" />
        {/* Subtle grid */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.01)_1px,transparent_1px)] dark:bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-size-[40px_40px]" />
      </div>
      
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl font-bold mb-4">Why <span className="gradient-text">Zig Index</span>?</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            The simplest way to discover quality Zig packages and applications
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              whileHover={{ y: -8, scale: 1.02 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1, type: "spring", stiffness: 200 }}
              className="p-6 rounded-xl bg-card/80 backdrop-blur-sm border card-gradient hover:shadow-2xl transition-all duration-300 tilt-effect group"
            >
              <motion.div 
                className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300"
                whileHover={{ rotate: [0, -10, 10, 0] }}
                transition={{ duration: 0.5 }}
              >
                <feature.icon className="w-6 h-6 text-primary" />
              </motion.div>
              <h3 className="font-semibold mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// Quick categories - only two main categories now
const categories = [
  { label: "Packages", href: "/packages", icon: Package, color: "text-blue-500" },
  { label: "Applications", href: "/applications", icon: Cpu, color: "text-green-500" },
];

export function QuickCategories() {
  return (
    <section className="py-16 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-linear-to-r from-primary/5 to-purple-500/5 rounded-full blur-3xl" />
      </div>
      
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-8"
        >
          <h2 className="text-2xl font-bold mb-2">Browse by Category</h2>
          <p className="text-muted-foreground">Find exactly what you're looking for</p>
        </motion.div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-xl mx-auto">
          {categories.map((category, index) => (
            <motion.a
              key={category.href}
              href={category.href}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              whileHover={{ y: -6, scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1, type: "spring", stiffness: 300 }}
              className="flex items-center justify-center gap-3 p-6 rounded-xl bg-card/80 backdrop-blur-sm border hover:shadow-xl hover:border-primary/30 transition-all w-full sm:w-auto sm:min-w-[200px] group glass"
            >
              <motion.span
                whileHover={{ rotate: 360 }}
                transition={{ duration: 0.5 }}
              >
                <category.icon className={cn("w-6 h-6", category.color)} />
              </motion.span>
              <span className="font-medium">{category.label}</span>
              <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
            </motion.a>
          ))}
        </div>
      </div>
    </section>
  );
}

export default Hero;
