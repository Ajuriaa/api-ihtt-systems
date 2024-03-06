var  queries = require('./queries');
var  inventory = require('./inventory');
var  express = require('express');
var  bodyParser = require('body-parser');
var  cors = require('cors');
var  app = express();
var  router = express.Router();

app.use(bodyParser.urlencoded({ extended:  true }));
app.use(bodyParser.json());
app.use(cors());
app.use('/api', router);

var  port = process.env.PORT || 3000;
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