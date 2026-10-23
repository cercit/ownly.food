# Ownly Together: group food ordering for Chennai

A concept feature for Ownly, Rapido's zero-commission food app. Friends, flatmates and office teams in Chennai order from one restaurant together. Each person adds their own food, the app splits the bill fairly, and everyone pays their own share. Ownly isn't in Chennai yet, so group ordering is how it launches there.

Every screen shows a thin strip: **"Concept prototype by Sameer Mittimani. Not an official Rapido product."**

---

## 1. Problem and solution

**Problem:** when a group orders food together, one person collects everyone's choices on WhatsApp, rebuilds the cart by hand, pays the whole bill, then chases people for their share for a day or two. Choices get lost, late additions come in after the order is placed, and the host often never gets all the money back.

**Solution: Ownly Together**
- The host starts a group order and shares a 6-character code, a link or a QR code.
- Everyone joins and adds their own dishes, with notes like "less spicy" or "no onion".
- A live shared cart shows who added what.
- The host locks the order at the cut-off and places one order with the restaurant.
- The app works out each person's share, and everyone pays their own share on a demo payment screen.
- Everyone in the group can track the order from the same link.

---

## 2. Rules (follow exactly)

**Sign-in**
- Email plus a 6-digit code sent to that email. No passwords.
- No demo accounts and no persona switcher. Anyone can sign up and try it, with no limit on sign-ups.
- Each person sees the app as themselves. You're the host of a group order if you started it, and a member if you joined it.

**Group order**
- Up to **12 people** per group, the host included. Person 13 sees: "This group is full (12 people)."
- **No limit on order value.**
- One restaurant per group order.
- Room code: exactly 6 capital letters or numbers, no dash (for example `TNR742`). Share link: the site address + `?join=TNR742`. A QR code shows the same link.
- Only the host can lock, place or cancel the order.

**Split rule: the host picks one when starting the group order**
- **a) Pay for what you ordered (default):** your own dishes at full price + an equal share of any dish marked **Shared** + an equal share of Rapido's charges.
- **b) Split everything equally:** the whole bill (food + charges) divided equally by the number of people.
- The chosen rule is shown in the cart, at checkout and on every payment screen.

**Rapido's charges**
- The host enters three amounts for the order: **delivery fee, packaging, taxes**.
- Each one is split equally across everyone in the group. Show them as three plain lines.
- No fee discounts, no "absorbed fees", no ₹0 fee claims, and no fixed delivery fee.

**Payment (demo)**
- Everyone pays their own share, the host included. Paid or Pending is shown next to every name.
- A Razorpay-style modal: UPI apps, QR, card, netbanking, plus "Paid the host in cash".
- "Simulate success" and "Simulate failure" buttons. A failed payment stays Pending with a Retry button.
- A clear note on the payment screen: **"Demo payment: no real money moves."**
- Never ask for or store full card numbers, CVVs or UPI PINs. Saved methods show only a masked label, such as "Visa •••• 4242".

**Do not include**
- Price comparisons with other apps, savings banners or savings dashboards
- A bag capacity gauge, or any 6-person or ₹2,000 limit
- Rider names, number plates or a call button
- Made-up Rapido product names. Just say "Rapido".
- Any Bengaluru or Hyderabad places or restaurants

---

## 3. Split example (rule a)

4 people. Rapido's charges: delivery ₹40 + packaging ₹20 + taxes ₹36 = ₹96, so ₹24 each. One shared dish, a ₹280 starter platter, so ₹70 each.

| Person | Own dishes | Shared share | Charges share | Pays |
|---|---|---|---|---|
| Host | ₹220 | ₹70 | ₹24 | **₹314** |
| Member 2 | ₹180 | ₹70 | ₹24 | **₹274** |
| Member 3 | ₹0 | ₹70 | ₹24 | **₹94** |
| Member 4 | ₹150 | ₹70 | ₹24 | **₹244** |
| **Total** | ₹550 | ₹280 | ₹96 | **₹926** |

Under rule b, the same bill is ₹926 ÷ 4 = **₹231.50 each**. If an amount doesn't divide evenly, round each share to the paisa and add the leftover paisa to the host's share.

---

## 4. Screens (desktop and mobile)

1. **Sign in:** enter your email, then the 6-digit code. First-time users add their name next.
2. **Explore restaurants (Chennai):** filter by area (T. Nagar, Adyar, Velachery, OMR, Anna Nagar, Nungambakkam, Mylapore) and cuisine, with a veg-only toggle. Open the menu. Use placeholder restaurants for now; real Chennai data comes from a CSV.
3. **Start group order (host):** choose the restaurant, the delivery address from saved addresses, a cut-off time (15 min, 30 min or custom) and the split rule. Then show the code, the link, the QR code, a "Copy link" button and a "Share on WhatsApp" button.
4. **Join (member):** open the link or type the code. Preview the restaurant, host name and cut-off, then tap Join. If you've already joined, go straight to the cart.
5. **Shared cart:** dishes grouped by person, with notes. Mark a dish as Shared. Running total, a countdown to the cut-off, and member status ("Adding items", "Done"). On desktop, show the menu beside the cart.
6. **Host checkout (lock and place):** lock the cart, enter delivery, packaging and taxes, review each person's share, and place the order. The host can also cancel.
7. **Order confirmation:** a short celebration, who ordered what, each person's share with Paid or Pending, and the tracking link with "Copy link" and "Share on WhatsApp".
8. **My share and pay:** my own dishes, my share of shared dishes, my share of charges and my total, shown according to the chosen split rule, with a Pay button that opens the Razorpay-style demo modal. Below that, the group's Paid or Pending list.
9. **Live tracking:** five stages: Order accepted → Preparing → Picked up → On the way → Delivered. Each one steps forward on a timer in this prototype. "Your Rapido Captain is on the way", with a simple map. Anyone in the group can open it from the link.
10. **Order history:** past group orders with the restaurant, date, people, my share and status, a receipt view, and "Order again with this group".
11. **Profile and addresses:** name, phone (optional), and saved addresses labelled Home, Office, Friend's place or Other. Each address has line 1, line 2, landmark, area, city and a 6-digit pincode, plus a map pin after the user allows location (ask first and explain why). Set a default address. Saved payment methods show masked labels only.

**Navigation:** Explore · Start group order · Join · Orders · Profile. A desktop / mobile preview toggle for reviewers is fine, but no persona switcher.

---

## 5. Visual design

- **Colours:** cream background `#FAFAF7`, white cards `#FFFFFF`, Ownly yellow `#F9C933` for the primary action, crimson `#B7131C` / `#DB3231` for important moments and errors, green `#006D3B` with tint `#E8F7EE` for Paid and Delivered. Text `#141C26`, muted text `#606D7C`, borders `#E5E9EE`.
- **Type:** Plus Jakarta Sans. Use tabular numbers for every ₹ amount and time.
- **Feel:** quick and cheerful, like ordering with friends. Rounded cards, plenty of white space, food photos, prices in ₹.
- **Motion:** short, gentle transitions (150–200 ms) for modals, the countdown, quantity changes and tracking progress. Respect reduced-motion settings.

---

## 6. Code structure

- React + TypeScript.
- **All data access goes in one file, `ownly-api.js`, with one function per action.** Use mock data inside it for now. I'll swap it for Supabase, so the screens must call only these functions:

```
sendCode(email)                 verifyCode(email, code)        signOut()
currentUser()                   onAuthChange(callback)
getProfile()                    updateProfile({full_name, phone})
recordLocationConsent()         getGps()
listAddresses()                 addAddress({...})               deleteAddress(id)
listRestaurants(area)           getMenu(restaurantId)
startGroupOrder(restaurantId, addressId, cutOff, splitRule)    -> { id, share_code }
shareLink(code)                 codeFromLink()
previewGroup(code)              joinGroup(code)                 -> { group_order_id }
getGroup(groupId)               watchGroup(groupId, callback)   -> stop()
addItem(groupId, menuItemId, qty, notes, shared)
removeItem(itemId)              leaveGroup(groupId)
lockGroup(groupId)              placeGroup(groupId, delivery, packaging, taxes)
cancelGroup(groupId)
payMyShare(groupId, method)     -> { status, reference }   // method: upi | card | netbanking | cash
listPaymentMethods()            savePaymentMethod(type, maskedLabel)
myGroupOrders()
```

- splitRule: `'itemised'` (pay for what you ordered) or `'equal'` (split everything equally).
- Group status: `open` → `locked` → `placed` → `delivered`, or `cancelled`. Payment status: `pending`, `paid`, `failed`.

---

## 7. How to check it works

1. Sign up with an email and code, add a name and an address.
2. Start a group order with each split rule, then copy the link and the code.
3. Open the link in another browser, sign in as a second person and join. Add items, mark one as Shared, and see both carts update.
4. Try to join as a 13th person and see the "group is full" message.
5. As the host, lock the order, enter the charges, and check that the shares match the example in section 3.
6. Pay as each person, once with "Simulate failure" then Retry, and once with "Paid the host in cash". Check that Paid and Pending update for everyone.
7. Open the confirmation page and tracking from the link, and watch all five stages.
8. Check order history and "Order again with this group".
9. Check every screen on desktop (1440 px) and mobile (390 px), with the concept strip showing.
