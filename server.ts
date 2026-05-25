import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Supabase admin client (server-side ONLY)
const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const supabase = (supabaseUrl && supabaseKey) ? createClient(supabaseUrl, supabaseKey) : null;

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// API Route: Order submission
app.post("/api/orders", async (req, res) => {
  const { orderItems, customerDetails } = req.body;
  const totalAmount = orderItems.reduce((acc: number, item: any) => acc + (item.price * item.quantity), 0);
  const orderItemsString = orderItems.map((i: any) => `${i.name} (x${i.quantity})`).join(", ");
  const timestamp = new Date().toISOString();
  
  console.log("New Order Received:", { orderItems, customerDetails });

  let orderId = `SAM-${Math.floor(Math.random() * 1000000)}`;

  // 1. Save to Supabase
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('orders')
        .insert([
          { 
            customer_name: customerDetails.name,
            customer_email: customerDetails.email,
            whatsapp: customerDetails.whatsappNumber,
            location: customerDetails.location,
            delivery_method: customerDetails.deliveryMethod,
            payment_method: customerDetails.paymentMethod,
            items: orderItems,
            total_amount: totalAmount,
            status: 'Processing'
          }
        ])
        .select();

      if (!error && data && data.length > 0) {
        orderId = data[0].id;
      }
    } catch (err: any) {
      console.error("Supabase Insertion Error:", err.message);
    }
  }

  res.status(201).json({ 
    message: "Order processed successfully", 
    orderId: orderId
  });
});

async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

if (process.env.NODE_ENV !== "production") {
  startServer();
}

export default app;
