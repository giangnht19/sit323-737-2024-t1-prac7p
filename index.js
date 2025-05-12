require('dotenv').config();
const port = process.env.PORT || 4000;
const express = require("express");
const cors = require("cors");
const app = express();
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

app.use(express.json());
app.use(cors());

// Database connection with MongoDB
mongoose.connect(process.env.MONGODB_URI)

app.use(express.urlencoded({ extended: true }));

// API Creation
app.get("/", (req, res) => {
    res.send("Express App is up and running");
})

app.listen(port, (error) => {
    if (!error) {
        console.log("Server is Successfully running, listening on port " + port);
    }
    else {
        console.log("Error occurred, server can't start", error);
    }
})


// Image Storage Engine
const storage = multer.diskStorage({    
    destination: './upload/images',
    filename: (req, file, cb) => {
        return cb(null, `${file.fieldname}_${Date.now()}_${path.extname(file.originalname)}`)
    }
})

const upload = multer({ storage: storage });

// Creating Upload Endpoints
app.use("/images", express.static("upload/images"));

app.post("/upload", upload.single("product"), (req, res) => {
    res.json({
        success: 1,
        image_url: `http://localhost:${port}/images/${req.file.filename}`
    })
})

// Schema for creating product
const productSchema = mongoose.model("product", {
    id: {
        type: Number,
        required: true
    },
    name: {
        type: String,
        required: true
    },
    image: {
        type: String,
        required: true
    },
    category: {
        type: String,
        required: true
    },
    new_price: {
        type: Number,
        required: true
    },
    old_price: {
        type: Number,
        required: true
    },
    date: {
        type: Date,
        default: Date.now
    },
    available: {
        type: Boolean,
        default: true
    }
})

app.post("/addproduct", async (req, res) => {
    let products = await productSchema.find({});
    // console.log(products);
    let id;
    if (products.length > 0) {
        let lastProduct = products.slice(-1)[0];
        id = lastProduct.id + 1;
    } else {
        id = 1;
    }
    const product = new productSchema({
        id: id,
        name: req.body.name,
        image: req.body.image,
        category: req.body.category,
        new_price: req.body.new_price,
        old_price: req.body.old_price
    });
    // console.log(product);
    product.save();
    // console.log("Success");
    res.json({
        success: true,
        name: req.body.name
    })
})

// Creating API for deleting product
app.post("/deleteproduct", async (req, res) => {
    await productSchema.findOneAndDelete({ 
        id: req.body.id 
    });
    // console.log("Removed");
    res.json({
        success: true,
        name: req.body.name
    })
})

// Creating API for getting all product
app.get("/allproducts", async (req, res) => {
    let products = await productSchema.find({});
    // console.log("All Products Fetched Successfully");
    res.send(products);
})

// Schema creating for user module
const userSchema = mongoose.model("user", {
    username: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    cartData: {
        type: Object,
    },
    date: {
        type: Date,
        default: Date.now
    }
})

// Schema for creating order
const orderSchema = mongoose.model("order", {
    userId: {
        type: String,
        required: true
    },
    items: {
        type: Array,
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    address: {
        type: Object,
        required: true
    },
    status: {
        type: String,
        default: "Pending"
    },
    date: {
        type: Date,
        default: Date.now
    },
    payment: {
        type: Boolean,
        default: false
    }
})

// Creating Endpoint for registering user
app.post("/register", async (req, res) => {
    
    let check = await userSchema.findOne({ email: req.body.email });
    if (check) {
        return res.status(400).json({
            success: false,
            message: "Email already exists"
        })
    };

    let cart = {};
    for (let i = 0; i < 300; i++) {
        cart[i] = 0;
    };
    const user = new userSchema({
        username: req.body.username,
        email: req.body.email,
        password: req.body.password,
        cartData: cart
    });

    await user.save();

    const data = {
        user: {
            id: user.id
        }
    }

    const authToken = jwt.sign(data, "secret_ecom")
    res.json({
        success: true,
        message: "User registered successfully",
        token: authToken
    })
})

// Creating Endpoint for newcollection data 
app.get("/newcollection", async (req, res) => {
    let products = await productSchema.find({});
    let newCollection = products.slice(1).slice(-8);
    // console.log("New Collection Fetched Successfully");
    res.send(newCollection);
})

// Creating Endpoint for popular in women data
app.get("/popularmen", async (req, res) => {
    let products = await productSchema.find({ category : "men" });
    let popularWomen = products.slice(0,4);
    // console.log("Popular in men Fetched Successfully");
    res.send(popularWomen);
})

// Creating middleware for fetching user data
const fetchUser = (req, res, next) => {
    const token = req.header('auth-token');
    if (!token) {
        res.status(401).send({ error: "Please authenticate using a valid token" });
    }
    try {
        const data = jwt.verify(token, "secret_ecom");
        req.user = data.user;
        next();
    } catch (error) {
        res.status(401).send({ error: "Please authenticate using a valid token" });
    }
}

// Creating Endpoint for adding to cart
app.post('/addtocart', fetchUser, async (req, res) => {
    let userData = await userSchema.findOne({_id: req.user.id});
    userData.cartData[req.body.itemId] += 1;
    await userSchema.findOneAndUpdate({_id: req.user.id}, { cartData: userData.cartData });
    // console.log("Removed", req.body.itemId);

});

// Creating Endpoint for removing from cart
app.post('/removefromcart', fetchUser, async (req, res) => {
    let userData = await userSchema.findOne({_id: req.user.id});
    if (userData.cartData[req.body.itemId] > 0)
    userData.cartData[req.body.itemId] -= 1;
    await userSchema.findOneAndUpdate({_id: req.user.id}, { cartData: userData.cartData });
    // console.log("Removed", req.body.itemId);
    
})

// Creating Endpoint for getting cart data
app.post('/getcartdata', fetchUser, async (req, res) => {
    let userData = await userSchema.findOne({_id: req.user.id});
    // console.log("Cart Data Fetched Successfully");
    res.json(userData.cartData);
})

// Creating Endpoint for making payment
app.post("/place-order", fetchUser, async (req, res) => {
    try {
        const { items } = req.body;

        const newOrder = new orderSchema({
            userId: req.user.id,
            items: items,
            amount: req.body.amount,
            address: req.body.address,
        });

        await userSchema.findOneAndUpdate(
            { _id: req.user.id },
            { cartData: req.body.cartData }
        );

        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ error: "No items in the order." });
        }

        const lineItems = items.map((item) => {
            if (!item.price || isNaN(item.price)) {
                throw new Error(`Invalid price for item: ${item.name}`);
            }

            return {
                price_data: {
                    currency: 'usd',
                    product_data: {
                        name: item.name,
                        images: item.image ? [item.image] : [],
                    },
                    unit_amount: Math.round(Number(item.price) * 100), // Ensure it's a number
                },
                quantity: item.quantity,
            };
        });

        const session = await stripe.checkout.sessions.create({
            line_items: lineItems,
            mode: 'payment',
            success_url: `http://localhost:3000/verify?success=true&orderId=${newOrder._id}`,
            cancel_url: `http://localhost:3000/verify?success=false&orderId=${newOrder._id}`,
        });

        await newOrder.save();

        res.json({ id: session.id, success: true });
    } catch (error) {
        console.error("Error creating Stripe session:", error);
        res.json({
            success: false,
            error: error.message
        });
    }
});

// Creating Endpoint for verifying order
app.post("/verify-order", async (req, res) => {
    
    // Get success status from stripe checkout session
    const { success, orderId } = req.body;
    console.log("Success:", success);
    console.log("Order ID:", orderId);
    
    try {
        if (success === "true") {
            await orderSchema.findOneAndUpdate({ _id: orderId },{ payment: true });
            console.log("Payment Successful");
            res.json({success: true, message: "Payment Successful"});
        }
        else {
            await orderSchema.findOneAndDelete(orderId);
            console.log("Payment Failed");
            res.json({success: false, message: "Payment Failed"});
        }
    } catch (error) {
        console.error("Error verifying order:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

//Creating Endpoint for getting user orders
app.post("/getorders", fetchUser, async (req, res) => {
    try {
        let orders = await orderSchema.find({ userId: req.user.id });
        // console.log("Orders Fetched Successfully");
        res.json({success: true, orders: orders});
    } catch (error) {
        // console.log("Error fetching orders:", error);
        res.status(500).json({ success: false, error: error.message });
    }
})

// Creating endpoint for listing all orders for admin
app.get("/allorders", async (req, res) => {
    try {
        let orders = await orderSchema.find({});
        // console.log("Orders Fetched Successfully");
        res.json({success: true, data: orders});
    } catch (error) {
        // console.log("Error fetching orders:", error);
        res.status(500).json({ success: false, error: error.message });
    }
})

// Creating Endpoint for updating order status
app.put("/orders/:id", async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    try {
        const updatedOrder = await orderSchema.findByIdAndUpdate(
            id,
            { status: status },
            { new: true }
        );

        if (!updatedOrder) {
            return res.status(404).json({ success: false, message: "Order not found" });
        }

        res.json({ success: true, message: "Order status updated successfully", order: updatedOrder });
    } catch (error) {
        console.error("Error updating order status:", error);
        res.status(500).json({ success: false, error: error.message });
    }
})

// Creating Endpoint for login user
app.post("/login", async (req, res) => {
    let user = await userSchema.findOne({ email: req.body.email });
    if (user) {
        if (req.body.password === user.password) {
            const data = {
                user: {
                    id: user.id
                }
            }
            const authToken = jwt.sign(data, "secret_ecom");
            res.json({
                success: true,
                message: "User logged in successfully",
                token: authToken
            })
        }
        else {
            res.json({
                success: false,
                message: "Wrong Password"
            })
        }
    }
    else {
        res.json({
            success: false,
            message: "Wrong Email"
        })
    }
})