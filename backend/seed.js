const dotenv = require('dotenv');
dotenv.config();
const mongoose = require('mongoose');
const Product = require('./models/Product');

// Database Connection
mongoose.connect(process.env.MONGO_URI, {
    dbName: 'gadgetDb',
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error(err));

const seedProducts = async () => {
    try {
        const count = await Product.countDocuments();
        if (count > 0) {
            console.log('Database already seeded, skipping...');
            process.exit();
        }
        await Product.deleteMany();
        await Product.insertMany([
            {
                name: "Galaxy S24",
                weight: "168g",
                height: "147mm",
                battery: "4000mAh",
                capacity: "128GB",
                amount: 799,
                category: "Phones",
                image: "https://example.com/galaxy-s24.jpg"
            },
            {
                name: "MacBook Pro",
                weight: "1.4kg",
                height: "15.5mm",
                battery: "66.5Wh",
                capacity: "512GB",
                amount: 1299,
                category: "Laptops",
                image: "https://example.com/macbook.jpg"
            },
            {
                name: "iPad Air",
                weight: "461g",
                height: "247.6mm",
                battery: "28.6Wh",
                capacity: "64GB",
                amount: 599,
                category: "Ipads",
                image: "https://example.com/ipad.jpg"
            },
            {
                name: "Apple Watch Series 9",
                weight: "31.9g",
                height: "45mm",
                battery: "308mAh",
                capacity: "64GB",
                amount: 399,
                category: "Watches",
                image: "https://example.com/watch.jpg"
            }
        ]);
        console.log('Database seeded successfully with products');
        process.exit();
    } catch (err) {
        console.error('Seeding error:', err);
        process.exit(1);
    }
};

seedProducts();