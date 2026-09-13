const db = require("../config/db");
const { sendServerError } = require("../middlewares/errorMiddleware");

/* =========================
   CREATE PRODUCT (ADMIN)
========================= */
exports.createProduct = (req, res) => {
  const {
    name,
    description,
    price,
    old_price,        // ==== ADDED: optional old price
    stock,
    category_id,
    featured
  } = req.body;

  const image = req.file ? req.file.filename : null;

  const query = `
    INSERT INTO products
    (name, description, price, old_price, stock, image, category_id, featured)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(
    query,
    [
      name,
      description,
      price,
      old_price || null,   // ==== ADDED
      stock,
      image,
      category_id,
      featured ? true : false
    ],
    (err, result) => {
      if (err) return sendServerError(res, err, "Failed to create product");

      res.status(201).json({
        message: "Product created successfully",
        productId: result.insertId
      });
    }
  );
};

/* =========================
   GET ALL PRODUCTS (SIMPLE)
========================= */
exports.getProducts = (req, res) => {
  const query = `
    SELECT p.*, c.name AS category,
           (p.old_price IS NOT NULL AND p.old_price > p.price) AS is_on_sale   
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
  `;

  db.query(query, (err, result) => {
    if (err) return sendServerError(res, err, "Failed to fetch products");
    res.json(result);
  });
};

/* =========================
   GET SINGLE PRODUCT (DETAILS PAGE)
========================= */
exports.getProductById = (req, res) => {
  const productId = req.params.id;

  const productQuery = `
    SELECT p.*, c.name AS category_name,
           (p.old_price IS NOT NULL AND p.old_price > p.price) AS is_on_sale   
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE p.id = ?
  `;

  db.query(productQuery, [productId], (err, productResult) => {
    if (err) return sendServerError(res, err, "Failed to fetch product");

    if (productResult.length === 0) {
      return res.status(404).json({
        message: "Product not found"
      });
    }

    const product = productResult[0];

    const reviewsQuery = `
      SELECT r.id, r.rating, r.comment, r.created_at, u.name
      FROM reviews r
      JOIN users u ON r.user_id = u.id
      WHERE r.product_id = ?
      ORDER BY r.created_at DESC
    `;

    db.query(reviewsQuery, [productId], (reviewErr, reviews) => {
      if (reviewErr) return sendServerError(res, reviewErr, "Failed to fetch product reviews");

      const ratingQuery = `
        SELECT 
          AVG(rating) AS averageRating,
          COUNT(*) AS totalReviews
        FROM reviews
        WHERE product_id = ?
      `;

      db.query(ratingQuery, [productId], (ratingErr, ratingResult) => {
        if (ratingErr) return sendServerError(res, ratingErr, "Failed to fetch product ratings");

        const relatedQuery = `
          SELECT *
          FROM products
          WHERE category_id = ?
          AND id != ?
          LIMIT 4
        `;

        db.query(
          relatedQuery,
          [product.category_id, product.id],
          (relatedErr, relatedProducts) => {
            if (relatedErr) return sendServerError(res, relatedErr, "Failed to fetch related products");

            res.json({
              product,
              reviews,
              averageRating: Number(
                ratingResult[0].averageRating || 0
              ).toFixed(1),
              totalReviews: ratingResult[0].totalReviews,
              relatedProducts
            });
          }
        );
      });
    });
  });
};

/* =========================
   UPDATE PRODUCT (ADMIN)
========================= */
exports.updateProduct = (req, res) => {
  const { name, description, price, old_price, stock, category_id } = req.body; // ==== ADDED old_price

  const query = `
    UPDATE products 
    SET name=?, description=?, price=?, old_price=?, stock=?, category_id=?
    WHERE id=?
  `;

  db.query(
    query,
    [name, description, price, old_price || null, stock, category_id, req.params.id],
    (err) => {
      if (err) return sendServerError(res, err, "Failed to update product");

      res.json({
        message: "Product updated successfully"
      });
    }
  );
};

/* =========================
   DELETE PRODUCT (ADMIN)
========================= */
exports.deleteProduct = (req, res) => {
  const query = `DELETE FROM products WHERE id = ?`;

  db.query(query, [req.params.id], (err) => {
    if (err) return sendServerError(res, err, "Failed to delete product");

    res.json({
      message: "Product deleted successfully"
    });
  });
};

/* =========================
   PRODUCT LISTING (SEARCH + FILTER + PAGINATION)
========================= */
exports.listProducts = (req, res) => {
  let {
    page = 1,
    limit = 10,
    category,
    sort,
    search,
    minPrice,
    maxPrice,
    sale,
    new: isNew      // ==== ADDED: new arrivals flag
  } = req.query;

  page = parseInt(page);
  limit = parseInt(limit);
  const offset = (page - 1) * limit;

  let query = `
    SELECT p.*, c.name AS category_name,
           (p.old_price IS NOT NULL AND p.old_price > p.price) AS is_on_sale
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE 1=1
  `;

  let countQuery = `
    SELECT COUNT(*) AS total
    FROM products p
    WHERE 1=1
  `;

  let values = [];

  /* SEARCH */
  if (search) {
    query += " AND p.name LIKE ?";
    countQuery += " AND p.name LIKE ?";
    values.push(`%${search}%`);
  }

  /* CATEGORY */
  if (category) {
    query += " AND p.category_id = ?";
    countQuery += " AND p.category_id = ?";
    values.push(category);
  }

  /* PRICE FILTER */
  if (minPrice) {
    query += " AND p.price >= ?";
    countQuery += " AND p.price >= ?";
    values.push(minPrice);
  }
  if (maxPrice) {
    query += " AND p.price <= ?";
    countQuery += " AND p.price <= ?";
    values.push(maxPrice);
  }

  /* SALE FILTER */
  if (sale === 'true') {
    query += " AND p.old_price IS NOT NULL AND p.old_price > p.price";
    countQuery += " AND p.old_price IS NOT NULL AND p.old_price > p.price";
  }

  /* ==== ADDED: NEW ARRIVALS FILTER (last 30 days) */
  if (isNew === 'true') {
    query += " AND p.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)";
    countQuery += " AND p.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)";
  }

  /* SORTING */
  if (sort === "price_asc") {
    query += " ORDER BY p.price ASC";
  } else if (sort === "price_desc") {
    query += " ORDER BY p.price DESC";
  } else if (sort === "newest") {
    query += " ORDER BY p.created_at DESC";
  } else {
    // Default sort: if new arrivals filter is on but no sort specified, sort by newest
    if (isNew === 'true') {
      query += " ORDER BY p.created_at DESC";
    } else {
      query += " ORDER BY p.id DESC";
    }
  }

  query += " LIMIT ? OFFSET ?";
  const queryValues = [...values, limit, offset];

  db.query(countQuery, values, (countErr, countResult) => {
    if (countErr) return sendServerError(res, countErr, "Failed to list products");

    db.query(query, queryValues, (err, products) => {
      if (err) return sendServerError(res, err, "Failed to list products");

      const totalProducts = countResult[0].total;

      res.json({
        currentPage: page,
        totalPages: Math.ceil(totalProducts / limit),
        totalProducts,
        products
      });
    });
  });
};

/* =========================
   FEATURED PRODUCTS
========================= */
exports.getFeaturedProducts = (req, res) => {
  const query = `
    SELECT p.*,
           (p.old_price IS NOT NULL AND p.old_price > p.price) AS is_on_sale   
    FROM products p
    WHERE p.featured = true
    ORDER BY p.created_at DESC
    LIMIT 8
  `;

  db.query(query, (err, results) => {
    if (err) return sendServerError(res, err, "Failed to fetch featured products");
    res.json(results);
  });
};