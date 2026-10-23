# How I designed Ownly Together in Google Stitch

Ownly Together is a group-ordering idea for Ownly, Rapido's zero-commission food app. Ownly runs in Bengaluru and Hyderabad but hasn't reached Chennai yet, so I designed Ownly Together as the way it launches there. Friends or office colleagues order from one restaurant, each person adds their own food, and the app splits the bill so nobody has to chase anyone on UPI the next day.

I designed every screen in Google Stitch with eight prompts. Each prompt built on the one before it: first the brief, then the full set of screens, then desktop, then payments, then what happens after the order is placed, then moving the whole design to Chennai, then holding every screen to the product rules, and a final clean-up pass. These are the prompts I used.

---

## Prompt 1: the brief

> I'm designing a concept feature called **Ownly Together** for Ownly, Rapido's zero-commission food delivery app in Bengaluru and Hyderabad. I've attached my PRD and the text from Ownly's Hyderabad page, so you have the problem, the users and the brand.
>
> The problem: when a group orders food together, one person collects everyone's choices on WhatsApp, rebuilds the cart by hand, pays the full bill and then spends a day or two chasing people for their share. Ownly Together moves all of that into the app.
>
> Read both files first. Match Ownly's look: the warm yellow, the bold red for important moments, green for "paid" and "delivered", plenty of white space, rounded friendly cards, real Indian food photography and prices in ₹. It should feel quick and cheerful, like ordering with friends, not like a banking app.
>
> Every screen carries a thin strip that reads: *"Concept prototype by Sameer Mittimani. Not an official Rapido product."*

## Prompt 2: every screen, mobile and web

> Now design the whole flow from the PRD, for both mobile and web. I want all nine screens:
>
> 1. **Sign in** with email and a 6-digit code. No passwords.
> 2. **Profile and saved addresses:** home, office, a friend's place or other, each with a pin on the map once the user allows location.
> 3. **Restaurants** near the chosen address.
> 4. **Start a group order:** pick the restaurant, the delivery address and a cut-off time, then get a 6-character code and a link to share.
> 5. **Join:** open the link or type the code and you're in.
> 6. **Shared cart:** everyone's dishes grouped by person, a "share this dish" option for things like a big biryani or dessert, and a running total that updates as people add.
> 7. **Lock and place:** the host closes the cart at the cut-off and places one order with the restaurant.
> 8. **My share:** what I owe and how it was worked out.
> 9. **History:** past group orders with "Order again with this group".
>
> Up to 12 people can join a group. There's no limit on the order value.

## Prompt 3: desktop

> Now build those same screens for desktop. Use the wider screen properly rather than stretching the phone layout: the menu next to the live shared cart, the bill split next to the payment options, and the group's progress always visible on the side. Keep the brand, the type and the concept strip exactly the same as on mobile.

## Prompt 4: payment, built for sharing

> There's no payment screen yet. Design one modelled on a Razorpay checkout (UPI, card, netbanking, plus a "paid the host in cash" option), built around sharing the bill rather than one person paying it.
>
> Show each person exactly where their number comes from: their own dishes at full price, their equal share of any shared dishes, and their equal share of Rapido's delivery, packaging and taxes. Everyone pays their own share, the host included. Show the whole group with a clear Paid or Pending badge next to each name.
>
> This is a demo, so add a clear note that no real money moves.

## Prompt 5: after the order

> Finish the journey after the host places the order:
>
> - An **order confirmation** page that celebrates a little, sums up who ordered what, and puts the share link front and centre.
> - A **live tracking** view that anyone in the group can open from that link, without asking the host: order accepted, being prepared, picked up, on the way, delivered.
>
> Everyone in the group should see the same status at the same moment, so nobody has to message the host asking "where's the food?"

---

## Prompt 6: moving it to Chennai

> Ownly isn't in Chennai yet, and that's where I want this to launch. Change every place, address, restaurant and map on all screens to Chennai: T. Nagar, Adyar, Velachery, OMR, Anna Nagar, Nungambakkam and Mylapore. Remove all Hyderabad and Bengaluru references. Keep everything else the same.

## Prompt 7: holding the design to the product rules

> Fix these on every screen, desktop and mobile:
> 1. Finish the move to Chennai: remove Paradise Biryani, Mindspace, Hitec City, Madhapur and every Hyderabad address, including the web home page and the WhatsApp share text. Use Chennai places only.
> 2. Remove the 6-member / ₹2,000 limit. The only limit is 12 people. No limit on order value.
> 3. Remove "absorbed fees", "markup" and every price comparison with other apps or "you saved" banner.
> 4. Remove rider names, number plates and the Call Captain button. Just say "Your Rapido Captain is on the way".
> 5. Don't use "Rapido Direct" or "Express Saver". Just say "Rapido".
> 6. Room code is 6 letters or numbers with no dash, e.g. TNR742 (not PAR-742).
> 7. Remove the bag capacity gauge.
>
> Keep the design, colours and layout the same.

## Prompt 8: final clean-up

> Almost there. Fix these remaining items on every screen:
> 1. Replace every "Rapido Direct" with "Rapido".
> 2. Remove all fee and price claims: "₹0 Fees", "No markup", "0% platform fees", "No inflated markups or surge fees", "Zero packaging markup", "0% eaten by intermediaries", "₹10 to Rapido direct runner". Show Rapido's delivery, packaging and taxes as plain amounts split equally.
> 3. Remove "Hyderabad, Telangana 500081" from the footer. Chennai only.
> 4. Room code has no dash anywhere: TNR742, not TNR-742 or PAR-742. Update the share, copy and WhatsApp messages too, and replace "Paradise Biryani" in them with the Chennai restaurant on screen.
> 5. Remove company names, CIN and GSTIN numbers, and "22,000+ restaurants". Footer should only say: "Concept prototype by Sameer Mittimani. Not an official Rapido product."
> 6. Add the concept strip to the mobile Razorpay payment screen.
>
> Keep everything else the same.

---

## What Stitch made

Twenty-two screens across mobile and desktop: sign-in, profile and addresses, restaurants, start a group, join, the shared cart with split, lock and place, the Razorpay-style split payment, order confirmation with the share link, live group tracking, order history, and a desktop home page.

The screens are in this folder, one per sub-folder, each with a `screen.png` preview and the `code.html` Stitch generated. Stitch's design notes (colours and type) are in `zero_commission_food_delivery/DESIGN.md`.

*Ownly and Rapido belong to their owners. This is a concept made for my IIT Roorkee × Masai product management course.*
