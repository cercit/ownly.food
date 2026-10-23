# Chennai food-delivery prototype data

Research date: 23 October 2026.

## Files

- restaurants.csv: 15 real restaurant branches across seven Chennai areas, including eight vegetarian-only restaurants.
- menu_items.csv: 150 dishes, 20 estimated prices marked `est`, and three simulated unavailable items.

Mylapore has three restaurants. T. Nagar, Adyar, Velachery, OMR, Anna Nagar and Nungambakkam each have two. Restaurant and menu source URLs are included in the CSVs. Prices are whole rupees, rounded from listed prices where available.

## Estimated prices

- McDonald's - T. Nagar: McSpicy Paneer Burger 225; McSpicy Chicken Burger 225; Fries (Regular) 110.
- Sangeetha Veg Restaurant - Adyar: Ghee Podi Dosa 230; Masala Dosa 200; South Indian Meals 300; Special Coffee 75.
- Pizza Hut - Velachery: Chicken Pepperoni 399; Garlic Bread 149.
- Geetham Veg Restaurant - OMR: Ghee Pongal 150; Curd Rice 140; Kuzhi Paniyaram Sweet (6 Pcs) 160.
- Chinese Wok - Anna Nagar: Veg Manchow Soup with Crispy Noodles 179; Chowmein Chicken - Half (500 ml) 249; Chicken Manchurian Gravy - Half 269; Hunan Chicken Dry - Mini 229; Veg Hakka Noodles - Half 229.
- Sandy's Chocolate Laboratory - Nungambakkam: Tiny Chocolate Cake 400; Nutella Tiramisu 450; Triple Chocolate Brownie 350.

## Restaurant details and assumptions

- Listings indicate operating restaurants with delivery offerings; live delivery to a particular address was not verified.
- Hours conflict across sources for Murugan, Anjappar, Geetham, Sandy's, Ratna Cafe and Sangeetha Mylapore. Cream Stone's opening time and Nithya Amirtham's closing time remain provisional.
- Pind's 12:00-23:00 represents its overall daily span; it has an afternoon service break. Source: https://www.zomato.com/chennai/pind-velachery
- Pizza Hut uses its official 11:00-23:00 hours. Source: https://restaurants.pizzahut.co.in/pizza-hut-velachery-pizza-restaurant-velachery-chennai-22864/Home
- Dindigul Thalappakatti uses its official 11:00-01:00 hours. Source: https://thalappakatti.com/store-locator/chennai/dindigul-thalappakatti-perungudi-chennai
- Coordinates are approximate map positions, particularly Chinese Wok and Bombay Brasserie.
- After-midnight closing times refer to the following day.
- Photos are representative Pexels stock images. Direct links were checked to return images. Blank fields mean no suitable verified photo was selected. Photos are referenced by URL, not bundled as local image files.
- The three unavailable flags are prototype fixtures: Murugan's Ghee Podi Dosai, Chinese Wok's Hunan Chicken Dry - Mini, and Sandy's Tiny Chocolate Cake.

## Validation

The generated CSVs were checked for required columns, 15 unique restaurant names, 150 menu rows, matching restaurant names, 10 dishes per restaurant, valid categories, whole-number prices, lowercase boolean values, six-decimal coordinates, HH:MM times, and exactly three unavailable items.
