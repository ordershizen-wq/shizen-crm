---
version: alpha
name: Shizen CRM
description: >
  CRM system สำหรับธุรกิจ supplement — ทีม 6-20 คน ใช้งานบน mobile เป็นหลัก
  เป้าหมาย: ข้อมูลหนาแน่นแต่อ่านง่าย ใช้งานเร็ว ไม่รู้สึกท่วม

colors:
  # ── แบรนด์ (เหมือนเดิม — Indigo 500) ──
  primary:        "#6366F1"
  primary-hover:  "#4F46E5"
  primary-deep:   "#3730A3"
  primary-light:  "#EEF0FF"
  primary-tint:   "#F5F4FF"
  primary-soft:   "#A5B4FC"

  # ── Surfaces ──
  bg-app:         "#F5F6FA"
  bg-card:        "#FFFFFF"
  bg-subtle:      "#F1F2F8"

  # ── Sidebar ──
  sidebar-bg:     "#14131C"
  sidebar-active: "#2B2839"
  sidebar-accent: "#6366F1"

  # ── Pastel KPI tints (เหมือนเดิม) ──
  tint-peach:     "#FFF1E6"
  tint-peach-ink: "#C2410C"
  tint-lavender:  "#EEF0FF"
  tint-lavender-ink: "#4338CA"
  tint-mint:      "#E6F4F0"
  tint-mint-ink:  "#047857"
  tint-butter:    "#FFF8E1"
  tint-butter-ink: "#B45309"

  # ── Semantic ──
  success:        "#10B981"
  success-light:  "#D1FAE5"
  warning:        "#F59E0B"
  warning-light:  "#FEF3C7"
  danger:         "#EF4444"
  danger-light:   "#FEE2E2"
  info:           "#3B82F6"
  info-light:     "#DBEAFE"
  gold:           "#C9A961"

  # ── Text ──
  text-dark:   "#1E1B30"
  text-body:   "#2A2645"
  text-muted:  "#6B6789"
  text-light:  "#A8A4C0"

  # ── Borders ──
  border:        "#ECECF3"
  border-light:  "#F1F1F7"
  border-medium: "#E5E5EF"

typography:
  display:
    fontFamily: "'Plus Jakarta Sans', 'Anuphan', sans-serif"
    fontSize: "28px"
    fontWeight: 700
    lineHeight: "1.2"
    letterSpacing: "-0.02em"
  heading:
    fontFamily: "'Plus Jakarta Sans', 'Anuphan', sans-serif"
    fontSize: "20px"
    fontWeight: 600
    lineHeight: "1.3"
    letterSpacing: "-0.015em"
  subheading:
    fontFamily: "'Plus Jakarta Sans', 'Anuphan', sans-serif"
    fontSize: "15px"
    fontWeight: 600
    lineHeight: "1.4"
    letterSpacing: "-0.01em"
  body:
    fontFamily: "'Anuphan', 'Inter', system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: "1.6"
  body-sm:
    fontFamily: "'Anuphan', 'Inter', system-ui, sans-serif"
    fontSize: "12.5px"
    fontWeight: 400
    lineHeight: "1.5"
  label:
    fontFamily: "'Anuphan', 'Inter', system-ui, sans-serif"
    fontSize: "11px"
    fontWeight: 600
    lineHeight: "1.2"
    letterSpacing: "0.04em"
  mono:
    fontFamily: "'IBM Plex Mono', monospace"
    fontSize: "13px"
    fontWeight: 500
    lineHeight: "1.4"

rounded:
  xs:   "4px"
  sm:   "6px"
  md:   "10px"
  lg:   "14px"
  xl:   "18px"
  pill: "9999px"

spacing:
  1: "4px"
  2: "8px"
  3: "12px"
  4: "16px"
  5: "20px"
  6: "24px"
  8: "32px"

components:
  card:
    background: "{colors.bg-card}"
    border: "1px solid {colors.border}"
    radius: "{rounded.xl}"
    shadow: "0 1px 3px rgba(30,27,48,0.06), 0 1px 2px rgba(30,27,48,0.04)"
    padding: "20px 24px"
  card-hover:
    shadow: "0 4px 12px rgba(30,27,48,0.08)"
    transform: "translateY(-1px)"
  button-primary:
    background: "{colors.primary}"
    color: "#FFFFFF"
    radius: "{rounded.md}"
    height: "40px"
    padding: "0 16px"
    fontSize: "13.5px"
    fontWeight: "600"
  button-secondary:
    background: "{colors.bg-card}"
    color: "{colors.text-body}"
    border: "1px solid {colors.border-medium}"
    radius: "{rounded.md}"
  badge:
    radius: "{rounded.pill}"
    padding: "2px 10px"
    fontSize: "11px"
    fontWeight: "700"
  sidebar:
    width: "240px"
    collapsed-width: "64px"
    background: "{colors.sidebar-bg}"
    item-height: "44px"
    item-radius: "{rounded.md}"
  table-row:
    height: "52px"
    hover-bg: "{colors.bg-subtle}"
    border: "1px solid {colors.border-light}"
  input:
    height: "44px"
    background: "{colors.bg-card}"
    border: "1.5px solid {colors.border-medium}"
    radius: "{rounded.md}"
    focus-shadow: "0 0 0 3px rgba(99,102,241,0.15)"
---

# Shizen CRM — Visual Identity v2

## Overview

Shizen CRM ใช้โทนสี **Indigo + Pastel** ที่มีอยู่แล้ว เป้าหมายหลักคือ **ให้ข้อมูลจำนวนมากอ่านง่าย** โดยไม่ต้องลด feature ออก

**ปัญหาปัจจุบัน:** Glassmorphism (backdrop-filter + gradient ทุกการ์ด) ทำให้สายตาไม่รู้จะโฟกัสตรงไหน เมื่อมีข้อมูลหนาแน่น พื้นหลังที่เคลื่อนไหวแข่งกับข้อมูลจริง

**ทิศทางใหม่:** เปลี่ยนจาก "สวยผ่านเอฟเฟกต์" → "สวยผ่าน hierarchy ที่ชัดเจน" — ตัวอักษรและ spacing คือตัวนำ ไม่ใช่กระจกฝ้า

---

## ทิศทาง UI ที่เสนอ (เลือก 1 แนวทาง)

### แนวทาง A — Clean Card Pro ⭐ (แนะนำ)
> ลบ glassmorphism ออก → การ์ดขาวทึบ shadow อ่อนๆ + typography hierarchy ที่แข็งแกร่ง

**ดูเหมือน:** Vercel Dashboard / Linear / Notion

**เปลี่ยนจาก:**
- `background: rgba(255,255,255,0.55)` + `backdrop-filter: blur()`
- gradient พื้นหลังทั้งหน้า

**เป็น:**
- `background: #FFFFFF` + `box-shadow: 0 1px 3px rgba(...)` เรียบง่าย
- `background: #F5F6FA` พื้นเรียบ ไม่ gradient
- section headers ที่ชัดขึ้น, spacing ที่สม่ำเสมอ

**ผลลัพธ์:** โหลดเร็วกว่า (ไม่ต้อง render blur), ตาโฟกัสที่ข้อมูลไม่ใช่พื้นหลัง, mobile ดูดีกว่าบนจอเล็ก

---

### แนวทาง B — Structured Sidebar Pro
> เพิ่ม visual structure ด้วย left-border accent ต่อ section + color-coded categories

**ดูเหมือน:** ClickUp / Monday.com

**วิธี:**
- การ์ดแต่ละ category มี left border สีต่างกัน (indigo, mint, peach)
- Section headers ใหญ่กว่าเดิม พร้อม icon ชัดเจน
- ยังคง glassmorphism แต่เฉพาะ KPI hero เท่านั้น

**ผลลัพธ์:** แยกแยะข้อมูลตาม category ได้เร็ว เหมาะสำหรับ power user ที่ต้องการ scan เร็ว

---

### แนวทาง C — Minimal Focus
> ซ่อนข้อมูลรองไว้ก่อน แสดงเฉพาะสิ่งสำคัญ → คลิกเพื่อเปิดรายละเอียด

**ดูเหมือน:** Notion / Bear

**วิธี:**
- Dashboard แสดงแค่ 3-4 KPI สำคัญ + งานวันนี้
- ส่วนที่เหลือ (กราฟ, leaderboard, source split) อยู่ใน "See more"
- Clean typography เป็นหัวใจ ไม่มี decoration

**ผลลัพธ์:** ดูสะอาดที่สุด แต่ผู้ใช้ต้องคลิกมากขึ้นเพื่อเข้าถึงข้อมูล

---

## Colors

ใช้ token เดิมทั้งหมด — **ไม่เปลี่ยนโทนสี**

| Token | ค่า | ใช้เพื่อ |
|---|---|---|
| `primary` | `#6366F1` | CTA, active state, link, icon สำคัญ |
| `primary-light` | `#EEF0FF` | hover background, selected row |
| `tint-*` | pastel ต่างๆ | KPI card background เท่านั้น |
| `text-dark` | `#1E1B30` | heading, value ตัวเลขสำคัญ |
| `text-muted` | `#6B6789` | label, metadata, secondary |
| `success/warning/danger` | semantic | status badge เท่านั้น |
| `sidebar-bg` | `#14131C` | sidebar background (คงไว้) |

กฎ: ใช้ `primary` เพื่อ "action" เท่านั้น — ไม่ใช้ตกแต่ง

## Typography

**สำหรับ hierarchy ที่ดีขึ้น ให้ใช้ weight และ size ไม่ใช่สี:**

```
page-title   → Plus Jakarta Sans 700  28px  -0.02em  text-dark
card-heading → Plus Jakarta Sans 600  15px  -0.01em  text-dark
body         → Anuphan 400  14px  1.6  text-body
label        → Anuphan 600  11px  UPPERCASE  text-muted  +0.04em
number       → Plus Jakarta Sans 700  tabular-nums  text-dark
meta         → Anuphan 400  12.5px  text-muted
```

**กฎ:** ไม่ใช้ขนาดฟอนต์ต่ำกว่า 12px บน mobile, ไม่ใส่ `font-size` ด้วย inline style

## Layout

```
Desktop:  sidebar 240px + content (max-width 1440px, padding 24px 32px)
Tablet:   sidebar collapsed 64px + content
Mobile:   drawer sidebar + content full-width (padding 16px)
```

**Grid rules:**
- KPI row: `grid-template-columns: repeat(auto-fit, minmax(200px, 1fr))`  
- Dashboard 2-col: `grid-template-columns: 3fr 2fr` (ไม่ใช่ 1fr 1fr — ออเดอร์ล่าสุดควรกว้างกว่า)
- Customer grid: `repeat(auto-fill, minmax(300px, 1fr))`

**Spacing rule:** ใช้ spacing token เท่านั้น — ห้าม `margin: 0.85rem` หรือค่า odd อื่นๆ

## Elevation & Depth

**แนวทาง A (Clean Card Pro):**
```
Level 0  bg-app     #F5F6FA   พื้นหลังหน้า
Level 1  card       shadow-sm  การ์ดทั่วไป
Level 2  card-hover shadow-md  hover state
Level 3  modal      shadow-lg  overlay/modal
Level 4  tooltip    shadow-lg + border
```

ห้ามใช้ `backdrop-filter: blur()` นอกจาก: sidebar (mobile drawer) และ sticky header

กฎ: ถ้าต้องการ "เด่น" ให้ใช้ border `1px solid primary-soft` ไม่ใช่ shadow เพิ่ม

## Shapes

```
xs   4px   chip ภายในตาราง, badge
sm   6px   inline pill tag
md   10px  button, input, filter tab
lg   14px  card, dropdown, modal small
xl   18px  modal, panel, drawer
pill 9999px  toggle, avatar, count badge
```

KPI hero card: `border-radius: 18px`  
Card ทั่วไป: `border-radius: 14px`  
ห้าม mix ขนาด radius ภายใน component เดียวกัน

## Components

### Card
```css
background: #FFFFFF;
border: 1px solid #ECECF3;
border-radius: 14px;
box-shadow: 0 1px 3px rgba(30,27,48,0.06), 0 1px 2px rgba(30,27,48,0.04);
padding: 20px 24px;
```
— ไม่มี `backdrop-filter`, ไม่มี `background: rgba(...)`

### KPI Hero (ยกเว้น glassmorphism ได้ 1 จุด)
```css
background: linear-gradient(135deg, #EEF0FF 0%, #F5F4FF 100%);
border: 1px solid rgba(99,102,241,0.20);
border-radius: 18px;
/* ไม่มี backdrop-filter */
```
มี top accent bar: `border-top: 3px solid #6366F1`

### Button Primary
```css
background: #6366F1;
color: #fff;
border-radius: 10px;
height: 40px;
padding: 0 16px;
font-weight: 600;
font-size: 13.5px;
transition: background 150ms ease;
```
Hover: `background: #4F46E5`

### Filter Tabs (Stage/Grade)
รวมเป็น bar เดียว ใช้ `inline-flex` + `gap: 4px` + `overflow-x: auto`
Active: `background: primary-light, color: primary, font-weight: 600`
Inactive: `background: transparent, color: text-muted`

ห้าม wrap เป็น 2 แถว — ให้ scroll แนวนอนแทน

### Status Badge
```css
border-radius: 9999px;
padding: 2px 10px;
font-size: 11px;
font-weight: 700;
```

### Table Row
```
height: 52px;
border-bottom: 1px solid #F1F1F7;
hover: background #F1F2F8;
```
ห้ามใส่ shadow บน table row

## Do's and Don'ts

### ✅ Do

- ใช้ **weight + size** เพื่อสร้าง hierarchy — ไม่ใช้สีพิเศษ
- ใช้ **border แทน shadow** เมื่อต้องการแยก section
- scroll แนวนอนสำหรับ filter tabs — ไม่ wrap เป็น 2 แถว
- ระยะห่างระหว่าง section ใช้ `gap: 16px` หรือ `gap: 24px` เสมอ
- touch target ขั้นต่ำ **44px** บน mobile
- ตัวเลขสำคัญใช้ `font-feature-settings: 'tnum' on` เสมอ
- page loading ใช้ skeleton ที่มีอยู่แล้ว ไม่ spinner

### ❌ Don't

- `backdrop-filter: blur()` นอกจาก sidebar mobile drawer และ sticky header
- `background: rgba(255,255,255,0.55)` บน card ทั่วไป — ใช้ `#FFFFFF` แทน
- gradient พื้นหลังทั้งหน้า (ยกเลิก radial-gradient บน `.legacy-body`)
- inline style ที่ขัดแย้งกับ token เช่น `style={{ fontSize: '13.5px' }}` ซ้ำกัน
- font size ต่ำกว่า 12px
- spacing ค่า odd เช่น `0.85rem`, `1.25rem` — ใช้ token ใน spacing scale เท่านั้น
- `box-shadow` ซ้อนหลายชั้นบน element เดียว
- color ที่ไม่อยู่ใน token (hardcode ค่าใหม่โดยไม่เพิ่มใน DESIGN.md)
