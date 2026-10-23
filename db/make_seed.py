"""Make synthetic demo data for Ownly Together.
Writes 03_seed.sql (Supabase) and csv/*.csv (Airtable / Softr course version). Run: python -I make_seed.py
All people, restaurants, addresses, phone numbers and payment details are invented."""
import csv, os, random, uuid
from datetime import datetime, timedelta

random.seed(29)
HERE = os.path.dirname(os.path.abspath(__file__))
NS = uuid.UUID("6f2b1c1e-0000-4000-8000-000000000029")
uid = lambda *k: str(uuid.uuid5(NS, "|".join(map(str, k))))
BASE = datetime(2026, 10, 23, 12, 0)  # CSV timestamps; SQL uses now()-relative times

AREAS = {  # approximate area centres, never real homes
    "Koramangala": ("Bengaluru", "560034", 12.9352, 77.6245),
    "HSR Layout": ("Bengaluru", "560102", 12.9116, 77.6474),
    "BTM Layout": ("Bengaluru", "560076", 12.9166, 77.6101),
    "Indiranagar": ("Bengaluru", "560038", 12.9784, 77.6408),
    "Bellandur": ("Bengaluru", "560103", 12.9260, 77.6762),
    "Gachibowli": ("Hyderabad", "500032", 17.4401, 78.3489),
    "HITEC City": ("Hyderabad", "500081", 17.4435, 78.3772),
    "Madhapur": ("Hyderabad", "500081", 17.4483, 78.3915),
}
def jitter(a):
    c = AREAS[a]
    return round(c[2] + random.uniform(-.004, .004), 6), round(c[3] + random.uniform(-.004, .004), 6)

PEOPLE = [  # (name, email, phone, home area, office area, office name)
    ("Ananya Rao", "demo.host@example.com", "+91 90000 10001", "Koramangala", "Bellandur", "Prestige Tech Park, Tower B"),
    ("Karthik Iyer", "demo.friend1@example.com", "+91 90000 10002", "HSR Layout", "Bellandur", "Prestige Tech Park, Tower B"),
    ("Meera Nair", "demo.friend2@example.com", "+91 90000 10003", "BTM Layout", "Koramangala", "Koramangala Co-work Hub"),
    ("Rohan Kulkarni", "rohan.k@example.com", "+91 90000 10004", "Koramangala", "Bellandur", "Prestige Tech Park, Tower B"),
    ("Sneha Patil", "sneha.p@example.com", "+91 90000 10005", "Indiranagar", "Koramangala", "Koramangala Co-work Hub"),
    ("Arjun Menon", "arjun.m@example.com", "+91 90000 10006", "HSR Layout", "HSR Layout", "HSR Startup Block"),
    ("Divya Shetty", "divya.s@example.com", "+91 90000 10007", "BTM Layout", "HSR Layout", "HSR Startup Block"),
    ("Vikram Reddy", "vikram.r@example.com", "+91 90000 10008", "Gachibowli", "HITEC City", "Cyber Towers, Wing 2"),
    ("Pooja Sharma", "pooja.s@example.com", "+91 90000 10009", "Madhapur", "HITEC City", "Cyber Towers, Wing 2"),
    ("Sai Teja", "sai.t@example.com", "+91 90000 10010", "Gachibowli", "Gachibowli", "Financial District Plaza"),
    ("Lakshmi Prasad", "lakshmi.p@example.com", "+91 90000 10011", "HITEC City", "Madhapur", "Madhapur IT Park"),
    ("Imran Khan", "imran.k@example.com", "+91 90000 10012", "Madhapur", "Gachibowli", "Financial District Plaza"),
]
FRIEND_FLATS = {0: (3, "Rohan's flat"), 1: (5, "Arjun's place"), 7: (9, "Sai's apartment")}

RESTAURANTS = [  # invented names
    ("Tiffin Tales", "South Indian", "Koramangala", True, "07:00", "22:30", [
        ("Masala Dosa", "Dosa", 90), ("Ghee Podi Idli", "Idli", 80), ("Rava Dosa", "Dosa", 100), ("Mini Meals", "Meals", 140),
        ("Bisi Bele Bath", "Rice", 110), ("Medu Vada (2)", "Snacks", 60), ("Filter Coffee", "Beverages", 40), ("Kesari Bath", "Desserts", 50)]),
    ("Biryani Bros", "Biryani", "HSR Layout", False, "11:00", "23:30", [
        ("Chicken Dum Biryani", "Biryani", 249), ("Mutton Biryani", "Biryani", 329), ("Veg Dum Biryani", "Biryani", 199),
        ("Egg Biryani", "Biryani", 189), ("Chicken 65", "Starters", 179), ("Mirchi ka Salan", "Sides", 69),
        ("Raita", "Sides", 39), ("Double ka Meetha", "Desserts", 89)]),
    ("Green Bowl Co.", "Salads and Bowls", "BTM Layout", True, "10:00", "22:00", [
        ("Paneer Tikka Bowl", "Bowls", 219), ("Quinoa Buddha Bowl", "Bowls", 249), ("Greek Salad", "Salads", 199),
        ("Peanut Noodle Salad", "Salads", 189), ("Hummus Wrap", "Wraps", 169), ("Cold Pressed Juice", "Beverages", 119),
        ("Oats Brownie", "Desserts", 89)]),
    ("Roll Republic", "Rolls", "Koramangala", False, "12:00", "01:00", [
        ("Chicken Tikka Roll", "Rolls", 149), ("Paneer Kathi Roll", "Rolls", 129), ("Double Egg Roll", "Rolls", 99),
        ("Mutton Seekh Roll", "Rolls", 179), ("Aloo Tikki Roll", "Rolls", 89), ("Masala Fries", "Sides", 79),
        ("Mint Lime Soda", "Beverages", 59)]),
    ("Dosa District", "South Indian", "Indiranagar", True, "07:30", "22:30", [
        ("Benne Masala Dosa", "Dosa", 120), ("Set Dosa", "Dosa", 95), ("Onion Uttapam", "Uttapam", 110),
        ("Pongal", "Rice", 90), ("Vada Sambar", "Snacks", 70), ("Badam Milk", "Beverages", 60)]),
    ("Hyderabadi Handi", "Hyderabadi", "Gachibowli", False, "11:30", "23:30", [
        ("Hyderabadi Chicken Biryani", "Biryani", 269), ("Haleem", "Mains", 239), ("Paneer Biryani", "Biryani", 229),
        ("Apollo Fish", "Starters", 259), ("Bagara Rice", "Rice", 149), ("Qubani ka Meetha", "Desserts", 109),
        ("Irani Chai", "Beverages", 30)]),
    ("Chai and Chakna", "Snacks", "HITEC City", True, "08:00", "23:00", [
        ("Bun Maska", "Snacks", 50), ("Samosa (2)", "Snacks", 40), ("Vada Pav", "Snacks", 45), ("Maggi Masala", "Snacks", 70),
        ("Cutting Chai", "Beverages", 20), ("Ginger Lemon Tea", "Beverages", 30), ("Osmania Biscuits", "Snacks", 35)]),
    ("Pizza Patio", "Pizza", "Madhapur", False, "11:00", "00:00", [
        ("Margherita (Medium)", "Pizza", 249), ("Farmhouse (Medium)", "Pizza", 329), ("Chicken Pepperoni (Medium)", "Pizza", 379),
        ("Paneer Makhani (Medium)", "Pizza", 349), ("Garlic Bread", "Sides", 129), ("Choco Lava Cake", "Desserts", 99),
        ("Coke 500 ml", "Beverages", 60)]),
]

# ---------------- build rows ----------------
profiles, addresses, restaurants, menu, methods = [], [], [], [], []
for i, (name, email, phone, home, office, office_name) in enumerate(PEOPLE):
    pid = uid("p", i)
    profiles.append(dict(id=pid, full_name=name, email=email, phone=phone, home=home))
    for kind, area, lname, line1 in [("home", home, "Home", f"Flat {random.randint(101, 905)}, {random.choice(['Sunrise', 'Lakeview', 'Green Park', 'Silver Oak'])} Residency"),
                                     ("office", office, "Office", office_name)]:
        lat, lng = jitter(area); city, pin = AREAS[area][:2]
        addresses.append(dict(id=uid("a", i, kind), user_id=pid, email=email, label=kind, label_name=lname, line1=line1,
                              line2=f"{random.randint(1, 18)}th Main", landmark=random.choice(["Near the metro", "Opposite the park", "Next to the bakery", "Behind the bus stop"]),
                              area=area, city=city, pincode=pin, lat=lat, lng=lng, gps_accuracy_m=random.choice([8, 12, 20, 35]),
                              source="gps" if kind == "home" else random.choice(["gps", "manual"]), is_default=(kind == "home")))
    if i in FRIEND_FLATS:
        fi, lname = FRIEND_FLATS[i]; area = PEOPLE[fi][3]; lat, lng = jitter(area); city, pin = AREAS[area][:2]
        addresses.append(dict(id=uid("a", i, "friend"), user_id=pid, email=email, label="friend", label_name=lname,
                              line1=f"House {random.randint(10, 99)}, {random.randint(1, 9)}th Cross", line2="", landmark="Gate with the blue door",
                              area=area, city=city, pincode=pin, lat=lat, lng=lng, gps_accuracy_m=15, source="manual", is_default=False))
    handle = email.split("@")[0][:3]
    methods.append(dict(id=uid("m", i, "upi"), user_id=pid, email=email, type="upi", display_label=f"{handle}•••@okaxis",
                        gateway_token=f"tok_TEST_{uuid.uuid5(NS, email).hex[:12]}", is_default=True))
    if i % 3 == 0:
        methods.append(dict(id=uid("m", i, "card"), user_id=pid, email=email, type="card", display_label=f"Visa •••• {4242 + i}",
                            gateway_token=f"tok_TEST_{uuid.uuid5(NS, email + 'card').hex[:12]}", is_default=False))

for r_i, (name, cuisine, area, veg, op, cl, items) in enumerate(RESTAURANTS):
    rid = uid("r", r_i); lat, lng = jitter(area)
    restaurants.append(dict(id=rid, name=name, cuisine=cuisine, area=area, city=AREAS[area][0], lat=lat, lng=lng,
                            veg_only=veg, opens_at=op, closes_at=cl, active=True))
    for m_i, (dish, cat, price) in enumerate(items):
        is_veg = veg or not any(w in dish for w in ["Chicken", "Mutton", "Egg", "Fish", "Haleem", "Pepperoni"])
        menu.append(dict(id=uid("mi", r_i, m_i), restaurant_id=rid, restaurant=name, name=dish, category=cat,
                         price=price, is_veg=is_veg, is_available=not (r_i == 1 and m_i == 1)))  # one sold-out dish

menu_by_r = {}
for m in menu:
    menu_by_r.setdefault(m["restaurant_id"], []).append(m)
addr = {(a["user_id"], a["label"]): a for a in addresses}

# group orders: (key, host idx, member idxs, restaurant idx, address kind, status, split, hours offset of creation, fees)
GROUPS = [
    ("G1", 0, [1, 3, 4], 0, "office", "open", "proportional", -0.5, (0, 0, 0)),
    ("G2", 7, [8, 10], 5, "office", "locked", "equal", -1, (0, 0, 0)),
    ("G3", 1, [0, 5, 6], 1, "home", "placed", "proportional", -3, (35, 20, 48)),
    ("G4", 2, [0, 4], 2, "home", "delivered", "equal", -26, (25, 15, 32)),
    ("G5", 9, [7, 11, 8], 7, "office", "delivered", "proportional", -50, (40, 25, 61)),
    ("G6", 5, [6], 3, "home", "cancelled", "equal", -72, (0, 0, 0)),
]
CODES = {"G1": "KORA24", "G2": "HITEC7", "G3": "BIRY4N", "G4": "GREEN2", "G5": "PIZZA5", "G6": "ROLL66"}
groups, members, items, payments = [], [], [], []
for key, h, mem, r_i, akind, status, split, hrs, (dfee, pfee, tax) in GROUPS:
    gid = uid("g", key); rid = restaurants[r_i]["id"]; host_pid = profiles[h]["id"]
    created = BASE + timedelta(hours=hrs)
    groups.append(dict(id=gid, key=key, share_code=CODES[key], host_id=host_pid, host_email=profiles[h]["email"], restaurant_id=rid,
                       restaurant=restaurants[r_i]["name"], delivery_address_id=addr[(host_pid, akind)]["id"], deliver_to=akind,
                       cut_off_hours=hrs + 1.5, created=created, status=status, split_rule=split,
                       delivery_fee=dfee, packaging_fee=pfee, taxes=tax))
    roster = [(h, "host")] + [(x, "member") for x in mem]
    food = {}
    for p_i, role in roster:
        mid = uid("gm", key, p_i)
        members.append(dict(id=mid, group_order_id=gid, group=key, user_id=profiles[p_i]["id"], email=profiles[p_i]["email"],
                            name=profiles[p_i]["full_name"], role=role, status="joined", joined=created + timedelta(minutes=5 * len(members) % 40)))
        picks = random.sample([m for m in menu_by_r[rid] if m["is_available"]], k=random.choice([1, 2, 2, 3]))
        food[mid] = 0
        for n, m in enumerate(picks):
            qty = 1 if m["category"] != "Beverages" else random.choice([1, 2])
            items.append(dict(id=uid("oi", key, p_i, n), group_order_id=gid, group=key, member_id=mid, member=profiles[p_i]["full_name"],
                              menu_item_id=m["id"], dish=m["name"], qty=qty, unit_price=m["price"],
                              notes=random.choice(["", "", "Less spicy", "No onion", "Extra chutney", "Pack separately"])))
            food[mid] += qty * m["price"]
    if status in ("placed", "delivered"):
        total_food = sum(food.values()); extras = dfee + pfee; n = len(food); rows = []
        for p_i, role in roster:
            mid = uid("gm", key, p_i); f = food[mid]
            d = round(extras / n, 2) if split == "equal" else round(extras * f / total_food, 2)
            t = round(tax / n, 2) if split == "equal" else round(tax * f / total_food, 2)
            paid = role == "host" or status == "delivered" or p_i % 2 == 0
            method = "upi" if role == "host" else random.choice(["upi", "upi", "card", "cash"])
            rows.append(dict(id=uid("pay", key, p_i), group_order_id=gid, group=key, member_id=mid, member=profiles[p_i]["full_name"],
                             food_amount=f, delivery_share=d, tax_share=t, total=round(f + d + t, 2),
                             payee="restaurant" if role == "host" else "host",
                             method_type=method if paid else "", status="paid" if paid else "pending",
                             gateway_payment_id=("CASH-TO-HOST" if method == "cash" else f"pay_TEST_{uuid.uuid5(NS, 'ref'+key+str(p_i)).hex[:10].upper()}") if paid else "",
                             paid=paid))
        diff = round(total_food + extras + tax - sum(r["total"] for r in rows), 2)
        rows[0]["total"] = round(rows[0]["total"] + diff, 2); rows[0]["delivery_share"] = round(rows[0]["delivery_share"] + diff, 2)
        payments += rows

# ---------------- CSV (Airtable-friendly: readable link columns) ----------------
out = os.path.join(HERE, "csv"); os.makedirs(out, exist_ok=True)
def write(name, rows, cols):
    with open(os.path.join(out, name), "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f); w.writerow(cols)
        for r in rows:
            w.writerow([r.get(c, "") for c in cols])
iso = lambda d: d.strftime("%Y-%m-%d %H:%M")
write("1_Users.csv", profiles, ["email", "full_name", "phone"])
write("2_Addresses.csv", [dict(a, user=a["email"]) for a in addresses],
      ["label_name", "user", "label", "line1", "line2", "landmark", "area", "city", "pincode", "lat", "lng", "gps_accuracy_m", "source", "is_default"])
write("3_Restaurants.csv", restaurants, ["name", "cuisine", "area", "city", "lat", "lng", "veg_only", "opens_at", "closes_at", "active"])
write("4_Menu_Items.csv", menu, ["name", "restaurant", "category", "price", "is_veg", "is_available"])
write("5_Group_Orders.csv", [dict(g, host=g["host_email"], created_at=iso(g["created"]),
                                  cut_off_at=iso(BASE + timedelta(hours=g["cut_off_hours"]))) for g in groups],
      ["share_code", "host", "restaurant", "deliver_to", "status", "split_rule", "cut_off_at", "created_at", "delivery_fee", "packaging_fee", "taxes"])
write("6_Group_Members.csv", [dict(m, group_code=CODES[m["group"]], user=m["email"], joined_at=iso(m["joined"])) for m in members],
      ["group_code", "user", "name", "role", "status", "joined_at"])
write("7_Order_Items.csv", [dict(i, group_code=CODES[i["group"]]) for i in items],
      ["group_code", "member", "dish", "qty", "unit_price", "notes"])
write("8_Payment_Methods.csv", [dict(m, user=m["email"]) for m in methods], ["user", "type", "display_label", "gateway_token", "is_default"])
write("9_Payments.csv", [dict(p, group_code=CODES[p["group"]]) for p in payments],
      ["group_code", "member", "food_amount", "delivery_share", "tax_share", "total", "payee", "method_type", "status", "gateway_payment_id"])

# ---------------- SQL seed (Supabase) ----------------
def q(v):
    if v is None or v == "": return "null"
    if isinstance(v, bool): return "true" if v else "false"
    if isinstance(v, (int, float)): return str(v)
    return "'" + str(v).replace("'", "''") + "'"
def ins(table, rows, cols, fn=None):
    lines = [f"insert into {table} ({', '.join(cols)}) values"]
    vals = []
    for r in rows:
        vals.append("  (" + ", ".join((fn(r, c) if fn and fn(r, c) is not None else q(r[c])) for c in cols) + ")")
    return "\n".join(lines) + "\n" + ",\n".join(vals) + ";\n"
hrs = lambda h: f"now() + interval '{h} hours'"
sql = ["-- Ownly Together demo data (synthetic). Run after 01 and 02. Safe to re-run: clears the demo tables first.",
       "truncate payments, order_items, group_members, group_orders, payment_methods, menu_items, restaurants restart identity cascade;",
       "update profiles set default_address_id = null;",
       "delete from addresses where user_id in (select id from profiles where email like '%@example.com');",
       "delete from profiles where email like '%@example.com' and auth_user_id is null;", ""]
sql.append(ins("profiles", profiles, ["id", "full_name", "email", "phone"]).replace(";\n", "\non conflict (email) do update set full_name = excluded.full_name, phone = excluded.phone;\n"))
# profiles linked to an existing login keep their own id; map seeded ids to whatever id the email has
sql.append("create temp table pid_map as select s.seed_id, p.id from (values " + ", ".join(f"({q(p['id'])}::uuid, {q(p['email'])})" for p in profiles) +
           ") s(seed_id, email) join profiles p on p.email = s.email;\n")
def remap(col):  # wrap a profile id so it follows pid_map
    return lambda r, c: f"(select id from pid_map where seed_id = {q(r[c])}::uuid)" if c == col else None
sql.append(ins("addresses", addresses, ["id", "user_id", "label", "label_name", "line1", "line2", "landmark", "area", "city", "pincode",
                                        "lat", "lng", "gps_accuracy_m", "source", "is_default"], remap("user_id")))
sql.append("update profiles p set default_address_id = a.id from addresses a where a.user_id = p.id and a.is_default;\n")
sql.append(ins("restaurants", restaurants, ["id", "name", "cuisine", "area", "city", "lat", "lng", "veg_only", "opens_at", "closes_at", "active"]))
sql.append(ins("menu_items", menu, ["id", "restaurant_id", "name", "category", "price", "is_veg", "is_available"]))
sql.append(ins("payment_methods", methods, ["id", "user_id", "type", "display_label", "gateway_token", "is_default"], remap("user_id")))
def gfn(r, c):
    if c == "host_id": return f"(select id from pid_map where seed_id = {q(r[c])}::uuid)"
    if c == "cut_off_at": return hrs(r["cut_off_hours"] + (24 if r["status"] == "open" else 0))
    if c == "created_at": return hrs(r["cut_off_hours"] - 1.5)
    if c == "placed_at": return hrs(r["cut_off_hours"]) if r["status"] in ("placed", "delivered") else "null"
    if c == "delivered_at": return hrs(r["cut_off_hours"] + 0.75) if r["status"] == "delivered" else "null"
    return None
for g in groups:
    g["cut_off_at"] = g["created_at"] = g["placed_at"] = g["delivered_at"] = None
sql.append(ins("group_orders", groups, ["id", "share_code", "host_id", "restaurant_id", "delivery_address_id", "cut_off_at", "status",
                                        "split_rule", "delivery_fee", "packaging_fee", "taxes", "created_at", "placed_at", "delivered_at"], gfn))
sql.append(ins("group_members", members, ["id", "group_order_id", "user_id", "role", "status"], remap("user_id")))
sql.append(ins("order_items", items, ["id", "group_order_id", "member_id", "menu_item_id", "qty", "unit_price", "notes"]))
def pfn(r, c):
    if c == "paid_at": return "now() - interval '1 hour'" if r["paid"] else "null"
    if c == "method_type": return q(r[c]) if r[c] else "null"
    return None
for p in payments:
    p["paid_at"] = None
sql.append(ins("payments", payments, ["id", "group_order_id", "member_id", "food_amount", "delivery_share", "tax_share", "total", "payee",
                                      "method_type", "status", "gateway_payment_id", "paid_at"], pfn))
sql.append("drop table pid_map;\n")
open(os.path.join(HERE, "03_seed.sql"), "w", encoding="utf-8").write("\n".join(sql))
print(f"{len(profiles)} users, {len(addresses)} addresses, {len(restaurants)} restaurants, {len(menu)} dishes, "
      f"{len(groups)} group orders, {len(members)} members, {len(items)} items, {len(methods)} payment methods, {len(payments)} payments")
