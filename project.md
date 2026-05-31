BUILD AMTP SKILLHUB V2
The Capability Registry for the Agentic Web

Build a production-grade platform called AMTP SkillHub.

SkillHub is not merely a repository.

SkillHub is the world's first Capability Registry where AI agents can:

Discover skills
Understand skills
Verify skills
Execute skills
Compose skills
Trust skills

using the AMTP protocol.

The platform is built on top of the published NPM package:

npm install @amtp/protocol

AMTP provides:

amtp-skill
amtp-action
amtp-permissions
amtp-policy

These are the core primitives of the Agentic Web.

CORE VISION

Traditional Web:

URL → Document

API Web:

URL → Service

Agentic Web:

URL → Capability

SkillHub should demonstrate this paradigm shift.

The platform should feel like:

GitHub
+
HuggingFace
+
npm
+
Zapier
+
OpenAPI Hub

but designed specifically for AI agents.

CRITICAL POSITIONING

DO NOT position SkillHub as:

A repository of skills

Position it as:

The Capability Layer for AI Agents
PRIMARY GOALS

Allow:

Developers
Publish AMTP skills
Import existing skills
Track usage
Monetize later
Agents
Search capabilities
Understand capabilities
Validate permissions
Execute capabilities
Organizations
Create internal capability registries
Publish verified skills
Build workflows
UNIQUE DIFFERENTIATOR

SkillHub must support importing skills from existing ecosystems.

Examples:

GitHub repositories
Awesome Skills
Claude Skills
MCP Servers
Prompt repositories
Agent workflows

SkillHub converts all imported capabilities into AMTP-native skills.

IMPORTER ENGINE

Build a Capability Import Engine.

User provides:

GitHub URL

Example:

https://github.com/user/skill-repo

Importer should:

Clone repository
Detect:
SKILL.md
README.md
prompts
MCP manifests
tool definitions
Analyze structure
Generate:
amtp-skill
amtp-action
amtp-permissions
amtp-policy
Create SkillHub entry
IMPORT SOURCES

Support:

GitHub

Repository import

Awesome Skills

Bulk import capability catalog

MCP

Import MCP tools as AMTP skills

Prompt Libraries

Convert prompts into executable capabilities

OpenAPI

Convert APIs into skills

Local Skill Upload

Upload markdown

Upload AMTP document

TECH STACK

Frontend:

Next.js 15
React 19
TypeScript
TailwindCSS
shadcn/ui
Framer Motion
Lucide

Backend:

Next.js API Routes
Prisma
PostgreSQL

Authentication:

Clerk

Storage:

PostgreSQL
S3 compatible storage

Search:

PostgreSQL FTS
Future semantic search support

Deployment:

Docker
Vercel
DESIGN SYSTEM

Style:

GitHub x OpenAI x Vercel

Characteristics:

futuristic
clean
dark-first
premium
AI-native

Primary colors:

Electric Blue
Indigo
Violet

Dark mode by default.

LANDING PAGE

Hero:

The Capability Layer for AI Agents

Subheadline:

Discover, publish, execute and compose AI capabilities using AMTP.

CTA:

Browse Skills
Publish Skill

Background animation:

Agents discovering capabilities across a network graph.

LANDING PAGE SECTIONS
What Is AMTP

Visual flow:

Agent
 ↓
Discover Capability
 ↓
Understand Contract
 ↓
Verify Permissions
 ↓
Execute Action
 ↓
Receive Result
Ecosystem Metrics

Animated counters:

Skills Published
Executions
Developers
Organizations
Agents Connected
Featured Capabilities

Display:

Contract Analyzer
Flight Search
Invoice Generator
Product Research
Patent Search

Each card:

trust score
executions
author
category
Why AMTP

Comparison table:

Browser Automation	APIs	AMTP
Fragile	Complex	Native
UI Parsing	Integration Work	Capability Discovery
Slow	Manual	Agent-First
MAIN APPLICATION
SKILL REGISTRY

Core feature.

Route:

/skills

Capabilities displayed as cards.

Search bar.

Filters:

category
trust score
verified
popularity
pricing
source
SKILL DETAIL PAGE

Equivalent to GitHub repository page.

Route:

/skills/[slug]

Display:

Name
Description
Category
Author
Version
Source
Trust Score
Executions
Rating

Tabs:

Overview
Actions
Permissions
Policies
Analytics
Source
Documentation
AMTP VISUALIZATION

Render:

amtp-skill

Display:

capability name
purpose
inputs
outputs
amtp-action

Display:

action id
endpoint
parameters
risk level
amtp-permissions

Display:

roles
scopes
auth requirements
approval requirements
amtp-policy

Display:

rate limits
restrictions
execution conditions
EXECUTION PLAYGROUND

Every skill page has:

Execute Capability

Dynamic form generation.

Build forms from AMTP schema.

Show:

input fields
execute button
logs
latency
output
status
PUBLISH FLOW

Wizard:

Step 1:

Metadata

Name
Description
Category

Step 2:

Import Source

Options:

GitHub URL
MCP Server
OpenAPI Spec
AMTP Markdown
Upload File

Step 3:

Validation

Use:

@amtp/protocol

Validate:

skills
actions
permissions
policies

Step 4:

Preview

Step 5:

Publish

CAPABILITY IMPORTER

Dedicated feature.

Route:

/import

User enters:

GitHub URL

System:

analyzes repository
generates AMTP manifest
previews generated capability
allows editing
publishes
AGENT DISCOVERY API

Expose:

GET /api/skills
GET /api/skills/search
GET /api/skills/:id
GET /api/categories

Support:

Accept: text/amtp+markdown

Content negotiation required.

AGENT EXECUTION API

Expose:

POST /api/execute

Execution pipeline:

Skill
 ↓
Permissions
 ↓
Policies
 ↓
Validation
 ↓
Execution
 ↓
Result
TRUST SYSTEM

Every skill receives:

Trust Score

Calculated from:

success rate
uptime
verification
usage
reviews

Display prominently.

REPUTATION SYSTEM

Developer profiles.

Badges:

Verified Publisher
Trusted Provider
10K Executions
100K Executions
Community Favorite
SKILL COMPOSER

Visual workflow builder.

Like Zapier.

Drag-and-drop interface.

Skills become nodes.

Connections map:

Output
 ↓
Input

Example:

Research Company
 ↓
Analyze Financials
 ↓
Generate Report
 ↓
Send Email

Save as workflow.

WORKFLOW REGISTRY

Route:

/workflows

Store reusable capability chains.

Allow:

publishing
cloning
execution
DATABASE SCHEMA

Create Prisma models:

User
Organization
Skill
SkillVersion
Action
Permission
Policy
Workflow
Execution
Agent
ApiKey
Review
Badge
TrustScore
ImportJob
Analytics
SEARCH ENGINE

Support:

keyword search
category search
popularity ranking
trust ranking

Architecture should allow future:

Vector Search
Semantic Search
Capability Search
ANALYTICS

Charts:

executions
latency
success rate
active agents
growth

Use Recharts.

AGENT-FIRST FEATURES

Add:

Capability Graph

Visualize relationships between skills.

Example:

search-flight
   ↓
compare-prices
   ↓
reserve-flight
Compatibility Matrix

Display:

ChatGPT
Claude
Cursor
Windsurf
OpenAI Agents
Custom Agents
Capability Contracts

Show:

Inputs

Outputs

Permissions

Policies

Risk Levels

SEED DATA

Automatically import sample capabilities:

Contract Review
Flight Search
Product Comparison
Invoice Generator
Legal Research
Patent Search
Market Analysis

Use AMTP manifests.

PERFORMANCE

Requirements:

SSR
Streaming
Caching
Pagination
Lazy Loading
Optimistic Updates
DELIVERABLES

Generate:

Complete folder structure
Full Prisma schema
Database migrations
API routes
Authentication
Landing page
Registry
Skill pages
Import engine
Execution playground
Workflow builder
Analytics dashboard
Agent APIs
Docker setup
Seed scripts
Deployment instructions

The final product should feel like:

"GitHub for Capabilities, npm for Agents, and the Operating System of the Agentic Web."
