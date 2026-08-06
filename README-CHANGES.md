# Conversations page — Clear option

Ye zip sirf 2 badle hue files hain, apne project ke `desktop/` folder ke same path pe
overwrite karo.

## Kya badla

Aapke app me ek "Clear all conversations" button **pehle se hi tha**, lekin wo Chat
window ke andar History icon click karne ke baad hi dikhta tha — ek extra click chahiye
tha.

Ab jab bhi aap **"Conversations"** pe navigate karoge (V logo panel se ya sidebar se), Chat
window seedha history/list view me khulega — jahan upar hi ek button milega:

**"Clear all conversations"** — click karte hi saari conversation history ek saath delete
ho jaati hai.

Agar sirf kuch specific conversations delete karni ho to "select multiple" (checklist)
icon se select karke "Delete selected" bhi already available hai, aur har item ke aage ek
chhota `X` bhi hai single conversation delete karne ke liye.

## Files changed
- `desktop/src/app/components/layout/MainLayout.tsx`
- `desktop/src/app/components/chat/ChatWidget.tsx`

TypeScript (`src/app` config) is sandbox me `tsc --noEmit` se error-free compile ho chuka
hai.
