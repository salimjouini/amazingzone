const port = 3000;

const mysql = require("mysql2");
const express = require("express");
const app = express();
const cors = require("cors");
app.use(express.json());
app.use(cors());


const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "admin",
  database: "prj_DB"
});

db.connect((err) => {
  if (err) {
    console.log("❌ Error connecting to DB:", err);
  } else {
    console.log("✅ Connected to MySQL");
  }
});

// serve images
app.use(express.static("public"));

// GET clients
app.get("/clients", (req, res) => {
  db.query("SELECT * FROM clients", (err, results) => {
    if (err) {
      console.log("QUERY ERROR:", err);
      return res.status(500).send("Error fetching clients");
    }

    if (!results || results.length === 0) {
      return res.send("No users found");
    }

    return res.json(results);
  });
});

// GET product by id
app.get("/products/:id", (req, res) => {
  const id = req.params.id;

  const sql = "SELECT * FROM products WHERE id_product = ?";

  db.query(sql, [id], (err, results) => {
    if (err) {
      return res.status(500).json({ message: "Error fetching product" });
    }

    if (results.length === 0) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json(results[0]);
  });
});
app.get("/products", (req, res) => {
  db.query("SELECT * FROM products ORDER BY id_product ASC", (err, results) => {
    if (err) {
      return res.status(500).json({ message: "Error fetching products" });
    }

    res.json(results);
  });
});

app.post("/addproducts", (req, res) => {
  const { nom, description, prix, stock, image, category } = req.body;

  console.log("BODY:", req.body);

  if (!nom || prix == null) {
    return res.status(400).json({ message: "nom and prix are required" });
  }

  const sql = `
    INSERT INTO products (nom, description, prix, stock, image, category)
    VALUES (?, ?, ?, ?, ?, ?)
  `;

  db.query(
    sql,
    [
      nom,
      description || null,
      prix,
      stock || 0.0,
      image || null,
      category || null
    ],
    (err, result) => {
      if (err) {
        console.log("INSERT ERROR:", err);
        return res.status(500).json({
          message: "Error inserting product",
          error: err.message
        });
      }

      res.status(201).json({
        message: "Product inserted successfully",
        id_product: result.insertId
      });
    }
  );
});

app.post("/adduser", (req, res) => {
  const { name, family_name, email, password, adresse } = req.body;
  db.query(
    "INSERT INTO clients (name, family_name, email, password,adresse) VALUES (?, ?, ?, ?, ?)",
    [name, family_name, email, password, adresse],
    (err, result) => {
      if (err) {
        console.log("INSERT ERROR:", err);
        return res.status(500).json({
          message: "Error inserting user",
          error: err.message
        });
      }

      res.status(201).json({
        message: "User inserted successfully",
        id_client: result.insertId
      });
    }
  );
});
app.post("/login", (req, res) => {
  const { email, password, id } = req.body;

  db.query(
    "SELECT * FROM clients WHERE email = ? AND password = ?",
    [email, password],
    (err, results) => {
      if (err) {
        console.log("QUERY ERROR:", err);
        return res.status(500).json({
          success: false,
          message: "Error fetching user"
        });
      }

      if (results.length === 0) {
        return res.status(404).json({
          success: false,
          message: "User not found"
        });
      }

      return res.json({
        

        success: true,
        message: "Login success",
        id: results[0].id_client
      });
    }
  );
});
app.post("/updateuser/", (req, res) => {
  const { id,name, familyname, email, password, adresse } = req.body;
  db.query(
    "UPDATE clients SET name = ?, family_name = ?, email = ?, password = ?, adresse = ? WHERE id_client = ?",
    [name, familyname, email, password, adresse, id],
    (err, result) => {
      if (err) {
        console.log("UPDATE ERROR:", err);
        return res.status(500).json({
          message: "Error updating user",
          error: err.message
        });
      }
      if (result.affectedRows === 0) {
        return res.status(404).json({
          message: "User not found"
        });
      }
      return res.json({
        success: true,
        message: "User updated successfully",
        user: result[0]
      });
    }
  );
});
app.post("/placeorder", (req, res) => {
  console.log("BODY =", req.body);

  const { idclient, cart } = req.body;
  const clientId = Number(idclient);

  if (!clientId || !cart || cart.length === 0) {
    return res.status(400).json({
      message: "Missing idclient or cart"
    });
  }

  const total = cart.reduce((sum, item) => {
    return sum + Number(item.prix) * Number(item.quantity);
  }, 0);

  db.query(
    "INSERT INTO orders (id_client, total) VALUES (?, ?)",
    [clientId, total],
    (err, result) => {
      if (err) {
        console.log("ORDER ERROR =", err);
        return res.status(500).json({
          message: "Error placing order",
          error: err.message
        });
      }

      const orderId = result.insertId;
      let completed = 0;

      cart.forEach((item) => {
        const productId = Number(item.id);
        const quantity = Number(item.quantity);
        const linePrice = Number(item.prix) * quantity;

        console.log("ITEM =", item);

        db.query(
          "INSERT INTO order_line (id_order, id_product, quantity, price) VALUES (?, ?, ?, ?)",
          [orderId, productId, quantity, linePrice],
          (err2) => {
            if (err2) {
              console.log("ORDER LINE ERROR =", err2);
              return res.status(500).json({
                message: "Error inserting order line",
                error: err2.message
              });
            }

            completed++;

            if (completed === cart.length) {
              return res.status(201).json({
                message: "Order placed successfully",
                orderId: orderId,
                total: total
              });
            }
          }
        );
      });
    }
  );
});


app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});