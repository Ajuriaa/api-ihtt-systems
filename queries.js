let  config = require('./db-config');
const  sql = require('mssql');

// async  function  getInventoryItems() {
//   try {
//     let  pool = await  sql.connect(config);
//     let  products = await  pool.request().query("SELECT * from TB_Inventario_Det");
//     return  products.recordsets;
//   }
//   catch (error) {
//     console.log(error);
//   }
// }

async  function  getInventoryItems() {
  try {
    let  pool = await  sql.connect(config);
    let  products = await  pool.request().query("SELECT * from Articulo_Inventario");
    return { data: products.recordsets[0] };
  }
  catch (error) {
    console.log(error);
    throw error;
  }
}

module.exports = {
  getInventoryItems:  getInventoryItems,
}