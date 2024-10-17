const mongoose = require("mongoose");

// Схема для адреса заказа
const AddressSchema = new mongoose.Schema({
  streetAddress: {
    type: String,
    required: true,
  },
  unit: {
    type: String,
  },
  state: {
    type: String,
    required: true,
  },
  suburb: {
    type: String,
    required: true,
  },
  postcode: {
    type: Number,
    required: true,
  },
  phone: {
    type: String,
    /* required: true, */
  },
});

// Схема для заказа клиента
const OrderSchema = new mongoose.Schema({
  userAccount: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  firstName: {
    type: String,
    required: true,
  },
  lastName: {
    type: String,
    required: true,
  },
  phone: {
    type: String,
    /* required: true, */
  },
  color: {
    type: String,
    required: true,
  },
  invoiceNumber: {
    type: Number,
    required: true,
    unique: true,
    default: 0,
  },
  orderDate: {
    type: Date,
    default: Date.now,
  },
  shippingAddress: {
    type: AddressSchema,
    required: true,
  },
  transactionDetails: {
    type: String, // or object
    /* required: true, */
  },
});


OrderSchema.pre("save", async function (next) {
  if (this.isNew) {
    const lastOrder = await mongoose
      .model("Order")
      .findOne()
      .sort({ invoiceNumber: -1 });
    this.invoiceNumber = lastOrder ? lastOrder.invoiceNumber + 1 : 1;
  }
  next();
});

module.exports = mongoose.model("Order", OrderSchema);
