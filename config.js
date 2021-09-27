const DB_HOST = '172.17.13.6';
const DB_PORT = 5432;
const DB_USER = 'postgres';
const DB_PASSWORD = '07071907';
const DB_NAME = 'geodata';
const DB_SCHEMA = 'hydro';
const { PORT = 4000 } = process.env;

module.exports = {
  DB_HOST,
  DB_PORT,
  DB_USER,
  DB_PASSWORD,
  DB_NAME,
  DB_SCHEMA,
  PORT,
}