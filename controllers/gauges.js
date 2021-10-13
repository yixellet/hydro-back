const pgp = require('pg-promise')();
const { ParameterizedQuery } = require('pg-promise');

const {
  DB_HOST,
  DB_PORT,
  DB_USER,
  DB_PASSWORD,
  DB_NAME,
  DB_SCHEMA } = require('../config');

const db = pgp(`postgres://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}`);

function getGauges(req, res) {
  const query = new ParameterizedQuery({
    text: `SELECT uuid, name, \
          ST_X(geom) AS lon, \
          ST_Y(geom) AS lat FROM ${DB_SCHEMA}.gauges ORDER BY name`
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
    text: `SELECT gauges.uuid, \
           gauges.code, \
           gauges.name, \
           gauges.river, \
           ST_X(geom) AS lon, \
           ST_Y(geom) AS lat \
           FROM ${DB_SCHEMA}.gauges \
           WHERE gauges.code = $1`,
    values: [req.params.code]
  });

  db.one(query)
    .then((data) => {
      const elevs = new ParameterizedQuery({
        text: `SELECT elev, \"startDate\", \"endDate\" \
               FROM ${DB_SCHEMA}.\"ref_elevations\" \
               WHERE \"gauge\" = $1 \
               ORDER BY \"startDate\" DESC`,
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
  const obsQuery = new ParameterizedQuery({
    text: `SELECT * \
           FROM ${DB_SCHEMA}."${req.query.code}abs"\
           WHERE date_part(\'year\', "${req.query.code}abs".date) \
           = $1 ORDER BY \"${req.query.code}abs\".date`,
    values: [req.query.year]
  });

  const legendQuery = new ParameterizedQuery({ text: `SELECT * FROM ${DB_SCHEMA}.legend` })
  let legendArr
  db.any(legendQuery)
    .then((legend) => {
      legendArr = legend
    })

  db.any(obsQuery)
    .then((observations) => {
      const data = []
      observations.forEach((observation) => {
        const newObs = {
          date: observation.date,
          stage: observation.stage,
          props: []
        }
        observation.props.forEach((prop) => {
          legendArr.forEach((legendItem) => {
            if (legendItem.uuid === prop) {
              newObs.props.push(legendItem)
            }
          })
        })
        data.push(newObs)
      })
      res.send({data});
    })
    .catch((error) => {
      res.send({error});
    });
};

function getSingleObservation(req, res) {
  const query = new ParameterizedQuery({
    text: `SELECT * \
           FROM ${DB_SCHEMA}."${req.query.code}abs"\
           WHERE date=$1`,
    values: [req.query.date]
  });
  console.log(query)
  const legendQuery = new ParameterizedQuery({ text: `SELECT * FROM ${DB_SCHEMA}.legend` })
  let legendArr
  db.any(legendQuery)
    .then((legend) => {
      legendArr = legend
    })

  db.one(query)
    .then((singleObs) => {
      const newObs = {
        date: singleObs.date,
        stage: singleObs.stage,
        props: []
      }
      singleObs.props.forEach((prop) => {
        legendArr.forEach((legendItem) => {
          if (legendItem.uuid === prop) {
            newObs.props.push(legendItem)
          }
        })
      })
      res.send(newObs);
    })
    .catch((error) => {
      res.send({error});
    });
}

function getObsCount(req, res) {
  const query = new ParameterizedQuery({
    text: `SELECT * FROM ${DB_SCHEMA}.count_obs(\'${req.query.code}abs\') ORDER BY year`
  });
  db.any(query)
    .then((data) => {
      res.send({data})
    })
    .catch((error) => {
      res.send({error})
    })
}

module.exports = {
  getGauges,
  getSingleGauge,
  getFullYearObservations,
  getSingleObservation,
  getObsCount
};
