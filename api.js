let  queries = require('./queries');
let  express = require('express');
let  bodyParser = require('body-parser');
let  cors = require('cors');
let  app = express();
let  router = express.Router();

app.use(bodyParser.urlencoded({ extended:  true }));
app.use(bodyParser.json());
app.use(cors());
app.use('/api', router);

let  port = process.env.PORT || 3000;
app.listen(port);
console.log('El api de proveduría está corriendo en el puerto ' + port);

router.use((request, response, next) => {
  console.log('middleware');
  next();
});

router.route('/inventory').get((request, response) => {
  queries.getInventoryItems().then((data) => {
    response.json(data);
  })
})