# Homepage Style Analysis: Marketing Site → App Consistency

## 📊 MARKETING SITE STYLES (treenitaastu.ee)

### Typography System

**Font Families:**
- Primary: `"DM Sans", sans-serif` (Google Fonts)
- Display/Stats: `Forum, display` (for large numbers)
- System fallback: `Inter, -apple-system, "system-ui", "Segoe UI", Roboto, sans-serif`

**Main Hero Heading (H1):**
- Text: "SELGE TEE TULEMUSENI"
- Font: `"DM Sans", sans-serif`
- Size: `85px`
- Weight: `900` (Black/Boldest)
- Color: `rgb(255, 255, 255)` (White)
- Line Height: `102px`
- Letter Spacing: `-3px` (Tight)
- Text Transform: `uppercase`

**Stats/Display Numbers (H4):**
- Text: "0", "Kümneid", etc.
- Font: `Forum, display` (serif display font)
- Size: `85px`
- Weight: `900`
- Color: `rgb(0, 182, 229)` (Cyan/Teal #00B6E5)

**Trainer Names (H3):**
- Text: "HENRI KRAAVI", "HENRI LEETMA"
- Font: `"DM Sans", sans-serif`
- Size: `52px`
- Weight: `900`
- Color: `rgb(255, 255, 255)` (White)
- Text Transform: `uppercase`

**Paragraph Text:**
- Font: `"DM Sans", sans-serif`
- Size: `18px`
- Weight: `700` (Bold - not regular!)
- Color: `rgb(33, 33, 33)` (Dark gray #212121)
- Line Height: `24px`

**CTA Button:**
- Text: "Alusta!"
- Font: `Inter, system fonts`
- Size: `16px`
- Weight: `700`
- Background: `rgb(0, 182, 229)` (Cyan #00B6E5)
- Text Color: `rgb(255, 255, 255)` (White)
- Border Radius: `14px`
- Padding: `0px 24px` (horizontal, vertical likely from line-height)

### Color Palette
- **Primary/Cyan:** `rgb(0, 182, 229)` / `#00B6E5`
- **Text Dark:** `rgb(33, 33, 33)` / `#212121`
- **White:** `rgb(255, 255, 255)` / `#FFFFFF`

---

## 📱 CURRENT APP HOMEPAGE STYLES (IndexPublic.tsx)

### Current Typography

**Main Hero Heading:**
```tsx
<h1 className="text-4xl md:text-6xl font-bold ...">
```
- Size: `text-4xl` (2.25rem/36px) → `md:text-6xl` (3.75rem/60px)
- Weight: `font-bold` (700)
- **Issue:** Much smaller than marketing site (60px vs 85px), wrong weight (700 vs 900)

**Subtitle:**
```tsx
<span className="text-5xl text-foreground font-bold">28 päevaga</span>
```
- Size: `text-5xl` (3rem/48px)
- **Issue:** Should match main heading size or be coordinated

**Body Text:**
```tsx
<p className="text-xl md:text-2xl text-muted-foreground ...">
```
- Size: `text-xl` (1.25rem/20px) → `md:text-2xl` (1.5rem/24px)
- Weight: Default (400) - **Issue:** Should be 700 (bold)
- Color: `text-muted-foreground` (gray) - **Issue:** Should be dark #212121

**CTA Button:**
- Uses default Button component styles
- **Issue:** Should match cyan color and specific styling

---

## 🎨 RECOMMENDED STYLE UPDATES

### 1. Add DM Sans Font
**Add to `index.html` or CSS:**
```html
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,700;9..40,900&display=swap" rel="stylesheet">
```

**Update Tailwind config** (`tailwind.config.js`):
```js
fontFamily: {
  sans: ['DM Sans', 'Inter', 'system-ui', 'sans-serif'],
  display: ['Forum', 'serif'], // For large numbers
}
```

### 2. Update Hero Heading
**Current:**
```tsx
text-4xl md:text-6xl font-bold
```

**Should be:**
```tsx
text-[85px] font-black uppercase tracking-[-3px] leading-[102px]
// Or use Tailwind's arbitrary values with responsive:
className="text-[60px] md:text-[85px] font-black uppercase tracking-[-3px] leading-[102px]"
```

### 3. Update Body Text
**Current:**
```tsx
text-xl md:text-2xl text-muted-foreground
```

**Should be:**
```tsx
text-lg font-bold text-[#212121]
// Size: 18px, Weight: 700, Color: dark gray
```

### 4. Update CTA Button Color
**Current:**
```tsx
bg-primary text-primary-foreground
```

**Should be:**
```tsx
bg-[#00B6E5] text-white
// Or add to theme colors
```

### 5. Color Theme Update
**Update CSS variables or Tailwind config:**
```css
--primary: 0 182 229; /* #00B6E5 */
--foreground: 33 33 33; /* #212121 for text */
```

---

## 📝 SPECIFIC CHANGES NEEDED

### IndexPublic.tsx Updates:

1. **Hero Heading:**
   - Increase size to match 85px (or responsive 60px → 85px)
   - Change weight from `font-bold` (700) to `font-black` (900)
   - Add `uppercase` transform
   - Add `tracking-[-3px]` for tighter letter spacing
   - Ensure white text color

2. **Body Text:**
   - Change weight from default (400) to `font-bold` (700)
   - Change color from `text-muted-foreground` to dark gray `text-[#212121]`
   - Keep size at 18px (text-lg)

3. **CTA Buttons:**
   - Use cyan color `#00B6E5` instead of theme primary
   - Match padding and border-radius (14px)

4. **Typography Scale:**
   - H1: 85px (900 weight, uppercase, white)
   - H2: ~52px (900 weight, uppercase)
   - H3: ~36-40px (900 weight)
   - Body: 18px (700 weight, dark gray)
   - Button: 16px (700 weight)

---

## 🔧 IMPLEMENTATION PRIORITY

**High Priority (Visual Impact):**
1. ✅ Update hero heading size and weight (85px, 900)
2. ✅ Add uppercase transform to main headings
3. ✅ Update body text to bold (700 weight)
4. ✅ Add DM Sans font import

**Medium Priority:**
5. Update button colors to match cyan
6. Add letter-spacing adjustments
7. Update text colors to match dark gray

**Low Priority (Nice to have):**
8. Add Forum font for display numbers (if needed)
9. Fine-tune line-height values

---

## 🎯 EXPECTED RESULT

After updates, the app homepage should:
- Feel consistent with marketing site visual style
- Use same typography hierarchy (sizes, weights)
- Match color scheme (cyan accents, dark text)
- Provide seamless transition from marketing → app
- Maintain readability and accessibility
