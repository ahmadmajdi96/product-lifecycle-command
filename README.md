# Product Lifecycle Command

Build the full Product Lifecycle Management (PLM) system based on the attached PLM MVP Requirements and Technical Architecture Specification, fully aligned with the Cortanex Manufacturing Operating System (CORTA QC System, MES Command Center, MES Command Central, Unified Command Center, MES Command Hub, Production Command Center, and Command Access Hub). 

Use the design, layout, styling, and UI system of MES Command Center:
- Industrial dark aesthetic with graphite background, cyan primary highlights, amber warnings, and high-density shop-floor controls
- Space Grotesk display font and JetBrains Mono for codes/revisions/technical parameters
- Full collapsible sidebar navigation grouping Control Center, Product Definition, Engineering Change (ECR/ECO/ECN), Document Vault, and System Integrations
- Complete feature set:
  1. Item Master & Part Catalog (raw materials, WIP, finished goods, packaging, tooling with revision control, lifecycle phases: Draft, Review, Approved, Active, Obsolete, and date effectivity)
  2. Multi-level Engineering BOM (EBOM) & Manufacturing BOM (MBOM) with visual tree hierarchy, parent-child relations, quantity scrap factor, and redline visual diff between revisions
  3. Digital Routings & Operation Sequences (standard routing, rework routing, work centers, setup times, cycle times, linked SOPs/work instructions)
  4. Engineering Change Management (Change Requests - ECR, Change Orders - ECO, Change Notices - ECN, automated multi-disciplinary approval matrix, disposition rules: scrap/rework/use-as-is, and downstream impact analysis on active work orders)
  5. Document Management Vault (controlled CAD/drawings/SOPs, PDF preview, checkout/checkin locking, watermark release status, 21 CFR Part 11 compliant audit logs and electronic signatures)
  6. Integration Hub with MOS alignment: export released BOMs/routings to MES Command Center, sync quality inspection plans with CORTA QC, and track maintenance/tooling requirements with Unified Command Center.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/9dd61755-17db-4d72-ba14-d288a3a10e30).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
