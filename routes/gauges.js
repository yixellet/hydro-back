const router = require('express').Router();
const {getGauges,
       getSingleGauge,
       getFullYearObservations,
       getSingleObservation,
       getObsCount} = require('../controllers/gauges');

router.get('/gauges', getGauges);
router.get('/gauges/:code', getSingleGauge);
router.get('/obs', getFullYearObservations);
router.get('/singleobs', getSingleObservation);
router.get('/count', getObsCount)

module.exports = router;