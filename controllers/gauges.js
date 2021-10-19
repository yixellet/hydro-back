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
    text: `SELECT code, name, \
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
    text: `SELECT gauges.uuid,
                  gauges.code,
                  gauges.name,
                  gauges.river,
                  ST_X(gauges.geom) AS lon,
                  ST_Y(gauges.geom) AS lat,
                  mag."allPeriod" AS "meanAnnualAllPeriod_GMS",
                  mag."iceFree" AS "meanAnnualIceFree_GMS",
                  msp."1p" AS "p1_GMS",
                  msp."3p" AS "p3_GMS",
                  msp."5p" AS "p5_GMS",
                  msp."10p" AS "p10_GMS",
                  msp."25p" AS "p25_GMS",
                  msp."50p" AS "p50_GMS",
                  maxst.date AS "maxDate",
                  maxst.stage AS "maxStage",
                  minst.date AS "minDate",
                  minst.stage AS "minStage"
            FROM ${DB_SCHEMA}."calcMaxStage"($1) maxst,
                 ${DB_SCHEMA}."calcMinStage"($1) minst,
                 ${DB_SCHEMA}.gauges
            LEFT JOIN ${DB_SCHEMA}."meanAnnualsGms" mag ON mag.gauge = gauges.uuid
            LEFT JOIN ${DB_SCHEMA}."maxStageProbGms" msp ON msp.gauge = gauges.uuid
            WHERE gauges.code = $1`,
    values: [req.params.code]
  });

  db.one(query)
    .then((data) => {
      const elevs = new ParameterizedQuery({
        text: `SELECT elev,
                  to_timestamp(to_char(\"startDate\", 'YYYY-mm-DD'), 'YYYY-mm-DD') AT TIME ZONE 'Europe/Astrakhan' AS \"startDate\",
                  to_timestamp(to_char(\"endDate\", 'YYYY-mm-DD'), 'YYYY-mm-DD') AT TIME ZONE 'Europe/Astrakhan' AS \"endDate\"
               FROM ${DB_SCHEMA}.\"ref_elevations\"
               WHERE \"gauge\" = $1
               ORDER BY \"startDate\" DESC`,
        values: [data.uuid]
      });
      db.any(elevs)
        .then((els) => {
          res.send({
            uuid: data.uuid,
            code: data.code,
            name: data.name,
            river: data.river,
            lat: data.lat,
            lon: data.lon,
            statistics: [
              {
                desc: 'среднемноголетний уровень (весь период)',
                stage: data.meanAnnualAllPeriod_GMS,
                source: 'ЦГМС'
              },
              {
                desc: 'среднемноголетний уровень (безледный период)',
                stage: data.meanAnnualIceFree_GMS,
                source: 'ЦГМС'
              },
              {
                desc: 'максимальный уровень',
                date: data.maxDate,
                stage: Number(data.maxStage),
                source: 'рассчитанное'
              },
              {
                desc: 'минимальный уровень',
                date: data.minDate,
                stage: Number(data.minStage),
                source: 'рассчитанное'
              }
            ],
            probabilities: [
              {desc: '1%', stage: data.p1_GMS, source: 'ЦГМС'},
              {desc: '3%', stage: data.p3_GMS, source: 'ЦГМС'},
              {desc: '5%', stage: data.p5_GMS, source: 'ЦГМС'},
              {desc: '10%', stage: data.p10_GMS, source: 'ЦГМС'},
              {desc: '25%', stage: data.p25_GMS, source: 'ЦГМС'},
              {desc: '50%', stage: data.p50_GMS, source: 'ЦГМС'}
            ],
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
    text: `SELECT date,
                  stage,
                  props
           FROM ${DB_SCHEMA}."s${req.query.code}"\
           WHERE date_part(\'year\', "s${req.query.code}".date) \
           = $1 ORDER BY \"s${req.query.code}\".date`,
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
          stage: Number(observation.stage),
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
      res.send(data);
    })
    .catch((error) => {
      res.send({error});
    });
};

function getSingleObservation(req, res) {
  const query = new ParameterizedQuery({
    text: `SELECT to_timestamp(to_char(date, 'YYYY-mm-DD'), 'YYYY-mm-DD') AT TIME ZONE 'Europe/Astrakhan' AS date,
                  stage,
                  props
           FROM ${DB_SCHEMA}."s${req.query.code}"\
           WHERE date=$1`,
    values: [req.query.date]
  });
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
    text: `SELECT * FROM ${DB_SCHEMA}.count_obs(\'${req.query.code}\') ORDER BY year`
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
