const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");

const productController = require("../controllers/productController");
const upload = require("../middleware/uploadMiddleware");

// PUBLIC
router.get("/", productController.getProducts);

// ADMIN
router.post("/", auth, upload.single("image"), productController.createProduct);
router.put("/:id", auth, upload.single("image"), productController.updateProduct);
router.delete("/:id", auth, productController.deleteProduct);

module.exports = router;
