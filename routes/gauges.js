const router = require('express').Router();
const {getGauges, getSingleGauge, getFullYearObservations} = require('../controllers/gauges');

router.get('/gauges', getGauges);
router.get('/gauges/:id', getSingleGauge);
router.get('/obs', getFullYearObservations);

module.exports = router;