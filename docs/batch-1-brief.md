# MODHORIZON — COMPLETE REBUILD
## BATCH 1/8 — FOUNDATION, DESIGN SYSTEM & LANDING PAGE

You are an elite frontend engineer, full-stack architect, and SaaS product designer.

Your task is to transform ModHorizon into a premium AI-powered Minecraft plugin and mod development platform.

PRIMARY REFERENCE:
https://kodari.ai

ModHorizon should compete with Kodari.AI in design quality, usability, functionality, and overall product experience.

However, DO NOT simply clone Kodari. Build an original, recognizable ModHorizon identity inspired by its best design and product decisions.

This is a complete product transformation divided into 8 batches to minimize Codex usage.

YOU ARE AUTHORIZED TO EXECUTE BATCH 1 ONLY.

---

## 1. CRITICAL CODEX USAGE RULES

Efficiency is extremely important.

- Do not implement future batches.
- Do not rewrite the entire codebase.
- Inspect relevant existing files before making changes.
- Reuse working functionality.
- Avoid unnecessary dependencies.
- Do not use subagents.
- Do not repeatedly inspect the same files.
- Do not generate lengthy explanations or documentation.
- Do not run unnecessary commands.
- Never implement functionality outside Batch 1.
- Run focused validation rather than excessive testing.

When Batch 1 is complete, STOP and wait for approval.

Do not start Batch 2 automatically.

---

## 2. INSPECT KODARI.AI

Visit https://kodari.ai and study the publicly accessible website.

Pay attention to:

- Landing page structure.
- Navigation.
- Hero section.
- Product demonstrations.
- Feature presentation.
- Typography and spacing.
- Pricing presentation.
- Onboarding flow where publicly accessible.
- Overall developer-tool aesthetic.

If the website cannot be accessed, use the design requirements below and do not waste time repeatedly retrying.

Important characteristics to take inspiration from:

1. The product's purpose is immediately obvious.
2. Minecraft development is the central focus.
3. The interface feels like a professional developer tool.
4. Features are demonstrated visually.
5. AI generation is presented as a simple workflow.
6. Project creation has a prominent call to action.
7. Credit-based pricing is clearly communicated.

Do not reuse Kodari's branding, illustrations, proprietary assets, or copy.

---

## 3. INSPECT THE MODHORIZON CODEBASE

Identify the current:

- Framework and routing architecture.
- Design system and styling solution.
- Landing page components.
- Authentication system.
- Dashboard routes.
- Existing credit balance infrastructure.
- Database integration.
- Project creation workflow.
- AI generation infrastructure.
- Payment integration.

Preserve functioning infrastructure.

Do not modify AI generation, compilation, payments, or authentication logic during this batch unless an essential compatibility fix is required.

---

## 4. COMPLETE VISUAL REDESIGN

Create a premium, modern, minimalist design system.

The website should feel like a polished 2026 developer platform.

DESIGN DIRECTION:

- Dark-first interface.
- Near-black charcoal backgrounds.
- Graphite secondary surfaces.
- Off-white text.
- Subtle neutral borders.
- Muted secondary typography.
- Restrained blue or violet accent.
- Precise spacing.
- Clean typography.
- Minimal animations.
- Strong visual hierarchy.
- Consistent components.

AVOID:

- Green as the primary accent.
- Generic AI-generated SaaS styling.
- Massive gradients.
- Floating glowing circles.
- Excessive glassmorphism.
- Oversized cards.
- Random decorative elements.
- Excessive rounded corners.
- Emoji icons.
- Unnecessary visual noise.

The design must be minimalist without feeling empty or unfinished.

Think: premium IDE + modern AI platform.

Build reusable tokens and components without introducing an unnecessary second UI library.

---

## 5. REDESIGN THE LANDING PAGE

Completely rebuild the homepage.

### Navigation

Include:

- ModHorizon logo.
- Features.
- How It Works.
- Pricing.
- Sign In.
- Start Building CTA.

Make the navigation compact and responsive.

### Hero

Suggested headline:

"Your Minecraft ideas. Built with AI."

Suggested subtitle:

"Describe your plugin or mod, let AI write the code, and build your project in one powerful workspace."

Primary CTA:
"Start Building"

Secondary CTA:
"See How It Works"

The hero should immediately explain the product.

Do not claim capabilities that are not yet functional.

### Workspace Showcase

This is the most important visual element.

Create a polished, realistic preview of the ModHorizon development workspace.

Include:

- Project sidebar.
- AI chat.
- Code editor.
- File explorer.
- Minecraft version selector.
- Build status.
- Download JAR action.

For Batch 1, this is a landing-page demonstration only.

It must not pretend to perform real AI generations.

Use sample code and clearly illustrative project content.

The actual interactive workspace will be implemented in later batches.

### Features

Create carefully designed sections introducing:

- AI-powered plugin generation.
- Minecraft mod development.
- Professional online IDE.
- Project management.
- Compilation and downloads.
- AI-assisted debugging.
- Project history.

Use clean compositions rather than endless identical feature cards.

Distinguish planned capabilities from those currently available.

### How It Works

Three steps:

1. Describe your Minecraft project.
2. Generate and refine the code.
3. Build and download.

### Pricing Preview

Introduce the credit-based model.

Free account:
- 5 signup credits.
- 25 potential referral bonus credits.
- No credit card required.

Do not invent paid prices or credit allowances.

Preserve existing paid prices if configured.

Do not modify payment processing.

### Final CTA

"Ready to build your first Minecraft project?"

Include a strong Start Building button.

---

## 6. ONBOARDING & REFERRAL CREDIT SYSTEM

ModHorizon will use a growth-focused onboarding system.

PLANNED REWARDS:

- 5 credits for registering an account.
- 25 bonus credits for referring another user who successfully creates their first legitimate project.

Unlike Kodari, we do NOT want Discord membership to be the primary reward action.

A successful referral directly benefits ModHorizon by acquiring another active user.

### Batch 1 Scope

Implement the frontend foundation:

- A welcome bonus section.
- An Earn Credits card.
- A referral reward explanation.
- A place for users to view referral progress.
- Consistent credit balance presentation.

Use existing functional account and credit data if available.

If referral infrastructure does not exist, prepare clean UI components for future integration.

Do NOT simulate real credit awards, fabricate a referral balance, or introduce a client-side credit granting mechanism.

### Future Backend Requirements

Document briefly for a later batch:

- Unique referral codes or links.
- Attribution when a referred user signs up.
- Credit reward after their first legitimate project.
- Server-side verification.
- Atomic transactions.
- Idempotent reward granting.
- Duplicate-account and self-referral prevention.
- Reasonable anti-abuse controls.
- Abuse-resistant bonus claiming.
- Preservation of existing paid balances.

Do not build the complete referral backend in Batch 1.

Do not require joining Discord.

---

## 7. RESPONSIVE DESIGN

Support desktop, tablet, and mobile.

Prioritize desktop because the actual development workspace is a desktop-oriented product.

Ensure:

- No horizontal overflow.
- Responsive navigation.
- Readable typography.
- Clean section spacing.
- Properly scaled preview components.
- Accessible buttons and inputs.
- Reduced-motion support.

---

## 8. PRESERVE EXISTING FUNCTIONALITY

Never break:

- Authentication.
- Existing projects.
- Credit balances.
- Payment integrations.
- AI generation endpoints.
- Compilation.
- Database relationships.
- Working application routes.

Do not replace production data with mock data.

Do not introduce unnecessary breaking changes.

---

## 9. VALIDATION

After implementing Batch 1:

- Run relevant type checks.
- Run lint where available.
- Run the project build where practical.
- Fix errors caused by your changes.
- Verify existing navigation still works.
- Review responsiveness.
- Confirm that no unrelated infrastructure was modified.

Avoid excessive test iterations.

---

## 10. FUTURE BATCH ROADMAP

BATCH 1:
Design system, landing page, onboarding reward UI.

BATCH 2:
Dashboard, navigation, project management.

BATCH 3:
New project creation and configuration.

BATCH 4:
AI chat experience and generation interface.

BATCH 5:
Professional IDE, Monaco editor, file explorer.

BATCH 6:
Generation workflows, builds, compilation, downloads.

BATCH 7:
Credits, referral backend, pricing, subscriptions, account management.

BATCH 8:
Polish, performance, accessibility, QA, bug fixing.

Only implement Batch 1.

---

## 11. FINAL RESPONSE

Provide a concise report:

1. Files changed.
2. Main design improvements.
3. Functionality preserved.
4. Validation results.
5. What remains for Batch 2.

Then STOP.

Do not automatically continue.

EXECUTE BATCH 1 NOW.