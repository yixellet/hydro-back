
const pgp = require('pg-promise')();
const { ParameterizedQuery } = require('pg-promise');

const {
  DB_HOST,
  DB_PORT,
  DB_USER,
  DB_PASSWORD,
  DB_NAME, } = require('../config');

const db = pgp(`postgres://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}`);

function getGauges(req, res) {
  const query = new ParameterizedQuery({
    text: 'SELECT id, name FROM hydro.gauges WHERE type = $1 ORDER BY name',
    values: ['gauge']
  });

  db.any(query)
    .then((data) => {
      res.send({data});
    })
    .catch((error) => {
      res.send({error});
    });
};

function getSingleGauge(req, res) {
  const query = new ParameterizedQuery({
    text: 'SELECT gauges.id, \
           gauges.uuid, \
           gauges.code, \
           gauges.name, \
           gauges.stream, \
           ST_X(geom) AS lon, \
           ST_Y(geom) AS lat \
           FROM hydro.gauges \
           WHERE gauges.id = $1',
    values: [req.params.id]
  });

  db.one(query)
    .then((data) => {
      const elevs = new ParameterizedQuery({
        text: 'SELECT elevation, \"startDate\", \"endDate\" \
               FROM hydro.\"ref_elevations\" \
               WHERE \"gauge\" = $1',
        values: [data.uuid]
      })
      db.any(elevs)
        .then((els) => {
          res.send({
            id: data.id,
            code: data.code,
            name: data.name,
            stream: data.stream,
            lat: data.lat,
            lon: data.lon,
            elevs: els
          });
        })
    })
    .catch((error) => {
      res.send({error});
    });
};

function getFullYearObservations(req, res) {
  const query = new ParameterizedQuery({
    text: `SELECT * \
           FROM hydro.\"${req.query.code}abs"\
           WHERE date_part(\'year\', \"${req.query.code}abs\".date) = $1 ORDER BY \"${req.query.code}abs\".date`,
    values: [req.query.year]
  });

  db.any(query)
    .then((data) => {
      res.send({data});
    })
    .catch((error) => {
      res.send({error});
    });
};

function getSingleObservation(req, res) {
  const query = new ParameterizedQuery({
    text: `SELECT * \
           FROM hydro.\"${req.query.code}abs"\
           WHERE date=$1`,
    values: [req.query.date]
  });

  db.one(query)
    .then((data) => {
      res.send({data});
    })
    .catch((error) => {
      res.send({error});
    });
}

module.exports = {
  getGauges,
  getSingleGauge,
  getFullYearObservations,
  getSingleObservation
};
