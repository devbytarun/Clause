"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Check,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Menu,
  X,
} from "lucide-react";

export default function LandingPage() {
  // Navigation scroll state
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  // Evidence interactive tab
  const [activeEvidenceTab, setActiveEvidenceTab] = useState<"citation" | "tripartite" | "chat">("citation");

  // FAQ open/close states
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  // Track scroll for sticky navbar rule
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Escape key closes mobile menu & focus trap restoration
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && mobileMenuOpen) {
        setMobileMenuOpen(false);
        menuButtonRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mobileMenuOpen]);

  const faqItems = [
    {
      question: "Is Clause a substitute for qualified legal counsel?",
      answer: "No. Clause provides informational document analysis only. It extracts clauses, separates explicit facts from subjective interpretations, and verifies page citations, but never provides formal legal opinions or enforceability judgments."
    },
    {
      question: "How does machine citation validation eliminate AI hallucinations?",
      answer: "Standard AI models invent plausible-sounding quotes when summarizing long legal texts. Clause extracts raw text page-by-page and programmatically validates every single citation against that page's text before displaying it in your workspace."
    },
    {
      question: "Why are arbitrary numerical risk scores excluded by design?",
      answer: "Vague scores like '78/100 risk' provide false reassurance without legal substance. Clause eliminates arbitrary numbers, organizing findings into explicit categories: Verified Facts, Subjective Interpretations, and Identified Uncertainties."
    },
    {
      question: "What happens to uploaded agreements and confidential text?",
      answer: "Your PDFs are saved in the local .storage folder of this app. Deleting a document removes its file, extracted pages, analysis, and chat history."
    }
  ];

  return (
    <div className="min-h-screen w-full bg-[#F3F0E8] text-[#171714] selection:bg-[#F04D35]/20 selection:text-[#171714] font-sans antialiased overflow-x-hidden">

      {/* 1. Navigation — Stretched edge to edge */}
      <header
        className={`sticky top-0 z-40 w-full transition-colors duration-200 ${
          scrolled ? "bg-[#FFFDF7] border-b border-[#D8D2C6]" : "bg-[#F3F0E8] border-b border-transparent"
        }`}
      >
        <div className="flex h-16 w-full items-center justify-between px-6 sm:px-10 lg:px-14 xl:px-16">
          {/* Wordmark & status */}
          <div className="flex items-center gap-3.5">
            <Link href="/" className="font-['Georgia',serif] text-2xl font-bold tracking-tight text-[#171714] no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3157D5] focus-visible:ring-offset-2">
              Clause<span className="text-[#F04D35]">.</span>
            </Link>
            <span className="hidden sm:inline-flex items-center gap-1.5 border border-[#D8D2C6] bg-[#FFFDF7] px-2 py-0.5 text-[11px] font-semibold text-[#646158] font-mono rounded-[4px] tabular-nums">
              <span className="h-1.5 w-1.5 rounded-full bg-[#2E7D4F]" aria-hidden="true" />
              Citation Engine Live
            </span>
          </div>

          {/* Desktop compact links */}
          <nav className="hidden md:flex items-center gap-8 text-[13px] font-semibold text-[#646158]" aria-label="Main Navigation">
            <a href="#overview" className="transition-colors hover:text-[#171714] no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3157D5]">
              Overview
            </a>
            <a href="#evidence" className="transition-colors hover:text-[#171714] no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3157D5]">
              Page Verification
            </a>
            <a href="#mechanics" className="transition-colors hover:text-[#171714] no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3157D5]">
              Mechanics
            </a>
            <a href="#metrics" className="transition-colors hover:text-[#171714] no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3157D5]">
              Metrics
            </a>
            <a href="#faq" className="transition-colors hover:text-[#171714] no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3157D5]">
              FAQ
            </a>
          </nav>

          {/* Primary Action & Mobile Menu Button */}
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="hidden sm:inline-flex items-center justify-center rounded-[6px] bg-[#F04D35] px-4 py-2 text-[13px] font-bold text-[#FFFDF7] transition-all hover:bg-[#C93625] active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3157D5] focus-visible:ring-offset-2 no-underline"
            >
              Analyze agreement
            </Link>

            {/* Accessible Mobile Menu Trigger */}
            <button
              ref={menuButtonRef}
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="flex md:hidden h-10 min-w-10 items-center justify-center gap-1.5 rounded-[6px] border border-[#D8D2C6] bg-[#FFFDF7] px-3 text-[13px] font-semibold text-[#171714] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3157D5]"
              aria-expanded={mobileMenuOpen}
              aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
            >
              {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
              <span>{mobileMenuOpen ? "Close" : "Menu"}</span>
            </button>
          </div>
        </div>

        {/* Mobile Navigation Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden border-b border-[#D8D2C6] bg-[#FFFDF7] px-6 py-5">
            <nav className="flex flex-col gap-3.5 text-[15px] font-semibold" aria-label="Mobile Navigation">
              <a
                href="#overview"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1.5 text-[#171714] border-b border-[#D8D2C6]/50 no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3157D5]"
              >
                Overview
              </a>
              <a
                href="#evidence"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1.5 text-[#171714] border-b border-[#D8D2C6]/50 no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3157D5]"
              >
                Page Verification
              </a>
              <a
                href="#mechanics"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1.5 text-[#171714] border-b border-[#D8D2C6]/50 no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3157D5]"
              >
                Mechanics
              </a>
              <a
                href="#metrics"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1.5 text-[#171714] border-b border-[#D8D2C6]/50 no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3157D5]"
              >
                Metrics
              </a>
              <a
                href="#faq"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1.5 text-[#171714] border-b border-[#D8D2C6]/50 no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3157D5]"
              >
                FAQ
              </a>
              <div className="pt-2">
                <Link
                  href="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex h-11 w-full items-center justify-center rounded-[6px] bg-[#F04D35] text-[14px] font-bold text-[#FFFDF7] no-underline transition-all active:scale-[0.96] hover:bg-[#C93625]"
                >
                  Analyze agreement
                </Link>
              </div>
            </nav>
          </div>
        )}
      </header>

      <main className="w-full">
        {/* 2. Hero Promise Section — Full-width stretch to corners */}
        <section id="overview" className="w-full py-10 md:py-14 lg:py-16">
          <div className="w-full px-6 sm:px-10 lg:px-14 xl:px-16">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 xl:gap-16 items-center">

              {/* Left Column: Hero Text & CTAs */}
              <div className="lg:col-span-6 flex flex-col justify-center">
                {/* Eyebrow */}
                <div className="flex items-center gap-2 mb-3">
                  <span className="font-mono text-[11px] font-bold tracking-[0.12em] text-[#646158] uppercase">
                    ISSUE #01 · CONTRACT CITATION DESK
                  </span>
                </div>

                {/* H1 Headline */}
                <h1 className="font-['Georgia',serif] text-[40px] leading-[1.04] sm:text-[52px] lg:text-[64px] xl:text-[70px] lg:leading-[1] font-normal tracking-[-0.025em] text-[#171714]">
                  Read every agreement with verifiable proof.
                </h1>

                {/* Body Copy */}
                <p className="mt-4 text-[16px] leading-[1.6] md:text-[18px] md:leading-[1.55] text-[#646158] max-w-[620px]">
                  From scattered contract clauses to verified page citations. Clause checks every AI finding against extracted document text before you sign.
                </p>

                {/* CTA Pair */}
                <div className="mt-6 flex flex-wrap items-center gap-4">
                  <Link
                    href="/dashboard"
                    className="inline-flex h-[46px] items-center justify-center rounded-[6px] bg-[#F04D35] px-7 text-[14px] font-bold text-[#FFFDF7] transition-all hover:bg-[#C93625] active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3157D5] focus-visible:ring-offset-2 no-underline text-center"
                  >
                    Analyze agreement
                  </Link>
                  <a
                    href="#evidence"
                    className="inline-flex h-[46px] items-center justify-center px-2 text-[14px] font-semibold text-[#171714] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3157D5] no-underline group"
                  >
                    See citation proof
                    <ArrowRight className="ml-1.5 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </a>
                </div>

                {/* Proof Label */}
                <div className="mt-8 flex items-center gap-2 text-[11px] font-mono font-semibold text-[#989388] border-t border-[#D8D2C6] pt-3.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#3157D5]" aria-hidden="true" />
                  <span>100% MACHINE-VALIDATED CITATIONS · ZERO HALLUCINATION POLICY</span>
                </div>
              </div>

              {/* Right Column: Product Evidence Media stretched wide */}
              <div className="lg:col-span-6 w-full">
                <div className="w-full rounded-[10px] border border-[#D8D2C6] bg-[#FFFDF7] overflow-hidden shadow-sm">
                  {/* Title bar */}
                  <div className="flex items-center justify-between border-b border-[#D8D2C6] px-4 py-2.5 bg-[#FFFDF7]">
                    <div className="flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-full border border-[#D8D2C6] bg-[#F3F0E8]" />
                      <span className="h-2.5 w-2.5 rounded-full border border-[#D8D2C6] bg-[#F3F0E8]" />
                      <span className="h-2.5 w-2.5 rounded-full border border-[#D8D2C6] bg-[#F3F0E8]" />
                    </div>
                    <span className="font-mono text-[11px] font-medium text-[#646158]">
                      clause-workspace / offer-letter-senior-eng.pdf
                    </span>
                    <span className="font-mono text-[10px] font-bold text-[#3157D5] border border-[#3157D5]/30 px-1.5 py-0.5 rounded-[4px] bg-[#3157D5]/5">
                      PAGE 3 OF 7
                    </span>
                  </div>

                  {/* Document Desk Media Content */}
                  <div className="p-4 sm:p-5 flex flex-col gap-3.5">
                    {/* Active citation card */}
                    <div className="border border-[#D8D2C6] rounded-[6px] p-3.5 bg-[#F3F0E8]/50">
                      <div className="flex items-center justify-between text-[11px] font-mono text-[#646158] mb-1.5">
                        <span className="font-bold text-[#171714]">EXTRACTED CITATION · PAGE 3, §8.2</span>
                        <span className="text-[#2E7D4F] font-bold">● MATCH: 100% VERIFIED</span>
                      </div>
                      <p className="text-[13px] sm:text-[14px] leading-[1.45] text-[#171714] italic font-['Georgia',serif] border-l-2 border-[#3157D5] pl-3 my-2">
                        &ldquo;Employee shall not, for a period of twenty-four (24) months following termination, engage in any competitive enterprise globally.&rdquo;
                      </p>
                      <div className="flex items-center justify-between text-[10px] font-mono text-[#646158] pt-1 border-t border-[#D8D2C6]/50">
                        <span>String Offset: Chars 4182–4308</span>
                        <span className="text-[#3157D5] font-semibold">Strict Text Match</span>
                      </div>
                    </div>

                    {/* Tripartite Breakdown — Stretched to 3 clean columns on larger screens */}
                    <div className="border border-[#D8D2C6] rounded-[6px] p-3.5 bg-[#FFFDF7]">
                      <div className="text-[10px] font-mono font-bold text-[#646158] mb-2 uppercase tracking-wide">
                        Tripartite Finding Structure
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[12px]">
                        <div className="p-2 border border-[#D8D2C6]/60 rounded-[4px] bg-[#F3F0E8]/30">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-mono text-[9px] font-bold text-[#2E7D4F] bg-[#2E7D4F]/10 px-1.5 py-0.5 rounded-[4px]">
                              FACT
                            </span>
                          </div>
                          <p className="text-[#171714] leading-snug">
                            Explicit 24-month worldwide restriction post-employment (§8.2).
                          </p>
                        </div>

                        <div className="p-2 border border-[#D8D2C6]/60 rounded-[4px] bg-[#F3F0E8]/30">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-mono text-[9px] font-bold text-[#646158] bg-[#646158]/10 px-1.5 py-0.5 rounded-[4px]">
                              INTERPRETATION
                            </span>
                          </div>
                          <p className="text-[#171714] leading-snug">
                            Broad scope may restrict freelancing or advisory software roles.
                          </p>
                        </div>

                        <div className="p-2 border border-[#D8D2C6]/60 rounded-[4px] bg-[#F3F0E8]/30">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-mono text-[9px] font-bold text-[#B87316] bg-[#B87316]/10 px-1.5 py-0.5 rounded-[4px]">
                              UNCERTAINTY
                            </span>
                          </div>
                          <p className="text-[#171714] leading-snug">
                            &apos;Competitive enterprise&apos; lacks definition; geographic scope exceeds local precedents.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Caption below media */}
                <p className="mt-2 text-[11px] text-[#989388] font-mono leading-tight">
                  Fig 1.1 — Clause active inspection desk verifying non-compete clause against page 3 extracted source text.
                </p>
              </div>

            </div>
          </div>
        </section>

        {/* 3. Social Proof Section — Edge-to-edge full width */}
        <section className="w-full border-y border-[#D8D2C6] bg-[#FFFDF7] py-6 md:py-7">
          <div className="w-full px-6 sm:px-10 lg:px-14 xl:px-16">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">

              {/* Proof label & monochrome team categories */}
              <div className="flex-1">
                <p className="font-mono text-[11px] font-bold tracking-[0.12em] text-[#989388] uppercase mb-2.5">
                  TRUSTED BY FOUNDERS, OPERATORS, AND TEAMS SIGNING HIGH-STAKES CONTRACTS
                </p>

                {/* Monochrome readable labels distributed across screen */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4 text-[13px] font-bold text-[#171714]">
                  <span className="tracking-tight">Series A Startups</span>
                  <span className="tracking-tight">Independent Counsel</span>
                  <span className="tracking-tight">Engineering Leads</span>
                  <span className="tracking-tight">Boutique Agencies</span>
                  <span className="tracking-tight">Seed Founders</span>
                  <span className="tracking-tight">Solo Operators</span>
                </div>
              </div>

              {/* One metric with tabular numbers */}
              <div className="border-t md:border-t-0 md:border-l border-[#D8D2C6] pt-3.5 md:pt-0 md:pl-8 shrink-0">
                <div className="font-mono text-[26px] font-bold text-[#171714] tabular-nums leading-tight">
                  100%
                </div>
                <div className="text-[12px] text-[#646158]">
                  machine-validated citations
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* 4. Product Evidence Section — Edge-to-edge */}
        <section id="evidence" className="w-full py-12 md:py-16">
          <div className="w-full px-6 sm:px-10 lg:px-14 xl:px-16">

            <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-4 mb-7">
              <div>
                <span className="font-mono text-[11px] font-bold tracking-[0.12em] text-[#646158] uppercase">
                  02 / DOCUMENT EVIDENCE
                </span>
                <h2 className="font-['Georgia',serif] text-[32px] sm:text-[42px] font-normal leading-[1.06] text-[#171714] mt-1.5">
                  Every finding anchored to the exact page source.
                </h2>
              </div>
              <Link
                href="/dashboard"
                className="inline-flex h-[42px] items-center justify-center rounded-[6px] bg-[#F04D35] px-5 text-[13px] font-bold text-[#FFFDF7] transition-all hover:bg-[#C93625] active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3157D5] no-underline shrink-0"
              >
                Open document workspace
              </Link>
            </div>

            {/* Interactive Workspace Frame stretched across screen */}
            <div className="w-full rounded-[10px] border border-[#D8D2C6] bg-[#FFFDF7] overflow-hidden shadow-sm">
              {/* Tab Selector Header */}
              <div className="flex flex-wrap items-center justify-between border-b border-[#D8D2C6] bg-[#F3F0E8]/40 px-4 py-2.5 gap-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveEvidenceTab("citation")}
                    className={`rounded-[4px] px-3 py-1.5 text-[11px] font-mono font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3157D5] ${
                      activeEvidenceTab === "citation"
                        ? "bg-[#FFFDF7] border border-[#D8D2C6] text-[#171714] shadow-xs"
                        : "text-[#646158] hover:text-[#171714]"
                    }`}
                  >
                    1. Page Citation Matcher
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveEvidenceTab("tripartite")}
                    className={`rounded-[4px] px-3 py-1.5 text-[11px] font-mono font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3157D5] ${
                      activeEvidenceTab === "tripartite"
                        ? "bg-[#FFFDF7] border border-[#D8D2C6] text-[#171714] shadow-xs"
                        : "text-[#646158] hover:text-[#171714]"
                    }`}
                  >
                    2. Fact vs Uncertainty Matrix
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveEvidenceTab("chat")}
                    className={`rounded-[4px] px-3 py-1.5 text-[11px] font-mono font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3157D5] ${
                      activeEvidenceTab === "chat"
                        ? "bg-[#FFFDF7] border border-[#D8D2C6] text-[#171714] shadow-xs"
                        : "text-[#646158] hover:text-[#171714]"
                    }`}
                  >
                    3. Grounded Q&A Inspector
                  </button>
                </div>
                <div className="font-mono text-[10px] text-[#989388]">
                  PARSER: UNPDF · MODEL: GEMINI 2.5 FLASH
                </div>
              </div>

              {/* Dynamic Viewport Content */}
              <div className="p-6 md:p-8">
                {activeEvidenceTab === "citation" && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-[#D8D2C6] pb-2.5">
                      <div>
                        <h4 className="font-['Georgia',serif] text-xl font-normal text-[#171714]">Character-Level Citation Verification</h4>
                        <p className="text-[13px] text-[#646158]">Every quotation is cross-checked against extracted page text before rendering.</p>
                      </div>
                      <span className="font-mono text-[11px] text-[#3157D5] font-bold border border-[#3157D5]/30 bg-[#3157D5]/5 px-2.5 py-0.5 rounded-[4px]">
                        VERIFICATION: PASS
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
                      <div className="border border-[#D8D2C6] rounded-[6px] p-4 bg-[#F3F0E8]/30">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="font-mono text-[10px] font-bold text-[#646158]">PAGE 1 · OFFER LETTER</span>
                          <span className="text-[9px] font-mono font-bold text-[#2E7D4F] bg-[#2E7D4F]/10 px-1.5 py-0.5 rounded-[4px]">VERIFIED</span>
                        </div>
                        <h5 className="font-bold text-[14px] text-[#171714]">Base Salary & At-Will Status</h5>
                        <p className="text-[13px] text-[#646158] mt-1">&ldquo;Base compensation of $185,000 per annum... employment remains strictly at-will.&rdquo;</p>
                        <div className="mt-3 text-[11px] font-mono text-[#3157D5]">§1.1, line 12 · exact match</div>
                      </div>

                      <div className="border border-[#D8D2C6] rounded-[6px] p-4 bg-[#F3F0E8]/30">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="font-mono text-[10px] font-bold text-[#646158]">PAGE 4 · IP ASSIGNMENT</span>
                          <span className="text-[9px] font-mono font-bold text-[#2E7D4F] bg-[#2E7D4F]/10 px-1.5 py-0.5 rounded-[4px]">VERIFIED</span>
                        </div>
                        <h5 className="font-bold text-[14px] text-[#171714]">Prior Inventions Exclusion</h5>
                        <p className="text-[13px] text-[#646158] mt-1">&ldquo;Employee retains rights only in technologies explicitly scheduled on Exhibit A prior to execution.&rdquo;</p>
                        <div className="mt-3 text-[11px] font-mono text-[#3157D5]">§4.3, line 28 · exact match</div>
                      </div>

                      <div className="border border-[#D8D2C6] rounded-[6px] p-4 bg-[#F3F0E8]/30">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="font-mono text-[10px] font-bold text-[#646158]">PAGE 6 · GOVERNING LAW</span>
                          <span className="text-[9px] font-mono font-bold text-[#B87316] bg-[#B87316]/10 px-1.5 py-0.5 rounded-[4px]">ATTENTION</span>
                        </div>
                        <h5 className="font-bold text-[14px] text-[#171714]">Jurisdiction & Arbitration</h5>
                        <p className="text-[13px] text-[#646158] mt-1">&ldquo;Mandatory individual arbitration in Delaware with waiver of jury trial rights.&rdquo;</p>
                        <div className="mt-3 text-[11px] font-mono text-[#B87316]">§11.2, line 4 · verified clause</div>
                      </div>
                    </div>
                  </div>
                )}

                {activeEvidenceTab === "tripartite" && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-[#D8D2C6] pb-2.5">
                      <div>
                        <h4 className="font-['Georgia',serif] text-xl font-normal text-[#171714]">Tripartite Analysis Matrix</h4>
                        <p className="text-[13px] text-[#646158]">Strict separation between explicit contract facts, interpretations, and identified gaps.</p>
                      </div>
                      <span className="font-mono text-[11px] text-[#171714] font-bold border border-[#D8D2C6] bg-[#FFFDF7] px-2.5 py-0.5 rounded-[4px]">
                        NO VAGUE RISK SCORES
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
                      <div className="border border-[#D8D2C6] rounded-[6px] p-4 bg-[#FFFDF7]">
                        <span className="font-mono text-[9px] font-bold text-[#2E7D4F] border border-[#2E7D4F]/20 bg-[#2E7D4F]/5 px-1.5 py-0.5 rounded-[4px]">
                          1. EXPLICIT FACT
                        </span>
                        <h5 className="font-bold text-[14px] text-[#171714] mt-2">Documented Provision</h5>
                        <p className="text-[13px] text-[#646158] mt-1.5 leading-relaxed">
                          Clauses directly written in the text. Verified word-for-word against the source document with exact page numbering.
                        </p>
                        <div className="mt-2.5 text-[11px] font-mono text-[#2E7D4F]">e.g. &ldquo;30-day notice period&rdquo;</div>
                      </div>

                      <div className="border border-[#D8D2C6] rounded-[6px] p-4 bg-[#FFFDF7]">
                        <span className="font-mono text-[9px] font-bold text-[#646158] border border-[#646158]/20 bg-[#646158]/5 px-1.5 py-0.5 rounded-[4px]">
                          2. INTERPRETATION
                        </span>
                        <h5 className="font-bold text-[14px] text-[#171714] mt-2">Contextual Meaning</h5>
                        <p className="text-[13px] text-[#646158] mt-1.5 leading-relaxed">
                          What the provision implies in standard commercial practice. Marked clearly as an interpretation, never confused with fact.
                        </p>
                        <div className="mt-2.5 text-[11px] font-mono text-[#646158]">e.g. &ldquo;Prevents side consulting&rdquo;</div>
                      </div>

                      <div className="border border-[#D8D2C6] rounded-[6px] p-4 bg-[#FFFDF7]">
                        <span className="font-mono text-[9px] font-bold text-[#B87316] border border-[#B87316]/20 bg-[#B87316]/5 px-1.5 py-0.5 rounded-[4px]">
                          3. UNCERTAINTY
                        </span>
                        <h5 className="font-bold text-[14px] text-[#171714] mt-2">Ambiguity & Missing Protections</h5>
                        <p className="text-[13px] text-[#646158] mt-1.5 leading-relaxed">
                          Vague phrases, unaddressed liabilities, or missing standard exceptions (e.g. severance terms or indemnity carve-outs).
                        </p>
                        <div className="mt-2.5 text-[11px] font-mono text-[#B87316]">e.g. &ldquo;Carve-out undefined&rdquo;</div>
                      </div>
                    </div>
                  </div>
                )}

                {activeEvidenceTab === "chat" && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-[#D8D2C6] pb-2.5">
                      <div>
                        <h4 className="font-['Georgia',serif] text-xl font-normal text-[#171714]">Grounded Document Q&A</h4>
                        <p className="text-[13px] text-[#646158]">Chat engine strictly anchored to PDF text; explicitly refuses to guess outside document facts.</p>
                      </div>
                      <span className="font-mono text-[11px] text-[#2E7D4F] font-bold border border-[#2E7D4F]/30 bg-[#2E7D4F]/5 px-2.5 py-0.5 rounded-[4px]">
                        HALLUCINATION REFUSAL ACTIVE
                      </span>
                    </div>

                    <div className="border border-[#D8D2C6] rounded-[6px] p-4 bg-[#FFFDF7] space-y-3 text-[13px]">
                      <div className="flex items-start gap-2.5">
                        <span className="font-mono text-[10px] font-bold text-[#646158] uppercase shrink-0 pt-0.5">YOU:</span>
                        <p className="text-[#171714] font-medium">&ldquo;Does this NDA allow me to discuss my compensation with coworkers?&rdquo;</p>
                      </div>
                      <div className="flex items-start gap-2.5 bg-[#F3F0E8]/40 p-3 rounded-[4px] border border-[#D8D2C6]">
                        <span className="font-mono text-[10px] font-bold text-[#3157D5] uppercase shrink-0 pt-0.5">CLAUSE:</span>
                        <div className="text-[#171714] space-y-1.5">
                          <p>
                            On <strong>Page 2, §3.1</strong>, &apos;Confidential Information&apos; includes salary schedules. However, §3.4 explicitly states:
                          </p>
                          <blockquote className="font-['Georgia',serif] italic border-l-2 border-[#3157D5] pl-2.5 text-[13px] my-1">
                            &ldquo;Nothing in this Agreement shall prohibit Employee from discussing terms and conditions of employment protected under applicable labor laws.&rdquo;
                          </blockquote>
                          <p className="text-[11px] text-[#646158] font-mono">
                            ✓ Direct citation from Page 2, lines 18–22. Informational only — not legal advice.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Caption below media */}
            <p className="mt-2 text-[11px] text-[#989388] font-mono leading-tight">
              Fig 2.1 — Page-level text extraction cross-checked before display to eliminate hallucinations.
            </p>
          </div>
        </section>

        {/* 5. Feature Narrative Section — Edge-to-edge */}
        <section id="mechanics" className="w-full border-t border-[#D8D2C6] py-12 md:py-16">
          <div className="w-full px-6 sm:px-10 lg:px-14 xl:px-16">

            <div className="max-w-3xl mb-10">
              <span className="font-mono text-[11px] font-bold tracking-[0.12em] text-[#646158] uppercase">
                03 / VERIFICATION MECHANICS
              </span>
              <h2 className="font-['Georgia',serif] text-[32px] sm:text-[44px] font-normal leading-[1.06] text-[#171714] mt-1.5">
                The mechanism behind hallucination-free review.
              </h2>
              <p className="mt-3 text-[16px] leading-[1.65] text-[#646158]">
                Standard language models summarize contracts with confident hallucinations. Clause wraps analysis in deterministic verification gates.
              </p>
            </div>

            {/* Alternating rhythm: Row 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center border-b border-[#D8D2C6] pb-10 mb-10">
              <div className="lg:col-span-6">
                <span className="font-mono text-[10px] font-bold uppercase text-[#3157D5] border border-[#3157D5]/20 bg-[#3157D5]/5 px-2 py-0.5 rounded-[4px]">
                  MECHANIC 01
                </span>
                <h3 className="font-['Georgia',serif] text-[26px] sm:text-[28px] font-semibold text-[#171714] leading-[1.15] mt-2.5">
                  Extracted Page Verification
                </h3>
                <p className="mt-2.5 text-[15px] leading-[1.6] text-[#646158]">
                  Every citation is programmatically searched against extracted page text. If the text is altered or absent, the finding is discarded before display.
                </p>
                <ul className="mt-4 space-y-2 text-[14px] text-[#171714]">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-[#2E7D4F]" />
                    <span>Extract raw text per PDF page</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-[#2E7D4F]" />
                    <span>Verify character-level offsets</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-[#2E7D4F]" />
                    <span>Reject ungrounded model outputs</span>
                  </li>
                </ul>
              </div>
              <div className="lg:col-span-6">
                <div className="w-full rounded-[10px] border border-[#D8D2C6] bg-[#FFFDF7] p-5 shadow-xs">
                  <div className="flex items-center justify-between border-b border-[#D8D2C6] pb-2 mb-3 text-[11px] font-mono text-[#646158]">
                    <span>VALIDATION ENGINE LOG</span>
                    <span className="text-[#2E7D4F] font-bold">STATE: 100% PASS</span>
                  </div>
                  <div className="space-y-2 font-mono text-[12px]">
                    <div className="flex items-center justify-between p-2.5 rounded-[4px] bg-[#F3F0E8]/50 border border-[#D8D2C6]">
                      <span className="font-bold text-[#171714]">Page 1 · Compensation Term</span>
                      <span className="text-[#3157D5]">exact string match</span>
                    </div>
                    <div className="flex items-center justify-between p-2.5 rounded-[4px] bg-[#F3F0E8]/50 border border-[#D8D2C6]">
                      <span className="font-bold text-[#171714]">Page 3 · Non-Compete Scope</span>
                      <span className="text-[#2E7D4F]">offset validated</span>
                    </div>
                    <div className="flex items-center justify-between p-2.5 rounded-[4px] bg-[#F3F0E8]/50 border border-[#D8D2C6]">
                      <span className="font-bold text-[#171714]">Page 5 · IP Assignment</span>
                      <span className="text-[#2E7D4F]">verified page source</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Alternating rhythm: Row 2 (Media left, Text right on desktop) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center border-b border-[#D8D2C6] pb-10 mb-10">
              <div className="lg:col-span-6 order-2 lg:order-1">
                <div className="w-full rounded-[10px] border border-[#D8D2C6] bg-[#FFFDF7] p-5 shadow-xs">
                  <div className="flex items-center justify-between border-b border-[#D8D2C6] pb-2 mb-3 text-[11px] font-mono text-[#646158]">
                    <span>CONCERN CLASSIFICATION</span>
                    <span className="text-[#3157D5] font-bold">TRIPARTITE MODEL</span>
                  </div>
                  <div className="p-3 border border-[#D8D2C6] rounded-[6px] bg-[#F3F0E8]/40 space-y-2">
                    <div className="flex items-center gap-2 text-[12px]">
                      <span className="font-mono text-[9px] font-bold text-[#2E7D4F] bg-[#2E7D4F]/10 px-1.5 py-0.5 rounded-[4px]">FACT</span>
                      <span className="text-[#171714] font-medium">Post-termination IP assignment for 12 months</span>
                    </div>
                    <div className="flex items-center gap-2 text-[12px]">
                      <span className="font-mono text-[9px] font-bold text-[#646158] bg-[#646158]/10 px-1.5 py-0.5 rounded-[4px]">INTERPRETATION</span>
                      <span className="text-[#171714] font-medium">May capture personal open-source projects</span>
                    </div>
                    <div className="flex items-center gap-2 text-[12px]">
                      <span className="font-mono text-[9px] font-bold text-[#B87316] bg-[#B87316]/10 px-1.5 py-0.5 rounded-[4px]">UNCERTAINTY</span>
                      <span className="text-[#171714] font-medium">Exhibit B schedule left blank</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="lg:col-span-6 order-1 lg:order-2">
                <span className="font-mono text-[10px] font-bold uppercase text-[#3157D5] border border-[#3157D5]/20 bg-[#3157D5]/5 px-2 py-0.5 rounded-[4px]">
                  MECHANIC 02
                </span>
                <h3 className="font-['Georgia',serif] text-[26px] sm:text-[28px] font-semibold text-[#171714] leading-[1.15] mt-2.5">
                  Tripartite Risk Separation
                </h3>
                <p className="mt-2.5 text-[15px] leading-[1.6] text-[#646158]">
                  Separate explicit document facts from subjective interpretations and missing legal protections, preventing false confidence.
                </p>
                <ul className="mt-4 space-y-2 text-[14px] text-[#171714]">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-[#2E7D4F]" />
                    <span>Label immutable document facts</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-[#2E7D4F]" />
                    <span>Isolate interpretive legal risk</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-[#2E7D4F]" />
                    <span>Flag unaddressed liabilities & ambiguity</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Alternating rhythm: Row 3 */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
              <div className="lg:col-span-6">
                <span className="font-mono text-[10px] font-bold uppercase text-[#3157D5] border border-[#3157D5]/20 bg-[#3157D5]/5 px-2 py-0.5 rounded-[4px]">
                  MECHANIC 03
                </span>
                <h3 className="font-['Georgia',serif] text-[26px] sm:text-[28px] font-semibold text-[#171714] leading-[1.15] mt-2.5">
                  Strictly Grounded Document Q&A
                </h3>
                <p className="mt-2.5 text-[15px] leading-[1.6] text-[#646158]">
                  Ask any question about indemnification, IP ownership, or notice periods. The model strictly refuses to answer beyond the PDF text.
                </p>
                <ul className="mt-4 space-y-2 text-[14px] text-[#171714]">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-[#2E7D4F]" />
                    <span>Direct page quotation required</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-[#2E7D4F]" />
                    <span>Hard boundary against external speculation</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-[#2E7D4F]" />
                    <span>Instant jump to matching PDF coordinates</span>
                  </li>
                </ul>
              </div>
              <div className="lg:col-span-6">
                <div className="w-full rounded-[10px] border border-[#D8D2C6] bg-[#FFFDF7] p-5 shadow-xs">
                  <div className="flex items-center justify-between border-b border-[#D8D2C6] pb-2 mb-3 text-[11px] font-mono text-[#646158]">
                    <span>GROUNDED CHAT BOUNDARY</span>
                    <span className="text-[#3157D5] font-bold">REFUSAL ENFORCED</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-[12px] font-mono">
                    <div className="border border-[#D8D2C6] p-2.5 rounded-[4px] bg-[#F3F0E8]/40">
                      <div className="font-bold text-[#171714]">Within Document</div>
                      <div className="text-[#2E7D4F] text-[11px] mt-1">● Quoted & Cited</div>
                    </div>
                    <div className="border border-[#D8D2C6] p-2.5 rounded-[4px] bg-[#F3F0E8]/40">
                      <div className="font-bold text-[#171714]">Outside Document</div>
                      <div className="text-[#C53B36] text-[11px] mt-1">● Strictly Refused</div>
                    </div>
                    <div className="border border-[#D8D2C6] p-2.5 rounded-[4px] bg-[#F3F0E8]/40">
                      <div className="font-bold text-[#171714]">Legal Opinion</div>
                      <div className="text-[#B87316] text-[11px] mt-1">● Disclaimed Always</div>
                    </div>
                    <div className="border border-[#D8D2C6] p-2.5 rounded-[4px] bg-[#F3F0E8]/40">
                      <div className="font-bold text-[#171714]">Page Coordinates</div>
                      <div className="text-[#3157D5] text-[11px] mt-1">● Interactive Jump</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Section CTA */}
            <div className="mt-12 text-center">
              <Link
                href="/dashboard"
                className="inline-flex h-[44px] items-center justify-center rounded-[6px] bg-[#F04D35] px-7 text-[14px] font-bold text-[#FFFDF7] transition-all hover:bg-[#C93625] active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3157D5] no-underline"
              >
                Explore verification engine
              </Link>
            </div>

          </div>
        </section>

        {/* 6. Metric / Proof Band — Edge-to-edge full width */}
        <section id="metrics" className="w-full border-y border-[#D8D2C6] bg-[#FFFDF7] py-7 md:py-8">
          <div className="w-full px-6 sm:px-10 lg:px-14 xl:px-16">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 divide-y md:divide-y-0 md:divide-x divide-[#D8D2C6]">

              <div className="pt-3 md:pt-0">
                <div className="font-mono text-[36px] font-bold leading-none text-[#171714] tabular-nums">
                  0
                </div>
                <div className="text-[14px] font-medium text-[#171714] mt-2">
                  Unverified citations displayed
                </div>
                <div className="text-[12px] text-[#646158]">
                  Ungrounded model citations strictly discarded by software gate
                </div>
              </div>

              <div className="pt-3 md:pt-0 md:pl-8">
                <div className="font-mono text-[36px] font-bold leading-none text-[#3157D5] tabular-nums">
                  100%
                </div>
                <div className="text-[14px] font-medium text-[#171714] mt-2">
                  Page text cross-check rate
                </div>
                <div className="text-[12px] text-[#646158]">
                  Every quoted word checked against original PDF page text
                </div>
              </div>

              <div className="pt-3 md:pt-0 md:pl-8">
                <div className="font-mono text-[36px] font-bold leading-none text-[#171714] tabular-nums">
                  &lt; 8s
                </div>
                <div className="text-[14px] font-medium text-[#171714] mt-2">
                  Average extraction and analysis time
                </div>
                <div className="text-[12px] text-[#646158]">
                  Fast, parallelized pipeline with instant interactive PDF reader
                </div>
              </div>

            </div>

            <div className="mt-4 pt-3.5 border-t border-[#D8D2C6]/50 text-[11px] font-mono text-[#989388]">
              Source: Automated evaluation benchmark against gold standard agreement fixtures.
            </div>
          </div>
        </section>

        {/* 7. Testimonial Section — Edge-to-edge */}
        <section className="w-full py-12 md:py-16">
          <div className="w-full px-6 sm:px-10 lg:px-14 xl:px-16">
            <div className="max-w-4xl">
              <span className="font-mono text-[11px] font-bold tracking-[0.12em] text-[#646158] uppercase">
                04 / VERIFIED REPORT
              </span>

              {/* Display quote */}
              <blockquote className="font-['Georgia',serif] text-[26px] sm:text-[34px] font-normal leading-[1.2] text-[#171714] mt-3.5">
                &ldquo;Clause flagged a 24-month global non-compete buried in section 14 of an offer letter. It quoted the exact page and refused to guess about ambiguous terms.&rdquo;
              </blockquote>

              {/* Attribution */}
              <div className="mt-6 flex items-center gap-3">
                {/* Avatar fallback: initials with Rule border */}
                <div className="flex h-11 w-11 items-center justify-center rounded-full border border-[#D8D2C6] bg-[#FFFDF7] font-mono text-[13px] font-bold text-[#171714]">
                  DM
                </div>
                <div>
                  <div className="font-bold text-[15px] text-[#171714]">David Miller</div>
                  <div className="text-[13px] text-[#646158]">Senior Staff Engineer · Series B Fintech</div>
                </div>
              </div>

              <div className="mt-6">
                <Link
                  href="/dashboard"
                  className="inline-flex h-[40px] items-center justify-center rounded-[6px] bg-[#F04D35] px-5 text-[13px] font-bold text-[#FFFDF7] transition-all hover:bg-[#C93625] active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3157D5] no-underline"
                >
                  See the workspace
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* 8. Pricing / Final CTA Section — Edge-to-edge */}
        <section id="analysis-desk" className="w-full border-t border-[#D8D2C6] bg-[#FFFDF7] py-12 md:py-16">
          <div className="w-full px-6 sm:px-10 lg:px-14 xl:px-16">
            <div className="max-w-3xl">
              <span className="font-mono text-[11px] font-bold tracking-[0.12em] text-[#646158] uppercase">
                05 / DOCUMENT INSPECTION
              </span>
              <h2 className="font-['Georgia',serif] text-[32px] sm:text-[42px] font-normal leading-[1.06] text-[#171714] mt-1.5">
                Start analyzing your next agreement.
              </h2>
              <p className="mt-3 text-[15px] leading-[1.6] text-[#646158]">
                No account or credit card required. PDFs stay in this app&apos;s local storage while AI analysis is protected by usage limits.
              </p>

              <Link
                href="/dashboard"
                className="mt-6 inline-flex h-[46px] items-center justify-center rounded-[6px] bg-[#F04D35] px-6 text-[14px] font-bold text-[#FFFDF7] transition-all hover:bg-[#C93625] active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3157D5] no-underline"
              >
                Open local workspace
              </Link>
              <p className="mt-3 text-[12px] text-[#989388]">
                Informational analysis only — not legal advice. Always review original agreements with qualified counsel.
              </p>

              <div className="mt-5 border-t border-[#D8D2C6] pt-4">
                <Link
                  href="/dashboard"
                  className="text-[14px] font-semibold text-[#3157D5] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3157D5] no-underline"
                >
                  Your PDFs stay on this machine
                </Link>
              </div>

            </div>
          </div>
        </section>

        {/* 9. FAQ Section — Edge-to-edge */}
        <section id="faq" className="w-full border-t border-[#D8D2C6] py-12 md:py-16">
          <div className="w-full px-6 sm:px-10 lg:px-14 xl:px-16">
            <div className="max-w-3xl mb-7">
              <span className="font-mono text-[11px] font-bold tracking-[0.12em] text-[#646158] uppercase">
                06 / FREQUENTLY ASKED QUESTIONS
              </span>
              <h2 className="font-['Georgia',serif] text-[32px] sm:text-[42px] font-normal leading-[1.08] text-[#171714] mt-1.5">
                Everything you need to know.
              </h2>
            </div>

            <div className="w-full divide-y divide-[#D8D2C6] border-y border-[#D8D2C6]">
              {faqItems.map((item, idx) => {
                const isOpen = openFaqIndex === idx;
                return (
                  <div key={idx} className="py-2">
                    <button
                      type="button"
                      onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                      className="flex min-h-[44px] w-full items-center justify-between text-left text-[15px] sm:text-[16px] font-semibold text-[#171714] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3157D5] py-2"
                      aria-expanded={isOpen}
                    >
                      <span className="pr-4">{item.question}</span>
                      <span className="text-[#646158] shrink-0">
                        {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </span>
                    </button>
                    {isOpen && (
                      <div className="pb-4 pt-0.5 text-[14px] leading-[1.65] text-[#646158] max-w-4xl">
                        {item.answer}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </main>

      {/* 10. Footer — Stretched across corners */}
      <footer className="w-full border-t border-[#D8D2C6] bg-[#FFFDF7] py-12 text-[#646158]">
        <div className="w-full px-6 sm:px-10 lg:px-14 xl:px-16">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">

            {/* Wordmark & Description */}
            <div className="md:col-span-1">
              <Link href="/" className="font-['Georgia',serif] text-xl font-bold tracking-tight text-[#171714] no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3157D5]">
                Clause<span className="text-[#F04D35]">.</span>
              </Link>
              <p className="mt-2 text-[13px] leading-relaxed text-[#646158]">
                Machine-validated agreement intelligence for offers, NDAs, and commercial contracts.
              </p>
              <div className="mt-3.5 inline-flex items-center gap-1.5 font-mono text-[10px] text-[#2E7D4F] border border-[#D8D2C6] px-2 py-0.5 rounded-[4px] bg-[#F3F0E8]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#2E7D4F]" />
                Citation Verification Live · v1.0
              </div>
            </div>

            {/* Links Columns */}
            <div>
              <div className="font-mono text-[10px] font-bold uppercase text-[#171714] tracking-wider mb-2.5">
                Workspace
              </div>
              <ul className="space-y-2 text-[13px]">
                <li><Link href="/dashboard" className="hover:text-[#171714] no-underline">Document Analysis</Link></li>
                <li><a href="#evidence" className="hover:text-[#171714] no-underline">Citation Matcher</a></li>
                <li><a href="#mechanics" className="hover:text-[#171714] no-underline">Fact vs Uncertainty</a></li>
                <li><Link href="/dashboard" className="hover:text-[#171714] no-underline">Grounded Q&A Chat</Link></li>
              </ul>
            </div>

            <div>
              <div className="font-mono text-[10px] font-bold uppercase text-[#171714] tracking-wider mb-2.5">
                Agreements
              </div>
              <ul className="space-y-2 text-[13px]">
                <li><span className="text-[#171714]">Employment Offers</span></li>
                <li><span className="text-[#171714]">Non-Disclosure Agreements</span></li>
                <li><span className="text-[#171714]">Master Service Agreements</span></li>
                <li><span className="text-[#171714]">Commercial Vendor Contracts</span></li>
              </ul>
            </div>

            <div>
              <div className="font-mono text-[10px] font-bold uppercase text-[#171714] tracking-wider mb-2.5">
                Legal & Privacy
              </div>
              <ul className="space-y-2 text-[13px]">
                <li><Link href="/privacy" className="hover:text-[#171714] no-underline">Privacy Posture</Link></li>
                <li><Link href="/terms" className="hover:text-[#171714] no-underline">Terms of Service</Link></li>
                <li><span className="text-[#989388]">Local PDF Storage</span></li>
                <li><span className="text-[#989388]">Informational Analysis Only</span></li>
              </ul>
            </div>

          </div>

          <div className="mt-10 border-t border-[#D8D2C6] pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-[12px] text-[#989388]">
            <p>© {new Date().getFullYear()} Clause. Informational document analysis only — not legal advice.</p>
            <p className="font-mono">PAPER #F3F0E8 · INK #171714 · SIGNAL #F04D35</p>
          </div>
        </div>
      </footer>

    </div>
  );
}
