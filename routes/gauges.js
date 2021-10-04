const router = require('express').Router();
const {getGauges, getSingleGauge, getFullYearObservations, getSingleObservation} = require('../controllers/gauges');

router.get('/gauges', getGauges);
router.get('/gauges/:id', getSingleGauge);
router.get('/obs', getFullYearObservations);
router.get('/singleobs', getSingleObservation);

module.exports = router;