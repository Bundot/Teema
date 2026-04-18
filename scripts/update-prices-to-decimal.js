const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Direct Supabase configuration
const supabaseUrl = 'https://qnuznpihinvgzomddivo.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFudXpucGloaW52Z3pvbWRkaXZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzOTc3NjYsImV4cCI6MjA4ODk3Mzc2Nn0.G9mYzgm5upwntLJW0sj-Uh3a2hTM-HbC1D4td0dgR8Y';

const supabase = createClient(supabaseUrl, supabaseKey);

// Function to parse price from filename
function parsePriceFromFilename(filename) {
  // Match patterns like "£8.49", "8.49", "£2.19", "2.19", etc.
  const priceMatch = filename.match(/[£$]?\s*(\d+)\.(\d{2})/);
  if (priceMatch) {
    const pounds = parseInt(priceMatch[1]);
    const pence = parseInt(priceMatch[2]);
    return parseFloat(`${pounds}.${pence}`); // Return as decimal
  }
  
  // Match patterns like "£8" or "8" (whole pounds)
  const wholePoundMatch = filename.match(/[£$]?\s*(\d+)(?!\.)/);
  if (wholePoundMatch) {
    return parseFloat(`${wholePoundMatch[1]}.00`); // Return as decimal
  }
  
  return null;
}

// Function to parse product name from filename
function parseProductName(filename) {
  // Remove file extension and price information
  let name = filename.replace(/\.(jpeg|jpg|png|gif|webp)$/i, '');
  
  // Remove price patterns (e.g., "£8.49", "8.49", "£2.19", etc.)
  name = name.replace(/[£$]?\s*\d+\.?\d*\s*\.?$/i, '');
  
  // Clean up extra spaces, dots, and special characters
  name = name.replace(/\s+/g, ' ').trim();
  name = name.replace(/\.$/, ''); // Remove trailing dot
  name = name.replace(/^\.+/, ''); // Remove leading dots
  
  return name;
}

// Function to find matching product image in TeemaProducts folder
function findProductImage(productName) {
  const productsDir = '/Users/m1pro/Applications/Teema/TeemaProducts';
  
  if (!fs.existsSync(productsDir)) {
    console.error(`Products directory not found: ${productsDir}`);
    return null;
  }
  
  try {
    const files = fs.readdirSync(productsDir);
    
    // Look for files that contain the product name (case insensitive)
    for (const file of files) {
      const fileBaseName = path.parse(file).name;
      const parsedName = parseProductName(fileBaseName);
      
      // Compare normalized names (lowercase, trimmed)
      if (parsedName && parsedName.toLowerCase().trim() === productName.toLowerCase().trim()) {
        const price = parsePriceFromFilename(fileBaseName);
        if (price) {
          return {
            filename: file,
            price: price, // This will be decimal like 8.49, 1.00, 45.00
            parsedName: parsedName
          };
        }
      }
    }
    
    // If exact match not found, try partial matching
    for (const file of files) {
      const fileBaseName = path.parse(file).name;
      const parsedName = parseProductName(fileBaseName);
      
      if (parsedName) {
        const fileWords = parsedName.toLowerCase().split(' ');
        const productWords = productName.toLowerCase().split(' ');
        
        // Check if most words match
        const commonWords = fileWords.filter(word => productWords.includes(word));
        if (commonWords.length >= Math.min(fileWords.length, productWords.length) * 0.6) {
          const price = parsePriceFromFilename(fileBaseName);
          if (price) {
            console.log(`Partial match found: "${productName}" -> "${parsedName}" (${file})`);
            return {
              filename: file,
              price: price,
              parsedName: parsedName
            };
          }
        }
      }
    }
  } catch (error) {
    console.error(`Error reading products directory: ${error.message}`);
  }
  
  return null;
}

async function updatePricesToDecimal() {
  try {
    console.log('Fetching current products from database...');
    
    // Fetch all products
    const { data: products, error: fetchError } = await supabase
      .from('products')
      .select('*');
    
    if (fetchError) {
      console.error('Error fetching products:', fetchError);
      return;
    }
    
    if (!products || products.length === 0) {
      console.log('No products found in database.');
      return;
    }
    
    console.log(`Found ${products.length} products in database.`);
    
    let updatedCount = 0;
    let notFoundCount = 0;
    let noPriceCount = 0;
    
    for (const product of products) {
      console.log(`\nProcessing: ${product.name}`);
      
      // Try to find matching image file
      const imageInfo = findProductImage(product.name);
      
      if (imageInfo) {
        const newPrice = imageInfo.price; // This is decimal (e.g., 8.49, 1.00, 45.00)
        console.log(`  Found image: ${imageInfo.filename}`);
        console.log(`  Current price: ${product.price}`);
        console.log(`  New decimal price: ${newPrice}`);
        
        if (product.price !== newPrice) {
          // Update the product price with decimal value
          const { error: updateError } = await supabase
            .from('products')
            .update({ price: newPrice })
            .eq('id', product.id);
          
          if (updateError) {
            console.error(`  Error updating product: ${updateError.message}`);
          } else {
            console.log(`  Updated price to decimal successfully!`);
            updatedCount++;
          }
        } else {
          console.log(`  Price is already correct.`);
        }
      } else {
        console.log(`  No matching image file found for this product.`);
        notFoundCount++;
      }
    }
    
    console.log('\n=== SUMMARY ===');
    console.log(`Total products: ${products.length}`);
    console.log(`Prices updated to decimal: ${updatedCount}`);
    console.log(`No image found: ${notFoundCount}`);
    console.log(`No price found: ${noPriceCount}`);
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

// Run the script
updatePricesToDecimal();
