const products = [
  { id: 1, name: "MacBook Air M2", price: 120000, category: "laptop", inStock: true, tags: ["apple", "work"] },
  { id: 2, name: "iPhone 15", price: 90000, category: "phone", inStock: false, tags: ["apple", "photo"] },
  { id: 3, name: "Galaxy S24", price: 85000, category: "phone", inStock: true, tags: ["android"] },
  { id: 4, name: "ThinkPad X1", price: 140000, category: "laptop", inStock: true, tags: ["work"] },
  { id: 5, name: "iPad Pro", price: 110000, category: "tablet", inStock: true, tags: ["apple", "draw"] },
];

const users = [
  { id: 10, name: "  Anna Smith  ", role: "admin", active: true },
  { id: 11, name: "ivan petrov", role: "user", active: false },
  { id: 12, name: "Maria  Ivanova", role: "user", active: true },
  { id: 13, name: "Denis", role: "moderator", active: true },
];

const orders = [
  { id: 100, userId: 10, items: [{ productId: 1, qty: 1 }, { productId: 3, qty: 2 }] },
  { id: 101, userId: 12, items: [{ productId: 2, qty: 1 }] },
  { id: 102, userId: 10, items: [{ productId: 5, qty: 1 }, { productId: 4, qty: 1 }] },
];
//1
const postTitle= products.map(product => product.name);
console.log("Title:", postTitle);
//2
const availableProducts= products.filter(product => product.inStock=== true);
console.log("inStock:", availableProducts);
//3
const currentProduct= products.find(product => product.id===4);
console.log("current", currentProduct);
//4

const expensive= products.every(product => product.price>50000 );
console.log("все Товары дороже 50000?",expensive);
//5
const clients = users.map(user =>
  user.name.trim().toLowerCase()
);
console.log("клиенты", clients);
//6
const result = products.filter(product =>
  product.name.toLowerCase().includes("pro")
);
console.log("Продукт содержазщий PRO", result);
//7
const categories= products.map(product=>
  product.category);
const uniqueProducts= [...new Set(categories)];
const dropdownOptions = uniqueProducts.map(category => ({
  value: category,
  label: category.toUpperCase()
}));

//8
const prices= products.map(product=>
  product.price);
const sortPrices= [...prices].sort((a, b) => b - a).slice(0,3);
console.log("Sort", sortPrices);

//10
const productsById= products.reduce((acc,product)=>{
acc[product.id]=product;
return acc
},{});
console.log(productsById[3]);

//11
const categoryCount = products.reduce((acc, product) => {
  const category = product.category;

  if (acc[category]) {
    acc[category] += 1;
  } else {
    acc[category] = 1;
  }

  return acc;
}, {});

console.log(categoryCount);

// 12
const numbers = [1, 2, 3];
const newNum =[...numbers,4]
console.log(newNum);
//13
const users1 = [
  { id: 1, name: "Anna" },
  { id: 2, name: "Ivan" }
];
const newUsers= users1.map(user => user.id ===2
 ?{...user,name:"Petr"}
 : user
);
console.log(newUsers);
//14
const cart = [
  { id: 1, qty: 1 },
  { id: 2, qty: 2 }
];
const newCart= cart.map(i => i.id ===1
 ?{...i, qty: i.qty+1}
 : i
);
console.log(newCart);


