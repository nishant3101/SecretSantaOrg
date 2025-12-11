# Design Guidelines: Secret Santa Organizer

## Design Approach
**Selected System**: Material Design principles with festive accents
**Rationale**: Utility-focused tool requiring clear information hierarchy, form handling, and role-based dashboards. Material Design provides excellent form patterns and data presentation while allowing for seasonal customization.

## Core Design Elements

### Typography
- **Primary Font**: Inter (Google Fonts)
- **Headings**: 
  - H1: text-4xl font-bold (Admin Dashboard, Login)
  - H2: text-2xl font-semibold (Section headers)
  - H3: text-xl font-medium (Card titles, User names)
- **Body**: text-base (Forms, lists, descriptions)
- **Labels**: text-sm font-medium (Form labels, status badges)

### Layout System
**Spacing Units**: Consistent use of Tailwind units: 2, 4, 6, 8, 12, 16, 20
- Component padding: p-6 to p-8
- Section spacing: my-12 to my-20
- Card gaps: gap-6
- Form field spacing: space-y-4

### Component Library

**Authentication Pages**
- Centered login cards with max-w-md
- Role indicator badge (Admin vs Participant)
- Clean form inputs with floating labels
- Festive header with app title and subtle holiday icon

**Admin Dashboard**
- Top navigation bar with admin controls
- Participant grid/list view (cards showing username, wishlist status)
- Prominent "Create New User" and "Shuffle Secret Santa" action buttons
- Status indicators: "Wishlist Complete" (green), "Pending" (amber), "Not Started" (gray)
- User creation modal with username/password generation

**Participant Interface**
- Welcome header showing participant name
- Wishlist creation form: 3 input fields for gift ideas with clear numbering
- Pre-shuffle state: Wishlist form only
- Post-shuffle state: Card revealing assigned person and their wishlist (3 items displayed cleanly)
- Save confirmation feedback

**Cards & Containers**
- Elevated cards with rounded-lg borders and subtle shadows
- White/light backgrounds with clear content hierarchy
- Status badges: rounded-full with appropriate colors

**Buttons**
- Primary actions: Solid buttons (Create, Save, Shuffle)
- Secondary actions: Outlined buttons (Cancel, View)
- Danger actions: Red-toned for Reset/Delete operations
- When on images: backdrop-blur-sm bg-white/80

**Forms**
- Input fields: border rounded-md with focus states
- Clear labels above inputs
- Helper text for password requirements
- Validation feedback inline

### Festive Elements
- Subtle holiday color accents (deep red #DC2626, forest green #059669, gold #F59E0B)
- Small decorative snowflake or gift icons in headers (from icon library)
- Warm, welcoming copy throughout
- Confetti animation on successful shuffle (subtle, brief)

### Images
**Hero Section**: None - This is a utility app; lead with the login form or dashboard immediately
**Decorative**: Small festive icons in navigation and empty states only

### Navigation
**Admin**: Top bar with "Participants" and "Settings" tabs, logout button
**Participant**: Simple header with user greeting and logout, no complex navigation

### Responsive Behavior
- Mobile: Single column, stacked cards, full-width forms
- Desktop: Multi-column participant grids (2-3 columns), side-by-side layouts for wishlist reveal