var  config = require('./db-config');
const  sql = require('mssql');

async  function  getInventory() {
  try {
    let  pool = await  sql.connect(config);
    let  products = await  pool.request().query("SELECT * from TB_Inventario_Det");
    return  products.recordsets;
  }
  catch (error) {
    console.log(error);
  }
}

module.exports = {
  getInventory:  getInventory,
}